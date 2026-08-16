import { Link } from 'react-router-dom'
import { useEffect, useRef, type CSSProperties } from 'react'
import { isTauri, invoke } from '@tauri-apps/api/core'
import { useSessions, useTick, elapsedMs, pauseTimer, resumeTimer } from '../lib/timeSession'
import { useSettings } from '../lib/settings'
import { playBeep } from '../lib/beep'

function hms(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}
function clock(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

const pill: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 999,
  background: 'var(--surface)', border: '2px solid var(--sketch-text)',
  boxShadow: '2px 2px 0px var(--sketch-text)', fontFamily: "'Architects Daughter', var(--font-sans)",
}
const dot = (bg: string, animate: boolean): CSSProperties => ({
  width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: bg,
  animation: animate ? 'sessionPulse 1.6s ease-in-out infinite' : 'none',
})
const timeLink: CSSProperties = {
  fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 700,
  color: 'var(--sketch-text)', textDecoration: 'none', minWidth: 52, textAlign: 'center',
}

/**
 * Always-visible timer indicator. Shows the countdown and/or the stopwatch — both
 * can run at once — as pills in the quick menu, plus a top progress line for the
 * countdown. Where it appears (top bar / tray / both) follows timerIndicator; a
 * beep fires once when the countdown reaches its target.
 */
export default function SessionBar() {
  const { countdown, timer } = useSessions()
  useTick(!!countdown?.running || !!timer?.running)
  const { settings } = useSettings()
  const indicator = settings.timerIndicator
  const beepedRef = useRef<number | null>(null)

  const now = Date.now()
  const cdStart = countdown?.startedAt ?? null           // authoritative (may be future = scheduled)
  const cdTarget = countdown?.targetMin ? countdown.targetMin * 60000 : null
  const cdFinish = cdStart != null && cdTarget != null ? cdStart + cdTarget : null
  const cdPending = cdStart != null && now < cdStart
  const cdDone = cdFinish != null && now >= cdFinish
  const cdElapsed = cdStart != null && cdTarget != null ? Math.min(cdTarget, Math.max(0, now - cdStart)) : 0

  // beep once when the countdown reaches its target
  useEffect(() => {
    if (!cdDone || !settings.timerBeep || cdStart == null) return
    if (beepedRef.current === cdStart) return
    beepedRef.current = cdStart
    playBeep(settings.timerVolume)
  }, [cdDone, cdStart, settings.timerBeep, settings.timerVolume])

  // desktop: tell the native tray whether to show itself (bar-only hides it)
  useEffect(() => {
    if (typeof isTauri === 'function' && isTauri()) {
      invoke('timer_set_tray', { enabled: indicator !== 'bar' }).catch(() => {})
    }
  }, [indicator])

  if (!countdown && !timer) return null

  const cdProgress = cdTarget ? cdElapsed / cdTarget : null
  const showBar = indicator !== 'tray'
  const cdRemain = cdPending ? cdTarget ?? 0 : cdFinish != null ? Math.max(0, cdFinish - now) : 0
  const cdPct = cdProgress != null ? Math.round(cdProgress * 100) : 0
  const cdTip = cdPending
    ? `Scheduled · starts ${clock(cdStart!)}`
    : cdDone ? 'Time up — target reached' : `${cdPct}% done · finishes ${clock(cdFinish!)}`
  const swElapsed = timer ? elapsedMs(timer, now) : 0

  return (
    <>
      {/* Top progress line — countdown only, and only when the bar is enabled */}
      {countdown && cdProgress !== null && showBar && (
        <div title={cdTip} style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 4, zIndex: 60, cursor: 'help' }}>
          <div style={{
            height: '100%', width: `${cdProgress * 100}%`,
            background: cdDone ? 'oklch(0.62 0.19 25)' : 'var(--accent, #7fbccb)',
            transition: 'width 0.4s linear, background 0.3s',
            boxShadow: cdDone ? '0 0 8px oklch(0.62 0.19 25)' : 'none',
            animation: cdDone ? 'sessionPulse 1.4s ease-in-out infinite' : 'none',
          }} />
        </div>
      )}

      {/* Quick-menu pills — one per running timer, stacked */}
      <div style={{ position: 'fixed', top: 62, right: 14, zIndex: 44, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        {countdown && (
          <div title={cdTip} style={pill}>
            <span style={dot(cdDone ? 'oklch(0.62 0.19 25)' : cdPending ? 'var(--text-muted)' : 'oklch(0.62 0.17 145)', !cdPending && !cdDone)} />
            <Link to="/time-tracker" title="Open Time Tracker" style={{ ...timeLink, color: cdDone ? 'oklch(0.62 0.19 25)' : 'var(--sketch-text)' }}>
              {cdDone ? 'Time up' : hms(cdRemain)}
            </Link>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', paddingRight: 2 }}>{cdPending ? `starts ${clock(cdStart!)}` : cdDone ? '✓ done' : `ends ${clock(cdFinish!)}`}</span>
          </div>
        )}
        {timer && (
          <div title={`Timer · ${hms(swElapsed)} elapsed`} style={pill}>
            <span style={dot(timer.running ? 'oklch(0.62 0.17 145)' : 'var(--text-muted)', timer.running)} />
            <Link to="/time-tracker" title="Open Time Tracker" style={timeLink}>{hms(swElapsed)}</Link>
            <button
              onClick={() => (timer.running ? pauseTimer() : resumeTimer())}
              className="btn-icon"
              title={timer.running ? 'Pause' : 'Resume'}
              aria-label={timer.running ? 'Pause timer' : 'Resume timer'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, color: 'var(--sketch-text)' }}
            >
              {timer.running ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z" /></svg>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
