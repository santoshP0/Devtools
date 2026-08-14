import { useState, useEffect, useRef, type CSSProperties } from 'react'
import ToolLayout from '../components/ToolLayout'
import ToolIcon from '../components/ToolIcon'
import {
  useSession, useTick, elapsedMs, startCountdown, resetSession,
} from '../lib/timeSession'

type Mode = 'countdown' | 'duration' | 'end'

const MODES: { id: Mode; label: string; icon: string; hint: string; accent: string }[] = [
  { id: 'countdown', label: 'Countdown', icon: 'Timer',             hint: 'start → target',  accent: 'var(--card-sec-text)' },
  { id: 'duration',  label: 'Duration',  icon: 'Hourglass',         hint: 'from → to',       accent: 'var(--card-data-text)' },
  { id: 'end',       label: 'End time',   icon: 'FlagTriangleRight', hint: 'start + length',  accent: 'var(--card-gen-text)' },
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
  const [mode, setMode] = useState<Mode>('countdown')

  return (
    <ToolLayout title="Time Tracker" description="Count down from a start time to a target and get notified when it's up, or work out durations and end times.">
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

        {mode === 'countdown' && <CountdownMode />}
        {mode === 'duration' && <DurationMode />}
        {mode === 'end' && <EndMode />}
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

// ── Countdown: pick a start time + a target length → live count-down to a
// deadline. Anchored to a fixed wall-clock start, fed to the top progress line +
// tray, and fires a notification when the target is reached.
function clockOf(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
function bigBtn(bg: string): CSSProperties {
  return {
    width: '100%', padding: '12px 0', borderRadius: 8, cursor: 'pointer',
    border: '2px solid var(--sketch-text)', background: bg, color: 'var(--sketch-bg)',
    boxShadow: '2px 2px 0 var(--sketch-text)', fontSize: 15, fontWeight: 700,
    fontFamily: "'Architects Daughter', var(--font-sans)",
  }
}
const ghostBtn: CSSProperties = {
  height: 44, padding: '0 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  fontFamily: "'Architects Daughter', var(--font-sans)", whiteSpace: 'nowrap',
  background: 'var(--surface)', color: 'var(--sketch-text)', border: '2px solid var(--sketch-text)',
  borderRadius: 6, boxShadow: '2px 2px 0 var(--sketch-text)',
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

// Rolling number wheel — native CSS scroll-snap, no library. Settles on the
// nearest value after a short scroll pause and snaps it to the centre band.
const WHEEL_ITEM = 40
function Wheel({ max, value, onChange }: { max: number; value: number; onChange: (n: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const drag = useRef<{ y: number; top: number } | null>(null)

  useEffect(() => {
    const el = ref.current; if (!el) return
    const target = value * WHEEL_ITEM
    if (Math.abs(el.scrollTop - target) > 2) el.scrollTop = target
  }, [value])

  // snap to the nearest value once movement stops (works for wheel + drag)
  const settle = () => {
    const el = ref.current; if (!el) return
    const n = Math.max(0, Math.min(max, Math.round(el.scrollTop / WHEEL_ITEM)))
    const target = n * WHEEL_ITEM
    if (Math.abs(el.scrollTop - target) > 1) el.scrollTo({ top: target, behavior: 'smooth' })
    if (n !== value) onChange(n)
  }
  const onScroll = () => {
    if (drag.current) return // settle on release, not mid-drag
    clearTimeout(t.current)
    t.current = setTimeout(settle, 80)
  }
  const onPointerDown = (e: React.PointerEvent) => {
    const el = ref.current; if (!el) return
    drag.current = { y: e.clientY, top: el.scrollTop }
    el.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const el = ref.current; if (!el || !drag.current) return
    el.scrollTop = drag.current.top - (e.clientY - drag.current.y)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const el = ref.current
    if (el) { try { el.releasePointerCapture(e.pointerId) } catch { /* already released */ } }
    drag.current = null
    settle()
  }

  return (
    <div style={{ position: 'relative', height: WHEEL_ITEM * 3, width: 60 }}>
      <div style={{ position: 'absolute', top: WHEEL_ITEM, left: 0, right: 0, height: WHEEL_ITEM, borderTop: '2px solid var(--sketch-text)', borderBottom: '2px solid var(--sketch-text)', pointerEvents: 'none' }} />
      <div
        ref={ref}
        className="wheel-scroll"
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          height: '100%', overflowY: 'scroll', boxSizing: 'border-box',
          padding: `${WHEEL_ITEM}px 0`, scrollbarWidth: 'none',
          userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none', cursor: 'grab',
        }}
      >
        {Array.from({ length: max + 1 }, (_, n) => (
          <div key={n} style={{
            height: WHEEL_ITEM, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontFamily: 'var(--font-mono)', fontWeight: 700, pointerEvents: 'none',
            color: n === value ? 'var(--sketch-text)' : 'var(--text-muted)',
            opacity: n === value ? 1 : 0.4, transition: 'opacity 0.15s, color 0.15s',
          }}>{String(n).padStart(2, '0')}</div>
        ))}
      </div>
    </div>
  )
}
function TimeWheels({ h, m, setH, setM, sep }: { h: number; m: number; setH: (n: number) => void; setM: (n: number) => void; sep: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <Wheel max={23} value={h} onChange={setH} />
      <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-muted)' }}>{sep}</span>
      <Wheel max={59} value={m} onChange={setM} />
    </div>
  )
}

function CountdownMode() {
  const session = useSession()
  const cd = session?.label === 'countdown' ? session : null
  useTick(!!cd?.running)

  const nd = new Date()
  const [sh, setSh] = useState(nd.getHours())   // start time defaults to now (sensible, not a preset)
  const [sm, setSm] = useState(nd.getMinutes())
  const [th, setTh] = useState(0)               // target length — no preset
  const [tm, setTm] = useState(0)

  const targetMin = th * 60 + tm
  const start = () => {
    if (targetMin <= 0) return
    const mid = new Date(); mid.setHours(0, 0, 0, 0)
    const startEpoch = mid.getTime() + (sh * 60 + sm) * 60000
    startCountdown(startEpoch, targetMin)
  }

  // ── setup ──
  if (!cd) {
    return (
      <Panel>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={wheelLabel}>Start time</div>
            <TimeWheels h={sh} m={sm} setH={setSh} setM={setSm} sep=":" />
            <button onClick={() => { const d = new Date(); setSh(d.getHours()); setSm(d.getMinutes()) }} style={{ ...ghostBtn, height: 32, marginTop: 10 }}>Now</button>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={wheelLabel}>Target length</div>
            <TimeWheels h={th} m={tm} setH={setTh} setM={setTm} sep="h" />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 14 }}>hours&nbsp;·&nbsp;minutes</div>
          </div>
        </div>
        <button onClick={start} disabled={targetMin <= 0} style={{ ...bigBtn('oklch(0.62 0.17 145)'), opacity: targetMin <= 0 ? 0.5 : 1, cursor: targetMin <= 0 ? 'not-allowed' : 'pointer' }}>▶ Start countdown</button>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
          A line at the top of the app fills as time passes — you'll get a notification when the target is reached.
        </p>
      </Panel>
    )
  }

  // ── live count-down ──
  const now = Date.now()
  const elapsed = elapsedMs(cd, now)
  const tMs = (cd.targetMin || 0) * 60000
  const startMs = now - elapsed
  const finish = startMs + tMs
  const progress = tMs ? Math.min(1, elapsed / tMs) : 0
  const remaining = Math.max(0, tMs - elapsed) // freezes at 0 — the timer stops at the end
  const done = elapsed >= tMs
  const green = 'oklch(0.55 0.17 145)'

  return (
    <Panel>
      <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: done ? green : 'var(--text-muted)' }}>
          {done ? '✓ Complete' : `${(progress * 100).toFixed(0)}% · target ${fmtDur(cd.targetMin!)}`}
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)', color: done ? green : 'var(--sketch-text)' }}>
          {hms(remaining)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{done ? 'time reached — timer stopped' : 'remaining'}</div>
      </div>

      <div style={{ height: 14, borderRadius: 999, background: 'var(--surface2)', border: '2px solid var(--sketch-text)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: done ? green : 'var(--accent)', transition: 'width 0.4s linear' }} />
      </div>

      {/* placeholder line under the timer once it ends, per request */}
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--sketch-text)', textAlign: 'center' }}>
        {done
          ? <>Reached your target of <b>{fmtDur(cd.targetMin!)}</b> at <b>{clockOf(finish)}</b>.</>
          : <>Started <b>{clockOf(startMs)}</b> · finishes at <b>{clockOf(finish)}</b>.</>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Stat label="Started" value={clockOf(startMs)} />
        <Stat label={done ? 'Finished' : 'Finishes'} value={clockOf(finish)} accent={done} />
      </div>

      <button onClick={resetSession} style={bigBtn('oklch(0.62 0.18 25)')}>■ {done ? 'Start new' : 'Cancel'}</button>
    </Panel>
  )
}
