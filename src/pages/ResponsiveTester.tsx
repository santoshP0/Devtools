import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

const DEVICES = [
  { label: 'Mobile S',    w: 320,  h: 568,  icon: '📱' },
  { label: 'Mobile M',    w: 375,  h: 667,  icon: '📱' },
  { label: 'Mobile L',    w: 414,  h: 736,  icon: '📱' },
  { label: 'iPhone 14 Pro', w: 390, h: 844, icon: '📱' },
  { label: 'Tablet',      w: 768,  h: 1024, icon: '📟' },
  { label: 'iPad Pro',    w: 1024, h: 1366, icon: '📟' },
  { label: 'Laptop',      w: 1280, h: 800,  icon: '💻' },
  { label: 'Desktop',     w: 1440, h: 900,  icon: '🖥️' },
  { label: 'Wide',        w: 1920, h: 1080, icon: '🖥️' },
]

export default function ResponsiveTesterPage() {
  const [url, setUrl] = useState('https://example.com')
  const [active, setActive] = useState(DEVICES[0])
  const [loaded, setLoaded] = useState('')
  const [customW, setCustomW] = useState(375)
  const [customH, setCustomH] = useState(667)
  const [useCustom, setUseCustom] = useState(false)
  const [zoom, setZoom] = useState(0.6)

  const current = useCustom ? { label: 'Custom', w: customW, h: customH, icon: '📐' } : active

  const load = () => { if (url.trim()) setLoaded(url.trim().startsWith('http') ? url.trim() : 'https://' + url.trim()) }

  return (
    <ToolLayout title="Responsive Screen Tester" description="Preview any URL at common device breakpoints">
      <div className="one-col">
        <div style={{ display:'flex', gap:8 }}>
          <input type="text" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="https://example.com" style={{ flex:1, fontSize:14 }} />
          <button className="btn btn-primary" onClick={load}>Load</button>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {DEVICES.map(d => (
            <button key={d.label} onClick={() => { setActive(d); setUseCustom(false) }} style={{
              padding:'6px 12px', borderRadius:8, border:'1px solid', cursor:'pointer',
              fontFamily:'var(--font-sans)', fontSize:12, transition:'all 0.15s',
              background: !useCustom && active.label === d.label ? 'var(--accent-bg)' : 'transparent',
              color: !useCustom && active.label === d.label ? 'var(--accent)' : 'var(--text-dim)',
              borderColor: !useCustom && active.label === d.label ? 'var(--accent-dim)' : 'var(--border)',
            }}>{d.icon} {d.label} <span style={{ opacity:0.6, fontFamily:'var(--font-mono)', fontSize:11 }}>{d.w}×{d.h}</span></button>
          ))}
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
          <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:0, cursor:'pointer', fontSize:13 }}>
            <input type="checkbox" checked={useCustom} onChange={e => setUseCustom(e.target.checked)} />
            Custom size
          </label>
          {useCustom && (
            <>
              <div><label>Width (px)</label><input type="number" value={customW} onChange={e => setCustomW(Number(e.target.value))} style={{ width:90 }} /></div>
              <div><label>Height (px)</label><input type="number" value={customH} onChange={e => setCustomH(Number(e.target.value))} style={{ width:90 }} /></div>
            </>
          )}
          <div style={{ marginLeft:'auto' }}>
            <label>Zoom: {Math.round(zoom * 100)}%</label>
            <input type="range" min={0.2} max={1} step={0.05} value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ width:120 }} />
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12, color:'var(--text-muted)', fontSize:13 }}>
          <span>{current.icon} {current.label}</span>
          <span style={{ fontFamily:'var(--font-mono)' }}>{current.w} × {current.h}px</span>
        </div>
        {loaded ? (
          <div style={{ overflow:'auto', border:'1px solid var(--border)', borderRadius:12, background:'var(--bg)', padding:16 }}>
            <div style={{ width:current.w * zoom, height:current.h * zoom, overflow:'hidden', margin:'0 auto', borderRadius:8, boxShadow:'0 8px 32px oklch(0 0 0 / 0.5)', border:'1px solid var(--border)' }}>
              <iframe
                src={loaded} title="preview"
                style={{ width: current.w, height: current.h, border:'none', transform:`scale(${zoom})`, transformOrigin:'top left' }}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        ) : (
          <div style={{ height:300, border:'2px dashed var(--border)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:15 }}>
            Enter a URL and click Load
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
