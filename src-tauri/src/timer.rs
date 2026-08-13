// ── Native work-timer tray indicator (desktop) ─────────────────────────────
// Mirrors the in-app Time Tracker session into the system tray / menu bar: a
// "pie" icon that fills toward the target, a quick menu (elapsed, pause/resume,
// reset, open, quit), and the OS taskbar/dock progress. A background thread
// redraws it every second so it keeps moving while the window is minimized or
// hidden — independent of the (throttled) webview.
//
// NOTE: this file uses Tauri's native tray/window APIs and can only be compiled
// as part of the desktop app (needs the `tray-icon` Cargo feature). It cannot be
// built in a webless CI sandbox — verify with `npm run tauri build`/`dev` locally.

use std::sync::{Arc, Mutex};
use std::time::Instant;

use serde::Serialize;
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::window::{ProgressBarState, ProgressBarStatus};
use tauri::{AppHandle, Emitter, Manager, State, Wry};

const TRAY_ID: &str = "dt-timer";
const ICON: u32 = 32;

// ── shared session state ────────────────────────────────────────────────────
#[derive(Default)]
pub struct TimerInner {
  active: bool,
  running: bool,
  accumulated_ms: u64,
  run_start: Option<Instant>,
  target_min: Option<u32>,
}

impl TimerInner {
  fn elapsed_ms(&self) -> u64 {
    self.accumulated_ms
      + if self.running {
        self.run_start.map(|s| s.elapsed().as_millis() as u64).unwrap_or(0)
      } else {
        0
      }
  }
}

pub struct TimerState(pub Arc<Mutex<TimerInner>>);

// Menu item handles we need to relabel as the timer ticks.
pub struct TrayMenu {
  status: MenuItem<Wry>,
  toggle: MenuItem<Wry>,
}

#[derive(Serialize, Clone)]
struct StatePayload {
  active: bool,
  running: bool,
  #[serde(rename = "elapsedMs")]
  elapsed_ms: u64,
  #[serde(rename = "targetMin")]
  target_min: Option<u32>,
}

fn payload(inner: &TimerInner) -> StatePayload {
  StatePayload {
    active: inner.active,
    running: inner.running,
    elapsed_ms: inner.elapsed_ms(),
    target_min: inner.target_min,
  }
}

fn fmt_hms(ms: u64) -> String {
  let s = ms / 1000;
  let (h, m, sec) = (s / 3600, (s % 3600) / 60, s % 60);
  if h > 0 { format!("{h}:{m:02}:{sec:02}") } else { format!("{m}:{sec:02}") }
}

// ── pie icon (raw RGBA, no image deps) ──────────────────────────────────────
// progress None = running with no target → a full accent ring.
fn draw_pie(progress: Option<f32>, done: bool) -> Image<'static> {
  let size = ICON;
  let c = size as f32 / 2.0;
  let outer = c - 1.0;
  let inner = c * 0.58;
  let (fr, fg, fb) = if done { (232u8, 90, 80) } else { (78u8, 201, 122) };
  let track = (120u8, 120, 120);
  let prog = progress.unwrap_or(1.0).clamp(0.0, 1.0);
  let has_target = progress.is_some();
  let mut buf = vec![0u8; (size * size * 4) as usize];
  for y in 0..size {
    for x in 0..size {
      let dx = x as f32 + 0.5 - c;
      let dy = y as f32 + 0.5 - c;
      let dist = (dx * dx + dy * dy).sqrt();
      let idx = ((y * size + x) * 4) as usize;
      if dist <= outer && dist >= inner {
        // angle: 0 at top, increasing clockwise, normalized 0..1
        let mut a = dy.atan2(dx) + std::f32::consts::FRAC_PI_2;
        if a < 0.0 { a += std::f32::consts::PI * 2.0; }
        let frac = a / (std::f32::consts::PI * 2.0);
        let filled = !has_target || frac <= prog;
        let (r, g, b) = if filled { (fr, fg, fb) } else { track };
        buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
      } else {
        buf[idx + 3] = 0;
      }
    }
  }
  Image::new_owned(buf, size, size)
}

