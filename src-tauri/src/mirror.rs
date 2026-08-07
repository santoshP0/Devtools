// Android screen mirroring + control.
//
// Same trust boundary as the ffmpeg bridge: the webview never sends raw adb or
// scrcpy arguments. Every flag is built here from bounded, validated options,
// the target serial must match a currently-connected device, and all numbers
// are clamped.
//
// How it works: adb pushes the bundled scrcpy server to the device, which
// H.264-encodes the screen with the hardware encoder and streams the compressed
// bytes back over a forwarded socket. We remux that raw stream to fragmented MP4
// with the bundled ffmpeg (stream copy — no re-encode) and serve it over a
// localhost socket, so the webview's <video> element decodes it in hardware.
// A second socket carries control messages (touch, scroll, keys, text).

use std::collections::HashMap;
use std::path::Path;
use std::sync::{Mutex, OnceLock};

use serde::{Deserialize, Serialize};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::process::Command;
use tokio::sync::Mutex as AsyncMutex;

// The bundled server jar is built for this exact scrcpy version — the startup
// arguments and the control-message layout below are tied to it. Bumping the
// jar means revisiting both.
const SCRCPY_VERSION: &str = "2.4";

// ── binary + resource resolution ────────────────────────────────────────────

// Resolve adb the same way ffmpeg is resolved in lib.rs: the sidecar shipped
// next to the app first (so nothing has to be installed), then common install
// locations, then a bare PATH lookup.
fn adb_program() -> String {
  if let Ok(exe) = std::env::current_exe() {
    if let Some(dir) = exe.parent() {
      let bundled = dir.join(if cfg!(windows) { "adb.exe" } else { "adb" });
      if bundled.is_file() {
        return bundled.to_string_lossy().into_owned();
      }
    }
  }
  #[cfg(not(windows))]
  const CANDIDATES: &[&str] = &[
    "/opt/homebrew/bin/adb",
    "/usr/local/bin/adb",
    "/opt/local/bin/adb",
    "/usr/bin/adb",
    "/usr/lib/android-sdk/platform-tools/adb",
  ];
  #[cfg(windows)]
  const CANDIDATES: &[&str] = &[
    r"C:\platform-tools\adb.exe",
    r"C:\Program Files\platform-tools\adb.exe",
  ];
  for c in CANDIDATES {
    if Path::new(c).is_file() {
      return (*c).to_string();
    }
  }
  "adb".to_string()
}

fn adb() -> Command {
  let mut cmd = Command::new(adb_program());
  #[cfg(not(windows))]
  {
    let extra = "/opt/homebrew/bin:/usr/local/bin:/opt/local/bin";
    let path = std::env::var("PATH").map(|p| format!("{extra}:{p}")).unwrap_or_else(|_| extra.to_string());
    cmd.env("PATH", path);
  }
  #[cfg(windows)]
  {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
  }
  cmd
}

fn ffmpeg() -> Command {
  let mut cmd = Command::new(crate::ffmpeg_program());
  #[cfg(not(windows))]
  {
    let extra = "/opt/homebrew/bin:/usr/local/bin:/opt/local/bin";
    let path = std::env::var("PATH").map(|p| format!("{extra}:{p}")).unwrap_or_else(|_| extra.to_string());
    cmd.env("PATH", path);
  }
  #[cfg(windows)]
  {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x0800_0000);
  }
  cmd
}

// Locate the bundled scrcpy server jar. Ships next to the app as a resource;
// fall back to a system scrcpy install so a dev machine still works.
fn scrcpy_server_jar() -> Option<String> {
  if let Ok(exe) = std::env::current_exe() {
    if let Some(dir) = exe.parent() {
      for rel in ["scrcpy-server.jar", "resources/scrcpy-server.jar", "../Resources/scrcpy-server.jar"] {
        let p = dir.join(rel);
        if p.is_file() {
          return Some(p.to_string_lossy().into_owned());
        }
      }
    }
  }
  for c in [
    "/opt/homebrew/share/scrcpy/scrcpy-server",
    "/usr/local/share/scrcpy/scrcpy-server",
    "/usr/share/scrcpy/scrcpy-server",
  ] {
    if Path::new(c).is_file() {
      return Some(c.to_string());
    }
  }
  None
}

// ── serial validation ───────────────────────────────────────────────────────

// adb serials are short device identifiers; keep them to a safe character set so
// a serial can never smuggle an extra argument even before the connected-device
// check below.
fn serial_ok(s: &str) -> bool {
  !s.is_empty()
    && s.len() <= 128
    && s.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | ':' | '-' | '_'))
}

