import { useState, useRef, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'
import QRCode from 'qrcode'

const ERROR_LEVELS = ['L', 'M', 'Q', 'H'] as const

export default function QrGenerator() {
  const [text, setText] = useState('')
  const [size, setSize] = useState(256)
  const [errorLevel, setErrorLevel] = useState<typeof ERROR_LEVELS[number]>('M')
  const [fgColor, setFgColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [dataUrl, setDataUrl] = useState('')
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!text) { setDataUrl(''); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const url = await QRCode.toDataURL(text, {
          width: size,
          errorCorrectionLevel: errorLevel,
          color: { dark: fgColor, light: bgColor },
          margin: 2,
        })
        setDataUrl(url)
        setError('')
      } catch (e) {
        setError((e as Error).message)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [text, size, errorLevel, fgColor, bgColor])

  const download = () => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'qrcode.png'
    a.click()
  }

  return (
    <ToolLayout title="QR Code Generator" description="Generate QR codes for any text or URL instantly.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="label">Text or URL</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="https://example.com"
              className="tool-textarea h-28"
              spellCheck={false}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="label">Size (px)</label>
                <span className="text-sm font-mono text-blue-600">{size}</span>
              </div>
              <input type="range" min={128} max={512} step={32} value={size} onChange={e => setSize(Number(e.target.value))} className="w-full accent-blue-600" />
            </div>
            <div>
              <label className="label">Error Correction</label>
              <div className="flex gap-1">
                {ERROR_LEVELS.map(l => (
                  <button key={l} onClick={() => setErrorLevel(l)} className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors ${errorLevel === l ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Foreground</label>
              <div className="flex items-center gap-2">
                <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} className="h-9 w-12 rounded border border-slate-200 cursor-pointer" />
                <span className="text-sm font-mono text-slate-600">{fgColor}</span>
              </div>
            </div>
            <div>
              <label className="label">Background</label>
              <div className="flex items-center gap-2">
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="h-9 w-12 rounded border border-slate-200 cursor-pointer" />
                <span className="text-sm font-mono text-slate-600">{bgColor}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-6 min-h-64">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {!text && <p className="text-slate-400 text-sm">Enter text to generate a QR code</p>}
          {dataUrl && (
            <>
              <img src={dataUrl} alt="QR code" className="rounded-lg shadow-sm" />
              <button onClick={download} className="btn-primary mt-4">Download PNG</button>
            </>
          )}
        </div>
      </div>
    </ToolLayout>
  )
}
