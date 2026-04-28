import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

export default function Base64ToImagePage() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<string | null>(null)

  const handleDecode = () => {
    let val = input.trim()
    if (!val) return
    if (!val.startsWith('data:image/')) {
      // Try to guess or default to PNG
      val = `data:image/png;base64,${val}`
    }
    setResult(val)
  }

  const download = (url: string) => {
    const a = document.createElement('a'); a.href = url; a.download = 'decoded-image.png'; a.click()
  }

  return (
    <ToolLayout title="Base64 → Image" description="Decode a Base64 string or Data URI back into an image file">
      <div className="one-col">
        <div className="tool-panel flex flex-col gap-4">
          <div>
            <label className="label">Base64 String / Data URI</label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              className="tool-textarea h-48"
              placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
              spellCheck={false}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setInput(''); setResult(null) }} className="btn btn-ghost btn-sm text-red-400">Clear</button>
            <button onClick={handleDecode} className="btn-primary">Decode to Image</button>
          </div>
        </div>

        {result && (
          <div className="tool-panel anim-fade-up">
            <div className="section-label">Decoded Image Preview</div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:20, background:'var(--bg)', borderRadius:12, border:'1px solid var(--border)' }}>
              <img
                src={result}
                alt="Decoded result"
                style={{ maxWidth:'100%', maxHeight:400, borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.3)' }}
                onError={() => { setResult(null); alert('Invalid Base64 image data. Please check your string.') }}
              />
              <div className="flex gap-3">
                <button onClick={() => download(result)} className="btn btn-primary btn-sm">⬇ Download Image</button>
                <button onClick={() => setResult(null)} className="btn btn-ghost btn-sm">× Close Preview</button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-[11px] text-slate-500 leading-relaxed">
          <p className="font-bold mb-1 text-slate-400 uppercase tracking-tighter">Instructions:</p>
          Paste a Base64 encoded string or a full Data URI (starting with <code className="text-accent">data:image/...</code>). If you paste raw Base64, the tool will attempt to render it as a PNG image.
        </div>
      </div>
    </ToolLayout>
  )
}