fn clamp(v: u32, lo: u32, hi: u32) -> u32 {
  v.max(lo).min(hi)
}

// ── device listing ──────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct DeviceInfo {
  serial: String,
  model: String,
  state: String,
}

async fn list_devices_raw() -> Result<Vec<DeviceInfo>, String> {
  let out = adb()
    .arg("devices")
    .arg("-l")
    .output()
    .await
    .map_err(|e| format!("could not run adb: {e}"))?;
  if !out.status.success() {
    return Err("adb failed to list devices".into());
  }
  let text = String::from_utf8_lossy(&out.stdout);
  let mut devices = Vec::new();
  for line in text.lines().skip(1) {
    let line = line.trim();
    if line.is_empty() {
      continue;
    }
    let mut parts = line.split_whitespace();
    let serial = match parts.next() {
      Some(s) => s.to_string(),
      None => continue,
    };
    let state = parts.next().unwrap_or("").to_string();
    let model = parts
      .find(|p| p.starts_with("model:"))
      .map(|p| p.trim_start_matches("model:").replace('_', " "))
      .unwrap_or_else(|| serial.clone());
    devices.push(DeviceInfo { serial, model, state });
  }
  Ok(devices)
}

#[tauri::command]
pub async fn mirror_list_devices() -> Result<Vec<DeviceInfo>, String> {
  list_devices_raw().await
}

// A serial is only usable if adb currently reports it as an authorized device.
async fn require_ready_device(serial: &str) -> Result<(), String> {
  if !serial_ok(serial) {
    return Err("invalid device serial".into());
  }
  let devices = list_devices_raw().await?;
  match devices.iter().find(|d| d.serial == serial) {
    Some(d) if d.state == "device" => Ok(()),
    Some(d) if d.state == "unauthorized" => {
      Err("device is unauthorized — accept the USB debugging prompt on the phone".into())
    }
    Some(d) => Err(format!("device is not ready ({})", d.state)),
    None => Err("device is not connected".into()),
  }
}

// ── session state ───────────────────────────────────────────────────────────

struct Session {
  serial: String,
  scid: String,
  forward_port: u16,
  device_w: u32,
  device_h: u32,
  control: AsyncMutex<TcpStream>,
  children: Mutex<Vec<tokio::process::Child>>,
}

fn sessions() -> &'static Mutex<HashMap<String, std::sync::Arc<Session>>> {
  static S: OnceLock<Mutex<HashMap<String, std::sync::Arc<Session>>>> = OnceLock::new();
  S.get_or_init(|| Mutex::new(HashMap::new()))
}

// ── start ───────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct StartOpts {
  serial: String,
  max_size: u32,  // longest edge cap in px (0 = device native)
  bitrate: u32,   // Mbps
  max_fps: u32,
}

#[derive(Serialize)]
pub struct StartResult {
  http_port: u16,
  device_w: u32,
  device_h: u32,
}

async fn device_resolution(serial: &str) -> (u32, u32) {
  let out = adb()
    .args(["-s", serial, "shell", "wm", "size"])
    .output()
    .await;
  if let Ok(o) = out {
    let text = String::from_utf8_lossy(&o.stdout);
    // Prefer "Override size" when present, else "Physical size".
    let pick = |key: &str| -> Option<(u32, u32)> {
      text.lines().find(|l| l.contains(key)).and_then(|l| {
        let dims = l.rsplit(':').next()?.trim();
        let (w, h) = dims.split_once('x')?;
        Some((w.trim().parse().ok()?, h.trim().parse().ok()?))
      })
    };
    if let Some(r) = pick("Override size").or_else(|| pick("Physical size")) {
      return r;
    }
  }
  (1080, 1920)
}

