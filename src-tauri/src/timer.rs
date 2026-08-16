// ── Native Time-Tracker tray indicators (desktop) ──────────────────────────
// Mirrors the two in-app timers into the macOS/Windows menu bar as TWO separate
// tray icons so both can be visible at once:
//   • countdown — a "pie" that fills toward the target + remaining time
//   • timer     — a small dot + ticking H:MM:SS stopwatch
// A background thread redraws every second so they advance while the window is
// hidden. The web UI is authoritative; it pushes both timers via `timer_sync`.
//
// NOTE: uses Tauri's native tray APIs (needs the `tray-icon` Cargo feature); can
// only be built as part of the desktop app.

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde::Deserialize;
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::window::{ProgressBarState, ProgressBarStatus};
use tauri::{AppHandle, Manager, State};

const TRAY_CD: &str = "dt-countdown";
const TRAY_SW: &str = "dt-timer";
const ICON: u32 = 32;

// ── per-timer state ─────────────────────────────────────────────────────────
#[derive(Default)]
struct Slot {
  active: bool,
  running: bool,
  accumulated_ms: u64,
  run_start: Option<Instant>, // may be in the FUTURE for a scheduled countdown
  target_min: Option<u32>,    // Some = countdown, None = stopwatch
  notified: bool,
  // tray render cache — only touch the OS tray when a value actually changes
  tray_pct: Option<u8>,
  tray_tip: Option<String>,
  tray_title: Option<String>,
  tray_visible: Option<bool>,
}

impl Slot {
  fn elapsed_ms(&self) -> u64 {
    self.accumulated_ms
      + if self.running {
        // checked_* keeps elapsed at 0 until a future (scheduled) start arrives.
        self.run_start
          .and_then(|s| Instant::now().checked_duration_since(s))
          .map(|d| d.as_millis() as u64)
          .unwrap_or(0)
      } else {
        0
      }
  }
}

#[derive(Default)]
pub struct Inner {
  cd: Slot,
  sw: Slot,
  tray_off: bool, // user disabled the tray (top-bar-only indicator)
}
pub struct TimerState(pub Arc<Mutex<Inner>>);

// Snapshot of a slot for rendering, taken under the lock then used lock-free.
struct View { active: bool, running: bool, elapsed: u64, target_min: Option<u32> }
impl View {
  fn target_ms(&self) -> Option<u64> { self.target_min.map(|m| m as u64 * 60_000) }
  fn done(&self) -> bool { self.target_ms().map(|t| self.elapsed >= t).unwrap_or(false) }
}
fn view(s: &Slot) -> View {
  View { active: s.active, running: s.running, elapsed: s.elapsed_ms(), target_min: s.target_min }
}

// What the web UI pushes for one timer (null = that timer is inactive).
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SlotPush {
  running: bool,
  elapsed_ms: u64,
  #[serde(default)]
  target_min: Option<u32>,
  #[serde(default)]
  start_in_ms: Option<u64>, // >0 → a scheduled start this many ms in the future
}

fn apply_push(slot: &mut Slot, p: Option<SlotPush>) {
  // any push invalidates the render cache so the tray redraws cleanly
  slot.tray_pct = None; slot.tray_tip = None; slot.tray_title = None; slot.tray_visible = None;
  match p {
    None => {
      slot.active = false; slot.running = false; slot.run_start = None;
      slot.accumulated_ms = 0; slot.target_min = None; slot.notified = false;
    }
    Some(p) => {
      let delay = p.start_in_ms.unwrap_or(0);
      slot.active = true;
      slot.running = p.running;
      slot.accumulated_ms = p.elapsed_ms;
      slot.run_start = if p.running { Some(Instant::now() + Duration::from_millis(delay)) } else { None };
      slot.target_min = p.target_min.filter(|&m| m > 0);
      let done_ms = slot.target_min.map(|m| m as u64 * 60_000);
      // already complete on restore (and not scheduled) → don't fire a stale notification
      slot.notified = delay == 0 && done_ms.map(|t| p.elapsed_ms >= t).unwrap_or(false);
    }
  }
}

fn fmt_hms(ms: u64) -> String {
  let s = ms / 1000;
  let (h, m, sec) = (s / 3600, (s % 3600) / 60, s % 60);
  if h > 0 { format!("{h}:{m:02}:{sec:02}") } else { format!("{m}:{sec:02}") }
}
fn fmt_hm(ms: u64) -> String {
  let total_min = ms / 60_000;
  let (h, m) = (total_min / 60, total_min % 60);
  if h > 0 { format!("{}h {}m", h, m) } else { format!("{}m", m) }
}
// Remaining for the tray: seconds under a minute (so a 30s countdown isn't "0m"),
// minutes/hours above. Seconds ceiled so it counts 30→1, not 29→0.
fn fmt_remaining(ms: u64) -> String {
  if ms < 60_000 { format!("{}s", ms.div_ceil(1000)) } else { fmt_hm(ms) }
}

