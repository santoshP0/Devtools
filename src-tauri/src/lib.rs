use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

// Native work-timer tray indicator. Tray + taskbar progress are desktop-only, so
// on mobile targets we compile no-op commands to keep the shared handler list valid.
#[cfg(desktop)]
mod timer;
#[cfg(not(desktop))]
mod timer {
  #[tauri::command] pub fn timer_start(_target_min: Option<u32>) {}
  #[tauri::command] pub fn timer_pause() {}
  #[tauri::command] pub fn timer_resume() {}
  #[tauri::command] pub fn timer_reset() {}
  #[tauri::command] pub fn timer_restore(_running: bool, _elapsed_ms: u64, _target_min: Option<u32>) {}
  #[tauri::command] pub fn timer_get() -> serde_json::Value {
    serde_json::json!({ "active": false, "running": false, "elapsedMs": 0, "targetMin": null })
  }
}

// Resolve the ffmpeg binary. We ship ffmpeg as a Tauri sidecar (externalBin),
// so it lives right next to the app executable — check there first so the user
// never has to install anything. Then fall back to common system locations
// (a GUI app launched from Finder/Dock does NOT inherit the shell PATH, so a
// bare "ffmpeg" fails even when installed), and finally a plain PATH lookup.
pub(crate) fn ffmpeg_program() -> String {
  // 1. bundled sidecar shipped with the app
  if let Ok(exe) = std::env::current_exe() {
    if let Some(dir) = exe.parent() {
      let bundled = dir.join(if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" });
      if bundled.is_file() {
        return bundled.to_string_lossy().into_owned();
      }
    }
  }

  // 2. common system install locations
  #[cfg(not(windows))]
  const CANDIDATES: &[&str] = &[
    "/opt/homebrew/bin/ffmpeg", // Apple Silicon Homebrew
    "/usr/local/bin/ffmpeg",    // Intel Homebrew
    "/opt/local/bin/ffmpeg",    // MacPorts
    "/usr/bin/ffmpeg",
    "/bin/ffmpeg",
    "/snap/bin/ffmpeg",         // Linux snap
  ];
  #[cfg(windows)]
  const CANDIDATES: &[&str] = &[
    r"C:\ffmpeg\bin\ffmpeg.exe",
    r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
  ];
  for c in CANDIDATES {
    if Path::new(c).is_file() {
      return (*c).to_string();
    }
  }
  "ffmpeg".to_string()
}

// Hide the console window that would flash on Windows for each ffmpeg spawn
fn ffmpeg_cmd() -> Command {
  let mut cmd = Command::new(ffmpeg_program());
  // Also widen PATH so a bare "ffmpeg" fallback can still be found in a GUI
  // launch where the inherited PATH is minimal.
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

#[derive(Serialize)]
pub struct FfmpegInfo {
  available: bool,
  version: String,
}

#[tauri::command]
fn ffmpeg_check() -> FfmpegInfo {
  match ffmpeg_cmd().arg("-version").output() {
    Ok(o) if o.status.success() => FfmpegInfo {
      available: true,
      version: String::from_utf8_lossy(&o.stdout)
        .lines()
        .next()
        .unwrap_or("")
        .to_string(),
    },
    _ => FfmpegInfo { available: false, version: String::new() },
  }
}

#[derive(Serialize)]
pub struct CompressResult {
  ok: bool,
  log: String,
  in_size: u64,
  out_size: u64,
  // Small GIF results are returned inline as base64 so the UI can preview them
  // via a data: URL — no asset protocol / broad filesystem scope needed.
  preview_b64: Option<String>,
}

// Cap inline preview payloads so IPC/memory stays sane
const PREVIEW_CAP: u64 = 25 * 1024 * 1024;

const MEDIA_EXTS: &[&str] = &[
  "jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "avif",
  "mp4", "mov", "mkv", "webm", "avi", "m4v",
];

fn ext_of(path: &str) -> Option<String> {
  Path::new(path).extension().map(|e| e.to_string_lossy().to_ascii_lowercase())
}

fn media_ext_ok(path: &str) -> bool {
  ext_of(path).map(|e| MEDIA_EXTS.contains(&e.as_str())).unwrap_or(false)
}

// Structured, bounded options. The webview never sends raw ffmpeg args —
// every flag below is built here in Rust, so there is no arg-injection or
// parser-differential surface. Numbers are clamped; enums are matched to
// fixed sets and anything unknown falls through to a safe default.
#[derive(Deserialize)]
#[serde(tag = "kind")]
enum Opts {
  #[serde(rename = "image")]
  Image {
    format: String,       // jpg | jpeg | png | webp | gif | bmp | tiff | avif
    quality: u32,         // 40..=100
    width: Option<u32>,   // max width, 1..=20000
    gif_fps: Option<u32>, // 1..=60
  },
  #[serde(rename = "video")]
  Video {
    codec: String,        // libx264 | libx265 | libvpx-vp9
    crf: u32,             // 0..=51
    preset: String,       // fast | medium | slow
    height: Option<u32>,  // max height, 1..=20000
    fps: Option<u32>,     // 1..=240
    audio: String,        // 64k | 96k | 128k | none
  },
  #[serde(rename = "video_gif")]
  VideoGif {
    fps: u32,             // 5..=30
    width: Option<u32>,   // max width, 1..=20000
    start: f64,           // trim start, seconds
    duration: f64,        // clip length, 0.1..=60 s
    quality: u32,         // 40..=100 -> palette color count
  },
}

#[derive(Deserialize)]
struct CompressReq {
  input: String,
  output: String,
  strip_metadata: bool,
  #[serde(flatten)]
  opts: Opts,
}

fn clamp(v: u32, lo: u32, hi: u32) -> u32 {
  v.max(lo).min(hi)
}

fn dim(v: Option<u32>) -> Option<u32> {
  v.map(|n| clamp(n, 1, 20000))
}

fn build_args(opts: &Opts, out_ext: &str, strip: bool) -> Vec<String> {
  let mut a: Vec<String> = Vec::new();
  match opts {
    Opts::Image { format, quality, width, gif_fps } => {
      let q = clamp(*quality, 40, 100);
      let mut filters: Vec<String> = Vec::new();
      if let Some(w) = dim(*width) {
        filters.push(format!("scale='min({w},iw)':-2"));
      }
      if format == "gif" || out_ext == "gif" {
        if let Some(f) = gif_fps {
          filters.insert(0, format!("fps={}", clamp(*f, 1, 60)));
        }
        let colors = 64 + ((q - 40) * 192 / 60); // 40->64, 100->256
        let chain = if filters.is_empty() { String::new() } else { format!("{},", filters.join(",")) };
        a.push("-filter_complex".into());
        a.push(format!(
          "[0:v]{chain}split[a][b];[a]palettegen=max_colors={colors}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle"
        ));
      } else {
        if !filters.is_empty() {
          a.push("-vf".into());
          a.push(filters.join(","));
        }
        match out_ext {
          "jpg" | "jpeg" => { a.push("-q:v".into()); a.push((31 - (q * 29 / 100)).to_string()); }
          "webp" => { a.push("-quality".into()); a.push(q.to_string()); }
          "png" => { a.push("-compression_level".into()); a.push("9".into()); }
          _ => {}
        }
      }
    }
    Opts::Video { codec, crf, preset, height, fps, audio } => {
      let vp9 = out_ext == "webm";
      let vcodec = if vp9 { "libvpx-vp9" }
        else if codec == "libx265" { "libx265" }
        else { "libx264" };
      a.push("-c:v".into()); a.push(vcodec.into());
      a.push("-crf".into()); a.push(clamp(*crf, 0, 51).to_string());

      let mut filters: Vec<String> = Vec::new();
      if let Some(h) = dim(*height) {
        filters.push(format!("scale=-2:'min({h},ih)'"));
      }
      if let Some(f) = fps {
        filters.push(format!("fps={}", clamp(*f, 1, 240)));
      }
      if !filters.is_empty() {
        a.push("-vf".into());
        a.push(filters.join(","));
      }
      if vp9 {
        a.push("-b:v".into()); a.push("0".into());
      } else {
        let p = match preset.as_str() { "fast" | "slow" => preset.as_str(), _ => "medium" };
        a.push("-preset".into()); a.push(p.into());
        a.push("-movflags".into()); a.push("+faststart".into());
      }
      match audio.as_str() {
        "none" => { a.push("-an".into()); }
        br @ ("64k" | "96k" | "128k") => {
          a.push("-c:a".into()); a.push(if vp9 { "libopus" } else { "aac" }.into());
          a.push("-b:a".into()); a.push(br.into());
        }
        _ => { a.push("-c:a".into()); a.push(if vp9 { "libopus" } else { "aac" }.into()); a.push("-b:a".into()); a.push("128k".into()); }
      }
    }
    Opts::VideoGif { fps, width, start, duration, quality } => {
      // sanitize NaN/Inf before they reach ffmpeg args
      let start = if start.is_finite() { start.max(0.0) } else { 0.0 };
      let duration = if duration.is_finite() { duration.clamp(0.1, 60.0) } else { 5.0 };
      // trim (output-side seek = frame-accurate for short clips)
      if start > 0.0 {
        a.push("-ss".into());
        a.push(format!("{:.3}", start));
      }
      a.push("-t".into());
      a.push(format!("{:.3}", duration));

      let f = clamp(*fps, 5, 30);
      let q = clamp(*quality, 40, 100);
      let colors = 64 + ((q - 40) * 192 / 60); // 40->64, 100->256
      let mut filters = vec![format!("fps={f}")];
      if let Some(w) = dim(*width) {
        filters.push(format!("scale='min({w},iw)':-2:flags=lanczos"));
      }
      let chain = filters.join(",");
      a.push("-filter_complex".into());
      a.push(format!(
        "[0:v]{chain},split[a][b];[a]palettegen=max_colors={colors}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle"
      ));
      a.push("-loop".into());
      a.push("0".into()); // loop forever
    }
  }
  if strip {
    a.push("-map_metadata".into());
    a.push("-1".into());
  }
  a
}

/// Compress a user-picked local media file. All ffmpeg flags are constructed
/// in Rust from bounded options — the webview cannot inject flags, read other
/// files (`-i`), or use protocols. Paths must be real media files and the
/// output directory must already exist (blocks writing to arbitrary/new
/// locations if the IPC boundary is ever reached without the native dialog).
#[tauri::command]
async fn ffmpeg_compress(req: CompressReq) -> Result<CompressResult, String> {
  if !media_ext_ok(&req.input) || !media_ext_ok(&req.output) {
    return Err("input and output must be media files".into());
  }
  let in_path = Path::new(&req.input);
  if !in_path.is_file() {
    return Err("input file not found".into());
  }
  let out_parent = Path::new(&req.output).parent().ok_or("invalid output path")?;
  if !out_parent.is_dir() {
    return Err("output directory does not exist".into());
  }
  let out_ext = ext_of(&req.output).unwrap_or_default();
  let args = build_args(&req.opts, &out_ext, req.strip_metadata);

  let out = ffmpeg_cmd()
    .arg("-y")
    .arg("-i")
    .arg(&req.input)
    .args(&args)
    .arg(&req.output)
    .output()
    .map_err(|e| format!("failed to run ffmpeg: {e}"))?;

  let stderr = String::from_utf8_lossy(&out.stderr);
  let log: String = stderr
    .chars()
    .skip(stderr.chars().count().saturating_sub(2000))
    .collect();

  let ok = out.status.success();
  let out_size = std::fs::metadata(&req.output).map(|m| m.len()).unwrap_or(0);

  // Inline preview for small GIFs only — bounded to the file we just produced
  let preview_b64 = if ok && out_ext == "gif" && out_size > 0 && out_size <= PREVIEW_CAP {
    std::fs::read(&req.output).ok().map(|bytes| {
      use base64::Engine;
      base64::engine::general_purpose::STANDARD.encode(bytes)
    })
  } else {
    None
  };

  Ok(CompressResult {
    ok,
    log,
    in_size: std::fs::metadata(&req.input).map(|m| m.len()).unwrap_or(0),
    out_size,
    preview_b64,
  })
}

/// Build a horizontal filmstrip (N evenly-spaced frames tiled into one image)
/// for a clip, returned as a data: URL for the timeline block background.
/// Native ffmpeg does the decode+tile in one pass — far cheaper than seeking a
/// hidden <video> N times in the webview.
#[tauri::command]
async fn ffmpeg_filmstrip(src: String, count: u32, duration: f64) -> Result<String, String> {
  if !media_ext_ok(&src) || !Path::new(&src).is_file() {
    return Err("not a media file".into());
  }
  let n = count.clamp(4, 40);
  let dur = if duration.is_finite() && duration > 0.1 { duration } else { 5.0 };
  let fps = (n as f64 / dur).clamp(0.1, 60.0);
  let nanos = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
  let tmp = std::env::temp_dir().join(format!("dt_strip_{}_{}.jpg", std::process::id(), nanos));

  let out = ffmpeg_cmd()
    .arg("-y")
    .arg("-i").arg(&src)
    .arg("-vf").arg(format!("fps={:.4},scale=-2:68,tile={n}x1", fps))
    .arg("-frames:v").arg("1")
    .arg("-q:v").arg("4")
    .arg(&tmp)
    .output()
    .map_err(|e| format!("failed to run ffmpeg: {e}"))?;

  if !out.status.success() {
    let _ = std::fs::remove_file(&tmp);
    return Err("could not build filmstrip".into());
  }
  let bytes = std::fs::read(&tmp).map_err(|e| e.to_string())?;
  let _ = std::fs::remove_file(&tmp);
  use base64::Engine;
  Ok(format!("data:image/jpeg;base64,{}", base64::engine::general_purpose::STANDARD.encode(bytes)))
}

// ── Native HTTP client (CORS-free) ─────────────────────────────────────────
// The browser REST Client is capped by CORS. On desktop we send the request
// natively via reqwest, so any endpoint / header works. Fully user-driven,
// like curl/Postman — structured input, no shell.
#[derive(Deserialize)]
struct HttpReq {
  method: String,
  url: String,
  headers: Vec<(String, String)>,
  body: Option<String>,
}

#[derive(Serialize)]
struct HttpRes {
  status: u16,
  status_text: String,
  headers: Vec<(String, String)>,
  body: String,
  time_ms: u64,
  size: u64,
}

// Reject responses larger than this to avoid OOM on hostile/huge endpoints
const MAX_RESPONSE: usize = 50 * 1024 * 1024;

#[tauri::command]
async fn http_request(req: HttpReq) -> Result<HttpRes, String> {
  // Only http(s) — reqwest rejects other schemes, but fail early and clearly
  if !(req.url.starts_with("http://") || req.url.starts_with("https://")) {
    return Err("only http and https URLs are allowed".into());
  }
  let method = reqwest::Method::from_bytes(req.method.as_bytes())
    .map_err(|_| "invalid HTTP method".to_string())?;
  let client = reqwest::Client::builder()
    .user_agent("DevToolbox")
    .timeout(std::time::Duration::from_secs(60))
    .build()
    .map_err(|e| e.to_string())?;
  let mut rb = client.request(method, &req.url);
  for (k, v) in &req.headers {
    rb = rb.header(k, v);
  }
  if let Some(b) = req.body {
    rb = rb.body(b);
  }
  let t0 = std::time::Instant::now();
  let mut resp = rb.send().await.map_err(|e| e.to_string())?;
  let status = resp.status();
  let status_text = status.canonical_reason().unwrap_or("").to_string();
  let headers: Vec<(String, String)> = resp
    .headers()
    .iter()
    .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
    .collect();

  // Stream the body with a hard cap instead of buffering it all unbounded
  let mut buf: Vec<u8> = Vec::new();
  while let Some(chunk) = resp.chunk().await.map_err(|e| e.to_string())? {
    if buf.len() + chunk.len() > MAX_RESPONSE {
      buf.extend_from_slice(&chunk[..MAX_RESPONSE - buf.len()]);
      break;
    }
    buf.extend_from_slice(&chunk);
  }

  Ok(HttpRes {
    status: status.as_u16(),
    status_text,
    headers,
    size: buf.len() as u64,
    body: String::from_utf8_lossy(&buf).to_string(),
    time_ms: t0.elapsed().as_millis() as u64,
  })
}

// ── Video editor: composite a bounded timeline into one video ───────────────
// Same trust boundary as ffmpeg_compress: the webview sends a *typed* timeline
// (≤10 layers, numbers + enum kinds), never raw ffmpeg/filtergraph strings. The
// whole filter_complex is built here, all coordinates/sizes/times are clamped,
// colors collapse to hex, and text is passed via a temp `textfile=` so nothing
// a user types can reach the argument list.
#[derive(Deserialize)]
#[serde(tag = "kind")]
enum EItem {
  #[serde(rename = "video")]
  Video { src: String, in_point: f64, t_start: f64, t_end: f64, x: f64, y: f64, w: f64, h: f64, opacity: f64, volume: f64, mute: bool },
  // detached audio — same media file, contributes only to the audio mix
  #[serde(rename = "audio")]
  Audio { src: String, in_point: f64, t_start: f64, t_end: f64, volume: f64 },
  #[serde(rename = "image")]
  Image { src: String, t_start: f64, t_end: f64, x: f64, y: f64, w: f64, h: f64, opacity: f64 },
  #[serde(rename = "text")]
  Text { text: String, t_start: f64, t_end: f64, x: f64, y: f64, size: f64, color: String, opacity: f64 },
  #[serde(rename = "box")]
  Box { t_start: f64, t_end: f64, x: f64, y: f64, w: f64, h: f64, color: String, opacity: f64 },
  // circle / line / arrow — rasterized to a PNG in the webview, overlaid like an image
  #[serde(rename = "shape")]
  Shape { png: String, t_start: f64, t_end: f64, x: f64, y: f64, w: f64, h: f64, opacity: f64 },
  #[serde(rename = "blur")]
  Blur { t_start: f64, t_end: f64, x: f64, y: f64, w: f64, h: f64, strength: f64 },
}

#[derive(Deserialize)]
struct RenderSpec {
  width: u32,
  height: u32,
  fps: u32,
  duration: f64,
  bg: String,
  output: String,
  items: Vec<EItem>,
}

// Reduce anything to a safe 0xRRGGBB — keep only hex digits, take the first six.
fn color_hex(s: &str) -> String {
  let h: String = s.chars().filter(|c| c.is_ascii_hexdigit()).collect();
  if h.len() >= 6 { format!("0x{}", &h[..6].to_ascii_uppercase()) } else { "0xFFFFFF".into() }
}

fn op01(v: f64) -> f64 { if v.is_finite() { v.clamp(0.0, 1.0) } else { 1.0 } }

// hex color with optional alpha suffix (ffmpeg accepts 0xRRGGBB@a)
fn color_a(s: &str, op: f64) -> String {
  let c = color_hex(s);
  if op < 0.999 { format!("{c}@{:.3}", op01(op)) } else { c }
}

// filter fragment that applies layer opacity to an overlay input (empty if opaque)
fn opacity_frag(op: f64) -> String {
  if op < 0.999 { format!(",format=rgba,colorchannelmixer=aa={:.3}", op01(op)) } else { String::new() }
}

// Escape a filesystem path for use inside a filtergraph option value.
fn esc_path(p: &str) -> String {
  p.replace('\\', "\\\\").replace(':', "\\:").replace('\'', "\\'")
}

fn default_font() -> &'static str {
  #[cfg(target_os = "macos")]   { "/System/Library/Fonts/Helvetica.ttc" }
  #[cfg(target_os = "windows")] { "C:\\Windows\\Fonts\\arial.ttf" }
  #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
  { "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf" }
}

fn evn(v: i64) -> i64 { let v = v.max(2); v - (v % 2) }

// normalized 0..1 -> pixels on a `total`-px axis
fn pxi(norm: f64, total: u32) -> i64 {
  let n = if norm.is_finite() { norm.clamp(0.0, 1.0) } else { 0.0 };
  (n * total as f64).round() as i64
}

fn time_pair(a: f64, b: f64, dur: f64) -> (f64, f64) {
  let a = if a.is_finite() { a.clamp(0.0, dur) } else { 0.0 };
  let b = if b.is_finite() { b.clamp(0.0, dur) } else { dur };
  if b > a + 0.02 { (a, b) } else { (a, (a + 0.1).min(dur)) }
}

// Does this file have an audio stream? Avoids referencing [k:a] for a silent
// clip, which would abort the whole render. One cheap probe per video (≤10).
fn has_audio_stream(src: &str) -> bool {
  ffmpeg_cmd().arg("-hide_banner").arg("-i").arg(src).output()
    .map(|o| String::from_utf8_lossy(&o.stderr).contains("Audio:"))
    .unwrap_or(false)
}

// Is a given encoder compiled into this ffmpeg build?
fn has_encoder(name: &str) -> bool {
  ffmpeg_cmd().arg("-hide_banner").arg("-encoders").output()
    .map(|o| String::from_utf8_lossy(&o.stdout).contains(name))
    .unwrap_or(false)
}

// Pick the fastest available H.264 encoder. macOS VideoToolbox is GPU-backed and
// several times faster than software x264; fall back to libx264 everywhere else
// (and if the build lacks VideoToolbox). Returns (codec, rate-control args).
fn pick_encoder(w: u32, h: u32, fps: u32) -> (&'static str, Vec<String>) {
  if cfg!(target_os = "macos") && has_encoder("h264_videotoolbox") {
    // ~0.1 bit per pixel·frame — a sane visually-lossless-ish target
    let kbps = ((w as u64 * h as u64 * fps as u64) as f64 * 0.1 / 1000.0) as u64;
    let kbps = kbps.clamp(1500, 60000);
    return ("h264_videotoolbox", vec![
      "-b:v".into(), format!("{kbps}k"),
      "-allow_sw".into(), "1".into(),   // fall back to software if the GPU is busy
    ]);
  }
  ("libx264", vec![
    "-preset".into(), "veryfast".into(),
    "-crf".into(), "20".into(),
    "-threads".into(), "0".into(),      // use every core
  ])
}

fn build_render(spec: &RenderSpec) -> Result<(Vec<String>, Vec<std::path::PathBuf>), String> {
  if spec.items.is_empty() { return Err("timeline is empty".into()); }
  if spec.items.len() > 10 { return Err("too many layers (max 10)".into()); }
  let w = clamp(spec.width, 16, 7680);
  let h = clamp(spec.height, 16, 4320);
  let fps = clamp(spec.fps, 1, 60);
  let dur = if spec.duration.is_finite() { spec.duration.clamp(0.1, 3600.0) } else { 10.0 };
  let bg = color_hex(&spec.bg);
  let font = esc_path(default_font());

  // input 0 = a solid background the exact size/length of the timeline
  let mut inputs: Vec<String> = vec![
    "-f".into(), "lavfi".into(),
    "-i".into(), format!("color=c={bg}:s={w}x{h}:r={fps}:d={:.3}", dur),
  ];
  // map each item to its real media input index (None for drawn layers)
  let mut in_idx: Vec<Option<usize>> = Vec::with_capacity(spec.items.len());
  let mut next = 1usize;
  let mut temps: Vec<std::path::PathBuf> = Vec::new();
  for it in &spec.items {
    match it {
      EItem::Video { src, .. } => {
        if !media_ext_ok(src) || !Path::new(src).is_file() { return Err("a clip file is missing".into()); }
        inputs.push("-i".into()); inputs.push(src.clone());
        in_idx.push(Some(next)); next += 1;
      }
      EItem::Audio { src, .. } => {
        if !media_ext_ok(src) || !Path::new(src).is_file() { return Err("an audio file is missing".into()); }
        inputs.push("-i".into()); inputs.push(src.clone());
        in_idx.push(Some(next)); next += 1;
      }
      EItem::Image { src, .. } => {
        if !media_ext_ok(src) || !Path::new(src).is_file() { return Err("an image file is missing".into()); }
        inputs.push("-loop".into()); inputs.push("1".into());
        inputs.push("-i".into()); inputs.push(src.clone());
        in_idx.push(Some(next)); next += 1;
      }
      EItem::Shape { png, .. } => {
        use base64::Engine;
        let bytes = base64::engine::general_purpose::STANDARD.decode(png).map_err(|_| "bad shape image".to_string())?;
        let nanos = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
        let tp = std::env::temp_dir().join(format!("dt_shape_{}_{next}_{nanos}.png", std::process::id()));
        std::fs::write(&tp, &bytes).map_err(|e| format!("could not stage shape: {e}"))?;
        inputs.push("-loop".into()); inputs.push("1".into());
        inputs.push("-i".into()); inputs.push(tp.to_string_lossy().into_owned());
        temps.push(tp);
        in_idx.push(Some(next)); next += 1;
      }
      _ => in_idx.push(None),
    }
  }

  let mut fc: Vec<String> = Vec::new();
  let mut acc = "0:v".to_string(); // current composite label
  let mut audio: Vec<String> = Vec::new();

  for (i, it) in spec.items.iter().enumerate() {
    let out = format!("s{i}");
    match it {
      EItem::Video { in_point, t_start, t_end, x, y, w: iw, h: ih, opacity, volume, mute, src } => {
        let k = in_idx[i].unwrap();
        let (ts, te) = time_pair(*t_start, *t_end, dur);
        let len = (te - ts).max(0.05);
        let inp = if in_point.is_finite() { in_point.max(0.0) } else { 0.0 };
        let pw = evn(pxi(*iw, w));
        let ph = evn(pxi(*ih, h));
        let ox = pxi(*x, w); let oy = pxi(*y, h);
        fc.push(format!(
          "[{k}:v]trim=start={:.3}:duration={:.3},setpts=PTS-STARTPTS+{:.3}/TB,scale={pw}:{ph}{}[v{i}]",
          inp, len, ts, opacity_frag(*opacity)));
        fc.push(format!(
          "[{acc}][v{i}]overlay=x={ox}:y={oy}:enable='between(t,{:.3},{:.3})'[{out}]",
          ts, te));
        acc = out;
        if !mute && has_audio_stream(src) {
          let ms = (ts * 1000.0).round() as i64;
          let vol = if volume.is_finite() { volume.clamp(0.0, 4.0) } else { 1.0 };
          fc.push(format!(
            "[{k}:a]atrim=start={:.3}:duration={:.3},asetpts=PTS-STARTPTS,volume={:.3},adelay={ms}:all=1[a{i}]",
            inp, len, vol));
          audio.push(format!("a{i}"));
        }
      }
      EItem::Audio { in_point, t_start, t_end, volume, src } => {
        let k = in_idx[i].unwrap();
        let (ts, te) = time_pair(*t_start, *t_end, dur);
        let len = (te - ts).max(0.05);
        let inp = if in_point.is_finite() { in_point.max(0.0) } else { 0.0 };
        if has_audio_stream(src) {
          let ms = (ts * 1000.0).round() as i64;
          let vol = if volume.is_finite() { volume.clamp(0.0, 4.0) } else { 1.0 };
          fc.push(format!(
            "[{k}:a]atrim=start={:.3}:duration={:.3},asetpts=PTS-STARTPTS,volume={:.3},adelay={ms}:all=1[a{i}]",
            inp, len, vol));
          audio.push(format!("a{i}"));
        }
      }
      EItem::Image { t_start, t_end, x, y, w: iw, h: ih, opacity, .. } => {
        let k = in_idx[i].unwrap();
        let (ts, te) = time_pair(*t_start, *t_end, dur);
        let pw = evn(pxi(*iw, w));
        let ph = evn(pxi(*ih, h));
        let ox = pxi(*x, w); let oy = pxi(*y, h);
        fc.push(format!("[{k}:v]scale={pw}:{ph},setpts=PTS-STARTPTS{}[img{i}]", opacity_frag(*opacity)));
        fc.push(format!(
          "[{acc}][img{i}]overlay=x={ox}:y={oy}:enable='between(t,{:.3},{:.3})'[{out}]",
          ts, te));
        acc = out;
      }
      EItem::Shape { t_start, t_end, x, y, w: iw, h: ih, opacity, .. } => {
        let k = in_idx[i].unwrap();
        let (ts, te) = time_pair(*t_start, *t_end, dur);
        let pw = evn(pxi(*iw, w));
        let ph = evn(pxi(*ih, h));
        let ox = pxi(*x, w); let oy = pxi(*y, h);
        fc.push(format!("[{k}:v]scale={pw}:{ph},setpts=PTS-STARTPTS{}[shp{i}]", opacity_frag(*opacity)));
        fc.push(format!(
          "[{acc}][shp{i}]overlay=x={ox}:y={oy}:enable='between(t,{:.3},{:.3})'[{out}]",
          ts, te));
        acc = out;
      }
      EItem::Box { t_start, t_end, x, y, w: iw, h: ih, color, opacity } => {
        let (ts, te) = time_pair(*t_start, *t_end, dur);
        let bw = pxi(*iw, w).max(1); let bh = pxi(*ih, h).max(1);
        let ox = pxi(*x, w); let oy = pxi(*y, h);
        let c = color_a(color, *opacity);
        fc.push(format!(
          "[{acc}]drawbox=x={ox}:y={oy}:w={bw}:h={bh}:color={c}:t=fill:enable='between(t,{:.3},{:.3})'[{out}]",
          ts, te));
        acc = out;
      }
      EItem::Blur { t_start, t_end, x, y, w: iw, h: ih, strength } => {
        let (ts, te) = time_pair(*t_start, *t_end, dur);
        let bw = evn(pxi(*iw, w));
        let bh = evn(pxi(*ih, h));
        // crop must stay fully inside the frame or ffmpeg aborts
        let ox = pxi(*x, w).clamp(0, (w as i64 - bw).max(0));
        let oy = pxi(*y, h).clamp(0, (h as i64 - bh).max(0));
        let s = if strength.is_finite() { (*strength as i64).clamp(1, 50) } else { 12 };
        fc.push(format!("[{acc}]split[bm{i}][bs{i}]"));
        fc.push(format!("[bs{i}]crop=w={bw}:h={bh}:x={ox}:y={oy},boxblur={s}:1[bd{i}]"));
        fc.push(format!(
          "[bm{i}][bd{i}]overlay=x={ox}:y={oy}:enable='between(t,{:.3},{:.3})'[{out}]",
          ts, te));
        acc = out;
      }
      EItem::Text { text, t_start, t_end, x, y, size, color, opacity } => {
        let (ts, te) = time_pair(*t_start, *t_end, dur);
        let ox = pxi(*x, w); let oy = pxi(*y, h);
        let fs = if size.is_finite() { (*size as i64).clamp(8, 400) } else { 32 };
        let c = color_a(color, *opacity);
        let tf = std::env::temp_dir().join(format!("dt_txt_{}_{i}.txt", std::process::id()));
        std::fs::write(&tf, text).map_err(|e| format!("could not stage text: {e}"))?;
        let tfp = esc_path(&tf.to_string_lossy());
        temps.push(tf);
        fc.push(format!(
          "[{acc}]drawtext=fontfile={font}:textfile={tfp}:x={ox}:y={oy}:fontsize={fs}:fontcolor={c}:enable='between(t,{:.3},{:.3})'[{out}]",
          ts, te));
        acc = out;
      }
    }
  }

  fc.push(format!("[{acc}]format=yuv420p[vout]"));

  let mut filter = fc.join(";");
  let has_audio = !audio.is_empty();
  if has_audio {
    if audio.len() == 1 {
      filter.push_str(&format!(";[{}]aresample=async=1[aout]", audio[0]));
    } else {
      let ins: String = audio.iter().map(|a| format!("[{a}]")).collect();
      filter.push_str(&format!(";{ins}amix=inputs={}:dropout_transition=0:normalize=0[aout]", audio.len()));
    }
  }

  let mut args = inputs;
  args.push("-filter_complex".into());
  args.push(filter);
  args.push("-map".into()); args.push("[vout]".into());
  if has_audio { args.push("-map".into()); args.push("[aout]".into()); }
  args.push("-t".into()); args.push(format!("{:.3}", dur));
  args.push("-r".into()); args.push(fps.to_string());
  let (vcodec, rate) = pick_encoder(w, h, fps);
  args.push("-c:v".into()); args.push(vcodec.into());
  args.extend(rate);
  args.push("-pix_fmt".into()); args.push("yuv420p".into());
  args.push("-movflags".into()); args.push("+faststart".into());
  if has_audio {
    args.push("-c:a".into()); args.push("aac".into());
    args.push("-b:a".into()); args.push("192k".into());
  }
  Ok((args, temps))
}

/// Render an editor timeline into a single video file. Flags/filtergraph are
/// built entirely in Rust from the bounded spec — the webview cannot inject
/// filters, extra inputs, or protocols.
#[tauri::command]
async fn ffmpeg_render(spec: RenderSpec) -> Result<CompressResult, String> {
  let out_ext = ext_of(&spec.output).unwrap_or_default();
  if !matches!(out_ext.as_str(), "mp4" | "mov" | "mkv") {
    return Err("output must be .mp4, .mov or .mkv".into());
  }
  let out_parent = Path::new(&spec.output).parent().ok_or("invalid output path")?;
  if !out_parent.is_dir() {
    return Err("output directory does not exist".into());
  }
  let (args, temps) = build_render(&spec)?;

  let out = ffmpeg_cmd()
    .arg("-y")
    .args(&args)
    .arg(&spec.output)
    .output()
    .map_err(|e| format!("failed to run ffmpeg: {e}"))?;

  for t in &temps { let _ = std::fs::remove_file(t); }

  let stderr = String::from_utf8_lossy(&out.stderr);
  let log: String = stderr.chars().skip(stderr.chars().count().saturating_sub(3000)).collect();
  Ok(CompressResult {
    ok: out.status.success(),
    log,
    in_size: 0,
    out_size: std::fs::metadata(&spec.output).map(|m| m.len()).unwrap_or(0),
    preview_b64: None,
  })
}

// ── Log parsing (desktop) ───────────────────────────────────────────────────
// Native port of the JS log parser so huge (100 MB+) production logs are read
// and parsed off the UI thread instead of freezing the webview. Output matches
// the in-app parser field-for-field (serde_json preserve_order keeps JSON key
// order; camelCase rename keeps the LogLine shape the React list expects).
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct LogLine {
  raw: String,
  level: String,
  display_level: String,
  time: String,
  source: String,
  msg: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  log_prefix: Option<String>,
  is_json: bool,
  is_stack: bool,
}

fn log_canonicalize(l: &str) -> String {
  match l { "WARNING" => "WARN", "FATAL" | "CRITICAL" => "ERROR", "VERBOSE" => "TRACE", "LOG" => "INFO", o => o }.to_string()
}
fn log_is_known_level(l: &str) -> bool {
  matches!(l, "ERROR" | "FATAL" | "CRITICAL" | "WARN" | "WARNING" | "INFO" | "LOG" | "DEBUG" | "VERBOSE" | "TRACE")
}
fn log_detect_level(text: &str) -> String {
  let up = text.to_uppercase();
  for l in ["CRITICAL", "FATAL", "ERROR", "WARNING", "WARN", "INFO", "VERBOSE", "DEBUG", "TRACE", "LOG"] {
    if up.contains(l) { return l.to_string(); }
  }
  String::new()
}
fn log_line_depth(line: &str) -> i32 {
  let (mut d, mut in_str, mut esc) = (0i32, false, false);
  for ch in line.chars() {
    if esc { esc = false; continue; }
    if ch == '\\' { esc = true; continue; }
    if ch == '"' { in_str = !in_str; continue; }
    if in_str { continue; }
    if ch == '{' || ch == '[' { d += 1; } else if ch == '}' || ch == ']' { d -= 1; }
  }
  d
}
// group balanced multi-line brace/bracket blocks into one chunk (mirrors chunkRawInput)
fn log_chunk_raw(raw: &str) -> Vec<String> {
  let mut chunks: Vec<String> = Vec::new();
  let mut depth = 0i32;
  let mut buffer: Vec<&str> = Vec::new();
  for line in raw.split('\n') {
    let t = line.trim();
    if t.is_empty() { continue; }
    if depth == 0 {
      let d = log_line_depth(t);
      if d > 0 { buffer = vec![line]; depth = d; }
      else { chunks.push(line.to_string()); }
    } else {
      buffer.push(line);
      depth += log_line_depth(line);
      if depth <= 0 { depth = 0; chunks.push(buffer.join("\n")); buffer.clear(); }
    }
  }
  if !buffer.is_empty() { chunks.push(buffer.join("\n")); }
  chunks
}
// serde_json value → string field (first present, non-null key)
fn log_get(v: &serde_json::Value, keys: &[&str]) -> String {
  for k in keys {
    if let Some(x) = v.get(*k) {
      if x.is_null() { continue; }
      return match x.as_str() { Some(s) => s.to_string(), None => x.to_string() };
    }
  }
  String::new()
}

// compile the format regexes once (regex crate has no lookaround, so the bare
// level token consumes its trailing space instead of the JS lookahead — the
// following `\s*` swallows the rest identically).
fn log_res() -> &'static [regex::Regex; 8] {
  static RES: std::sync::OnceLock<[regex::Regex; 8]> = std::sync::OnceLock::new();
  RES.get_or_init(|| [
    regex::Regex::new(r"^\s+(at\s|\.\.\.|[\w$]+Error:|Caused by:)").unwrap(),                                        // 0 stack
    regex::Regex::new(r"^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+").unwrap(), // 1 iso
    regex::Regex::new(r"^(?:\[([A-Za-z]+)\]|([A-Za-z]+)\s)\s*").unwrap(),                                            // 2 level
    regex::Regex::new(r"^\[([^\]]+)\]\s+").unwrap(),                                                                 // 3 source
    regex::Regex::new(r"[{\[]\s*$").unwrap(),                                                                        // 4 ends-open
    regex::Regex::new(r"^(\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\.\d+)\s+\d+\s+\d+\s+([A-Za-z])\s+([^:]+):\s+(.*)$").unwrap(), // 5 logcat
    regex::Regex::new(r"^([A-Z]+):([^:]+):(.+)$").unwrap(),                                                          // 6 python
    regex::Regex::new(r"^\[([^\]]+)\]\s+(?:\[([^\]]+)\]\s+)?(.*)$").unwrap(),                                        // 7 bracket
  ])
}

