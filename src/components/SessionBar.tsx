import { Link } from 'react-router-dom'
import { useSession, useTick, elapsedMs, pauseSession, resumeSession } from '../lib/timeSession'

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
 * Always-visible work-session indicator. A thin progress line pinned to the top
 * edge that fills as the session runs toward its target, plus a compact pill.
 * Handles both the stopwatch (pause/resume) and a work-day (login → 8h deadline,
 * with a notch on the line marking when the in-office slice is done).
 */
export default function SessionBar() {
  const session = useSession()
  useTick(!!session?.running)

  if (!session) return null

  const now = Date.now()
  const elapsed = elapsedMs(session, now)
  const targetMs = session.targetMin ? session.targetMin * 60000 : null
  const progress = targetMs ? Math.min(1, elapsed / targetMs) : null
  const done = progress !== null && progress >= 1

  const countdown = session.label === 'countdown'
  const start = now - elapsed
  const finish = targetMs != null ? start + targetMs : null
  const remainMs = targetMs != null ? Math.max(0, targetMs - elapsed) : null
  const pct = progress != null ? Math.round(progress * 100) : null
  // minute-resolution (no ticking seconds) so the native tooltip doesn't flicker
  const tip = countdown
    ? done
      ? `Time up — target reached`
      : `${pct}% done · finishes ${clock(finish!)}`
    : `${hms(elapsed)} elapsed`

  return (
    <>
      {/* Top progress line — only when a target is set */}
      {progress !== null && (
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
