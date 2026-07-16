import { useState, useMemo, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'

/* ── Helpers ── */
interface Stop { id: number; color: string; pos: number }

const DIRECTIONS = [
  { label: '↑', val: 0 }, { label: '↗', val: 45 }, { label: '→', val: 90 }, { label: '↘', val: 135 },
  { label: '↓', val: 180 }, { label: '↙', val: 225 }, { label: '←', val: 270 }, { label: '↖', val: 315 },
]

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const num = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

/* ── Canvas export ── */
function exportGradientPng(
  gradientCss: string,
  type: string,
  angle: number,
  radialShape: string,
  stops: Stop[],
  width: number,
  height: number,
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const sorted = [...stops].sort((a, b) => a.pos - b.pos)

  let grad: CanvasGradient
  if (type === 'linear') {
    const rad = (angle - 90) * (Math.PI / 180)
    const cos = Math.cos(rad), sin = Math.sin(rad)
    const hw = width / 2, hh = height / 2
    grad = ctx.createLinearGradient(hw - cos * hw, hh - sin * hh, hw + cos * hw, hh + sin * hh)
  } else if (type === 'radial') {
    const r = Math.max(width, height) / 2
    grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, r)
  } else {
    // conic — approximate with linear
    const rad = (angle - 90) * (Math.PI / 180)
    const cos = Math.cos(rad), sin = Math.sin(rad)
    const hw = width / 2, hh = height / 2
    grad = ctx.createLinearGradient(hw - cos * hw, hh - sin * hh, hw + cos * hw, hh + sin * hh)
  }

  sorted.forEach(s => {
    try {
      const [r, g, b] = hexToRgb(s.color)
      grad.addColorStop(s.pos / 100, `rgb(${r},${g},${b})`)
    } catch { /* skip invalid */ }
  })

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  canvas.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `gradient_${width}x${height}.png`; a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

export default function GradientBuilderPage() {
  const [type, setType] = useState('linear')
  const [angle, setAngle] = useState(135)
  const [radialShape, setRadialShape] = useState('circle')
  const [stops, setStops] = useState<Stop[]>([
    { id: 1, color: '#0d9488', pos: 0 },
    { id: 2, color: '#7c3aed', pos: 100 },
  ])
  const [exportW, setExportW] = useState(800)
  const [exportH, setExportH] = useState(400)
  const nextId = useRef(3)

  const gradientCSS = useMemo(() => {
    const sorted = [...stops].sort((a, b) => a.pos - b.pos)
    const stopsStr = sorted.map(s => `${s.color} ${s.pos}%`).join(', ')
    if (type === 'linear') return `linear-gradient(${angle}deg, ${stopsStr})`
    if (type === 'radial')  return `radial-gradient(${radialShape} at center, ${stopsStr})`
    return `conic-gradient(from ${angle}deg, ${stopsStr})`
  }, [stops, type, angle, radialShape])

  const addStop = () => {
    const sorted = [...stops].sort((a, b) => a.pos - b.pos)
    let bestPct = 50, bestGap = 0
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].pos - sorted[i].pos
      if (gap > bestGap) { bestGap = gap; bestPct = Math.round((sorted[i].pos + sorted[i + 1].pos) / 2) }
    }
    setStops(s => [...s, { id: nextId.current++, color: '#f59e0b', pos: bestPct }])
  }
  const removeStop = (id: number) => { if (stops.length > 2) setStops(s => s.filter(x => x.id !== id)) }
  const updateStop = (id: number, key: keyof Stop, val: string | number) =>
    setStops(s => s.map(x => x.id === id ? { ...x, [key]: val } : x))

  const handleExportPng = () => {
    exportGradientPng(gradientCSS, type, angle, radialShape, stops, exportW || 800, exportH || 400)
  }

  // Preview aspect ratio mirrors export
  const previewAspect = Math.max(0.25, Math.min(4, (exportW || 800) / (exportH || 400)))

  return (
    <ToolLayout title="Gradient Builder" description="Visual CSS gradient editor with live preview, adjustable export size, and PNG download">
      <div className="one-col">

        {/* ── Preview ── */}
        <div style={{
          width: '100%',
          paddingBottom: `${100 / previewAspect}%`,
          maxHeight: 240,
          position: 'relative',
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          transition: 'padding-bottom 0.3s',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: gradientCSS,
            transition: 'background 0.3s',
          }} />
          {/* Size watermark */}
          <div style={{
            position: 'absolute', bottom: 10, right: 12,
            fontSize: 11, fontFamily: 'var(--font-mono)',
            color: 'rgba(255,255,255,0.55)',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}>
            {exportW} × {exportH}px
          </div>
        </div>

        {/* ── Type + Direction ── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <div className="section-label">Type</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['linear', 'radial', 'conic'].map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    padding: '5px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', border: '1px solid',
                    background: type === t ? 'var(--accent-bg)' : 'transparent',
                    color: type === t ? 'var(--accent)' : 'var(--text-dim)',
                    borderColor: type === t ? 'var(--accent-dim)' : 'var(--border)',
                    transition: 'all 0.15s',
                  }}
                >{t}</button>
              ))}
            </div>
          </div>

          {(type === 'linear' || type === 'conic') && (
            <div>
              <div className="section-label">Direction</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                {DIRECTIONS.map(d => (
                  <button
                    key={d.val} onClick={() => setAngle(d.val)}
                    style={{
                      width: 34, height: 34, borderRadius: 8, border: '1px solid',
                      background: angle === d.val ? 'var(--accent-bg)' : 'transparent',
                      color: angle === d.val ? 'var(--accent)' : 'var(--text-dim)',
                      borderColor: angle === d.val ? 'var(--accent-dim)' : 'var(--border)',
                      cursor: 'pointer', fontSize: 15, transition: 'all 0.15s',
                    }}
                  >{d.label}</button>
                ))}
                <input
                  type="number" value={angle} onChange={e => setAngle(Number(e.target.value))}
                  style={{ width: 60, fontFamily: 'var(--font-mono)', fontSize: 13 }}
                  placeholder="135"
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>°</span>
                <input
                  type="range" min={0} max={360} value={angle} onChange={e => setAngle(Number(e.target.value))}
                  style={{ width: 100, cursor: 'pointer' }}
                />
              </div>
            </div>
          )}

          {type === 'radial' && (
            <div>
              <div className="section-label">Shape</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['circle', 'ellipse'].map(s => (
                  <button
                    key={s} onClick={() => setRadialShape(s)}
                    style={{
                      padding: '5px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                      fontFamily: 'var(--font-sans)', border: '1px solid',
                      background: radialShape === s ? 'var(--accent-bg)' : 'transparent',
                      color: radialShape === s ? 'var(--accent)' : 'var(--text-dim)',
                      borderColor: radialShape === s ? 'var(--accent-dim)' : 'var(--border)',
                      transition: 'all 0.15s',
                    }}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Color Stops ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="section-label">Color Stops</div>
            <button className="btn btn-ghost btn-sm" onClick={addStop}>+ Add Stop</button>
          </div>
          {/* Gradient bar with stop indicators */}
          <div style={{
            height: 8, borderRadius: 4, background: gradientCSS,
            marginBottom: 14, border: '1px solid var(--border)',
            transition: 'background 0.3s',
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...stops].sort((a, b) => a.pos - b.pos).map(stop => (
              <div key={stop.id} style={{
                display: 'flex', gap: 10, alignItems: 'center',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '8px 12px',
              }}>
                <input
                  type="color" value={stop.color} onChange={e => updateStop(stop.id, 'color', e.target.value)}
                  style={{ width: 38, height: 34, borderRadius: 6, border: '1px solid var(--border)', padding: 2, background: 'none', cursor: 'pointer' }}
                />
                <input
                  type="text" value={stop.color} onChange={e => updateStop(stop.id, 'color', e.target.value)}
                  style={{ width: 86, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                />
                <div style={{ flex: 1 }}>
                  <input
                    type="range" min={0} max={100} value={stop.pos}
                    onChange={e => updateStop(stop.id, 'pos', Number(e.target.value))}
                  />
                </div>
                <input
                  type="number" min={0} max={100} value={stop.pos}
                  onChange={e => updateStop(stop.id, 'pos', Math.max(0, Math.min(100, Number(e.target.value))))}
                  style={{ width: 52, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 14 }}>%</span>
                <button
                  onClick={() => removeStop(stop.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
                  title="Remove stop"
                >×</button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Export section ── */}
        <div className="panel" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <span className="section-label" style={{ margin: 0 }}>Export</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <CopyBtn text={`background: ${gradientCSS};\nbackground-image: ${gradientCSS};`} label="Copy CSS" />
              <button className="btn btn-primary btn-sm" onClick={handleExportPng} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v8M5 7l3 3 3-3M2 12v1.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Export PNG
              </button>
            </div>
          </div>

          {/* Size inputs */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Size:</span>
            <input
              type="number" value={Number.isNaN(exportW) ? '' : exportW} min={1} max={8000}
              onChange={e => setExportW(e.target.valueAsNumber)}
              onBlur={() => setExportW(w => Math.max(1, Math.min(8000, w || 800)))}
              style={{ width: 80, fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>×</span>
            <input
              type="number" value={Number.isNaN(exportH) ? '' : exportH} min={1} max={8000}
              onChange={e => setExportH(e.target.valueAsNumber)}
              onBlur={() => setExportH(h => Math.max(1, Math.min(8000, h || 400)))}
              style={{ width: 80, fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>px</span>
            {/* Quick presets */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {[
                { label: 'HD', w: 1280, h: 720 }, { label: 'FHD', w: 1920, h: 1080 },
                { label: '4K', w: 3840, h: 2160 }, { label: 'Square', w: 1080, h: 1080 },
                { label: 'Banner', w: 1200, h: 400 },
              ].map(p => (
                <button
                  key={p.label}
                  onClick={() => { setExportW(p.w); setExportH(p.h) }}
                  style={{
                    padding: '3px 9px', borderRadius: 6, fontSize: 11,
                    fontFamily: 'var(--font-sans)', cursor: 'pointer',
                    border: '1px solid var(--border)',
                    background: exportW === p.w && exportH === p.h ? 'var(--accent-bg)' : 'transparent',
                    color: exportW === p.w && exportH === p.h ? 'var(--accent)' : 'var(--text-muted)',
                    transition: 'all 0.12s',
                  }}
                >{p.label}</button>
              ))}
            </div>
          </div>

          {/* CSS output */}
          <pre style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 13px',
            fontFamily: 'var(--font-mono)', fontSize: 11.5,
            color: 'var(--text-dim)', lineHeight: 1.7,
            overflowX: 'auto',
          }}>
            {`background: ${gradientCSS};\nbackground-image: ${gradientCSS};`}
          </pre>
        </div>
      </div>
    </ToolLayout>
  )
}