// ── redraw the tray + menu + taskbar from current state ─────────────────────
fn refresh(app: &AppHandle) {
  let (active, running, elapsed, target) = {
    let st = app.state::<TimerState>();
    let inner = st.0.lock().unwrap();
    (inner.active, inner.running, inner.elapsed_ms(), inner.target_min)
  };

  let tray = app.tray_by_id(TRAY_ID);
  let menu = app.try_state::<TrayMenu>();
  let main = app.get_webview_window("main");

  if !active {
    if let Some(t) = &tray {
      if let Some(ico) = app.default_window_icon() { let _ = t.set_icon(Some(ico.clone())); }
      let _ = t.set_tooltip(Some("DevToolbox"));
    }
    if let Some(m) = &menu {
      let _ = m.status.set_text("No timer running");
      let _ = m.toggle.set_text("Pause");
      let _ = m.toggle.set_enabled(false);
    }
    if let Some(w) = &main {
      let _ = w.set_progress_bar(ProgressBarState {
        status: Some(ProgressBarStatus::None),
        progress: Some(0),
      });
    }
    return;
  }

  let target_ms = target.map(|m| m as u64 * 60_000);
  let prog = target_ms.map(|t| (elapsed as f32 / t.max(1) as f32).clamp(0.0, 1.0));
  let done = prog.map(|p| p >= 1.0).unwrap_or(false);

  if let Some(t) = &tray {
    let _ = t.set_icon(Some(draw_pie(prog, done)));
    let _ = t.set_icon_as_template(false); // keep our colours on macOS
    let tip = match target {
      Some(min) => format!("{} / {}m{}", fmt_hms(elapsed), min, if done { " · done" } else { "" }),
      None => fmt_hms(elapsed),
    };
    let _ = t.set_tooltip(Some(tip));
  }
  if let Some(m) = &menu {
    let status = match (target_ms, running) {
      (Some(tm), _) => format!("{} of {} · {}", fmt_hms(elapsed), fmt_hms(tm), if running { "running" } else { "paused" }),
      (None, true) => format!("{} elapsed", fmt_hms(elapsed)),
      (None, false) => format!("{} · paused", fmt_hms(elapsed)),
    };
    let _ = m.status.set_text(status);
    let _ = m.toggle.set_text(if running { "Pause" } else { "Resume" });
    let _ = m.toggle.set_enabled(true);
  }
  if let Some(w) = &main {
    let _ = w.set_progress_bar(ProgressBarState {
      status: Some(if done { ProgressBarStatus::Error } else if prog.is_some() { ProgressBarStatus::Normal } else { ProgressBarStatus::Indeterminate }),
      progress: prog.map(|p| (p * 100.0).round() as u64),
    });
  }
}

fn emit_state(app: &AppHandle) {
  let st = app.state::<TimerState>();
  let p = { payload(&st.0.lock().unwrap()) };
  let _ = app.emit("timer-state", p);
}

// ── commands called from the web UI ─────────────────────────────────────────
#[tauri::command]
pub fn timer_start(app: AppHandle, state: State<'_, TimerState>, target_min: Option<u32>) {
  {
    let mut s = state.0.lock().unwrap();
    s.active = true;
    s.running = true;
    s.accumulated_ms = 0;
    s.run_start = Some(Instant::now());
    s.target_min = target_min.filter(|&m| m > 0);
  }
  refresh(&app);
}

#[tauri::command]
pub fn timer_pause(app: AppHandle, state: State<'_, TimerState>) {
  {
    let mut s = state.0.lock().unwrap();
    if s.active && s.running {
      s.accumulated_ms = s.elapsed_ms();
      s.running = false;
      s.run_start = None;
    }
  }
  refresh(&app);
}

#[tauri::command]
pub fn timer_resume(app: AppHandle, state: State<'_, TimerState>) {
  {
    let mut s = state.0.lock().unwrap();
    if s.active && !s.running {
      s.running = true;
      s.run_start = Some(Instant::now());
    }
  }
  refresh(&app);
}

#[tauri::command]
pub fn timer_reset(app: AppHandle, state: State<'_, TimerState>) {
  {
    let mut s = state.0.lock().unwrap();
    *s = TimerInner::default();
  }
  refresh(&app);
}

