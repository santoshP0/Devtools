import { useState, useCallback, useRef, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'
import { useFileDrop } from '../hooks/useFileDrop'

type Mode = 'smart' | 'highcontrast' | 'invert'

const MODES: { value: Mode; label: string; desc: string }[] = [
  { value: 'smart', label: 'Smart (Preserves Colors)', desc: 'Inverts lightness while preserving original colors. Best for UI designs, screenshots, and logos.' },
  { value: 'highcontrast', label: 'High Contrast (Accessibility)', desc: 'Stronger lightness inversion with boosted contrast. Great for readability and accessibility.' },
  { value: 'invert', label: 'Full Invert (Classic RGB)', desc: 'Classic full color inversion. Flips all RGB channels.' },
]

const OUTPUT_FORMATS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
]

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ]
}

function convertPixels(data: ImageData, mode: Mode): ImageData {
  const d = new Uint8ClampedArray(data.data)
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]
    // skip fully transparent pixels
    if (d[i + 3] === 0) continue

    if (mode === 'invert') {
      d[i] = 255 - r
      d[i + 1] = 255 - g
      d[i + 2] = 255 - b
    } else {
      const [h, s, l] = rgbToHsl(r, g, b)
      let newL = 1 - l
      if (mode === 'highcontrast') {
        // push toward extremes for more contrast
        newL = newL < 0.5 ? newL * 0.8 : 1 - (1 - newL) * 0.8
      }
      const [nr, ng, nb] = hslToRgb(h, s, newL)
      d[i] = nr
      d[i + 1] = ng
      d[i + 2] = nb
    }
  }
  return new ImageData(d, data.width, data.height)
}

