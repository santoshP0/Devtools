import { useState, useMemo, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const click = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }
  return <button className="btn btn-ghost btn-sm" onClick={click}>{copied ? '✓ Copied' : label}</button>
}

function SegControl({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="option-row">
      {options.map(o => (
        <button key={o} className={`seg-btn ${value === o ? 'active' : ''}`} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  )
}

interface Stop { id: number; color: string; pos: number }

const DIRECTIONS = [
  { label:'↑', val:0 }, { label:'↗', val:45 }, { label:'→', val:90 }, { label:'↘', val:135 },
  { label:'↓', val:180 }, { label:'↙', val:225 }, { label:'←', val:270 }, { label:'↖', val:315 },
]

export default function GradientBuilderPage() {
  const [type, setType] = useState('linear')
  const [angle, setAngle] = useState(135)
  const [radialShape, setRadialShape] = useState('circle')
  const [stops, setStops] = useState<Stop[]>([
    { id:1, color:'#0d9488', pos:0 },
    { id:2, color:'#7c3aed', pos:100 },
  ])
  const nextId = useRef(3)

  const gradientCSS = useMemo(() => {
    const sorted = [...stops].sort((a,b) => a.pos - b.pos)
    const stopsStr = sorted.map(s => `${s.color} ${s.pos}%`).join(', ')
    if (type === 'linear') return `linear-gradient(${angle}deg, ${stopsStr})`
    if (type === 'radial')  return `radial-gradient(${radialShape} at center, ${stopsStr})`
    return `conic-gradient(from ${angle}deg, ${stopsStr})`
  }, [stops, type, angle, radialShape])

  const addStop = () => {
    const mid = stops.length > 1 ? Math.round((stops[0].pos + stops[stops.length-1].pos)/2) : 50
    setStops(s => [...s, { id: nextId.current++, color:'#f59e0b', pos: mid }])
  }
  const removeStop = (id: number) => { if (stops.length > 2) setStops(s => s.filter(x => x.id !== id)) }
  const updateStop = (id: number, key: keyof Stop, val: string | number) => setStops(s => s.map(x => x.id===id ? {...x,[key]:val} : x))

  return (
    <ToolLayout title="Gradient Builder" description="Visual CSS gradient editor with live preview and copy">
      <div className="one-col">
        <div style={{ height:160, borderRadius:14, background:gradientCSS, border:'1px solid var(--border)', transition:'background 0.3s' }} />

        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-start' }}>
          <div>
            <div className="section-label">Type</div>
            <SegControl options={['linear','radial','conic']} value={type} onChange={setType} />
          </div>
          {(type === 'linear' || type === 'conic') && (
            <div>
              <div className="section-label">Direction</div>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {DIRECTIONS.map(d => (
                  <button key={d.val} onClick={() => setAngle(d.val)} style={{
                    width:36, height:36, borderRadius:8, border:'1px solid',
                    background: angle===d.val ? 'var(--accent-bg)' : 'transparent',
                    color: angle===d.val ? 'var(--accent)' : 'var(--text-dim)',
                    borderColor: angle===d.val ? 'var(--accent-dim)' : 'var(--border)',
                    cursor:'pointer', fontSize:14, transition:'all 0.15s',
                  }}>{d.label}</button>
                ))}
                <input type="number" value={angle} onChange={e => setAngle(Number(e.target.value))}
                  style={{ width:62, fontFamily:'var(--font-mono)', fontSize:13 }} placeholder="135" />
              </div>
            </div>
          )}
          {type === 'radial' && (
            <div>
              <div className="section-label">Shape</div>
              <SegControl options={['circle','ellipse']} value={radialShape} onChange={setRadialShape} />
            </div>
          )}
        </div>

        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div className="section-label">Color Stops</div>
            <button className="btn btn-ghost btn-sm" onClick={addStop}>+ Add Stop</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[...stops].sort((a,b)=>a.pos-b.pos).map(stop => (
              <div key={stop.id} style={{ display:'flex', gap:12, alignItems:'center', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px' }}>
                <input type="color" value={stop.color} onChange={e => updateStop(stop.id,'color',e.target.value)}
                  style={{ width:40, height:36, borderRadius:6, border:'1px solid var(--border)', padding:2, background:'none', cursor:'pointer' }} />
                <input type="text" value={stop.color} onChange={e => updateStop(stop.id,'color',e.target.value)}
                  style={{ width:90, fontFamily:'var(--font-mono)', fontSize:13 }} />
                <div style={{ flex:1 }}>
                  <input type="range" min={0} max={100} value={stop.pos} onChange={e => updateStop(stop.id,'pos',Number(e.target.value))} />
                </div>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:13, minWidth:36, color:'var(--text-dim)' }}>{stop.pos}%</span>
                <button onClick={() => removeStop(stop.id)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18, lineHeight:1, padding:'0 4px' }}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div className="section-label">CSS Output</div>
            <CopyBtn text={`background: ${gradientCSS};`} />
          </div>
          <pre className="code-out">{`background: ${gradientCSS};\nbackground-image: ${gradientCSS};`}</pre>
        </div>
      </div>
    </ToolLayout>
  )
}