#[tauri::command]
pub async fn mirror_start(opts: StartOpts) -> Result<StartResult, String> {
  require_ready_device(&opts.serial).await?;
  let serial = opts.serial.clone();

  // one live session per device
  if sessions().lock().unwrap().contains_key(&serial) {
    let _ = mirror_stop_inner(&serial).await;
  }

  let jar = scrcpy_server_jar()
    .ok_or("scrcpy server not found — reinstall the app or install scrcpy")?;

  let max_size = if opts.max_size == 0 { 0 } else { clamp(opts.max_size, 320, 3840) };
  let bitrate = clamp(opts.bitrate, 1, 50) * 1_000_000;
  let max_fps = clamp(opts.max_fps, 10, 120);

  let (device_w, device_h) = device_resolution(&serial).await;

  // push the server to the device
  let push = adb()
    .args(["-s", &serial, "push", &jar, "/data/local/tmp/scrcpy-server.jar"])
    .output()
    .await
    .map_err(|e| format!("failed to push server: {e}"))?;
  if !push.status.success() {
    return Err("failed to push server to device".into());
  }

  // random session id + forwarded local port
  let scid = format!("{:08x}", std::process::id().wrapping_mul(2654435761) ^ (now_nanos() as u32));
  let fwd = adb()
    .args([
      "-s",
      &serial,
      "forward",
      "tcp:0",
      &format!("localabstract:scrcpy_{scid}"),
    ])
    .output()
    .await
    .map_err(|e| format!("failed to set up forward: {e}"))?;
  if !fwd.status.success() {
    return Err("failed to forward device socket".into());
  }
  let forward_port: u16 = String::from_utf8_lossy(&fwd.stdout)
    .trim()
    .parse()
    .map_err(|_| "adb did not report a forward port".to_string())?;

  // launch the server. Options are a fixed key=value set; the stream carries a
  // raw H.264 elementary stream (frame/codec/device headers off) so ffmpeg can
  // parse it directly — only the one-byte forward-tunnel handshake precedes it.
  let server_args = format!(
    "CLASSPATH=/data/local/tmp/scrcpy-server.jar app_process / com.genymobile.scrcpy.Server {SCRCPY_VERSION} \
scid={scid} log_level=error tunnel_forward=true \
video=true audio=false control=true \
send_device_meta=false send_frame_meta=false send_dummy_byte=true send_codec_meta=false \
video_codec=h264 max_size={max_size} video_bit_rate={bitrate} max_fps={max_fps}"
  );
  let mut server = adb()
    .args(["-s", &serial, "shell", &server_args])
    .stdout(std::process::Stdio::null())
    .stderr(std::process::Stdio::null())
    .spawn()
    .map_err(|e| format!("failed to start server: {e}"))?;

  // connect the two client sockets (video first, then control)
  let addr = format!("127.0.0.1:{forward_port}");
  let mut video = connect_retry(&addr).await.map_err(|e| {
    let _ = server.start_kill();
    e
  })?;
  // forward tunnel sends one dummy byte on the first socket
  let mut dummy = [0u8; 1];
  let _ = video.read_exact(&mut dummy).await;
  let control = connect_retry(&addr).await.map_err(|e| {
    let _ = server.start_kill();
    e
  })?;

  // remux raw H.264 -> fragmented MP4 (stream copy, no re-encode)
  let mut ff = ffmpeg()
    .args([
      "-fflags", "nobuffer",
      "-flags", "low_delay",
      "-f", "h264",
      "-i", "pipe:0",
      "-c:v", "copy",
      "-f", "mp4",
      "-movflags", "frag_keyframe+empty_moov+default_base_moof+low_latency",
      "-frag_duration", "100000",
      "pipe:1",
    ])
    .stdin(std::process::Stdio::piped())
    .stdout(std::process::Stdio::piped())
    .stderr(std::process::Stdio::null())
    .spawn()
    .map_err(|e| {
      let _ = server.start_kill();
      format!("failed to start ffmpeg: {e}")
    })?;
  let mut ff_stdin = ff.stdin.take().ok_or("ffmpeg stdin unavailable")?;
  let mut ff_stdout = ff.stdout.take().ok_or("ffmpeg stdout unavailable")?;

  // pump the device video socket into ffmpeg
  tokio::spawn(async move {
    let _ = tokio::io::copy(&mut video, &mut ff_stdin).await;
  });

  // serve the fragmented MP4 to the webview over localhost
  let listener = TcpListener::bind("127.0.0.1:0")
    .await
    .map_err(|e| format!("failed to bind stream server: {e}"))?;
  let http_port = listener.local_addr().map_err(|e| e.to_string())?.port();
  tokio::spawn(async move {
    if let Ok((mut sock, _)) = listener.accept().await {
      // read past the request headers
      let mut buf = [0u8; 1024];
      let _ = sock.read(&mut buf).await;
      let header = "HTTP/1.1 200 OK\r\nContent-Type: video/mp4\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n";
      if sock.write_all(header.as_bytes()).await.is_ok() {
        let _ = tokio::io::copy(&mut ff_stdout, &mut sock).await;
      }
    }
  });

  let session = std::sync::Arc::new(Session {
    serial: serial.clone(),
    scid,
    forward_port,
    device_w,
    device_h,
    control: AsyncMutex::new(control),
    children: Mutex::new(vec![server, ff]),
  });
  sessions().lock().unwrap().insert(serial, session);

  Ok(StartResult { http_port, device_w, device_h })
}

