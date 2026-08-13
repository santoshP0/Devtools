import { useState, type CSSProperties } from 'react'
import ToolLayout from '../components/ToolLayout'
import ToolIcon from '../components/ToolIcon'
import {
  useSession, useTick, elapsedMs,
  startSession, pauseSession, resumeSession, resetSession,
} from '../lib/timeSession'

type Mode = 'duration' | 'end' | 'timer'

const MODES: { id: Mode; label: string; icon: string; hint: string; accent: string }[] = [
  { id: 'duration', label: 'Duration',  icon: 'Hourglass',         hint: 'from → to',       accent: 'var(--card-data-text)' },
  { id: 'end',      label: 'End time',   icon: 'FlagTriangleRight', hint: 'start + length',  accent: 'var(--card-gen-text)' },
  { id: 'timer',    label: 'Live timer', icon: 'Timer',             hint: 'track as you go', accent: 'var(--card-sec-text)' },
]

// ── time helpers ──
function parseMin(v: string): number | null {
  if (!v) return null
  const [h, m] = v.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}
function fmtDur(totalMin: number): string {
  const neg = totalMin < 0 ? '-' : ''
  let t = Math.abs(Math.round(totalMin))
  const h = Math.floor(t / 60); t %= 60
  if (h && t) return `${neg}${h}h ${t}m`
  if (h) return `${neg}${h}h`
  return `${neg}${t}m`
}
function minToClock(totalMin: number) {
  const days = Math.floor(totalMin / 1440)
  const t = ((totalMin % 1440) + 1440) % 1440
  const h24 = Math.floor(t / 60), m = t % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const h12 = h24 % 12 || 12
  return { clock24: `${pad(h24)}:${pad(m)}`, clock12: `${h12}:${pad(m)} ${h24 < 12 ? 'AM' : 'PM'}`, days }
}
function hms(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(sec)}`
}

const timeInput: CSSProperties = {
  width: '100%', height: 44, padding: '0 12px', fontSize: 16,
  fontFamily: 'var(--font-mono)', color: 'var(--sketch-text)',
  background: 'var(--surface)', border: '2px solid var(--sketch-text)',
  borderRadius: 6, boxShadow: '2px 2px 0px var(--sketch-text)', outline: 'none',
  boxSizing: 'border-box',
}

export default function TimeTracker() {
  const [mode, setMode] = useState<Mode>('duration')

  return (
    <ToolLayout title="Time Tracker" description="Work out durations and end times, factor in breaks, or run a live timer toward a target.">
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Icon-forward mode picker — big glyphs so you spot the mode instantly */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
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

        {mode === 'duration' && <DurationMode />}
        {mode === 'end' && <EndMode />}
        {mode === 'timer' && <TimerMode />}
      </div>
    </ToolLayout>
  )
}

// ── shared bits ──
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 130 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>{label}</label>
      {children}
    </div>
  )
}

function Breaks({ breaks, setBreaks }: { breaks: number[]; setBreaks: (b: number[]) => void }) {
  const [val, setVal] = useState('')
  const total = breaks.reduce((a, b) => a + b, 0)
  const add = () => {
    const n = Math.round(Number(val))
    if (n > 0) { setBreaks([...breaks, n]); setVal('') }
  }
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>
        <ToolIcon name="Coffee" size={14} /> Breaks {total > 0 && <span style={{ color: 'var(--sketch-text)' }}>· {fmtDur(total)} total</span>}
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {breaks.map((b, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 6px 4px 10px', borderRadius: 999, background: 'var(--surface2)', border: '1.5px solid var(--sketch-text)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
            {b}m
            <span role="button" tabIndex={0} onClick={() => setBreaks(breaks.filter((_, j) => j !== i))}
              onKeyDown={e => { if (e.key === 'Enter') setBreaks(breaks.filter((_, j) => j !== i)) }}
              title="Remove break" style={{ cursor: 'pointer', opacity: 0.6, fontSize: 14, lineHeight: 1 }}>×</span>
          </span>
        ))}
        <input
          type="number" min={1} value={val} placeholder="+ min"
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          style={{ width: 86, height: 34, padding: '0 10px', fontSize: 13, fontFamily: 'var(--font-mono)', background: 'var(--surface)', color: 'var(--sketch-text)', border: '2px solid var(--sketch-text)', borderRadius: 6, boxShadow: '2px 2px 0 var(--sketch-text)', outline: 'none' }}
        />
        <span role="button" tabIndex={0} onClick={add} onKeyDown={e => { if (e.key === 'Enter') add() }}
          style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '7px 12px', borderRadius: 6, border: '2px solid var(--sketch-text)', background: 'var(--surface)', boxShadow: '2px 2px 0 var(--sketch-text)', fontFamily: "'Architects Daughter', var(--font-sans)" }}>Add</span>
      </div>
    </div>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '2px solid var(--sketch-text)', boxShadow: '4px 4px 0px var(--sketch-text)', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {children}
    </div>
  )
}

// Big icon-led result — the number is the hero, the icon flags what it is.
function Result({ icon, color, big, sub, extra }: { icon: string; color: string; big: string; sub: string; extra?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 10, background: 'var(--surface2)', border: '2px solid var(--sketch-text)' }}>
      <span style={{
        flexShrink: 0, width: 54, height: 54, borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: color, color: 'var(--sketch-bg)', border: '2px solid var(--sketch-text)',
      }}>
        <ToolIcon name={icon} size={28} strokeWidth={2.2} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums', fontFamily: "'Architects Daughter', var(--font-sans)" }}>{big}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-sans)' }}>{sub}</div>
        {extra}
      </div>
    </div>
  )
}

// ── Duration mode: from → to (minus breaks) ──
function DurationMode() {
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('17:30')
  const [breaks, setBreaks] = useState<number[]>([])

  const s = parseMin(start), e = parseMin(end)
  const totalBreak = breaks.reduce((a, b) => a + b, 0)
  let span: number | null = null, overnight = false
  if (s != null && e != null) {
    span = e - s
    if (span <= 0) { span += 1440; overnight = true }
  }
  const net = span == null ? null : Math.max(0, span - totalBreak)

  return (
    <Panel>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Field label="Start"><input type="time" value={start} onChange={e => setStart(e.target.value)} style={timeInput} /></Field>
        <Field label="End"><input type="time" value={end} onChange={e => setEnd(e.target.value)} style={timeInput} /></Field>
      </div>
      <Breaks breaks={breaks} setBreaks={setBreaks} />
      {span == null ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Enter a start and end time.</p>
      ) : (
        <Result
          icon="Hourglass" color="var(--card-data-text)"
          big={fmtDur(net!)}
          sub={totalBreak > 0
            ? `${fmtDur(span)} elapsed − ${fmtDur(totalBreak)} breaks${overnight ? ' · overnight' : ''}`
            : `${(net! / 60).toFixed(2)} hours${overnight ? ' · overnight (+1 day)' : ''}`}
        />
      )}
    </Panel>
  )
}

// ── End time mode: start + length (+ breaks) → end ──
function EndMode() {
  const [start, setStart] = useState('09:00')
  const [h, setH] = useState('8')
  const [m, setM] = useState('0')
  const [breaks, setBreaks] = useState<number[]>([])

  const s = parseMin(start)
  const dur = (Number(h) || 0) * 60 + (Number(m) || 0)
  const totalBreak = breaks.reduce((a, b) => a + b, 0)
  const end = s != null && dur > 0 ? minToClock(s + dur + totalBreak) : null

  const numStyle: CSSProperties = { ...timeInput, width: '100%' }

  return (
    <Panel>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Field label="Start"><input type="time" value={start} onChange={e => setStart(e.target.value)} style={timeInput} /></Field>
        <Field label="Hours"><input type="number" min={0} value={h} onChange={e => setH(e.target.value)} style={numStyle} /></Field>
        <Field label="Minutes"><input type="number" min={0} max={59} value={m} onChange={e => setM(e.target.value)} style={numStyle} /></Field>
      </div>
      <Breaks breaks={breaks} setBreaks={setBreaks} />
      {end == null ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Enter a start time and a length.</p>
      ) : (
        <Result
          icon="FlagTriangleRight" color="var(--card-gen-text)"
          big={end.clock12}
          sub={`${end.clock24}${end.days > 0 ? ` · +${end.days} day${end.days > 1 ? 's' : ''}` : ''}${totalBreak > 0 ? ` · incl. ${fmtDur(totalBreak)} breaks` : ''}`}
        />
      )}
    </Panel>
  )
}

// ── Live timer: run toward a target, feeds the global top bar ──
function TimerMode() {
  const session = useSession()
  useTick(!!session?.running)
  const [h, setH] = useState('1')
  const [m, setM] = useState('0')

  const elapsed = session ? elapsedMs(session) : 0
  const targetMs = session?.targetMin ? session.targetMin * 60000 : null
  const progress = targetMs ? Math.min(1, elapsed / targetMs) : null
  const remaining = targetMs ? Math.max(0, targetMs - elapsed) : null
  const done = progress !== null && progress >= 1

  const btn = (bg: string): CSSProperties => ({
    flex: 1, padding: '12px 0', borderRadius: 8, cursor: 'pointer',
    border: '2px solid var(--sketch-text)', background: bg, color: 'var(--sketch-bg)',
    boxShadow: '2px 2px 0 var(--sketch-text)', fontSize: 15, fontWeight: 700,
    fontFamily: "'Architects Daughter', var(--font-sans)",
  })

  if (!session) {
    return (
      <Panel>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Field label="Target hours"><input type="number" min={0} value={h} onChange={e => setH(e.target.value)} style={timeInput} /></Field>
          <Field label="Target minutes"><input type="number" min={0} max={59} value={m} onChange={e => setM(e.target.value)} style={timeInput} /></Field>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
          Optional — leave at 0:0 to just count up. A target fills the progress line at the top of the screen as you work.
        </p>
        <button
          onClick={() => { const t = (Number(h) || 0) * 60 + (Number(m) || 0); startSession(t > 0 ? t : null) }}
          style={btn('oklch(0.62 0.17 145)')}
        >
          ▶ Start timer
        </button>
      </Panel>
    )
  }

  return (
    <Panel>
      <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
          {session.running ? 'Tracking' : 'Paused'}{session.targetMin ? ` · target ${fmtDur(session.targetMin)}` : ''}
        </div>
        <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)', color: done ? 'oklch(0.62 0.19 25)' : 'var(--sketch-text)' }}>
          {hms(elapsed)}
        </div>
        {remaining !== null && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {done ? 'target reached 🎉' : `${hms(remaining)} to go`}
          </div>
        )}
      </div>

      {progress !== null && (
        <div style={{ height: 12, borderRadius: 999, background: 'var(--surface2)', border: '2px solid var(--sketch-text)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: done ? 'oklch(0.62 0.19 25)' : 'oklch(0.62 0.17 145)', transition: 'width 0.4s linear' }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        {session.running
          ? <button onClick={pauseSession} style={btn('var(--card-data-text)')}>❚❚ Pause</button>
          : <button onClick={resumeSession} style={btn('oklch(0.62 0.17 145)')}>▶ Resume</button>}
        <button onClick={resetSession} style={{ ...btn('oklch(0.62 0.18 25)') }}>■ Reset</button>
      </div>
    </Panel>
  )
}
