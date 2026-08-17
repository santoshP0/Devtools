import { useState, useRef, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'
import { saveFile, saveFilesToDir, urlToBlob } from '../lib/saveFile'

const SIZES = [16, 32, 48, 64, 96, 128, 180, 192, 512]
const BG_PRESETS = ['#0d9488','#7c3aed','#2563eb','#dc2626','#16a34a','#d97706','#000000','#ffffff','transparent']

export default function FaviconGeneratorPage() {
  const [text, setText] = useState('DT')
  const [bgColor, setBgColor] = useState('#0d9488')
  const [fgColor, setFgColor] = useState('#ffffff')
  const [fontSize, setFontSize] = useState(48)
  const [radius, setRadius] = useState(16)
  const [bold, setBold] = useState(true)
  const [shape, setShape] = useState<'square'|'circle'|'rounded'>('rounded')
  const [previewSize, setPreviewSize] = useState(128)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = (canvas: HTMLCanvasElement, size: number) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = size; canvas.height = size
    ctx.clearRect(0, 0, size, size)
    const r = shape === 'circle' ? size/2 : shape === 'rounded' ? (radius/128)*size : 0
    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor
      if (r > 0) {
        ctx.beginPath(); ctx.roundRect(0, 0, size, size, r); ctx.fill()
      } else {
        ctx.fillRect(0, 0, size, size)
      }
    }
    if (text) {
      const fs = (fontSize / 128) * size
      ctx.font = `${bold ? '700' : '400'} ${fs}px "Space Grotesk", sans-serif`
      ctx.fillStyle = fgColor
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(text.slice(0, 3), size / 2, size / 2)
    }
  }

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, previewSize)
  }, [text, bgColor, fgColor, fontSize, radius, bold, shape, previewSize])

  const pngOf = (size: number) => {
    const canvas = document.createElement('canvas')
    draw(canvas, size)
    return urlToBlob(canvas.toDataURL('image/png'))
  }

  const download = async (size: number) => {
    await saveFile(`favicon-${size}x${size}.png`, await pngOf(size))
  }

  const downloadAll = async () => {
    const files = await Promise.all(SIZES.map(async s => ({ name: `favicon-${s}x${s}.png`, data: await pngOf(s) })))
    await saveFilesToDir(files)
  }

  return (
    <ToolLayout title="Favicon Generator" description="Create favicons from text or emoji in all required sizes">
      <div className="two-col">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label>Text / Emoji</label>
            <input type="text" value={text} onChange={e => setText(e.target.value)} maxLength={3} style={{ fontFamily:'var(--font-mono)', fontSize:18, letterSpacing:'0.1em' }} placeholder="DT" />
          </div>
          <div>
            <label>Background</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
              {BG_PRESETS.map(c => (
                <button key={c} onClick={() => setBgColor(c)} style={{
                  width:28, height:28, borderRadius:6, cursor:'pointer', flexShrink:0,
                  background: c === 'transparent' ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='4' height='4' fill='%23aaa'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23aaa'/%3E%3C/svg%3E")` : c,
                  border: bgColor === c ? '2px solid var(--accent)' : '2px solid var(--border)',
                }} />
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input type="color" value={bgColor === 'transparent' ? '#ffffff' : bgColor} onChange={e => setBgColor(e.target.value)} style={{ width:40, height:36, borderRadius:6, border:'1px solid var(--border)', padding:2, background:'none', cursor:'pointer' }} />
              <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ flex:1, fontFamily:'var(--font-mono)', fontSize:13 }} />
            </div>
          </div>
          <div>
            <label>Text Color</label>
            <div style={{ display:'flex', gap:8 }}>
              <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} style={{ width:40, height:36, borderRadius:6, border:'1px solid var(--border)', padding:2, background:'none', cursor:'pointer' }} />
              <input type="text" value={fgColor} onChange={e => setFgColor(e.target.value)} style={{ flex:1, fontFamily:'var(--font-mono)', fontSize:13 }} />
            </div>
          </div>
          <div>
            <div className="section-label">Shape</div>
            <div style={{ display:'flex', gap:6 }}>
              {(['square','rounded','circle'] as const).map(s => (
                <button key={s} className={`seg-btn ${shape === s ? 'active' : ''}`} onClick={() => setShape(s)}>{s}</button>
              ))}
            </div>
          </div>
          {shape === 'rounded' && (
            <div><div className="section-label">Corner radius: {radius}px</div><input type="range" min={0} max={64} value={radius} onChange={e => setRadius(Number(e.target.value))} /></div>
          )}
          <div><div className="section-label">Font size: {fontSize}%</div><input type="range" min={16} max={80} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} /></div>
          <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:0, cursor:'pointer', fontSize:13 }}>
            <input type="checkbox" checked={bold} onChange={e => setBold(e.target.checked)} />
            Bold font weight
          </label>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div className="section-label">Preview · {previewSize}px</div>
            <input type="range" min={32} max={256} value={previewSize} onChange={e => setPreviewSize(Number(e.target.value))} style={{ width:120 }} />
          </div>
          <div style={{ display:'flex', justifyContent:'center', padding:32, background:'var(--bg)', borderRadius:12, border:'1px solid var(--border)' }}>
            <canvas ref={canvasRef} style={{ imageRendering:'pixelated', borderRadius: shape === 'circle' ? '50%' : shape === 'rounded' ? 12 : 0 }} />
          </div>
          <div>
            <div className="section-label">Download sizes</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {SIZES.map(s => (
                <button key={s} className="btn btn-ghost btn-sm" onClick={() => download(s)}>{s}×{s}</button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={downloadAll}>⬇ Download All Sizes</button>
          <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', fontSize:13, color:'var(--text-dim)', lineHeight:1.7 }}>
            <div style={{ fontWeight:600, color:'var(--text)', marginBottom:6 }}>Add to your HTML:</div>
            <pre style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--accent)', margin:0 }}>{`<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180x180.png">`}</pre>
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
