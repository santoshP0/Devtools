import { useSyncExternalStore, useEffect, useState } from 'react'

/**
 * Tiny live work-session store — module-level state + subscribers so the Time
 * Tracker page and the global progress bar stay in sync and survive navigation.
 * Persisted to localStorage so a running session outlives a reload, and synced
 * across tabs via the storage event.
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
function emit() {
  try { state ? localStorage.setItem(KEY, JSON.stringify(state)) : localStorage.removeItem(KEY) } catch { /* ignore */ }
  subs.forEach(f => f())
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
}
export function pauseSession() {
  if (!state || !state.running) return
  state = { ...state, running: false, accumulatedMs: elapsedMs(state), startedAt: 0 }
  emit()
}
export function resumeSession() {
  if (!state || state.running) return
  state = { ...state, running: true, startedAt: Date.now() }
  emit()
}
export function resetSession() { state = null; emit() }
export function setTarget(targetMin: number | null) {
  if (!state) return
  state = { ...state, targetMin }
  emit()
}

// keep tabs in sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === KEY) { state = load(); subs.forEach(f => f()) }
  })
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
