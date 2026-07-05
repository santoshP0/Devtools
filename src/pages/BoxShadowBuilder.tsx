import { useState, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'

interface Shadow { id: number; x: number; y: number; blur: number; spread: number; color: string; opacity: number; inset: boolean }

export default function BoxShadowBuilderPage() {
  const [shadows, setShadows] = useState<Shadow[]>([
    { id:1, x:0, y:4, blur:16, spread:0, color:'#000000', opacity:30, inset:false },
    { id:2, x:0, y:1, blur:4,  spread:0, color:'#000000', opacity:15, inset:false },
  ])
  const [bgColor, setBgColor] = useState('#1a1a2e')
  const [boxColor, setBoxColor] = useState('#16213e')
  const nextId = useRef(3)

  const toCSS = (s: Shadow) => {
    const hex = s.color.replace('#','')
    const r=parseInt(hex.slice(0,2),16), g=parseInt(hex.slice(2,4),16), b=parseInt(hex.slice(4,6),16)
    return `${s.inset?'inset ':''}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px rgba(${r},${g},${b},${s.opacity/100})`
  }

  const cssValue = shadows.map(toCSS).join(',\n             ')
  const cssDecl = `box-shadow: ${cssValue};`

  const addShadow = () => setShadows(s => [...s, { id:nextId.current++, x:0, y:8, blur:24, spread:-4, color:'#000000', opacity:20, inset:false }])
  const removeShadow = (id: number) => { if (shadows.length>1) setShadows(s=>s.filter(x=>x.id!==id)) }
  const update = (id: number, key: keyof Shadow, val: unknown) => setShadows(s => s.map(x => x.id===id ? {...x,[key]:val} : x))

  return (
    <ToolLayout title="Box Shadow Builder" description="Visual multi-layer CSS box-shadow generator">
      <div className="one-col">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, borderRadius:14, background:bgColor, border:'1px solid var(--border)', transition:'background 0.3s' }}>
          <div style={{ width:140, height:100, borderRadius:12, background:boxColor, boxShadow: shadows.map(toCSS).join(', '), transition:'box-shadow 0.2s, background 0.3s' }} />
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
          <div>
            <label>Canvas color</label>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)} style={{ width:40, height:36, borderRadius:6, border:'1px solid var(--border)', padding:2, background:'none', cursor:'pointer' }} />
              <input type="text" value={bgColor} onChange={e=>setBgColor(e.target.value)} style={{ width:90, fontSize:13, fontFamily:'var(--font-mono)' }} />
            </div>
          </div>
          <div>
            <label>Box color</label>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input type="color" value={boxColor} onChange={e=>setBoxColor(e.target.value)} style={{ width:40, height:36, borderRadius:6, border:'1px solid var(--border)', padding:2, background:'none', cursor:'pointer' }} />
              <input type="text" value={boxColor} onChange={e=>setBoxColor(e.target.value)} style={{ width:90, fontSize:13, fontFamily:'var(--font-mono)' }} />
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={addShadow} style={{ marginBottom:1 }}>+ Add Layer</button>
        </div>
        {shadows.map((s, i) => (
          <div key={s.id} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontWeight:600, fontSize:13 }}>Layer {i+1}</span>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, marginBottom:0, fontSize:13, cursor:'pointer' }}>
                  <input type="checkbox" checked={s.inset} onChange={e=>update(s.id,'inset',e.target.checked)} />
                  Inset
                </label>
                <button onClick={()=>removeShadow(s.id)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))', gap:12 }}>
              {[{k:'x',label:'X Offset',min:-100,max:100},{k:'y',label:'Y Offset',min:-100,max:100},{k:'blur',label:'Blur',min:0,max:200},{k:'spread',label:'Spread',min:-100,max:100}].map(({k,label,min,max}) => (
                <div key={k}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                    <span style={{ color:'var(--text-dim)' }}>{label}</span>
                    <span style={{ fontFamily:'var(--font-mono)', color:'var(--accent)' }}>{s[k as keyof Shadow]}px</span>
                  </div>
                  <input type="range" min={min} max={max} value={s[k as keyof Shadow] as number} onChange={e=>update(s.id,k as keyof Shadow,Number(e.target.value))} />
                </div>
              ))}
              <div>
                <div style={{ fontSize:12, color:'var(--text-dim)', marginBottom:4 }}>Opacity: <span style={{ fontFamily:'var(--font-mono)', color:'var(--accent)' }}>{s.opacity}%</span></div>
                <input type="range" min={0} max={100} value={s.opacity} onChange={e=>update(s.id,'opacity',Number(e.target.value))} />
              </div>
              <div>
                <div style={{ fontSize:12, color:'var(--text-dim)', marginBottom:4 }}>Color</div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <input type="color" value={s.color} onChange={e=>update(s.id,'color',e.target.value)} style={{ width:36, height:32, borderRadius:6, border:'1px solid var(--border)', padding:2, background:'none', cursor:'pointer' }} />
                  <input type="text" value={s.color} onChange={e=>update(s.id,'color',e.target.value)} style={{ flex:1, fontSize:12, fontFamily:'var(--font-mono)' }} />
                </div>
              </div>
            </div>
          </div>
        ))}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div className="section-label">CSS Output</div>
            <CopyBtn text={cssDecl} />
          </div>
          <pre className="code-out" style={{ fontSize:13 }}>{cssDecl}</pre>
        </div>
      </div>
    </ToolLayout>
  )
}