// ── icons (raw RGBA, no image deps) ─────────────────────────────────────────
// A tiny 3x5 bitmap font so the time is legible IN the icon — the only way to
// show it on Windows/Linux, whose trays have no inline text label like macOS.
fn glyph(ch: char) -> Option<[u8; 5]> {
  Some(match ch {
    '0' => [0b111, 0b101, 0b101, 0b101, 0b111],
    '1' => [0b010, 0b110, 0b010, 0b010, 0b111],
    '2' => [0b111, 0b001, 0b111, 0b100, 0b111],
    '3' => [0b111, 0b001, 0b111, 0b001, 0b111],
    '4' => [0b101, 0b101, 0b111, 0b001, 0b001],
    '5' => [0b111, 0b100, 0b111, 0b001, 0b111],
    '6' => [0b111, 0b100, 0b111, 0b101, 0b111],
    '7' => [0b111, 0b001, 0b010, 0b010, 0b010],
    '8' => [0b111, 0b101, 0b111, 0b101, 0b111],
    '9' => [0b111, 0b101, 0b111, 0b001, 0b111],
    'h' => [0b100, 0b100, 0b110, 0b101, 0b101],
    _ => return None,
  })
}
// Draw `text` centered, sized to `frac` of the icon, in `color`.
fn draw_glyphs(buf: &mut [u8], size: u32, text: &str, color: (u8, u8, u8), frac: f32) {
  let n = text.chars().count() as u32;
  if n == 0 { return; }
  let unit_w = 3 * n + (n - 1); // cells wide incl. 1-cell gaps
  let budget = (size as f32 * frac) as u32;
  let scale = (budget / unit_w).min(budget / 5).max(1);
  let total_w = unit_w * scale;
  let total_h = 5 * scale;
  let x0 = (size.saturating_sub(total_w)) / 2;
  let y0 = (size.saturating_sub(total_h)) / 2;
  let mut cx = x0;
  for ch in text.chars() {
    if let Some(g) = glyph(ch) {
      for (row, bits) in g.iter().enumerate() {
        for col in 0..3u32 {
          if bits & (1 << (2 - col)) != 0 {
            for dy in 0..scale {
              for dx in 0..scale {
                let px = cx + col * scale + dx;
                let py = y0 + row as u32 * scale + dy;
                if px < size && py < size {
                  let idx = ((py * size + px) * 4) as usize;
                  buf[idx] = color.0; buf[idx + 1] = color.1; buf[idx + 2] = color.2; buf[idx + 3] = 255;
                }
              }
            }
          }
        }
      }
    }
    cx += 4 * scale;
  }
}
// Compact icon label: seconds (<1m), minutes (<1h), else whole hours ("2h").
fn icon_label(ms: u64) -> String {
  let s = ms / 1000;
  if s < 60 { s.max(1).to_string() } else if s < 3600 { (s / 60).to_string() } else { format!("{}h", s / 3600) }
}

fn draw_pie(progress: f32, done: bool, label: &str) -> Image<'static> {
  let size = ICON;
  let c = size as f32 / 2.0;
  let outer = c - 1.0;
  let inner = c * 0.58;
  let (fr, fg, fb) = if done { (232u8, 90, 80) } else { (78u8, 201, 122) };
  let track = (120u8, 120, 120);
  let prog = progress.clamp(0.0, 1.0);
  let mut buf = vec![0u8; (size * size * 4) as usize];
  for y in 0..size {
    for x in 0..size {
      let dx = x as f32 + 0.5 - c;
      let dy = y as f32 + 0.5 - c;
      let dist = (dx * dx + dy * dy).sqrt();
      let idx = ((y * size + x) * 4) as usize;
      if dist <= outer && dist >= inner {
        let mut a = dy.atan2(dx) + std::f32::consts::FRAC_PI_2;
        if a < 0.0 { a += std::f32::consts::PI * 2.0; }
        let frac = a / (std::f32::consts::PI * 2.0);
        let (r, g, b) = if frac <= prog { (fr, fg, fb) } else { track };
        buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
      } else {
        buf[idx + 3] = 0;
      }
    }
  }
  draw_glyphs(&mut buf, size, label, (fr, fg, fb), 0.5); // remaining, in the ring's centre
  Image::new_owned(buf, size, size)
}
// Count-up stopwatch: the elapsed number as the icon (Windows/Linux, no title).
fn draw_num(running: bool, label: &str) -> Image<'static> {
  let size = ICON;
  let color = if running { (78u8, 201, 122) } else { (150u8, 150, 150) };
  let mut buf = vec![0u8; (size * size * 4) as usize];
  draw_glyphs(&mut buf, size, label, color, 0.85);
  Image::new_owned(buf, size, size)
}
// Small filled dot for the macOS stopwatch (macOS shows the time via set_title).
fn draw_dot(running: bool) -> Image<'static> {
  let size = ICON;
  let c = size as f32 / 2.0;
  let r = c * 0.42;
  let (fr, fg, fb) = if running { (78u8, 201, 122) } else { (150u8, 150, 150) };
  let mut buf = vec![0u8; (size * size * 4) as usize];
  for y in 0..size {
    for x in 0..size {
      let dx = x as f32 + 0.5 - c;
      let dy = y as f32 + 0.5 - c;
      let idx = ((y * size + x) * 4) as usize;
      if (dx * dx + dy * dy).sqrt() <= r {
        buf[idx] = fr; buf[idx + 1] = fg; buf[idx + 2] = fb; buf[idx + 3] = 255;
      } else {
        buf[idx + 3] = 0;
      }
    }
  }
  Image::new_owned(buf, size, size)
}

