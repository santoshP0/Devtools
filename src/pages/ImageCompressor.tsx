import { useState, useRef, useCallback } from 'react'
import ToolLayout from '../components/ToolLayout'
import imageCompression from 'browser-image-compression'

interface FileInfo { name: string; original: number; compressed: number; url: string; blob: Blob }

function fmt(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

export default function ImageCompressor() {
  const [quality, setQuality] = useState(80)
  const [maxWidth, setMaxWidth] = useState(1920)
  const [results, setResults] = useState<FileInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const compress = useCallback(async (files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'))
    if (!images.length) return
    setLoading(true)
    setProgress(0)
    const out: FileInfo[] = []
    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      try {
        const blob = await imageCompression(file, {
          maxSizeMB: 10,
          maxWidthOrHeight: maxWidth,
          useWebWorker: true,
          initialQuality: quality / 100,
          onProgress: p => setProgress(Math.round(((i / images.length) + p / 100 / images.length) * 100)),
        })
        out.push({ name: file.name, original: file.size, compressed: blob.size, url: URL.createObjectURL(blob), blob })
      } catch {
        out.push({ name: file.name, original: file.size, compressed: 0, url: '', blob: new Blob() })
      }
    }
    setResults(out)
    setLoading(false)
    setProgress(100)
  }, [quality, maxWidth])

  const onFiles = (files: FileList | null) => files && compress(Array.from(files))

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    onFiles(e.dataTransfer.files)
  }

  const download = (r: FileInfo) => {
    const a = document.createElement('a')
    a.href = r.url
    a.download = r.name.replace(/\.[^.]+$/, '') + '-compressed' + r.name.match(/\.[^.]+$/)?.[0]
    a.click()
  }

  return (
    <ToolLayout title="Image Compressor" description="Compress images in your browser. Files never leave your device.">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white border border-slate-200 rounded-xl p-4">
          <div>
            <div className="flex justify-between mb-1">
              <label className="label">Quality</label>
              <span className="text-sm font-mono font-bold text-blue-600">{quality}%</span>
            </div>
            <input type="range" min={10} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
          <div>
            <label className="label">Max Width / Height (px)</label>
            <input type="number" value={maxWidth} onChange={e => setMaxWidth(Number(e.target.value))} min={100} max={8000} className="tool-input" />
          </div>
        </div>

        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-400'}`}
        >
          <p className="text-2xl mb-2">🖼</p>
          <p className="text-slate-600 font-medium">Drop images here or click to select</p>
          <p className="text-sm text-slate-400 mt-1">Supports JPEG, PNG, WebP, GIF</p>
          <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => onFiles(e.target.files)} />
        </div>

        {loading && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2"><span>Compressing…</span><span>{progress}%</span></div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((r, i) => {
              const saved = r.original > 0 && r.compressed > 0 ? Math.round((1 - r.compressed / r.original) * 100) : 0
              return (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                  {r.url && <img src={r.url} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{r.name}</p>
                    <div className="flex gap-4 text-xs text-slate-500 mt-1">
                      <span>Original: {fmt(r.original)}</span>
                      <span>Compressed: {fmt(r.compressed)}</span>
                      {saved > 0 && <span className="text-green-600 font-medium">↓ {saved}% saved</span>}
                    </div>
                  </div>
                  {r.url && (
                    <button onClick={() => download(r)} className="btn-primary flex-shrink-0">Download</button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
