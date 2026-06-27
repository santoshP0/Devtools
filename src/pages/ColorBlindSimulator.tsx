import { useState, useRef, useCallback, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'

type SimType =
  | 'protanopia' | 'deuteranopia' | 'tritanopia'
  | 'protanomaly' | 'deuteranomaly' | 'tritanomaly'
  | 'achromatopsia' | 'achromatomaly'

interface SimInfo {
  label: string
  description: string
  matrix: number[]
  isAnomaly: boolean
}

// Brettel/Vienot simulation matrices (3x3 row-major, applied to linear RGB)
// Full severity versions for -opia types; anomaly types are interpolated with identity
const SIMS: Record<SimType, SimInfo> = {
  protanopia: {
    label: 'Protanopia',
    description: 'No red cones',
    matrix: [
      0.152286, 1.052583, -0.204868,
      0.114503, 0.786281,  0.099216,
     -0.003882, -0.048116, 1.051998,
    ],
    isAnomaly: false,
  },
  deuteranopia: {
    label: 'Deuteranopia',
    description: 'No green cones',
    matrix: [
      0.367322, 0.860646, -0.227968,
      0.280085, 0.672501,  0.047413,
     -0.011820, 0.042940,  0.968881,
    ],
    isAnomaly: false,
  },
  tritanopia: {
    label: 'Tritanopia',
    description: 'No blue cones',
    matrix: [
      1.255528, -0.076749, -0.178779,
     -0.078411,  0.930809,  0.147602,
      0.004733,  0.691367,  0.303900,
    ],
    isAnomaly: false,
  },
  protanomaly: {
    label: 'Protanomaly',
    description: 'Weak red cones',
    matrix: [
      0.152286, 1.052583, -0.204868,
      0.114503, 0.786281,  0.099216,
     -0.003882, -0.048116, 1.051998,
    ],
    isAnomaly: true,
  },
  deuteranomaly: {
    label: 'Deuteranomaly',
    description: 'Weak green cones',
    matrix: [
      0.367322, 0.860646, -0.227968,
      0.280085, 0.672501,  0.047413,
     -0.011820, 0.042940,  0.968881,
    ],
    isAnomaly: true,
  },
  tritanomaly: {
    label: 'Tritanomaly',
    description: 'Weak blue cones',
    matrix: [
      1.255528, -0.076749, -0.178779,
     -0.078411,  0.930809,  0.147602,
      0.004733,  0.691367,  0.303900,
    ],
    isAnomaly: true,
  },
  achromatopsia: {
    label: 'Achromatopsia',
    description: 'Total color blindness',
    matrix: [
      0.2126, 0.7152, 0.0722,
      0.2126, 0.7152, 0.0722,
      0.2126, 0.7152, 0.0722,
    ],
    isAnomaly: false,
  },
  achromatomaly: {
    label: 'Achromatomaly',
    description: 'Weak total color vision',
    matrix: [
      0.2126, 0.7152, 0.0722,
      0.2126, 0.7152, 0.0722,
      0.2126, 0.7152, 0.0722,
    ],
    isAnomaly: true,
  },
}

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1]

function interpolateMatrix(full: number[], t: number): number[] {
  return full.map((v, i) => IDENTITY[i] * (1 - t) + v * t)
}

// sRGB <-> linear conversion
function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  return Math.round(Math.min(255, Math.max(0, v * 255)))
}

const SIM_TYPES: SimType[] = [
  'protanopia', 'deuteranopia', 'tritanopia',
  'protanomaly', 'deuteranomaly', 'tritanomaly',
  'achromatopsia', 'achromatomaly',
]

