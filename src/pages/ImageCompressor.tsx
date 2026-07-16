import { useState, useRef, useCallback, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'
import imageCompression from 'browser-image-compression'

interface FileInfo { name: string; original: number; compressed: number; url: string }

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

  // Revoke object URLs when results change to prevent memory leaks
  useEffect(() => {
    return () => { results.forEach(r => { if (r.url) URL.revokeObjectURL(r.url) }) }
  }, [results])

  const compress = useCallback(async (files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'))
    if (!images.length) return
    // Revoke old URLs before replacing results
    setResults(prev => { prev.forEach(r => { if (r.url) URL.revokeObjectURL(r.url) }); return [] })
    setLoading(true)
    setProgress(0)
    const out: FileInfo[] = []
    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      try {
        const blob = await imageCompression(file, {
          maxSizeMB: 10,
          maxWidthOrHeight: Math.min(8000, Math.max(100, maxWidth || 1920)),
          useWebWorker: true,
          initialQuality: quality / 100,
          onProgress: p => setProgress(Math.round(((i / images.length) + p / 100 / images.length) * 100)),
        })
        out.push({ name: file.name, original: file.size, compressed: blob.size, url: URL.createObjectURL(blob) })
      } catch {
        out.push({ name: file.name, original: file.size, compressed: 0, url: '' })
      }
    }
    setResults(out)
    setLoading(false)
    setProgress(100)
  }, [quality, maxWidth])

  const onFiles = (files: FileList | null) => {
    if (files && files.length) {
      compress(Array.from(files))
      // Reset input so the same file(s) can be re-selected
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    onFiles(e.dataTransfer.files)
  }

  const download = (r: FileInfo) => {
    const a = document.createElement('a')
    a.href = r.url
    a.download = r.name.replace(/\.[^.]+$/, '') + '-compressed' + (r.name.match(/\.[^.]+$/) ?? [''])[0]
    a.click()
  }

  const downloadAll = () => results.filter(r => r.url).forEach(download)

  return (
    <ToolLayout title="Image Compressor" description="Compress images in your browser. Files never leave your device.">
      <div className="flex flex-col gap-5 flex-1">

        {/* Settings */}
        <div className="tool-panel grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="label mb-0">Quality</label>
              <span className="text-sm font-mono font-semibold text-blue-600 tabular-nums">{quality}%</span>
            </div>
            <input
              type="range" min={10} max={100} value={quality}
              onChange={e => setQuality(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Smaller file</span>
              <span>Higher quality</span>
            </div>
          </div>
          <div>
            <label className="label">Max dimension (px)</label>
            <input
              type="number" value={Number.isNaN(maxWidth) ? '' : maxWidth}
              onChange={e => setMaxWidth(e.target.valueAsNumber)}
              onBlur={() => setMaxWidth(m => Math.min(8000, Math.max(100, m || 1920)))}
              min={100} max={8000}
              className="tool-input"
            />
            <p className="text-xs text-slate-400 mt-1">Longer side will be scaled down to this</p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 select-none
            ${dragging
              ? 'border-blue-400 bg-blue-50 scale-[1.01]'
              : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40'
            }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 9.75h18M3 6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V6.75z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-700">Drop images here or click to select</p>
              <p className="text-sm text-slate-400 mt-0.5">JPEG, PNG, WebP, GIF · Multiple files supported</p>
            </div>
          </div>
          <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => onFiles(e.target.files)} />
        </div>

        {/* Progress */}
        {loading && (
          <div className="tool-panel">
            <div className="flex justify-between items-center text-sm mb-3">
              <span className="font-medium text-slate-700">Compressing…</span>
              <span className="font-mono text-blue-600 font-semibold">{progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && !loading && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">{results.length} file{results.length !== 1 ? 's' : ''} compressed</span>
              {results.length > 1 && (
                <button onClick={downloadAll} className="btn-primary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download all
                </button>
              )}
            </div>
            {results.map((r, i) => {
              const saved = r.original > 0 && r.compressed > 0 ? Math.round((1 - r.compressed / r.original) * 100) : 0
              return (
                <div key={i} className="tool-panel flex items-center gap-4">
                  {r.url && <img src={r.url} alt="" className="w-14 h-14 object-cover rounded-xl flex-shrink-0 border border-slate-100" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate mb-1">{r.name}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{fmt(r.original)} → <span className="text-slate-700 font-medium">{fmt(r.compressed)}</span></span>
                      {saved > 0 && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                          </svg>
                          {saved}% smaller
                        </span>
                      )}
                      {r.compressed === 0 && <span className="text-red-400">Compression failed</span>}
                    </div>
                  </div>
                  {r.url && (
                    <button onClick={() => download(r)} className="btn-secondary flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download
                    </button>
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
