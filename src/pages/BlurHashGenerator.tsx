import { useState, useRef, useCallback, useEffect } from 'react'
import { encode, decode } from 'blurhash'
import ToolLayout from '../components/ToolLayout'
import { useClipboardCopy } from '../hooks/useClipboardCopy'

/* ─── Helpers ─── */

function getImagePixels(
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, targetW, targetH)
  return ctx.getImageData(0, 0, targetW, targetH)
}

function renderToDataURL(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(width, height)
  imageData.data.set(pixels)
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL()
}

/* ─── Component ─── */

export default function BlurHashGenerator() {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [hash, setHash] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const { copied, copy: copyToClipboard } = useClipboardCopy()
  const [imgDimensions, setImgDimensions] = useState({ w: 0, h: 0 })

  // Decode mode
  const [decodeInput, setDecodeInput] = useState('')
  const [decodeW, setDecodeW] = useState(400)
  const [decodeH, setDecodeH] = useState(400)
  const [decodedUrl, setDecodedUrl] = useState<string | null>(null)
  const [decodeError, setDecodeError] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  // Auto-encode when image loads
  useEffect(() => {
    if (!imgSrc) return
    const img = new Image()
    img.onload = () => {
      setImgDimensions({ w: img.width, h: img.height })
      const sampleW = 32
      const sampleH = Math.round((img.height / img.width) * sampleW)
      const imageData = getImagePixels(img, sampleW, sampleH)
      const result = encode(imageData.data, imageData.width, imageData.height, 4, 3)
      setHash(result)
    }
    img.src = imgSrc
  }, [imgSrc])

  // Render preview when hash changes — match original aspect ratio
  useEffect(() => {
    if (!hash || !imgDimensions.w) { setPreviewUrl(null); return }
    try {
      const maxDim = 512
      const { w, h } = imgDimensions
      const scale = maxDim / Math.max(w, h)
      const pw = Math.round(w * scale)
      const ph = Math.round(h * scale)
      const pixels = decode(hash, pw, ph)
      setPreviewUrl(renderToDataURL(pixels, pw, ph))
    } catch {
      setPreviewUrl(null)
    }
  }, [hash, imgDimensions])

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      setImgSrc(reader.result as string)
      setHash('')
      setPreviewUrl(null)
    }
    reader.readAsDataURL(file)
  }, [])

  const copyHash = useCallback(() => {
    if (!hash) return
    copyToClipboard(hash)
  }, [hash, copyToClipboard])

  const decodeHash = useCallback(() => {
    const input = decodeInput.trim()
    if (!input) return
    setDecodeError('')
    try {
      const w = Math.max(1, Math.min(1024, decodeW))
      const h = Math.max(1, Math.min(1024, decodeH))
      const pixels = decode(input, w, h)
      setDecodedUrl(renderToDataURL(pixels, w, h))
    } catch (e) {
      setDecodeError(e instanceof Error ? e.message : 'Invalid BlurHash string')
      setDecodedUrl(null)
    }
  }, [decodeInput, decodeW, decodeH])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 16,
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: 12,
    color: 'var(--text-dim)',
    marginBottom: 4,
  }

  return (
    <ToolLayout
      title="BlurHash Generator"
      description="Generate compact placeholder strings from images"
    >
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Upload area */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            ...cardStyle,
            border: dragging ? '2px dashed var(--accent)' : '2px dashed var(--border)',
            textAlign: 'center',
            cursor: 'pointer',
            padding: imgSrc ? 16 : 40,
            transition: 'border-color 0.15s',
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              if (fileRef.current) fileRef.current.value = ''
            }}
          />
          {!imgSrc ? (
            <>
              <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>&#128444;</div>
              <div style={{ color: 'var(--text)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600 }}>
                Drop an image here or click to upload
              </div>
              <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: 12, marginTop: 4 }}>
                PNG, JPG, WebP — hash generated automatically
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)' }}>
              Click or drop to replace image
            </div>
          )}
        </div>

        {/* Result: hash + preview side by side */}
        {imgSrc && hash && previewUrl && (
          <div style={cardStyle}>
            {/* Hash output */}
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}>BlurHash</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  background: 'var(--surface2)',
                  padding: '8px 12px',
                  borderRadius: 6,
                  color: 'var(--text)',
                  wordBreak: 'break-all',
                  border: '1px solid var(--border)',
                  userSelect: 'all',
                }}>
                  {hash}
                </code>
                <button className="btn btn-ghost btn-sm" onClick={copyHash}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'var(--font-sans)' }}>
                {imgDimensions.w}×{imgDimensions.h} → {hash.length} chars
              </div>
            </div>

            {/* Side by side */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', textAlign: 'center' }}>
                <div style={{ ...labelStyle, marginBottom: 8, fontWeight: 600 }}>Original</div>
                <img
                  src={imgSrc}
                  alt="Original"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 280,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    objectFit: 'contain',
                  }}
                />
              </div>
              <div style={{ flex: '1 1 200px', textAlign: 'center' }}>
                <div style={{ ...labelStyle, marginBottom: 8, fontWeight: 600 }}>BlurHash Preview</div>
                <img
                  src={previewUrl}
                  alt="BlurHash preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 280,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    objectFit: 'contain',
                    imageRendering: 'auto',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Separator */}
        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* Decode mode */}
        <div style={cardStyle}>
          <div style={{ ...labelStyle, fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
            Decode a BlurHash
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={decodeInput}
              onChange={e => setDecodeInput(e.target.value)}
              placeholder="Paste a BlurHash string..."
              style={{
                flex: '1 1 200px',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                background: 'var(--surface2)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '8px 12px',
                outline: 'none',
              }}
              onKeyDown={e => { if (e.key === 'Enter') decodeHash() }}
            />
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="number"
                value={decodeW}
                onChange={e => setDecodeW(Math.max(1, +e.target.value))}
                style={{
                  width: 64,
                  padding: '8px 6px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surface2)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>×</span>
              <input
                type="number"
                value={decodeH}
                onChange={e => setDecodeH(Math.max(1, +e.target.value))}
                style={{
                  width: 64,
                  padding: '8px 6px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surface2)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={decodeHash} disabled={!decodeInput.trim()}>
              Decode
            </button>
          </div>

          {decodeError && (
            <div style={{
              marginTop: 12, padding: 10, borderRadius: 8,
              border: '1px solid #ef444480', background: '#ef444418',
              color: '#f87171', fontSize: 13,
            }}>
              {decodeError}
            </div>
          )}

          {decodedUrl && (
            <div style={{ marginTop: 16 }}>
              <img
                src={decodedUrl}
                alt="Decoded BlurHash"
                style={{
                  width: '100%',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  imageRendering: 'auto',
                  display: 'block',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  )
}