async fn connect_retry(addr: &str) -> Result<TcpStream, String> {
  for _ in 0..100 {
    if let Ok(s) = TcpStream::connect(addr).await {
      let _ = s.set_nodelay(true);
      return Ok(s);
    }
    tokio::time::sleep(std::time::Duration::from_millis(50)).await;
  }
  Err("could not connect to device stream".into())
}

fn now_nanos() -> u128 {
  std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .map(|d| d.as_nanos())
    .unwrap_or(0)
}

// ── stop ────────────────────────────────────────────────────────────────────

async fn mirror_stop_inner(serial: &str) -> Result<(), String> {
  let session = sessions().lock().unwrap().remove(serial);
  if let Some(session) = session {
    if let Ok(mut children) = session.children.lock() {
      for c in children.iter_mut() {
        let _ = c.start_kill();
      }
    }
    let _ = adb()
      .args([
        "-s",
        &session.serial,
        "forward",
        "--remove",
        &format!("tcp:{}", session.forward_port),
      ])
      .output()
      .await;
    // discourage a stray server process from lingering
    let _ = adb()
      .args([
        "-s",
        &session.serial,
        "shell",
        &format!("pkill -f scrcpy_{}", session.scid),
      ])
      .output()
      .await;
  }
  Ok(())
}

#[tauri::command]
pub async fn mirror_stop(serial: String) -> Result<(), String> {
  mirror_stop_inner(&serial).await
}

// ── control ─────────────────────────────────────────────────────────────────

// Typed control events from the webview. Positions are normalized 0..1 and
// scaled to device pixels here, so nothing the webview sends is trusted as a
// raw coordinate or command.
#[derive(Deserialize)]
#[serde(tag = "kind")]
pub enum InputMsg {
  #[serde(rename = "touch")]
  Touch { action: String, x: f64, y: f64 }, // action: down | up | move
  #[serde(rename = "scroll")]
  Scroll { x: f64, y: f64, dx: f64, dy: f64 },
  #[serde(rename = "text")]
  Text { text: String },
  #[serde(rename = "key")]
  Key { keycode: i32 }, // down+up of an Android keycode (e.g. BACK=4, HOME=3)
}

const MOUSE_POINTER_ID: i64 = -1;

fn norm_px(v: f64, total: u32) -> i32 {
  let n = if v.is_finite() { v.clamp(0.0, 1.0) } else { 0.0 };
  (n * total as f64).round() as i32
}

fn touch_message(action: u8, x: i32, y: i32, w: u32, h: u32, pressure: u16, buttons: u32) -> Vec<u8> {
  let mut m = Vec::with_capacity(32);
  m.push(2u8); // TYPE_INJECT_TOUCH_EVENT
  m.push(action);
  m.extend_from_slice(&MOUSE_POINTER_ID.to_be_bytes());
  m.extend_from_slice(&x.to_be_bytes());
  m.extend_from_slice(&y.to_be_bytes());
  m.extend_from_slice(&(w as u16).to_be_bytes());
  m.extend_from_slice(&(h as u16).to_be_bytes());
  m.extend_from_slice(&pressure.to_be_bytes());
  m.extend_from_slice(&buttons.to_be_bytes()); // action button
  m.extend_from_slice(&buttons.to_be_bytes()); // buttons
  m
}

// float -> scrcpy 16-bit signed fixed point
fn fixed16(v: f64) -> i16 {
  let c = v.clamp(-1.0, 1.0);
  (c * 32767.0).round() as i16
}

fn scroll_message(x: i32, y: i32, w: u32, h: u32, hs: f64, vs: f64) -> Vec<u8> {
  let mut m = Vec::with_capacity(21);
  m.push(3u8); // TYPE_INJECT_SCROLL_EVENT
  m.extend_from_slice(&x.to_be_bytes());
  m.extend_from_slice(&y.to_be_bytes());
  m.extend_from_slice(&(w as u16).to_be_bytes());
  m.extend_from_slice(&(h as u16).to_be_bytes());
  m.extend_from_slice(&fixed16(hs).to_be_bytes());
  m.extend_from_slice(&fixed16(vs).to_be_bytes());
  m.extend_from_slice(&0u32.to_be_bytes()); // buttons
  m
}

