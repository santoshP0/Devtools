import { useState, useEffect, useRef } from 'react'

// Rolling number wheel — native CSS scroll-snap, no library. Settles on the
// nearest value after a short scroll pause and snaps it to the centre band.
// Infinite rolling wheel. Transform-driven (no native scroll), so it loops
// seamlessly (23 → 00) and never hits an edge. Numbers are placed by modulo
// around a continuous pixel offset; drag / mouse-wheel move it, release snaps.
export const WHEEL_ITEM = 40
const WHEEL_BUF = 3 // slots rendered above & below centre
export function mod(n: number, len: number) { return ((n % len) + len) % len }

export function Wheel({ len, value, onChange }: { len: number; value: number; onChange: (n: number) => void }) {
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

// HH:MM rolling picker. value is minutes-of-day (0..1439).
export function TimeWheel({ value, onChange }: { value: number; onChange: (min: number) => void }) {
  const h = Math.floor(value / 60), m = value % 60
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <Wheel len={24} value={h} onChange={hh => onChange(hh * 60 + m)} />
      <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-muted)' }}>:</span>
      <Wheel len={60} value={m} onChange={mm => onChange(h * 60 + mm)} />
    </div>
  )
}
