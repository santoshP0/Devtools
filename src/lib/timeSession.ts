import { useSyncExternalStore, useEffect, useState } from 'react'
import { isTauri, invoke } from '@tauri-apps/api/core'

/**
 * Two independent timers that survive navigation + reload and sync across tabs:
 *   • countdown — a wall-clock deadline (start → target), drives notifications.
 *   • timer     — a plain count-up stopwatch (pause/resume).
 * Both can run at once and both show in the in-app quick menu. The desktop
 * menu-bar tray can only show one icon, so it mirrors the countdown (which has
 * the deadline + notification); if there's no countdown it mirrors the stopwatch.
 */
export interface TimeSession {
  running: boolean
  startedAt: number      // epoch ms the current running segment began (0 when paused)
  accumulatedMs: number  // total of completed (paused) segments
  targetMin: number | null
  label: string
}
export interface Sessions { countdown: TimeSession | null; timer: TimeSession | null }

const EMPTY: Sessions = { countdown: null, timer: null }
const KEY = 'devtoolbox-time-sessions'
let state: Sessions = load()
const subs = new Set<() => void>()

function load(): Sessions {
  try { const s = localStorage.getItem(KEY); if (s) return { ...EMPTY, ...JSON.parse(s) } } catch { /* ignore */ }
  return EMPTY
}
function persist() {
  try {
    if (state.countdown || state.timer) localStorage.setItem(KEY, JSON.stringify(state))
    else localStorage.removeItem(KEY)
  } catch { /* ignore */ }
}
function emit() { persist(); subs.forEach(f => f()) }

// ── native (desktop) bridge — mirrors ONE timer to the tray ────────────────
const native = typeof window !== 'undefined' && isTauri()
function toNative(cmd: string, args?: Record<string, unknown>) {
  if (native) invoke(cmd, args).catch(() => { /* desktop-only, ignore on web */ })
}

export function subscribe(fn: () => void) { subs.add(fn); return () => { subs.delete(fn) } }
export function getSessions() { return state }

export function elapsedMs(s: TimeSession | null, now = Date.now()) {
  if (!s) return 0
  return s.accumulatedMs + (s.running ? Math.max(0, now - s.startedAt) : 0)
}

// Push both timers to the native tray (each gets its own menu-bar icon). For a
// scheduled countdown, startInMs > 0 tells Rust to hold at 0 until the start.
function pushNative() {
  const n = Date.now()
  const cd = state.countdown
  const sw = state.timer
  toNative('timer_sync', {
    cd: cd ? { running: cd.running, elapsedMs: elapsedMs(cd, n), targetMin: cd.targetMin, startInMs: Math.max(0, cd.startedAt - n) } : null,
    sw: sw ? { running: sw.running, elapsedMs: elapsedMs(sw, n) } : null,
  })
}

// ── countdown ──────────────────────────────────────────────────────────────
export function startCountdown(startEpoch: number, targetMin: number) {
  state = { ...state, countdown: { running: true, startedAt: startEpoch, accumulatedMs: 0, targetMin, label: 'countdown' } }
  emit(); pushNative()
}
export function resetCountdown() { state = { ...state, countdown: null }; emit(); pushNative() }

// ── stopwatch (count-up timer) ───────────────────────────────────────────────
export function startTimer() {
  state = { ...state, timer: { running: true, startedAt: Date.now(), accumulatedMs: 0, targetMin: null, label: 'timer' } }
  emit(); pushNative()
}
export function pauseTimer() {
  const t = state.timer; if (!t || !t.running) return
  state = { ...state, timer: { ...t, running: false, accumulatedMs: elapsedMs(t), startedAt: 0 } }
  emit(); pushNative()
}
export function resumeTimer() {
  const t = state.timer; if (!t || t.running) return
  state = { ...state, timer: { ...t, running: true, startedAt: Date.now() } }
  emit(); pushNative()
}
export function resetTimer() { state = { ...state, timer: null }; emit(); pushNative() }

// keep browser tabs in sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === KEY) { state = load(); subs.forEach(f => f()) }
  })
}

// desktop: the web UI is authoritative — push both timers to the tray on launch,
// and re-push on focus to correct any drift (e.g. a scheduled start after sleep).
if (native) {
  pushNative()
  window.addEventListener('focus', pushNative)
}

/** Subscribe a component to both timers. */
export function useSessions() {
  return useSyncExternalStore(subscribe, getSessions, () => EMPTY)
}

/** Re-render on an interval while `active`, for the ticking clock display. */
export function useTick(active: boolean, intervalMs = 250) {
  const [, force] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => force(n => n + 1), intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs])
}