export default function ColorBlindSimulator() {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [simType, setSimType] = useState<SimType>('deuteranopia')
  const [severity, setSeverity] = useState(100)
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const originalCanvasRef = useRef<HTMLCanvasElement>(null)
  const simCanvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const sim = SIMS[simType]

  const loadImage = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadImage(file)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadImage(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  // Draw original and simulated when image, type, or severity changes
  useEffect(() => {
    if (!imageSrc) return

    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      const origCanvas = originalCanvasRef.current
      const simCanvas = simCanvasRef.current
      if (!origCanvas || !simCanvas) return

      // Cap display size to avoid huge canvases
      const maxDim = 1200
      let w = img.width
      let h = img.height
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }

      origCanvas.width = w
      origCanvas.height = h
      simCanvas.width = w
      simCanvas.height = h

      const origCtx = origCanvas.getContext('2d')!
      origCtx.drawImage(img, 0, 0, w, h)

      setProcessing(true)
      // Use requestAnimationFrame so the UI can update before heavy processing
      requestAnimationFrame(() => {
        const simCtx = simCanvas.getContext('2d')!
        simCtx.drawImage(img, 0, 0, w, h)
        const imageData = simCtx.getImageData(0, 0, w, h)
        const data = imageData.data

        const effectiveSeverity = sim.isAnomaly ? severity / 100 : 1
        const mat = sim.isAnomaly
          ? interpolateMatrix(sim.matrix, effectiveSeverity)
          : sim.matrix

        // Process pixels
        for (let i = 0; i < data.length; i += 4) {
          const lr = srgbToLinear(data[i])
          const lg = srgbToLinear(data[i + 1])
          const lb = srgbToLinear(data[i + 2])

          const nr = mat[0] * lr + mat[1] * lg + mat[2] * lb
          const ng = mat[3] * lr + mat[4] * lg + mat[5] * lb
          const nb = mat[6] * lr + mat[7] * lg + mat[8] * lb

          data[i]     = linearToSrgb(nr)
          data[i + 1] = linearToSrgb(ng)
          data[i + 2] = linearToSrgb(nb)
          // alpha unchanged
        }

        simCtx.putImageData(imageData, 0, 0)
        setProcessing(false)
      })
    }
    img.src = imageSrc
  }, [imageSrc, simType, severity, sim])

  const downloadSimulated = () => {
    const canvas = simCanvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `colorblind-${simType}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 8,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text)',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'var(--font-sans)',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  })

  return (
    <ToolLayout title="Color Blind Simulator" description="Upload an image and preview how it appears under different types of color vision deficiency.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 12,
            padding: imageSrc ? '16px' : '48px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'var(--surface2)' : 'var(--surface)',
            transition: 'all 0.2s ease',
          }}
        >
          {!imageSrc ? (
            <div>
              <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>&#128444;</div>
              <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>
                Drop an image here or click to select
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                JPEG, PNG, WebP, GIF
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Click or drop to replace image
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
        </div>

        {imageSrc && (
          <>
            {/* Simulation type selector */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
                Color Vision Deficiency Type
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SIM_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setSimType(type)}
                    style={pillStyle(simType === type)}
                  >
                    {SIMS[type].label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
                {sim.description}
                {sim.isAnomaly && ' (partial — adjust severity below)'}
              </div>
            </div>

            {/* Severity slider for anomaly types */}
            {sim.isAnomaly && (
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    Severity
                  </span>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>
                    {severity}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={severity}
                  onChange={e => setSeverity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>Normal vision</span>
                  <span>Full deficiency</span>
                </div>
              </div>
            )}

            {/* Side-by-side canvases */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}>
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 12,
                overflow: 'hidden',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                  Original
                </div>
                <canvas
                  ref={originalCanvasRef}
                  style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block' }}
                />
              </div>
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 12,
                overflow: 'hidden',
                position: 'relative',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {sim.label}
                    {sim.isAnomaly && ` (${severity}%)`}
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={downloadSimulated}
                    style={{ fontSize: 12 }}
                  >
                    Download
                  </button>
                </div>
                <canvas
                  ref={simCanvasRef}
                  style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block' }}
                />
                {processing && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                  }}>
                    Processing...
                  </div>
                )}
              </div>
            </div>

            {/* Info panel */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '14px 16px',
              fontSize: 13,
              color: 'var(--text-dim)',
              lineHeight: 1.7,
            }}>
              <strong style={{ color: 'var(--text)' }}>About color blindness simulation:</strong>{' '}
              This tool applies Brettel/Vienot color transformation matrices to simulate how images
              appear to people with various types of color vision deficiency. All processing is done
              client-side in your browser — images never leave your device. Anomaly types (partial
              deficiency) support an adjustable severity slider.
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  )
}
