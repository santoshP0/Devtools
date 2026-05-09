import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const click = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }
  return <button className="btn btn-ghost btn-sm" onClick={click}>{copied ? '✓ Copied' : label}</button>
}

export default function CssUnitConverterPage() {
  const [baseFontSize, setBaseFontSize] = useState(16)
  const [viewportW, setViewportW] = useState(1440)
  const [viewportH, setViewportH] = useState(900)
  const [values, setValues] = useState<Record<string,string>>({ px:'16', em:'1', rem:'1', vw:'1.111', vh:'1.778', pt:'12', cm:'0.423', '%':'100' })

  const PX_FACTORS = useMemo(() => ({
    px:  1,
    em:  baseFontSize,
    rem: baseFontSize,
    vw:  viewportW / 100,
    vh:  viewportH / 100,
    pt:  96 / 72,
    cm:  96 / 2.54,
    '%': baseFontSize / 100,
  }), [baseFontSize, viewportW, viewportH])

  const updateFrom = (unit: string, raw: string) => {
    const n = parseFloat(raw)
    if (isNaN(n)) { setValues(v => ({...v, [unit]: raw})); return }
    const px = n * PX_FACTORS[unit as keyof typeof PX_FACTORS]
    const next: Record<string,string> = {}
    Object.keys(PX_FACTORS).forEach(u => {
      next[u] = u === unit ? raw : parseFloat((px / PX_FACTORS[u as keyof typeof PX_FACTORS]).toFixed(4)).toString()
    })
    setValues(next)
  }

  const UNITS = [
    { key:'px',  label:'px',  desc:'Pixels' },
    { key:'em',  label:'em',  desc:'Relative to parent font-size' },
    { key:'rem', label:'rem', desc:'Relative to root font-size' },
    { key:'vw',  label:'vw',  desc:'% of viewport width' },
    { key:'vh',  label:'vh',  desc:'% of viewport height' },
    { key:'pt',  label:'pt',  desc:'Points (1pt = 1.333px)' },
    { key:'cm',  label:'cm',  desc:'Centimeters' },
    { key:'%',   label:'%',   desc:'% of parent font-size' },
  ]

  return (
    <ToolLayout title="CSS Unit Converter" description="Convert px, em, rem, vw, vh, pt — all synced live">
      <div className="one-col">
        <div style={{ display:'flex', gap:16, flexWrap:'wrap', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 20px' }}>
          <div>
            <label>Base Font Size</label>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="number" value={baseFontSize} onChange={e => setBaseFontSize(Number(e.target.value))} style={{ width:70 }} />
              <span style={{ fontSize:13, color:'var(--text-muted)' }}>px</span>
            </div>
          </div>
          <div>
            <label>Viewport Width</label>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="number" value={viewportW} onChange={e => setViewportW(Number(e.target.value))} style={{ width:90 }} />
              <span style={{ fontSize:13, color:'var(--text-muted)' }}>px</span>
            </div>
          </div>
          <div>
            <label>Viewport Height</label>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="number" value={viewportH} onChange={e => setViewportH(Number(e.target.value))} style={{ width:90 }} />
              <span style={{ fontSize:13, color:'var(--text-muted)' }}>px</span>
            </div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:12 }}>
          {UNITS.map(({key, label, desc}) => (
            <div key={key} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontWeight:700, fontSize:16, color:'var(--accent)', fontFamily:'var(--font-mono)' }}>{label}</span>
                <CopyBtn text={`${values[key]}${key}`} label="Copy" />
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10 }}>{desc}</div>
              <input type="text" value={values[key]} onChange={e => updateFrom(key, e.target.value)}
                style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight:600 }} />
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {[8,10,12,14,16,18,20,24,32,48,64].map(n => (
            <button key={n} onClick={() => updateFrom('px', String(n))} style={{
              padding:'5px 12px', borderRadius:8, border:'1px solid var(--border)',
              background: values.px === String(n) ? 'var(--accent-bg)' : 'transparent',
              color: values.px === String(n) ? 'var(--accent)' : 'var(--text-dim)',
              fontFamily:'var(--font-mono)', fontSize:13, cursor:'pointer', transition:'all 0.15s',
            }}>{n}px</button>
          ))}
        </div>
      </div>
    </ToolLayout>
  )
}
