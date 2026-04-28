import { useState, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const click = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }
  return <button className="btn btn-ghost btn-sm" onClick={click}>{copied ? '✓ Copied' : label}</button>
}

interface Result {
  dataUrl: string; base64: string; type: string; name: string
  sizeKB: number; width: number; height: number
  imgTag: string; cssBg: string
}

export default function ImageToBase64Page() {
  const [result, setResult] = useState<Result | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target!.result as string
      const base64  = dataUrl.split(',')[1]
      const img = new Image()
      img.onload = () => setResult({
        dataUrl, base64, type: file.type, name: file.name,
        sizeKB: Math.round(file.size / 1024),
        width: img.width, height: img.height,
        imgTag: `<img src="${dataUrl}" alt="${file.name}" />`,
        cssBg: `background-image: url("${dataUrl}");`,
      })
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const formats = result ? [
    { label:'Data URI',    val: result.dataUrl },
    { label:'Base64 only', val: result.base64 },
    { label:'HTML <img>',  val: result.imgTag },
    { label:'CSS bg',      val: result.cssBg },
  ] : []

  return (
    <ToolLayout title="Image → Base64" description="Convert images to Base64 data URIs for use in CSS or HTML">
      <div className="one-col">
        {!result ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current?.click()}
            style={{
              border:`2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius:16, padding:'64px 32px', textAlign:'center',
              cursor:'pointer', transition:'all 0.2s',
              background: dragging ? 'var(--accent-bg)' : 'var(--surface)',
            }}
          >
            <div style={{ fontSize:48, marginBottom:16, opacity:0.5 }}>IMG</div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Drop an image here</div>
            <div style={{ fontSize:14, color:'var(--text-muted)' }}>or click to browse · PNG, JPG, GIF, SVG, WebP</div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
          </div>
        ) : (
          <>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
              <img src={result.dataUrl} alt="preview" style={{ width:80, height:80, objectFit:'cover', borderRadius:10, border:'1px solid var(--border)' }} />
              <div>
                <div style={{ fontWeight:600, marginBottom:4 }}>{result.name}</div>
                <div style={{ fontSize:13, color:'var(--text-dim)' }}>{result.type} · {result.width}×{result.height} · {result.sizeKB} KB</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:2 }}>
                  Base64 length: {result.base64.length.toLocaleString()} chars
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setResult(null)} style={{ marginLeft:'auto' }}>× Reset</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {formats.map(({label, val}) => (
                <div key={label} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span className="section-label" style={{ margin:0 }}>{label}</span>
                    <CopyBtn text={val} />
                  </div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-dim)', wordBreak:'break-all', lineHeight:1.6, maxHeight:72, overflow:'hidden', position:'relative' }}>
                    {val.slice(0,200)}{val.length > 200 ? '…' : ''}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  )
}
