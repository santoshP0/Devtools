import { useState, type CSSProperties } from 'react'
import ToolLayout from '../components/ToolLayout'
import ToolIcon from '../components/ToolIcon'
import { Wheel, TimeWheel } from '../components/Wheel'
import {
  useSessions, useTick, elapsedMs, startCountdown, resetCountdown,
  startTimer, pauseTimer, resumeTimer, resetTimer,
} from '../lib/timeSession'

type Mode = 'countdown' | 'timer'

const MODES: { id: Mode; label: string; icon: string; hint: string; accent: string }[] = [
  { id: 'countdown', label: 'Countdown', icon: 'Timer', hint: 'count down to a target', accent: 'var(--card-sec-text)' },
  { id: 'timer',     label: 'Timer',     icon: 'Clock', hint: 'count up from zero',     accent: 'var(--card-data-text)' },
]

// ── time helpers ──
function fmtDur(totalMin: number): string {
  const neg = totalMin < 0 ? '-' : ''
  let t = Math.abs(Math.round(totalMin))
  const h = Math.floor(t / 60); t %= 60
  if (h && t) return `${neg}${h}h ${t}m`
  if (h) return `${neg}${h}h`
  return `${neg}${t}m`
}
function hms(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(sec)}`
}

export default function TimeTracker() {
  const [mode, setMode] = useState<Mode>('countdown')

  return (
    <ToolLayout title="Time Tracker" description="Count down to a target and get notified when it's up, or run a simple count-up timer — both stay visible in the top bar and menu-bar tray.">
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Icon-forward mode picker — big glyphs so you spot the mode instantly */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {MODES.map(m => {
            const active = mode === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '16px 8px 12px', borderRadius: 10, cursor: 'pointer',
                  border: '2px solid var(--sketch-text)',
                  background: active ? 'var(--sketch-text)' : 'var(--surface)',
                  color: active ? 'var(--sketch-bg)' : 'var(--sketch-text)',
                  boxShadow: active ? 'none' : '3px 3px 0px var(--sketch-text)',
                  transform: active ? 'translate(2px,2px)' : 'none',
                  transition: 'all 0.12s ease-out',
                }}
              >
                <span style={{ color: active ? 'var(--sketch-bg)' : m.accent }}>
                  <ToolIcon name={m.icon} size={30} strokeWidth={2} />
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Architects Daughter', var(--font-sans)" }}>{m.label}</span>
                <span style={{ fontSize: 11, opacity: 0.7, fontFamily: 'var(--font-mono)' }}>{m.hint}</span>
              </button>
            )
          })}
        </div>

        {mode === 'countdown' && <CountdownMode />}
        {mode === 'timer' && <StopwatchMode />}
      </div>
    </ToolLayout>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '2px solid var(--sketch-text)', boxShadow: '4px 4px 0px var(--sketch-text)', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {children}
    </div>
  )
}

// ── Timer: a plain count-up stopwatch, shown in the top bar + tray ──
function StopwatchMode() {
  const { timer: sw } = useSessions()
  useTick(!!sw?.running)

  if (!sw) {
    return (
      <Panel>
        <div style={{ textAlign: 'center' }}>
          <div style={wheelLabel}>Stopwatch</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Counts up from zero. Stays visible in the top bar and menu-bar tray while it runs — even if you switch tools.
          </p>
        </div>
        <button onClick={startTimer} style={bigBtn('oklch(0.62 0.17 145)')}>▶ Start timer</button>
      </Panel>
    )
  }

  const elapsed = elapsedMs(sw)
  return (
    <Panel>
      <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
          {sw.running ? 'Running' : 'Paused'}
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)', color: 'var(--sketch-text)' }}>
          {hms(elapsed)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>elapsed</div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {sw.running
          ? <button onClick={pauseTimer} style={{ ...bigBtn('var(--card-data-text)'), flex: 1, width: 'auto' }}>❚❚ Pause</button>
          : <button onClick={resumeTimer} style={{ ...bigBtn('oklch(0.62 0.17 145)'), flex: 1, width: 'auto' }}>▶ Resume</button>}
        <button onClick={resetTimer} style={{ ...bigBtn('oklch(0.62 0.18 25)'), flex: 1, width: 'auto' }}>■ Reset</button>
      </div>
    </Panel>
  )
}

// ── Countdown: pick a start time + a target length → live count-down to a
// deadline. Anchored to a fixed wall-clock start, fed to the top progress line +
// tray, and fires a notification when the target is reached.
function clockOf(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
// epoch ms for a clock time (h:m) today
function todayAt(h: number, m: number) {
  const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime()
}
function bigBtn(bg: string): CSSProperties {
  return {
    width: '100%', padding: '12px 0', borderRadius: 8, cursor: 'pointer',
    border: '2px solid var(--sketch-text)', background: bg, color: 'var(--sketch-bg)',
    boxShadow: '2px 2px 0 var(--sketch-text)', fontSize: 15, fontWeight: 700,
    fontFamily: "'Architects Daughter', var(--font-sans)",
  }
}
const wheelLabel: CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface2)', border: '2px solid var(--sketch-text)', textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Architects Daughter', var(--font-sans)", color: accent ? 'oklch(0.55 0.17 145)' : 'var(--sketch-text)' }}>{value}</div>
    </div>
  )
}

const unitLabel: CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginTop: 8 }

const PRESETS = [30, 60, 240, 360, 480, 540] // minutes: 30m · 1h · 4h · 6h · 8h · 9h
function chip(active: boolean): CSSProperties {
  return {
    padding: '8px 16px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 700,
    fontFamily: "'Architects Daughter', var(--font-sans)", border: '2px solid var(--sketch-text)',
    background: active ? 'var(--sketch-text)' : 'var(--surface)',
    color: active ? 'var(--sketch-bg)' : 'var(--sketch-text)',
    boxShadow: active ? 'none' : '2px 2px 0 var(--sketch-text)',
    transform: active ? 'translate(2px, 2px)' : 'none', transition: 'all 0.1s ease-out',
  }
}

function CountdownMode() {
  const { countdown: cd } = useSessions()
  useTick(!!cd?.running)

  const [durationMin, setDurationMin] = useState(0) // no preset selected
  const [customOpen, setCustomOpen] = useState(false)
  const [customStart, setCustomStart] = useState(false)
  const [startMin, setStartMin] = useState<number>(new Date().getHours() * 60 + new Date().getMinutes())

  const startEpoch = customStart ? todayAt(Math.floor(startMin / 60), startMin % 60) : Date.now()

  const start = () => {
    if (durationMin <= 0) return
    startCountdown(startEpoch, durationMin)
  }

  // ── setup: start = now / custom (top) → pick how long (bottom) ──
  if (!cd) {
    const previewEnd = startEpoch + durationMin * 60000
    return (
      <Panel>
        {/* start — now, or a custom wall-clock time */}
        <div style={{ textAlign: 'center' }}>
          <div style={wheelLabel}>Starts</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => setCustomStart(false)} style={chip(!customStart)}>Now</button>
            <button onClick={() => setCustomStart(true)} style={chip(customStart)}>Custom</button>
          </div>
          {customStart ? (
            <div style={{ marginTop: 12 }}>
              <TimeWheel value={startMin} onChange={setStartMin} />
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Architects Daughter', var(--font-sans)", color: 'var(--sketch-text)', marginTop: 8 }}>
                {clockOf(startEpoch)}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Architects Daughter', var(--font-sans)", color: 'var(--sketch-text)', marginTop: 8 }}>
              Now · {clockOf(Date.now())}
            </div>
          )}
        </div>

        {/* how long */}
        <div style={{ textAlign: 'center' }}>
          <div style={wheelLabel}>How long?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {PRESETS.map(min => (
              <button key={min} onClick={() => { setDurationMin(min); setCustomOpen(false) }} style={chip(!customOpen && durationMin === min)}>{fmtDur(min)}</button>
            ))}
            <button onClick={() => setCustomOpen(v => !v)} style={chip(customOpen)}>Custom</button>
          </div>
        </div>

        {customOpen && (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 22 }}>
            <div style={{ textAlign: 'center' }}><Wheel len={24} value={Math.floor(durationMin / 60)} onChange={h => setDurationMin(h * 60 + durationMin % 60)} /><div style={unitLabel}>hours</div></div>
            <div style={{ textAlign: 'center' }}><Wheel len={60} value={durationMin % 60} onChange={mm => setDurationMin(Math.floor(durationMin / 60) * 60 + mm)} /><div style={unitLabel}>minutes</div></div>
          </div>
        )}

        {durationMin > 0 && (
          <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, fontFamily: "'Architects Daughter', var(--font-sans)", color: 'var(--sketch-text)' }}>
            ends {clockOf(previewEnd)}
          </div>
        )}

        <button onClick={start} disabled={durationMin <= 0} style={{ ...bigBtn('oklch(0.62 0.17 145)'), opacity: durationMin <= 0 ? 0.5 : 1, cursor: durationMin <= 0 ? 'not-allowed' : 'pointer' }}>▶ Start countdown</button>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
          A line at the top of the app fills as time passes — you'll get a notification when it's up.
        </p>
      </Panel>
    )
  }

  // ── live count-down ──
  const now = Date.now()
  const startMs = cd.startedAt                 // authoritative — may be in the future (scheduled)
  const tMs = (cd.targetMin || 0) * 60000
  const finish = startMs + tMs
  const pending = now < startMs                // scheduled, not started yet
  const done = now >= finish
  const elapsed = Math.min(tMs, Math.max(0, now - startMs))
  const progress = tMs ? elapsed / tMs : 0
  const untilStart = Math.max(0, startMs - now)
  const bigRemain = pending ? tMs : Math.max(0, finish - now) // frozen at full while scheduled
  const green = 'oklch(0.55 0.17 145)'

  return (
    <Panel>
      <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: done ? green : 'var(--sketch-text)' }}>
          {done ? '✓ Complete' : pending ? `Scheduled · starts in ${hms(untilStart)}` : `${(progress * 100).toFixed(0)}% · target ${fmtDur(cd.targetMin!)}`}
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)', color: done ? green : 'var(--sketch-text)' }}>
          {hms(bigRemain)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{done ? 'time reached — timer stopped' : pending ? 'will count down when it starts' : 'remaining'}</div>
      </div>

      <div style={{ height: 14, borderRadius: 999, background: 'var(--surface2)', border: '2px solid var(--sketch-text)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: done ? green : 'var(--accent)', transition: 'width 0.4s linear' }} />
      </div>

      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--sketch-text)', textAlign: 'center' }}>
        {done
          ? <>Reached your target of <b>{fmtDur(cd.targetMin!)}</b> at <b>{clockOf(finish)}</b>.</>
          : pending
            ? <>Starts at <b>{clockOf(startMs)}</b> · finishes at <b>{clockOf(finish)}</b>.</>
            : <>Started <b>{clockOf(startMs)}</b> · finishes at <b>{clockOf(finish)}</b>.</>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Stat label={pending ? 'Starts' : 'Started'} value={clockOf(startMs)} accent={pending} />
        <Stat label={done ? 'Finished' : 'Finishes'} value={clockOf(finish)} accent={done} />
      </div>

      <button onClick={resetCountdown} style={bigBtn('oklch(0.62 0.18 25)')}>■ {done ? 'Start new' : pending ? 'Cancel schedule' : 'Cancel'}</button>
    </Panel>
  )
}
