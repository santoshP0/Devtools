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
// Infinite rolling wheel. Transform-driven (no native scroll), so it loops
// seamlessly (23 → 00) and never hits an edge. Numbers are placed by modulo
// around a continuous pixel offset; drag / mouse-wheel move it, release snaps.
const WHEEL_ITEM = 40
const WHEEL_BUF = 3 // slots rendered above & below centre
function mod(n: number, len: number) { return ((n % len) + len) % len }
function Wheel({ len, value, onChange }: { len: number; value: number; onChange: (n: number) => void }) {
  const H = WHEEL_ITEM * 3
  const off = useRef(value * WHEEL_ITEM)      // continuous position in px
  const drag = useRef<{ y: number; off: number } | null>(null)
  const snapT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [snapping, setSnapping] = useState(false)
  const [, force] = useState(0)
  const redraw = () => force(n => n + 1)

  // follow external value changes (preset chips, "set to now", etc.)
  useEffect(() => {
    if (mod(Math.round(off.current / WHEEL_ITEM), len) !== value) { off.current = value * WHEEL_ITEM; redraw() }
  }, [value, len])

  const snap = () => {
    const target = Math.round(off.current / WHEEL_ITEM)
    off.current = target * WHEEL_ITEM
    setSnapping(true)
    redraw()
    const v = mod(target, len)
    if (v !== value) onChange(v)
    clearTimeout(snapT.current)
    snapT.current = setTimeout(() => setSnapping(false), 200)
  }
  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setSnapping(false)
    drag.current = { y: e.clientY, off: off.current }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    off.current = drag.current.off - (e.clientY - drag.current.y)
    redraw()
  }
  const onPointerUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* released */ }
    if (!drag.current) return
    drag.current = null
    snap()
  }
  const onWheel = (e: React.WheelEvent) => {
    off.current += e.deltaY
    setSnapping(false)
    redraw()
    clearTimeout(snapT.current)
    snapT.current = setTimeout(snap, 100)
  }

  const center = Math.round(off.current / WHEEL_ITEM)
  const slots: number[] = []
  for (let k = center - WHEEL_BUF; k <= center + WHEEL_BUF; k++) slots.push(k)

  return (
    <div
      style={{ position: 'relative', height: H, width: 60, overflow: 'hidden', cursor: 'grab', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <div style={{ position: 'absolute', top: WHEEL_ITEM, left: 0, right: 0, height: WHEEL_ITEM, borderTop: '2px solid var(--sketch-text)', borderBottom: '2px solid var(--sketch-text)', pointerEvents: 'none' }} />
      {slots.map(k => {
        const y = k * WHEEL_ITEM - off.current + (H / 2 - WHEEL_ITEM / 2)
        const dist = Math.abs(k * WHEEL_ITEM - off.current) / WHEEL_ITEM
        return (
          <div key={k} style={{
            position: 'absolute', left: 0, right: 0, height: WHEEL_ITEM, top: 0,
            transform: `translateY(${y}px)`,
            transition: snapping ? 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontFamily: 'var(--font-mono)', fontWeight: 700, pointerEvents: 'none',
            color: 'var(--sketch-text)', opacity: Math.max(0.18, 1 - dist * 0.42),
          }}>{String(mod(k, len)).padStart(2, '0')}</div>
        )
      })}
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
  const session = useSession()
  const cd = session?.label === 'countdown' ? session : null
  useTick(!!cd?.running)

  const [durationMin, setDurationMin] = useState(0) // no preset selected
  const [customOpen, setCustomOpen] = useState(false)

  const start = () => {
    if (durationMin <= 0) return
    startCountdown(Date.now(), durationMin)
  }

  // ── setup: start = now (top) → pick how long (bottom) ──
  if (!cd) {
    const previewEnd = Date.now() + durationMin * 60000
    return (
      <Panel>
        {/* start — always the current time, no fiddling */}
        <div style={{ textAlign: 'center' }}>
          <div style={wheelLabel}>Starts</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Architects Daughter', var(--font-sans)", color: 'var(--sketch-text)' }}>
            Now · {clockOf(Date.now())}
          </div>
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
