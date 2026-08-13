import { useSyncExternalStore, useEffect, useState } from 'react'
import { isTauri, invoke } from '@tauri-apps/api/core'

/**
 * Tiny live work-session store — module-level state + subscribers so the Time
 * Tracker page and the global progress bar stay in sync and survive navigation.
 * Persisted to localStorage so a running session outlives a reload, and synced
 * across tabs via the storage event.
 *
 * In the desktop app it also mirrors to Rust (see src-tauri/src/timer.rs), which
 * drives the tray "pie" + taskbar progress and keeps them updating while the
 * window is minimized/hidden. Tray-initiated pause/resume/reset flow back here
 * via the `timer://state` event.
 */
export interface TimeSession {
  running: boolean
  startedAt: number      // epoch ms the current running segment began (0 when paused)
  accumulatedMs: number  // total of completed (paused) segments
  targetMin: number | null
  label: string
}

const KEY = 'devtoolbox-time-session'
let state: TimeSession | null = load()
const subs = new Set<() => void>()

function load(): TimeSession | null {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null } catch { return null }
}
function persist() {
  try { state ? localStorage.setItem(KEY, JSON.stringify(state)) : localStorage.removeItem(KEY) } catch { /* ignore */ }
}
function emit() {
  persist()
  subs.forEach(f => f())
}

// ── native (desktop) bridge ──────────────────────────────────────────────
const native = typeof window !== 'undefined' && isTauri()
function toNative(cmd: string, args?: Record<string, unknown>) {
  if (native) invoke(cmd, args).catch(() => { /* desktop-only, ignore on web */ })
}

export function subscribe(fn: () => void) { subs.add(fn); return () => { subs.delete(fn) } }
export function getSession() { return state }

export function elapsedMs(s: TimeSession | null, now = Date.now()) {
  if (!s) return 0
  return s.accumulatedMs + (s.running ? Math.max(0, now - s.startedAt) : 0)
}

export function startSession(targetMin: number | null, label = '') {
  state = { running: true, startedAt: Date.now(), accumulatedMs: 0, targetMin, label }
  emit()
  toNative('timer_start', { targetMin })
}
export function pauseSession() {
  if (!state || !state.running) return
  state = { ...state, running: false, accumulatedMs: elapsedMs(state), startedAt: 0 }
  emit()
  toNative('timer_pause')
}
export function resumeSession() {
  if (!state || state.running) return
  state = { ...state, running: true, startedAt: Date.now() }
  emit()
  toNative('timer_resume')
}
export function resetSession() { state = null; emit(); toNative('timer_reset') }
export function setTarget(targetMin: number | null) {
  if (!state) return
  state = { ...state, targetMin }
  emit()
}

// Apply a state pushed FROM the native side (tray pause/resume/reset, or a
// resync) — no re-invoke back to Rust, so there's no feedback loop.
interface NativePayload { active: boolean; running: boolean; elapsedMs: number; targetMin: number | null }
function applyNative(p: NativePayload) {
  state = p.active
    ? { running: p.running, startedAt: p.running ? Date.now() : 0, accumulatedMs: p.elapsedMs, targetMin: p.targetMin ?? null, label: '' }
    : null
  emit()
}

// keep browser tabs in sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === KEY) { state = load(); subs.forEach(f => f()) }
  })
}

// desktop: two-way sync with the Rust timer
if (native) {
  import('@tauri-apps/api/event')
    .then(({ listen }) => listen<NativePayload>('timer-state', e => applyNative(e.payload)))
    .catch(() => {})
  const resync = () => invoke<NativePayload>('timer_get').then(applyNative).catch(() => {})
  // On launch, push an in-progress session into Rust (so the tray shows it),
  // otherwise adopt whatever Rust reports.
  const cur = state
  if (cur && (cur.running || cur.accumulatedMs > 0)) {
    toNative('timer_restore', { running: cur.running, elapsedMs: elapsedMs(cur), targetMin: cur.targetMin })
  } else {
    resync()
  }
  window.addEventListener('focus', resync)
}

/** Subscribe a component to the session. */
export function useSession() {
  return useSyncExternalStore(subscribe, getSession, () => null)
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
