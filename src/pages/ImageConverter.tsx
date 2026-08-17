import { useState, useRef, useCallback, useEffect } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import ToolLayout from '../components/ToolLayout'
import { useFileDrop } from '../hooks/useFileDrop'
import { useNativeDrop, usePasteImage } from '../hooks/useNativeDrop'
import { saveFile } from '../lib/saveFile'

// native image_convert result (desktop) — base64 of the encoded bytes
interface ImageOut { data: string; width: number; height: number; size: number }
// formats the browser can't paint in an <img> — need a native decode for preview
const NEEDS_NATIVE_PREVIEW = /\.(tiff?|tga|dds|qoi|pnm|ppm|pgm|pbm|ff|farbfeld)$/i
const isHeicFile = (f: File) => /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name)

function b64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

interface ImageInfo {
  width: number
  height: number
  format: string
  size: number
  name: string
}

interface ConvertedResult {
  blob: Blob
  url: string
  width: number
  height: number
  size: number
}

function fmt(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

function pct(original: number, converted: number) {
  const diff = ((converted - original) / original) * 100
  return diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`
}

function mimeFromFormat(format: string): string {
  const map: Record<string, string> = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
  }
  return map[format] || 'image/png'
}

function extFromFormat(format: string): string {
  const map: Record<string, string> = {
    png: '.png',
    jpeg: '.jpg',
    webp: '.webp',
  }
  return map[format] || '.png'
}

function formatFromMime(mime: string): string {
  if (mime.includes('png')) return 'PNG'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPEG'
  if (mime.includes('webp')) return 'WebP'
  if (mime.includes('gif')) return 'GIF'
  if (mime.includes('bmp')) return 'BMP'
  if (mime.includes('svg')) return 'SVG'
  if (mime.includes('avif')) return 'AVIF'
  if (mime.includes('tiff')) return 'TIFF'
  return mime.split('/')[1]?.toUpperCase() || 'Unknown'
}

const OUTPUT_FORMATS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
]

export default function ImageConverter() {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [sourceInfo, setSourceInfo] = useState<ImageInfo | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string>('')

  const [outputFormat, setOutputFormat] = useState('webp')
  const [quality, setQuality] = useState(85)
  const [resizeMode, setResizeMode] = useState<'none' | 'scale' | 'custom'>('none')
  const [scale, setScale] = useState(100)
  const [customWidth, setCustomWidth] = useState(0)
  const [customHeight, setCustomHeight] = useState(0)
  const [lockAspect, setLockAspect] = useState(true)

  const [result, setResult] = useState<ConvertedResult | null>(null)
  const [converting, setConverting] = useState(false)
  const [decoding, setDecoding] = useState(false)
  const [error, setError] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const aspectRatio = useRef(1)
  const origFile = useRef<File | null>(null)   // the real source file (native convert reads its bytes)

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
      if (result?.url) URL.revokeObjectURL(result.url)
    }
  }, [])

  // meta overrides the displayed name/size/format — used for HEIC, where the
  // <img> loads a decoded PNG but we still want to show the real source stats
  const loadImage = useCallback((file: File, meta?: { name: string; size: number; format: string }) => {
    // Revoke old URLs
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    if (result?.url) URL.revokeObjectURL(result.url)
    setResult(null)

    const url = URL.createObjectURL(file)
    setSourceUrl(url)
    setSourceFile(file)

    const img = new Image()
    img.onload = () => {
      setSourceImage(img)
      aspectRatio.current = img.width / img.height
      setCustomWidth(img.width)
      setCustomHeight(img.height)
      setSourceInfo({
        width: img.width,
        height: img.height,
        format: meta?.format ?? formatFromMime(file.type),
        size: meta?.size ?? file.size,
        name: meta?.name ?? file.name,
      })
    }
    img.src = url
  }, [sourceUrl, result])

  const handleFile = useCallback(async (file: File) => {
    setError('')
    origFile.current = file
    if (isHeicFile(file)) {
      // Browsers (except Safari) can't decode HEIC on a canvas — decode to PNG
      // first via libheif-wasm, lazy-loaded so the base bundle stays light.
      setDecoding(true)
      try {
        const heic2any = (await import('heic2any')).default
        const out = await heic2any({ blob: file, toType: 'image/png' })
        const png = Array.isArray(out) ? out[0] : out // multi-image HEIC → take first frame
        loadImage(new File([png], file.name, { type: 'image/png' }),
          { name: file.name, size: file.size, format: 'HEIC' })
      } catch {
        setError('Could not decode this HEIC file. It may be corrupted or an unsupported variant.')
      } finally {
        setDecoding(false)
      }
      return
    }
    // Desktop: formats the webview <img> can't paint (TIFF/TGA/DDS/QOI/…) get a
    // native PNG preview from the image crate; conversion still uses the original.
    if (isTauri() && NEEDS_NATIVE_PREVIEW.test(file.name)) {
      setDecoding(true)
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const bytes = new Uint8Array(await file.arrayBuffer())
        const out = await invoke<ImageOut>('image_convert', { bytes, format: 'png', quality: 100, width: null, height: null })
        const png = b64ToBlob(out.data, 'image/png')
        loadImage(new File([png], file.name, { type: 'image/png' }),
          { name: file.name, size: file.size, format: (file.name.split('.').pop() || '').toUpperCase() })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not decode this image.')
      } finally {
        setDecoding(false)
      }
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Unsupported file type.')
      return
    }
    loadImage(file)
  }, [loadImage])

  const ACCEPT = 'image/*,.heic,.heif,.tiff,.tif,.tga,.dds,.qoi,.pnm,.ppm,.pgm,.pbm,.ff'
  const { dragging, inputRef, dragProps, openPicker, onInputChange } = useFileDrop(handleFile, ACCEPT)
  // Desktop: Finder drag-drop (HTML drag-drop is intercepted by Tauri).
  useNativeDrop(items => { if (items[0]) handleFile(items[0].file) })
  // Paste a screenshot straight in.
  usePasteImage(handleFile)

  const getOutputDimensions = useCallback(() => {
    if (!sourceImage) return { w: 0, h: 0 }
    if (resizeMode === 'scale') {
      const factor = scale / 100
      return { w: Math.round(sourceImage.width * factor), h: Math.round(sourceImage.height * factor) }
    }
    if (resizeMode === 'custom') {
      return { w: customWidth, h: customHeight }
    }
    return { w: sourceImage.width, h: sourceImage.height }
  }, [sourceImage, resizeMode, scale, customWidth, customHeight])

  const convert = useCallback(async () => {
    if (!sourceImage) return
    setConverting(true)
    const { w, h } = getOutputDimensions()

    // Desktop: convert natively (image crate) — Lanczos resize + native encode,
    // off the main thread, no canvas size limits. HEIC has no native decoder, so
    // it falls through to the canvas path (which runs on its decoded PNG).
    if (isTauri() && origFile.current && !isHeicFile(origFile.current)) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const bytes = new Uint8Array(await origFile.current.arrayBuffer())
        const resize = resizeMode !== 'none'
        const out = await invoke<ImageOut>('image_convert', {
          bytes, format: outputFormat, quality,
          width: resize ? w : null, height: resize ? h : null,
        })
        const blob = b64ToBlob(out.data, mimeFromFormat(outputFormat))
        if (result?.url) URL.revokeObjectURL(result.url)
        setResult({ blob, url: URL.createObjectURL(blob), width: out.width, height: out.height, size: out.size })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Conversion failed.')
      } finally {
        setConverting(false)
      }
      return
    }

    // Use a small timeout so the UI can update
    setTimeout(() => {
      const canvas = canvasRef.current || document.createElement('canvas')
      const { w, h } = getOutputDimensions()
      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext('2d')
      if (!ctx) { setConverting(false); return }

      // For JPEG, fill white background (no transparency)
      if (outputFormat === 'jpeg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
      }

      ctx.drawImage(sourceImage, 0, 0, w, h)

      const mime = mimeFromFormat(outputFormat)
      const q = (outputFormat === 'png') ? undefined : quality / 100

      canvas.toBlob((blob) => {
        if (!blob) { setConverting(false); return }
        // Revoke old result URL
        if (result?.url) URL.revokeObjectURL(result.url)
        const url = URL.createObjectURL(blob)
        setResult({ blob, url, width: w, height: h, size: blob.size })
        setConverting(false)
      }, mime, q)
    }, 50)
  }, [sourceImage, outputFormat, quality, getOutputDimensions, result, resizeMode])

  const download = async () => {
    if (!result || !sourceFile) return
    const baseName = sourceFile.name.replace(/\.[^.]+$/, '')
    await saveFile(baseName + extFromFormat(outputFormat), result.blob)
  }

  const onCustomWidthChange = (val: number) => {
    setCustomWidth(val)
    if (lockAspect && aspectRatio.current) {
      setCustomHeight(Math.round(val / aspectRatio.current))
    }
  }

  const onCustomHeightChange = (val: number) => {
    setCustomHeight(val)
    if (lockAspect && aspectRatio.current) {
      setCustomWidth(Math.round(val * aspectRatio.current))
    }
  }

  const supportsQuality = outputFormat === 'jpeg' || outputFormat === 'webp'

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 20,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text)',
    fontFamily: 'var(--font-sans)',
    marginBottom: 6,
    display: 'block',
  }

  const selectStyle: React.CSSProperties = {
    background: 'var(--surface2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '6px 10px',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    outline: 'none',
    width: '100%',
  }

  const inputStyle: React.CSSProperties = {
    ...selectStyle,
    width: 80,
  }

  return (
    <ToolLayout title="Image Converter" description="Convert images between formats with quality and resize controls — runs locally; the desktop app adds native TIFF/TGA/DDS/QOI decoding and Lanczos resizing.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>

        {/* Upload Area */}
        <div
          {...dragProps}
          onClick={openPicker}
          style={{
            ...cardStyle,
            border: dragging ? '2px dashed var(--accent)' : '2px dashed var(--border)',
            textAlign: 'center',
            cursor: 'pointer',
            padding: 40,
            transition: 'border-color 0.15s',
            background: dragging ? 'var(--surface2)' : 'var(--surface)',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={onInputChange}
            style={{ display: 'none' }}
          />
          <div style={{ fontSize: 32, marginBottom: 8 }}>{decoding ? '⏳' : '🖼'}</div>
          <div style={{ color: 'var(--text)', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 15 }}>
            {decoding ? 'Decoding HEIC…' : 'Drop an image here or click to browse'}
          </div>
          <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', fontSize: 13, marginTop: 4 }}>
            PNG, JPEG, WebP, GIF, BMP — plus HEIC/HEIF from iPhone{isTauri() ? ', and TIFF/TGA/DDS/QOI natively' : ''}
          </div>
        </div>

        {error && (
          <div style={{
            ...cardStyle, padding: 12, borderColor: '#ef4444',
            color: '#ef4444', fontFamily: 'var(--font-sans)', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Source + Controls Row */}
        {sourceInfo && sourceImage && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Original Preview */}
            <div style={cardStyle}>
              <div style={labelStyle}>Original</div>
              <img
                src={sourceUrl}
                alt="Original"
                style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 6, objectFit: 'contain', background: 'var(--surface2)' }}
              />
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                <span>{sourceInfo.format}</span>
                <span>{sourceInfo.width} x {sourceInfo.height}</span>
                <span>{fmt(sourceInfo.size)}</span>
              </div>
            </div>

            {/* Conversion Controls */}
            <div style={cardStyle}>
              <div style={labelStyle}>Conversion Settings</div>

              {/* Output Format */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ ...labelStyle, fontSize: 12, color: 'var(--text-dim)' }}>Output Format</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {OUTPUT_FORMATS.map(f => (
                    <button
                      key={f.value}
                      className={outputFormat === f.value ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                      onClick={() => setOutputFormat(f.value)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Slider */}
              {supportsQuality && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ ...labelStyle, fontSize: 12, color: 'var(--text-dim)' }}>
                    Quality: {quality}%
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={quality}
                    onChange={e => setQuality(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                  />
                </div>
              )}

              {/* Resize Mode */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ ...labelStyle, fontSize: 12, color: 'var(--text-dim)' }}>Resize</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['none', 'scale', 'custom'] as const).map(m => (
                    <button
                      key={m}
                      className={resizeMode === m ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                      onClick={() => setResizeMode(m)}
                    >
                      {m === 'none' ? 'Original' : m === 'scale' ? 'Scale %' : 'Custom'}
                    </button>
                  ))}
                </div>
              </div>

              {resizeMode === 'scale' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ ...labelStyle, fontSize: 12, color: 'var(--text-dim)' }}>
                    Scale: {scale}%
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={400}
                    value={scale}
                    onChange={e => setScale(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                  />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                    {getOutputDimensions().w} x {getOutputDimensions().h}
                  </div>
                </div>
              )}

              {resizeMode === 'custom' && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 11, color: 'var(--text-muted)' }}>Width</label>
                      <input
                        type="number"
                        value={customWidth}
                        min={1}
                        onChange={e => onCustomWidthChange(Number(e.target.value))}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ fontSize: 16, color: 'var(--text-muted)', marginTop: 18 }}>x</div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 11, color: 'var(--text-muted)' }}>Height</label>
                      <input
                        type="number"
                        value={customHeight}
                        min={1}
                        onChange={e => onCustomHeightChange(Number(e.target.value))}
                        style={inputStyle}
                      />
                    </div>
                    <button
                      className={lockAspect ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                      onClick={() => setLockAspect(!lockAspect)}
                      title={lockAspect ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                      style={{ marginTop: 18, minWidth: 36 }}
                    >
                      {lockAspect ? '🔒' : '🔓'}
                    </button>
                  </div>
                </div>
              )}

              {/* Convert Button */}
              <button
                className="btn btn-primary btn-sm"
                onClick={convert}
                disabled={converting}
                style={{ width: '100%', marginTop: 6, padding: '8px 0' }}
              >
                {converting ? 'Converting...' : 'Convert'}
              </button>
            </div>
          </div>
        )}

        {/* Output Result */}
        {result && sourceInfo && (
          <div style={cardStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
              {/* Output Preview */}
              <div>
                <div style={labelStyle}>Converted Preview</div>
                <img
                  src={result.url}
                  alt="Converted"
                  style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 6, objectFit: 'contain', background: 'var(--surface2)' }}
                />
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                  <span>{outputFormat.toUpperCase()}</span>
                  <span>{result.width} x {result.height}</span>
                  <span>{fmt(result.size)}</span>
                </div>
              </div>

              {/* Size Comparison */}
              <div>
                <div style={labelStyle}>File Size Comparison</div>
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 12,
                  background: 'var(--surface2)', borderRadius: 8, padding: 16,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-dim)' }}>Original</span>
                    <span style={{ color: 'var(--text)' }}>{fmt(sourceInfo.size)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-dim)' }}>Converted</span>
                    <span style={{ color: 'var(--text)' }}>{fmt(result.size)}</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-dim)' }}>Difference</span>
                    <span style={{
                      color: result.size <= sourceInfo.size ? '#22c55e' : '#ef4444',
                      fontWeight: 600,
                    }}>
                      {pct(sourceInfo.size, result.size)}
                      {result.size <= sourceInfo.size ? ' smaller' : ' larger'}
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={download}
                  style={{ width: '100%', marginTop: 14, padding: '8px 0' }}
                >
                  Download {outputFormat.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden canvas */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </ToolLayout>
  )
}