fn notify_done(app: &AppHandle) {
  use tauri_plugin_notification::NotificationExt;
  let _ = app.notification().builder()
    .title("Time's up")
    .body("Your countdown has reached its target.")
    .show();
}

// ── redraw both trays + the taskbar from current state ──────────────────────
enum Which { Cd, Sw }

fn refresh(app: &AppHandle) {
  let (cd, sw, tray_off) = {
    let st = app.state::<TimerState>();
    let i = st.0.lock().unwrap();
    (view(&i.cd), view(&i.sw), i.tray_off)
  };

  // countdown "time up" notification, exactly once
  if cd.active && cd.done() {
    let first = {
      let st = app.state::<TimerState>();
      let mut i = st.0.lock().unwrap();
      let was = i.cd.notified;
      i.cd.notified = true;
      !was
    };
    if first { notify_done(app); }
  }

  update_tray(app, TRAY_CD, Which::Cd, &cd, tray_off);
  update_tray(app, TRAY_SW, Which::Sw, &sw, tray_off);

  // taskbar/dock progress follows the countdown
  if let Some(w) = app.get_webview_window("main") {
    if cd.active {
      let prog = cd.target_ms().map(|t| (cd.elapsed as f32 / t.max(1) as f32).clamp(0.0, 1.0));
      let _ = w.set_progress_bar(ProgressBarState {
        status: Some(if cd.done() { ProgressBarStatus::Error } else if prog.is_some() { ProgressBarStatus::Normal } else { ProgressBarStatus::Indeterminate }),
        progress: prog.map(|p| (p * 100.0).round() as u64),
      });
    } else {
      let _ = w.set_progress_bar(ProgressBarState { status: Some(ProgressBarStatus::None), progress: Some(0) });
    }
  }
}