fn log_parse_line(chunk: &str) -> LogLine {
  let res = log_res();
  let trimmed = chunk.trim();
  let mk = |level: &str, display: &str, time: &str, source: &str, msg: &str, is_json: bool, is_stack: bool, log_prefix: Option<String>| LogLine {
    raw: chunk.to_string(), level: level.to_string(), display_level: display.to_string(),
    time: time.to_string(), source: source.to_string(), msg: msg.to_string(), log_prefix, is_json, is_stack,
  };

  // 1. JSON block
  if trimmed.starts_with('{') || trimmed.starts_with('[') {
    if let Ok(obj) = serde_json::from_str::<serde_json::Value>(trimmed) {
      let raw_level = log_get(&obj, &["level", "severity", "lvl"]).to_uppercase();
      let display = if raw_level.is_empty() { "JSON".to_string() } else { raw_level.clone() };
      let mut level = log_canonicalize(&raw_level);
      if level.is_empty() { level = "INFO".to_string(); }
      let msg = serde_json::to_string_pretty(&obj).unwrap_or_else(|_| trimmed.to_string());
      let time = log_get(&obj, &["time", "timestamp", "@timestamp"]);
      let source = log_get(&obj, &["service", "name", "logger", "component"]);
      return mk(&level, &display, &time, &source, &msg, true, false, None);
    }
  }
  // 2. Stack trace
  if res[0].is_match(chunk) { return mk("TRACE", "TRACE", "", "", trimmed, false, true, None); }
  // 3. ISO timestamp prefix
  if let Some(cap) = res[1].captures(trimmed) {
    let full = cap.get(0).unwrap().as_str();
    let ts = cap.get(1).unwrap().as_str();
    let rest = &trimmed[full.len()..];
    let (raw_level, after_level) = if let Some(lc) = res[2].captures(rest) {
      let lv = lc.get(1).or_else(|| lc.get(2)).map(|m| m.as_str().to_uppercase()).unwrap_or_default();
      (lv, &rest[lc.get(0).unwrap().as_str().len()..])
    } else { (String::new(), rest) };
    let detected = if !raw_level.is_empty() && log_is_known_level(&raw_level) { raw_level } else { log_detect_level(rest) };
    let mut level = log_canonicalize(&detected);
    if level.is_empty() { level = "INFO".to_string(); }
    let (source, msg_str) = if let Some(sc) = res[3].captures(after_level) {
      (sc.get(1).unwrap().as_str().to_string(), after_level[sc.get(0).unwrap().as_str().len()..].to_string())
    } else { (String::new(), after_level.to_string()) };
    let display = if detected.is_empty() { level.clone() } else { detected.clone() };
    // inline JSON (log line ends with { or [ and more lines follow)
    let first_line = msg_str.split('\n').next().unwrap_or("");
    if res[4].is_match(first_line) && chunk.contains('\n') {
      if let Some(open_idx) = first_line.find(|c| c == '{' || c == '[') {
        let log_prefix = first_line[..open_idx].trim().to_string();
        let rest_lines: Vec<&str> = chunk.split('\n').skip(1).collect();
        let body = format!("{}\n{}", &first_line[open_idx..], rest_lines.join("\n"));
        if let Ok(obj) = serde_json::from_str::<serde_json::Value>(&body) {
          let msg = serde_json::to_string_pretty(&obj).unwrap_or(body);
          return mk(&level, &display, ts, &source, &msg, true, false, Some(log_prefix));
        }
      }
    }
    return mk(&level, &display, ts, &source, &msg_str, false, false, None);
  }
  // 4. Logcat
  if let Some(c) = res[5].captures(trimmed) {
    let lvl = c.get(2).unwrap().as_str().to_uppercase();
    let level = match lvl.as_str() { "V" => "TRACE", "D" => "DEBUG", "I" => "INFO", "W" => "WARN", "E" | "F" => "ERROR", _ => "INFO" };
    return mk(level, &lvl, c.get(1).unwrap().as_str(), c.get(3).unwrap().as_str().trim(), c.get(4).unwrap().as_str(), false, false, None);
  }
  // 5. Python style LEVEL:logger:msg
  if let Some(c) = res[6].captures(trimmed) {
    let lv = c.get(1).unwrap().as_str();
    if log_is_known_level(lv) {
      return mk(&log_canonicalize(lv), lv, "", c.get(2).unwrap().as_str().trim(), c.get(3).unwrap().as_str().trim(), false, false, None);
    }
  }
  // 6. Bracket style
  if let Some(c) = res[7].captures(trimmed) {
    let a = c.get(1).unwrap().as_str().to_uppercase();
    let b = c.get(2).map(|m| m.as_str().to_uppercase());
    let rest = c.get(3).map(|m| m.as_str()).unwrap_or("");
    if log_is_known_level(&a) {
      let msg = match &b { Some(bb) => format!("[{}] {}", bb, rest), None => rest.to_string() };
      return mk(&log_canonicalize(&a), &a, "", "", &msg, false, false, None);
    }
    if let Some(bb) = &b {
      if log_is_known_level(bb) {
        return mk(&log_canonicalize(bb), bb, c.get(1).unwrap().as_str(), "", rest, false, false, None);
      }
    }
  }
  // 7. Keyword scan
  let kw = log_detect_level(trimmed);
  if !kw.is_empty() { return mk(&log_canonicalize(&kw), &kw, "", "", trimmed, false, false, None); }
  // 8. Plain
  mk("TRACE", "\u{b7}\u{b7}\u{b7}", "", "", chunk, false, false, None)
}

