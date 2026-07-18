use serde::Serialize;
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

/// Runs ffmpeg on a user-picked local file. Args come from our own UI,
/// executing on the user's own machine against their own files.
#[tauri::command]
async fn ffmpeg_compress(
  input: String,
  output: String,
  args: Vec<String>,
) -> Result<CompressResult, String> {
  let mut cmd = ffmpeg_cmd();
  cmd.arg("-y").arg("-i").arg(&input);
  for a in &args {
    cmd.arg(a);
  }
  cmd.arg(&output);

  let out = cmd.output().map_err(|e| format!("failed to run ffmpeg: {e}"))?;
  let stderr = String::from_utf8_lossy(&out.stderr);
  // keep only the tail — ffmpeg logs are long and only the end matters on error
  let log: String = stderr
    .chars()
    .skip(stderr.chars().count().saturating_sub(2000))
    .collect();

  Ok(CompressResult {
    ok: out.status.success(),
    log,
    in_size: std::fs::metadata(&input).map(|m| m.len()).unwrap_or(0),
    out_size: std::fs::metadata(&output).map(|m| m.len()).unwrap_or(0),
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