fn update_tray(app: &AppHandle, tray_id: &str, which: Which, v: &View, tray_off: bool) {
  let tray = app.tray_by_id(tray_id);
  let show = v.active && !tray_off;

  let target_ms = v.target_ms();
  let done = v.done();
  let prog = target_ms.map(|t| (v.elapsed as f32 / t.max(1) as f32).clamp(0.0, 1.0));
  let has_target = target_ms.is_some();
  let pct: u8 = match (target_ms, v.running) {
    (Some(_), _) => prog.map(|p| (p * 100.0).round() as u8).unwrap_or(0),
    (None, true) => 200,  // stopwatch running (sentinel; redraws the dot on pause)
    (None, false) => 201, // stopwatch paused
  };
  let title = match target_ms {
    Some(_) if done => "done".to_string(),
    Some(tm) => fmt_remaining(tm.saturating_sub(v.elapsed)),
    None => fmt_hms(v.elapsed),
  };
  let tip = match target_ms {
    Some(_) if done => "Time up — target reached ✓".to_string(),
    Some(tm) => format!("{}% · {} left", pct, fmt_remaining(tm.saturating_sub(v.elapsed))),
    None => format!("Timer · {}", fmt_hm(v.elapsed)), // minute-res so hover doesn't flicker
  };

  let (vis_changed, redraw, retip, retitle) = {
    let st = app.state::<TimerState>();
    let mut i = st.0.lock().unwrap();
    let slot = match which { Which::Cd => &mut i.cd, Which::Sw => &mut i.sw };
    let vis_changed = slot.tray_visible != Some(show);
    if vis_changed { slot.tray_visible = Some(show); }
    let redraw = show && slot.tray_pct != Some(pct);
    let retip = show && slot.tray_tip.as_deref() != Some(tip.as_str());
    let retitle = show && slot.tray_title.as_deref() != Some(title.as_str());
    if redraw { slot.tray_pct = Some(pct); }
    if retip { slot.tray_tip = Some(tip.clone()); }
    if retitle { slot.tray_title = Some(title.clone()); }
    (vis_changed, redraw, retip, retitle)
  };

  // macOS shows the time as the tray title, so its icon stays clean (pie/dot,
  // redrawn only on % change). Windows/Linux have no title, so the time is drawn
  // INTO the icon and it must redraw whenever the shown time changes.
  let is_mac = cfg!(target_os = "macos");
  if let Some(t) = &tray {
    if vis_changed { let _ = t.set_visible(show); }
    if redraw || (!is_mac && retitle) {
      let icon = if has_target {
        let label = if is_mac || done { String::new() } else { icon_label(target_ms.unwrap().saturating_sub(v.elapsed)) };
        draw_pie(prog.unwrap_or(0.0), done, &label)
      } else if is_mac {
        draw_dot(v.running)
      } else {
        draw_num(v.running, &icon_label(v.elapsed))
      };
      let _ = t.set_icon(Some(icon));
      let _ = t.set_icon_as_template(false); // keep our colours on macOS
    }
    if retip { let _ = t.set_tooltip(Some(tip)); }
    if retitle { let _ = t.set_title(Some(title)); }
  }
}

// ── commands (web UI is authoritative) ──────────────────────────────────────
#[tauri::command]
pub fn timer_sync(app: AppHandle, state: State<'_, TimerState>, cd: Option<SlotPush>, sw: Option<SlotPush>) {
  {
    let mut i = state.0.lock().unwrap();
    apply_push(&mut i.cd, cd);
    apply_push(&mut i.sw, sw);
  }
  refresh(&app);
}

// Toggle whether the menu-bar trays are shown (top-bar-only hides them).
#[tauri::command]
pub fn timer_set_tray(app: AppHandle, state: State<'_, TimerState>, enabled: bool) {
  { let mut i = state.0.lock().unwrap(); i.tray_off = !enabled; }
  refresh(&app);
}

fn on_menu(app: &AppHandle, id: &str) {
  match id {
    "dt-open" => { if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.unminimize(); let _ = w.set_focus(); } }
    "dt-quit" => { app.exit(0); }
    _ => {}
  }
}

fn build_tray(app: &tauri::App, id: &'static str) -> tauri::Result<()> {
  let open = MenuItem::with_id(app, "dt-open", "Open DevToolbox", true, None::<&str>)?;
  let quit = MenuItem::with_id(app, "dt-quit", "Quit DevToolbox", true, None::<&str>)?;
  let menu = Menu::with_items(app, &[&open, &quit])?;
  let mut builder = TrayIconBuilder::with_id(id)
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
  if let Some(ic) = app.default_window_icon() { builder = builder.icon(ic.clone()); }
  let tray = builder.build(app)?;
  let _ = tray.set_visible(false); // hidden until its timer runs
  Ok(())
}

// ── setup: create both trays, manage state, spawn the ticker, hide-to-tray ───
pub fn setup(app: &tauri::App) -> tauri::Result<()> {
  app.manage(TimerState(Arc::new(Mutex::new(Inner::default()))));

  build_tray(app, TRAY_CD)?;
  build_tray(app, TRAY_SW)?;

  // Closing the window while a timer runs hides to the tray instead of quitting.
  if let Some(win) = app.get_webview_window("main") {
    let handle = app.handle().clone();
    win.on_window_event(move |event| {
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        let active = handle.state::<TimerState>().0.lock().map(|i| i.cd.active || i.sw.active).unwrap_or(false);
        if active {
          api.prevent_close();
          if let Some(w) = handle.get_webview_window("main") { let _ = w.hide(); }
        }
      }
    });
  }

  // ~4 Hz redraw so the tray tracks the app closely (updates are cache-guarded,
  // so the OS tray is only touched when a displayed value actually changes).
  let handle = app.handle().clone();
  std::thread::spawn(move || loop {
    std::thread::sleep(std::time::Duration::from_millis(250));
    let tick = handle.state::<TimerState>().0.lock()
      .map(|i| (i.cd.active && i.cd.running) || (i.sw.active && i.sw.running))
      .unwrap_or(false);
    if tick { refresh(&handle); }
  });

  Ok(())
}