// Read + parse a log file natively (desktop). Returns the parsed lines so a
// 130 MB log never has to be loaded into a textarea or parsed on the UI thread.
#[tauri::command]
fn parse_log_file(path: String) -> Result<Vec<LogLine>, String> {
  let raw = std::fs::read_to_string(&path).map_err(|e| format!("could not read file: {e}"))?;
  Ok(log_chunk_raw(&raw).iter().map(|c| log_parse_line(c)).collect())
}

// Close the splash window and reveal the main window once the UI has mounted.
#[tauri::command]
fn close_splashscreen(app: tauri::AppHandle) {
  use tauri::Manager;
  if let Some(s) = app.get_webview_window("splashscreen") { let _ = s.close(); }
  if let Some(m) = app.get_webview_window("main") { let _ = m.show(); let _ = m.set_focus(); }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let mut builder = tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_notification::init());

  // in-app auto-update (desktop only)
  #[cfg(desktop)]
  {
    builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
  }

  builder
    .invoke_handler(tauri::generate_handler![ffmpeg_check, ffmpeg_compress, ffmpeg_render, ffmpeg_filmstrip, http_request, close_splashscreen, parse_log_file, timer::timer_sync, timer::timer_set_tray])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      // Fallback: reveal main even if the frontend never signals ready, so a
      // JS error can never leave the app stuck on the splash screen.
      let handle = app.handle().clone();
      std::thread::spawn(move || {
        use tauri::Manager;
        std::thread::sleep(std::time::Duration::from_secs(4));
        if let Some(m) = handle.get_webview_window("main") {
          if !m.is_visible().unwrap_or(true) { let _ = m.show(); }
        }
        if let Some(s) = handle.get_webview_window("splashscreen") { let _ = s.close(); }
      });

      // Native work-timer tray indicator (desktop only).
      #[cfg(desktop)]
      timer::setup(app)?;

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(move |_app_handle, _event| {
      // macOS: closing hides the window to the tray (so the timer keeps its tray
      // pie). Without this, clicking the dock icon does nothing and the app looks
      // stuck. Reopen re-reveals the hidden window.
      #[cfg(target_os = "macos")]
      {
        if let tauri::RunEvent::Reopen { .. } = _event {
          use tauri::Manager;
          if let Some(w) = _app_handle.get_webview_window("main") {
            let _ = w.show();
            let _ = w.unminimize();
            let _ = w.set_focus();
          }
        }
      }
    });
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn no_injection_reaches_args() {
    // hostile-looking option values must never produce a raw flag / path
    let opts = Opts::Video {
      codec: "libx264; rm -rf".into(),
      crf: 9999,
      preset: "-i /etc/passwd".into(),
      height: Some(u32::MAX),
      fps: Some(0),
      audio: "; curl evil".into(),
    };
    let args = build_args(&opts, "mp4", true);
    // codec falls back to libx264, crf clamped to 51, preset falls back to medium
    assert!(args.contains(&"libx264".to_string()));
    assert!(args.contains(&"51".to_string()));
    assert!(args.contains(&"medium".to_string()));
    // no argument is an unexpected flag or contains the smuggled payload
    for a in &args {
      assert!(!a.contains("passwd") && !a.contains("rm ") && !a.contains("curl"));
    }
  }

  #[test]
  fn video_gif_trim_and_palette() {
    let opts = Opts::VideoGif { fps: 60, width: Some(480), start: 3.5, duration: 999.0, quality: 80 };
    let args = build_args(&opts, "gif", false);
    let joined = args.join(" ");
    assert!(joined.contains("-ss 3.500"));
    assert!(joined.contains("-t 60.000"));   // duration clamped to 60
    assert!(joined.contains("fps=30"));       // fps clamped to 30
    assert!(joined.contains("palettegen"));
    assert!(joined.contains("scale='min(480,iw)'"));
  }

  #[test]
  fn log_parser_matches_formats() {
    // JSON line → pretty msg, level canonicalized, key order preserved
    let j = log_parse_line(r#"{"level":"warn","service":"api","msg":"slow","time":"t1"}"#);
    assert_eq!(j.level, "WARN"); assert!(j.is_json); assert_eq!(j.source, "api"); assert_eq!(j.time, "t1");
    assert!(j.msg.contains("\"level\": \"warn\"") && j.msg.contains('\n'));

    // ISO timestamp + bracket level + source
    let iso = log_parse_line("2024-01-15T10:23:44Z [ERROR] [db] connection lost");
    assert_eq!(iso.level, "ERROR"); assert_eq!(iso.time, "2024-01-15T10:23:44Z"); assert_eq!(iso.source, "db");
    assert_eq!(iso.msg, "connection lost");

    // Logcat single-char level maps
    let lc = log_parse_line("01-15 10:23:44.123  1234  1234 E MyTag: boom");
    assert_eq!(lc.level, "ERROR"); assert_eq!(lc.source, "MyTag"); assert_eq!(lc.msg, "boom");

    // canonicalization + keyword scan + plain fallback
    assert_eq!(log_parse_line("[FATAL] disk full").level, "ERROR");
    assert_eq!(log_parse_line("just some DEBUG chatter").level, "DEBUG");
    assert_eq!(log_parse_line("plain text no level").level, "TRACE");

    // multi-line JSON block gets chunked into one entry
    let chunks = log_chunk_raw("line one\n{\n  \"a\": 1\n}\nline two");
    assert_eq!(chunks.len(), 3);
    assert!(chunks[1].contains('\n') && chunks[1].contains("\"a\""));
  }

  #[test]
  fn render_bounds_and_no_injection() {
    // drawn-only layers (no file check) so this runs without ffmpeg/media.
    let spec = RenderSpec {
      width: 1920, height: 1080, fps: 30, duration: 5.0,
      bg: "#000000".into(), output: "/tmp/out.mp4".into(),
      items: vec![
        EItem::Box { t_start: 0.0, t_end: 2.0, x: 0.1, y: 0.1, w: 0.5, h: 0.5, color: "#Ff0000".into(), opacity: 1.0 },
        EItem::Text { text: "evil:'; rm -rf / #".into(), t_start: 0.0, t_end: 2.0, x: 0.2, y: 0.2, size: 9999.0, color: "nope".into(), opacity: 0.5 },
        EItem::Blur { t_start: 1.0, t_end: 3.0, x: 0.9, y: 0.9, w: 0.5, h: 0.5, strength: 999.0 },
      ],
    };
    let (args, temps) = build_render(&spec).unwrap();
    for t in temps { let _ = std::fs::remove_file(t); }
    let j = args.join(" ");
    assert!(j.contains("drawbox") && j.contains("drawtext") && j.contains("boxblur"));
    assert!(j.contains("0xFF0000"));           // valid hex kept
    assert!(j.contains("fontcolor=0xFFFFFF@0.500")); // bad color -> white, opacity applied
    assert!(j.contains("fontsize=400"));       // size clamped 8..400
    assert!(j.contains("boxblur=50:1"));       // strength clamped 1..50
    // hostile text lives only in the temp file, never in the args
    assert!(!j.contains("rm -rf"));
    // blur crop stays inside the frame (x clamped so x+w<=width)
    assert!(j.contains("crop=w=960:h=540:x=960:y=540"));
  }

  #[test]
  fn render_rejects_overflow_layers() {
    let mk = || EItem::Box { t_start: 0.0, t_end: 1.0, x: 0.0, y: 0.0, w: 0.2, h: 0.2, color: "#fff".into(), opacity: 1.0 };
    let spec = RenderSpec {
      width: 640, height: 480, fps: 30, duration: 2.0, bg: "#000".into(),
      output: "/tmp/o.mp4".into(),
      items: (0..11).map(|_| mk()).collect(),
    };
    assert!(build_render(&spec).is_err());
  }

  #[test]
  fn gif_palette_pipeline_built() {
    let opts = Opts::Image { format: "gif".into(), quality: 70, width: Some(500), gif_fps: Some(15) };
    let args = build_args(&opts, "gif", true);
    let joined = args.join(" ");
    assert!(joined.contains("palettegen"));
    assert!(joined.contains("fps=15"));
    assert!(joined.contains("scale='min(500,iw)'"));
  }
}