fn text_message(text: &str) -> Vec<u8> {
  // cap injected text so a single message can't be unbounded
  let bytes: Vec<u8> = text.bytes().take(2000).collect();
  let mut m = Vec::with_capacity(5 + bytes.len());
  m.push(1u8); // TYPE_INJECT_TEXT
  m.extend_from_slice(&(bytes.len() as u32).to_be_bytes());
  m.extend_from_slice(&bytes);
  m
}

fn keycode_message(action: u8, keycode: i32) -> Vec<u8> {
  let mut m = Vec::with_capacity(14);
  m.push(0u8); // TYPE_INJECT_KEYCODE
  m.push(action); // 0 down, 1 up
  m.extend_from_slice(&keycode.to_be_bytes());
  m.extend_from_slice(&0i32.to_be_bytes()); // repeat
  m.extend_from_slice(&0i32.to_be_bytes()); // metastate
  m
}

fn build_input(msg: &InputMsg, w: u32, h: u32) -> Vec<u8> {
  match msg {
    InputMsg::Touch { action, x, y } => {
      let (act, pressure, buttons) = match action.as_str() {
        "down" => (0u8, 0xffffu16, 1u32),
        "move" => (2u8, 0xffffu16, 1u32),
        _ => (1u8, 0u16, 0u32), // up
      };
      touch_message(act, norm_px(*x, w), norm_px(*y, h), w, h, pressure, buttons)
    }
    InputMsg::Scroll { x, y, dx, dy } => {
      scroll_message(norm_px(*x, w), norm_px(*y, h), w, h, *dx, *dy)
    }
    InputMsg::Text { text } => text_message(text),
    InputMsg::Key { keycode } => {
      // valid Android keycode range; sent as a down/up pair
      let kc = (*keycode).clamp(0, 1000);
      let mut m = keycode_message(0, kc);
      m.extend_from_slice(&keycode_message(1, kc));
      m
    }
  }
}

#[tauri::command]
pub async fn mirror_input(serial: String, msg: InputMsg) -> Result<(), String> {
  let session = {
    let map = sessions().lock().unwrap();
    map.get(&serial).cloned()
  };
  let session = session.ok_or("no active mirror session for this device")?;
  let payload = build_input(&msg, session.device_w, session.device_h);
  let mut stream = session.control.lock().await;
  stream
    .write_all(&payload)
    .await
    .map_err(|e| format!("failed to send input: {e}"))
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn serials_are_bounded() {
    assert!(serial_ok("emulator-5554"));
    assert!(serial_ok("192.168.1.10:5555"));
    assert!(serial_ok("R58M12ABCDE"));
    assert!(!serial_ok("bad serial; rm -rf"));
    assert!(!serial_ok(""));
    assert!(!serial_ok(&"x".repeat(200)));
  }

  #[test]
  fn touch_message_is_fixed_layout() {
    let m = touch_message(0, 100, 200, 1080, 1920, 0xffff, 1);
    assert_eq!(m.len(), 32);
    assert_eq!(m[0], 2); // type
    assert_eq!(m[1], 0); // down
  }

  #[test]
  fn input_scales_normalized_coords() {
    let m = build_input(&InputMsg::Touch { action: "down".into(), x: 0.5, y: 0.25 }, 1000, 2000);
    // x = 500, y = 500 packed big-endian after type+action+pointerId(8)
    let x = i32::from_be_bytes([m[10], m[11], m[12], m[13]]);
    let y = i32::from_be_bytes([m[14], m[15], m[16], m[17]]);
    assert_eq!(x, 500);
    assert_eq!(y, 500);
  }

  #[test]
  fn text_is_length_prefixed_and_capped() {
    let m = text_message(&"a".repeat(5000));
    let len = u32::from_be_bytes([m[1], m[2], m[3], m[4]]) as usize;
    assert_eq!(len, 2000);
    assert_eq!(m.len(), 5 + 2000);
  }

  #[test]
  fn key_sends_down_then_up() {
    let m = build_input(&InputMsg::Key { keycode: 4 }, 1080, 1920);
    assert_eq!(m.len(), 28); // two 14-byte keycode messages
    assert_eq!(m[0], 0); // type keycode
    assert_eq!(m[1], 0); // down
    assert_eq!(m[15], 1); // up action on the second message
  }
}