// Push an in-progress web session into Rust after an app restart, so the tray
// reflects it without resetting the clock.
#[tauri::command]
pub fn timer_restore(app: AppHandle, state: State<'_, TimerState>, running: bool, elapsed_ms: u64, target_min: Option<u32>) {
  {
    let mut s = state.0.lock().unwrap();
    s.active = true;
    s.running = running;
    s.accumulated_ms = elapsed_ms;
    s.run_start = if running { Some(Instant::now()) } else { None };
    s.target_min = target_min.filter(|&m| m > 0);
  }
  refresh(&app);
}

#[tauri::command]
pub fn timer_get(state: State<'_, TimerState>) -> StatePayload {
  payload(&state.0.lock().unwrap())
}

// ── tray menu actions (these DO echo back to the web UI) ─────────────────────
fn on_menu(app: &AppHandle, id: &str) {
  match id {
    "dt-toggle" => {
      let running = { app.state::<TimerState>().0.lock().unwrap().running };
      if running { toggle_pause(app, true) } else { toggle_pause(app, false) }
      emit_state(app);
      refresh(app);
    }
    "dt-reset" => {
      { *app.state::<TimerState>().0.lock().unwrap() = TimerInner::default(); }
      emit_state(app);
      refresh(app);
    }
    "dt-open" => {
      if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.unminimize(); let _ = w.set_focus(); }
    }
    "dt-quit" => { app.exit(0); }
    _ => {}
  }
}

fn toggle_pause(app: &AppHandle, pause: bool) {
  let st = app.state::<TimerState>();
  let mut s = st.0.lock().unwrap();
  if !s.active { return; }
  if pause && s.running {
    s.accumulated_ms = s.elapsed_ms();
    s.running = false;
    s.run_start = None;
  } else if !pause && !s.running {
    s.running = true;
    s.run_start = Some(Instant::now());
  }
}

// ── setup: create the tray, manage state, spawn the ticker, hide-to-tray ─────
pub fn setup(app: &tauri::App) -> tauri::Result<()> {
  app.manage(TimerState(Arc::new(Mutex::new(TimerInner::default()))));

  let status = MenuItem::with_id(app, "dt-status", "No timer running", false, None::<&str>)?;
  let toggle = MenuItem::with_id(app, "dt-toggle", "Pause", false, None::<&str>)?;
  let reset = MenuItem::with_id(app, "dt-reset", "Reset", true, None::<&str>)?;
  let open = MenuItem::with_id(app, "dt-open", "Open DevToolbox", true, None::<&str>)?;
  let quit = MenuItem::with_id(app, "dt-quit", "Quit DevToolbox", true, None::<&str>)?;
  let sep1 = PredefinedMenuItem::separator(app)?;
  let sep2 = PredefinedMenuItem::separator(app)?;
  let menu = Menu::with_items(app, &[&status, &sep1, &toggle, &reset, &sep2, &open, &quit])?;

  app.manage(TrayMenu { status: status.clone(), toggle: toggle.clone() });

  let mut builder = TrayIconBuilder::with_id(TRAY_ID)
    .tooltip("DevToolbox")
    .menu(&menu)
    .show_menu_on_left_click(false)
    .on_menu_event(|app, event| on_menu(app, event.id.as_ref()))
    .on_tray_icon_event(|tray, event| {
      if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
        let app = tray.app_handle();
        if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.unminimize(); let _ = w.set_focus(); }
      }
    });
  if let Some(ic) = app.default_window_icon() {
    builder = builder.icon(ic.clone());
  }
  let _tray = builder.build(app)?;

  // Closing the window while a session runs hides to the tray instead of
  // quitting, so the timer keeps going. "Quit DevToolbox" in the tray exits.
  if let Some(win) = app.get_webview_window("main") {
    let handle = app.handle().clone();
    win.on_window_event(move |event| {
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        let active = handle.state::<TimerState>().0.lock().map(|s| s.active).unwrap_or(false);
        if active {
          api.prevent_close();
          if let Some(w) = handle.get_webview_window("main") { let _ = w.hide(); }
        }
      }
    });
  }

  // 1 Hz redraw so the pie/taskbar advance even while minimized.
  let handle = app.handle().clone();
  std::thread::spawn(move || loop {
    std::thread::sleep(std::time::Duration::from_secs(1));
    let active = handle.state::<TimerState>().0.lock().map(|s| s.active && s.running).unwrap_or(false);
    if active { refresh(&handle); }
  });

  Ok(())
}
