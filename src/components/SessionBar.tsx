import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { isTauri, invoke } from '@tauri-apps/api/core'
import { useSession, useTick, elapsedMs, pauseSession, resumeSession } from '../lib/timeSession'
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

/**
 * Always-visible timer indicator. A thin progress line pinned to the top edge
 * (countdown only), plus a compact pill to pause/resume and jump to the tracker.
 * Where it appears (top bar / tray / both) follows the timerIndicator setting;
 * a beep fires once when a countdown reaches its target.
 */
export default function SessionBar() {
  const session = useSession()
  useTick(!!session?.running)
  const { settings } = useSettings()
  const indicator = settings.timerIndicator
  const beepedRef = useRef<number | null>(null)

  const now = Date.now()
  const elapsed = session ? elapsedMs(session, now) : 0
  const targetMs = session?.targetMin ? session.targetMin * 60000 : null
  const countdown = session?.label === 'countdown'
  const done = targetMs != null && elapsed >= targetMs && countdown
  const startedAt = session?.startedAt ?? null

  // beep once when a countdown reaches its target
  useEffect(() => {
    if (!done || !settings.timerBeep || startedAt == null) return
    if (beepedRef.current === startedAt) return
    beepedRef.current = startedAt
    playBeep(settings.timerVolume)
  }, [done, startedAt, settings.timerBeep, settings.timerVolume])

  // desktop: tell the native tray whether to show itself (bar-only hides it)
  useEffect(() => {
    if (typeof isTauri === 'function' && isTauri()) {
      invoke('timer_set_tray', { enabled: indicator !== 'bar' }).catch(() => {})
    }
  }, [indicator])

  if (!session) return null

  const progress = targetMs ? Math.min(1, elapsed / targetMs) : null
  const start = now - elapsed
  const finish = targetMs != null ? start + targetMs : null
  const remainMs = targetMs != null ? Math.max(0, targetMs - elapsed) : null
  const pct = progress != null ? Math.round(progress * 100) : null
  const showBar = indicator !== 'tray' // top line unless the user picked tray-only
  // minute-resolution (no ticking seconds) so the native tooltip doesn't flicker
  const tip = countdown
    ? done
      ? `Time up — target reached`
      : `${pct}% done · finishes ${clock(finish!)}`
    : `${hms(elapsed)} elapsed`

  return (
    <>
      {/* Top progress line — countdown only, and only when the bar is enabled */}
      {progress !== null && showBar && (
        <div title={tip} style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 4, zIndex: 60, cursor: 'help' }}>
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: done ? 'oklch(0.62 0.19 25)' : 'var(--accent, #7fbccb)',
              transition: 'width 0.4s linear, background 0.3s',
              boxShadow: done ? '0 0 8px oklch(0.62 0.19 25)' : 'none',
              animation: done ? 'sessionPulse 1.4s ease-in-out infinite' : 'none',
            }}
          />
        </div>
      )}

      {/* Compact control pill, just below the nav */}
      <div title={tip} style={{
        position: 'fixed', top: 62, right: 14, zIndex: 44,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 10px', borderRadius: 999,
        background: 'var(--surface)', border: '2px solid var(--sketch-text)',
        boxShadow: '2px 2px 0px var(--sketch-text)',
        fontFamily: "'Architects Daughter', var(--font-sans)",
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: done ? 'oklch(0.62 0.19 25)' : session.running ? 'oklch(0.62 0.17 145)' : 'var(--text-muted)',
          animation: session.running ? 'sessionPulse 1.6s ease-in-out infinite' : 'none',
        }} />
        <Link to="/time-tracker" title="Open Time Tracker" style={{
          fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 700,
          color: done ? 'oklch(0.62 0.19 25)' : 'var(--sketch-text)', textDecoration: 'none', minWidth: 52, textAlign: 'center',
        }}>
          {countdown ? (done ? 'Time up' : hms(remainMs ?? 0)) : hms(elapsed)}
        </Link>

        {countdown ? (
          // wall-clock countdown — show where it lands, no pause (freezes at 0)
          <span style={{ fontSize: 12, color: 'var(--text-muted)', paddingRight: 2 }}>
            {done ? '✓ done' : `ends ${clock(finish!)}`}
          </span>
        ) : (
          <button
            onClick={() => (session.running ? pauseSession() : resumeSession())}
            className="btn-icon"
            title={session.running ? 'Pause' : 'Resume'}
            aria-label={session.running ? 'Pause session' : 'Resume session'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, color: 'var(--sketch-text)' }}
          >
            {session.running ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z" /></svg>
            )}
          </button>
        )}
      </div>
    </>
  )
}
