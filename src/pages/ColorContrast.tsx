import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

function luminance(hex: string) {
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255
  const f = (v: number) => v <= 0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4
  return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b)
}
function contrast(h1: string, h2: string) {
  try {
    const l1=luminance(h1), l2=luminance(h2)
    const [hi,lo]=l1>l2?[l1,l2]:[l2,l1]
    return ((hi+0.05)/(lo+0.05)).toFixed(2)
  } catch { return '0' }
}

export default function ColorContrastPage() {
  const [fg, setFg] = useState('#ffffff')
  const [bg, setBg] = useState('#0d9488')

  const ratio  = Number(contrast(fg, bg))
  const aaaLg  = ratio >= 3
  const aa     = ratio >= 4.5
  const aaa    = ratio >= 7
  const aaLg   = ratio >= 3

  const badge = (label: string, pass: boolean) => (
    <div style={{
      padding:'12px 16px', borderRadius:10, textAlign:'center', flex:1, minWidth:90,
      background: pass ? 'oklch(0.17 0.05 145)' : 'oklch(0.17 0.05 25)',
      border:`1px solid ${pass ? 'oklch(0.45 0.12 145)' : 'oklch(0.45 0.12 25)'}`,
    }}>
      <div style={{ fontSize:20, marginBottom:4 }}>{pass ? '✓' : '✗'}</div>
      <div style={{ fontWeight:700, fontSize:13, color: pass ? 'var(--cat-gen)' : 'var(--cat-sec)' }}>{label}</div>
    </div>
  )

  return (
    <ToolLayout title="Color Contrast" description="Check WCAG AA/AAA contrast ratio between two colors">
      <div className="one-col">
        <div style={{ height:120, borderRadius:14, background:bg, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)' }}>
          <span style={{ color:fg, fontSize:24, fontWeight:700 }}>Sample Text Aa</span>
        </div>
        <div className="two-col">
          <div>
            <label>Foreground (Text)</label>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input type="color" value={fg} onChange={e=>setFg(e.target.value)} style={{ width:48, height:42, borderRadius:8, border:'1px solid var(--border)', padding:3, background:'none', cursor:'pointer' }} />
              <input type="text" value={fg} onChange={e=>setFg(e.target.value)} style={{ flex:1, fontFamily:'var(--font-mono)', fontSize:14 }} />
            </div>
          </div>
          <div>
            <label>Background</label>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input type="color" value={bg} onChange={e=>setBg(e.target.value)} style={{ width:48, height:42, borderRadius:8, border:'1px solid var(--border)', padding:3, background:'none', cursor:'pointer' }} />
              <input type="text" value={bg} onChange={e=>setBg(e.target.value)} style={{ flex:1, fontFamily:'var(--font-mono)', fontSize:14 }} />
            </div>
          </div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:56, fontWeight:800, fontFamily:'var(--font-mono)', color: ratio >= 4.5 ? 'var(--cat-gen)' : ratio >= 3 ? 'oklch(0.80 0.14 75)' : 'var(--cat-sec)', lineHeight:1 }}>{ratio}:1</div>
          <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>Contrast Ratio</div>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {badge('AA Normal', aa)}
          {badge('AA Large', aaLg)}
          {badge('AAA Normal', aaa)}
          {badge('AAA Large', aaaLg)}
        </div>
        <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', fontSize:13, color:'var(--text-dim)', lineHeight:1.8 }}>
          <strong style={{ color:'var(--text)' }}>WCAG Guidelines:</strong> AA requires 4.5:1 for normal text and 3:1 for large text (18pt+ or 14pt+ bold). AAA requires 7:1 for normal text and 4.5:1 for large text.
        </div>
      </div>
    </ToolLayout>
  )
}