function fmt(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

export default function DarkLightConverter() {
  const [mode, setMode] = useState<Mode>('smart')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null)
  const [resultUrl, setResultUrl] = useState('')
  const [outputFormat, setOutputFormat] = useState('png')
  const [converting, setConverting] = useState(false)
  const [fadeIn, setFadeIn] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
      if (resultUrl) URL.revokeObjectURL(resultUrl)
    }
  }, [])

  const processImage = useCallback((img: HTMLImageElement, convMode: Mode, isInitial = false) => {
    if (isInitial) setConverting(true)
    // Use requestAnimationFrame to avoid blocking UI
    requestAnimationFrame(() => {
      const canvas = canvasRef.current || document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) { setConverting(false); return }
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, img.width, img.height)
      const converted = convertPixels(imageData, convMode)
      ctx.putImageData(converted, 0, 0)
      canvas.toBlob((blob) => {
        if (!blob) { setConverting(false); return }
        setFadeIn(false)
        // Trigger fade-in on next frame after URL swap
        requestAnimationFrame(() => {
          setResultUrl(prev => {
            if (prev) URL.revokeObjectURL(prev)
            return URL.createObjectURL(blob)
          })
          setConverting(false)
          requestAnimationFrame(() => setFadeIn(true))
        })
      }, 'image/png')
    })
  }, [])

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setResultUrl('')

    const url = URL.createObjectURL(file)
    setSourceUrl(url)
    setSourceFile(file)

    const img = new Image()
    img.onload = () => {
      setSourceImg(img)
      processImage(img, mode, true)
    }
    img.src = url
  }, [sourceUrl, resultUrl, mode, processImage])

  // Re-process when mode changes
  useEffect(() => {
    if (sourceImg) processImage(sourceImg, mode)
  }, [mode])

  const { dragging, inputRef, dragProps, openPicker, onInputChange } = useFileDrop(loadFile, 'image/*')

  const download = () => {
    if (!resultUrl || !sourceFile) return
    // Re-export in chosen format
    const canvas = canvasRef.current
    if (!canvas) return
    const mime = outputFormat === 'jpeg' ? 'image/jpeg' : outputFormat === 'webp' ? 'image/webp' : 'image/png'
    const ext = outputFormat === 'jpeg' ? '.jpg' : outputFormat === 'webp' ? '.webp' : '.png'
    canvas.toBlob((blob) => {
      if (!blob) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = sourceFile.name.replace(/\.[^.]+$/, '') + '-converted' + ext
      a.click()
      URL.revokeObjectURL(a.href)
    }, mime, 0.92)
  }

  const reset = () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setSourceUrl('')
    setResultUrl('')
    setSourceFile(null)
    setSourceImg(null)
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '2px solid var(--sketch-text)',
    borderRadius: 10,
    padding: 20,
    boxShadow: '3px 3px 0px var(--sketch-text)',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--sketch-text)',
    fontFamily: "'Architects Daughter', var(--font-sans)",
    marginBottom: 8,
    display: 'block',
  }

  return (
    <ToolLayout title="Dark/Light Mode Converter" description="Transform light mode designs to dark mode instantly — convert white backgrounds to black and vice-versa">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>

        {/* Top row: Controls left, Previews right */}
        <div style={{ display: 'grid', gridTemplateColumns: sourceImg ? '340px 1fr' : '1fr', gap: 20 }}>

          {/* Left column: Mode + Upload + Reset */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Conversion Mode */}
            <div style={cardStyle}>
              <span style={labelStyle}>Conversion Mode:</span>
              <select
                value={mode}
                onChange={e => setMode(e.target.value as Mode)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '2px solid var(--sketch-text)',
                  background: 'var(--surface)',
                  color: 'var(--sketch-text)',
                  fontFamily: "'Architects Daughter', var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: '2px 2px 0px var(--sketch-text)',
                }}
              >
                {MODES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <p style={{
                fontSize: 12, color: 'var(--text-dim)', marginTop: 8,
                fontFamily: 'var(--font-sans)', lineHeight: 1.5,
              }}>
                {MODES.find(m => m.value === mode)?.desc}
              </p>
            </div>

            {/* Drop zone */}
            <div
              {...dragProps}
              onClick={openPicker}
              style={{
                ...cardStyle,
                border: dragging ? '2px dashed var(--accent)' : '2px dashed var(--sketch-text)',
                textAlign: 'center',
                cursor: 'pointer',
                padding: '36px 20px',
                transition: 'all 0.15s',
                background: dragging ? 'var(--surface2)' : 'var(--surface)',
                boxShadow: 'none',
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={onInputChange}
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: 32, marginBottom: 8 }}>
                {sourceImg ? '🔄' : '⬆'}
              </div>
              <div style={{
                color: 'var(--sketch-text)',
                fontFamily: "'Architects Daughter', var(--font-sans)",
                fontWeight: 700, fontSize: 15,
              }}>
                {sourceImg ? 'Drop a new image' : 'Drop your image here'}
              </div>
              <p style={{
                color: 'var(--text-dim)', fontFamily: 'var(--font-sans)',
                fontSize: 12, marginTop: 6, lineHeight: 1.5,
              }}>
                Convert screenshots, UI designs, logos, and documents to dark/light mode
              </p>
            </div>

            {/* Reset */}
            {sourceImg && (
              <button
                onClick={reset}
                style={{
                  width: '100%', padding: '10px 0',
                  borderRadius: 6,
                  border: '2px solid var(--sketch-text)',
                  background: 'var(--surface)',
                  color: 'var(--sketch-text)',
                  fontFamily: "'Architects Daughter', var(--font-sans)",
                  fontWeight: 700, fontSize: 14,
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0px var(--sketch-text)',
                  transition: 'all 0.1s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translate(-1px, -1px)'
                  e.currentTarget.style.boxShadow = '3px 3px 0px var(--sketch-text)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translate(0, 0)'
                  e.currentTarget.style.boxShadow = '2px 2px 0px var(--sketch-text)'
                }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Right column: Original + Converted side by side */}
          {sourceImg && (
            <div className="two-col" style={{ gap: 20 }}>

              {/* Original */}
              <div style={cardStyle}>
                <span style={labelStyle}>Original</span>
                <div style={{
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '2px solid var(--border)',
                  background: 'repeating-conic-gradient(var(--surface2) 0% 25%, var(--surface) 0% 50%) 50% / 16px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: 200,
                }}>
                  <img
                    src={sourceUrl}
                    alt="Original"
                    style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain' }}
                  />
                </div>
                {sourceFile && (
                  <div style={{
                    marginTop: 10, fontSize: 12, fontFamily: 'var(--font-mono)',
                    color: 'var(--text-dim)', display: 'flex', gap: 12,
                  }}>
                    <span>{sourceFile.name}</span>
                    <span>{fmt(sourceFile.size)}</span>
                  </div>
                )}
              </div>

              {/* Converted */}
              <div style={cardStyle}>
                <span style={labelStyle}>Converted</span>
                <div style={{
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '2px solid var(--border)',
                  background: 'repeating-conic-gradient(var(--surface2) 0% 25%, var(--surface) 0% 50%) 50% / 16px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: 200,
                }}>
                  {resultUrl ? (
                    <img
                      src={resultUrl}
                      alt="Converted"
                      style={{
                        maxWidth: '100%', maxHeight: 360, objectFit: 'contain',
                        opacity: fadeIn ? 1 : 0.3,
                        transition: 'opacity 0.2s ease-out',
                      }}
                    />
                  ) : converting ? (
                    <div style={{
                      padding: 40,
                      color: 'var(--text-dim)',
                      fontFamily: "'Architects Daughter', var(--font-sans)",
                      fontSize: 14,
                    }}>
                      Converting...
                    </div>
                  ) : null}
                </div>

                {/* Download bar */}
                {resultUrl && !converting && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <select
                      value={outputFormat}
                      onChange={e => setOutputFormat(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '2px solid var(--sketch-text)',
                        background: 'var(--surface)',
                        color: 'var(--sketch-text)',
                        fontFamily: "'Architects Daughter', var(--font-sans)",
                        fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', outline: 'none',
                      }}
                    >
                      {OUTPUT_FORMATS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={download}
                      style={{
                        flex: 1, padding: '8px 0',
                        borderRadius: 6,
                        border: '2px solid var(--sketch-text)',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontFamily: "'Architects Daughter', var(--font-sans)",
                        fontWeight: 700, fontSize: 14,
                        cursor: 'pointer',
                        boxShadow: '2px 2px 0px var(--sketch-text)',
                        transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translate(-1px, -1px)'
                        e.currentTarget.style.boxShadow = '3px 3px 0px var(--sketch-text)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translate(0, 0)'
                        e.currentTarget.style.boxShadow = '2px 2px 0px var(--sketch-text)'
                      }}
                    >
                      Download
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </ToolLayout>
  )
}
