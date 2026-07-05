import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'
import { useFileDrop } from '../hooks/useFileDrop'

function optimizeSVG(svg: string): string {
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/\s+>/g, '>')
    .replace(/<\?xml[^>]*>/g, '')
    .replace(/<!DOCTYPE[^>]*>/g, '')
    .replace(/\s*(id|class)="[^"]*"/g, '')
    .replace(/\s+style="[^"]*?opacity:\s*1[^"]*?"/g, '')
    .trim()
}

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <!-- DevToolbox logo -->
  <circle cx="50" cy="50" r="45" fill="#0d9488" opacity="1"/>
  <rect x="30" y="38" width="40" height="8" rx="4" fill="white"/>
  <rect x="30" y="54" width="28" height="8" rx="4" fill="white"/>
</svg>`

export default function SvgPreviewPage() {
  const [svg, setSvg] = useState(SAMPLE_SVG)
  const [bgStyle, setBgStyle] = useState<'dark'|'light'|'checker'>('dark')

  const optimized = (() => { try { return optimizeSVG(svg) } catch { return svg } })()
  const savings = svg.length > 0 ? Math.round((1 - optimized.length / svg.length) * 100) : 0
  const isValid = svg.trim().startsWith('<svg') || svg.trim().startsWith('<?xml')
  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

  // Strip hardcoded width/height so preview respects container size
  const previewSvg = svg
    .replace(/<svg([^>]*?)\s+width=["'][^"']*["']/g, '<svg$1')
    .replace(/<svg([^>]*?)\s+height=["'][^"']*["']/g, '<svg$1')
  const previewUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(previewSvg)}`

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.svg') && file.type !== 'image/svg+xml') return
    file.text().then(setSvg)
  }

  const { dragging, inputRef, dragProps, openPicker, onInputChange } = useFileDrop(handleFile, '.svg,image/svg+xml')

  const download = (content: string, name: string) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type:'image/svg+xml' })); a.download = name; a.click()
  }

  const bgMap = { dark:'var(--bg)', light:'#f8f8f8', checker:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23888'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23888'/%3E%3C/svg%3E")` }

  return (
    <ToolLayout title="SVG Preview + Optimizer" description="Preview SVG files, remove bloat and export optimized code">
      <div className="two-col">
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div className="section-label">SVG Source</div>
            <button className="btn btn-ghost btn-sm" onClick={openPicker}>Upload .svg</button>
            <input ref={inputRef} type="file" accept=".svg,image/svg+xml" style={{ display:'none' }} onChange={onInputChange} />
          </div>
          <textarea value={svg} onChange={e => setSvg(e.target.value)}
            {...dragProps}
            style={{ minHeight:280, fontSize:12, outline: dragging ? '2px solid var(--accent)' : undefined }} spellCheck={false} />
          {!isValid && svg.trim() && <div className="error-msg">⚠ Doesn't look like valid SVG</div>}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <CopyBtn text={optimized} label="Copy optimized" />
            <button className="btn btn-ghost btn-sm" onClick={() => download(svg, 'original.svg')}>⬇ Original</button>
            <button className="btn btn-ghost btn-sm" onClick={() => download(optimized, 'optimized.svg')}>⬇ Optimized</button>
          </div>
          <div className="stat-grid">
            {[
              { val:`${svg.length} B`, key:'Original' },
              { val:`${optimized.length} B`, key:'Optimized' },
              { val:`${Math.max(0, savings)}%`, key:'Saved' },
            ].map(s => <div className="stat-box" key={s.key}><div className="stat-val" style={{ fontSize:18 }}>{s.val}</div><div className="stat-key">{s.key}</div></div>)}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div className="section-label">Preview</div>
            <div style={{ display:'flex', gap:6 }}>
              {(['dark','light','checker'] as const).map(b => (
                <button key={b} className={`seg-btn ${bgStyle === b ? 'active' : ''}`} onClick={() => setBgStyle(b)} style={{ padding:'4px 10px', fontSize:11 }}>{b}</button>
              ))}
            </div>
          </div>
          <div style={{ flex:1, minHeight:280, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:12, border:'1px solid var(--border)', background: bgMap[bgStyle], overflow:'hidden', padding:16 }}>
            {isValid
              ? <img src={previewUri} alt="SVG preview" style={{ maxWidth:'100%', maxHeight:280, objectFit:'contain', display:'block' }} />
              : <span style={{ color:'var(--text-muted)', fontSize:14 }}>Enter valid SVG →</span>
            }
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div className="section-label">Optimized output</div>
            <CopyBtn text={optimized} />
          </div>
          <pre className="code-out" style={{ fontSize:12, maxHeight:160, overflow:'auto' }}>{optimized}</pre>
        </div>
      </div>
    </ToolLayout>
  )
}
