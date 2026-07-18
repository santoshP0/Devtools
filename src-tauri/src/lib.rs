use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

// Hide the console window that would flash on Windows for each ffmpeg spawn
fn ffmpeg_cmd() -> Command {
  let cmd = Command::new("ffmpeg");
  #[cfg(windows)]
  let cmd = {
    use std::os::windows::process::CommandExt;
    let mut c = cmd;
    c.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    c
  };
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
}

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

  Ok(CompressResult {
    ok: out.status.success(),
    log,
    in_size: std::fs::metadata(&req.input).map(|m| m.len()).unwrap_or(0),
    out_size: std::fs::metadata(&req.output).map(|m| m.len()).unwrap_or(0),
  })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![ffmpeg_check, ffmpeg_compress])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
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
  fn gif_palette_pipeline_built() {
    let opts = Opts::Image { format: "gif".into(), quality: 70, width: Some(500), gif_fps: Some(15) };
    let args = build_args(&opts, "gif", true);
    let joined = args.join(" ");
    assert!(joined.contains("palettegen"));
    assert!(joined.contains("fps=15"));
    assert!(joined.contains("scale='min(500,iw)'"));
  }
}
