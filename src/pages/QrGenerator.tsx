import { useState, useRef, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'
import bwipjs from '@bwip-js/browser'

interface BarcodeType {
  id: string
  name: string
  category: '1D' | '2D'
  placeholder: string
  description: string
}

const BARCODE_TYPES: BarcodeType[] = [
  { id: 'qrcode', name: 'QR Code', category: '2D', placeholder: 'https://google.com', description: 'Universal 2D matrix code for URLs and text' },
  { id: 'pdf417', name: 'PDF417', category: '2D', placeholder: 'ANSI 636000080002DL00000278DLDAASANTOSH...', description: 'Stacked linear 2D barcode used in IDs and shipping' },
  { id: 'datamatrix', name: 'Data Matrix', category: '2D', placeholder: 'PART-1234-XYZ', description: 'High-density 2D code for small industrial items' },
  { id: 'code128', name: 'Code 128', category: '1D', placeholder: 'SKU-987654321', description: 'High-density alphanumeric 1D barcode' },
  { id: 'code39', name: 'Code 39', category: '1D', placeholder: 'ITEM123A', description: 'Standard alphanumeric barcode used in automotive' },
  { id: 'ean13', name: 'EAN-13', category: '1D', placeholder: '9780201379624', description: '13-digit global retail product barcode (digits only)' },
  { id: 'upca', name: 'UPC-A', category: '1D', placeholder: '012345678905', description: '12-digit North American retail product barcode (digits only)' },
  { id: 'rationalizedCodabar', name: 'Codabar', category: '1D', placeholder: 'A123456789B', description: 'Self-checking barcode used in libraries and logistics' },
  { id: 'interleaved2of5', name: 'ITF (Interleaved 2 of 5)', category: '1D', placeholder: '10012345123457', description: 'Numeric-only barcode for cardboard shipping cartons' }
]

export default function QrGenerator() {
  const [selectedType, setSelectedType] = useState<BarcodeType>(BARCODE_TYPES[0])
  const [text, setText] = useState('')
  const [scale, setScale] = useState(3)
  const [fgColor, setFgColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  
  // 1D Barcode specific options
  const [height, setHeight] = useState(15) // in mm
  const [includeText, setIncludeText] = useState(true)
  
  const [error, setError] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Set default text on barcode type change to keep it valid
  useEffect(() => {
    setText(selectedType.placeholder)
  }, [selectedType])

  useEffect(() => {
    if (!text.trim()) {
      setError('')
      setDownloadUrl('')
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!canvasRef.current) return
      
      try {
        const cleanFg = fgColor.replace('#', '')
        const cleanBg = bgColor.replace('#', '')

        const options: any = {
          bcid: selectedType.id,
          text: text,
          scale: scale,
          barcolor: cleanFg,
          backgroundcolor: cleanBg,
          textxalign: 'center',
        }

        // Apply 1D specific options
        if (selectedType.category === '1D') {
          options.height = height
          options.includetext = includeText
          options.textcolor = cleanFg
        }

        bwipjs.toCanvas(canvasRef.current, options)
        
        // Generate download data URL
        const dataUrl = canvasRef.current.toDataURL('image/png')
        setDownloadUrl(dataUrl)
        setError('')
      } catch (e: any) {
        setError(e.message || 'Failed to generate barcode. Please check your data format.')
        setDownloadUrl('')
      }
    }, 200)

    return () => clearTimeout(debounceRef.current)
  }, [text, selectedType, scale, fgColor, bgColor, height, includeText])

  const handleDownload = () => {
    if (!downloadUrl) return
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `${selectedType.id}_barcode.png`
    a.click()
  }

  return (
    <ToolLayout title="QR & Barcode Generator" description="Generate QR Codes, PDF417, Data Matrix, and a variety of 1D barcodes instantly.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Configuration Panel */}
        <div className="space-y-4">
          
          {/* Barcode Type */}
          <div>
            <label className="label">Barcode Format</label>
            <select
              value={selectedType.id}
              onChange={e => {
                const type = BARCODE_TYPES.find(t => t.id === e.target.value)
                if (type) setSelectedType(type)
              }}
              className="tool-select w-full"
            >
              {BARCODE_TYPES.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400 mt-1 block">
              {selectedType.description}
            </span>
          </div>

          {/* Text/Data Input */}
          <div>
            <label className="label">Data / Text to Encode</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={selectedType.placeholder}
              className="tool-textarea h-24"
              spellCheck={false}
            />
          </div>

          {/* Sizing Slider */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="label">Scale Factor (Resolution)</label>
                <span className="text-sm font-mono text-blue-600">{scale}x</span>
              </div>
              <input 
                type="range" 
                min={1} 
                max={5} 
                step={1} 
                value={scale} 
                onChange={e => setScale(Number(e.target.value))} 
                className="w-full accent-blue-600" 
              />
            </div>

            {/* Height Slider (1D Barcode only) */}
            {selectedType.category === '1D' && (
              <div>
                <div className="flex justify-between mb-1">
                  <label className="label">Bar Height</label>
                  <span className="text-sm font-mono text-blue-600">{height} mm</span>
                </div>
                <input 
                  type="range" 
                  min={5} 
                  max={40} 
                  step={5} 
                  value={height} 
                  onChange={e => setHeight(Number(e.target.value))} 
                  className="w-full accent-blue-600" 
                />
              </div>
            )}
          </div>

          {/* Options toggle (1D Barcodes only) */}
          {selectedType.category === '1D' && (
            <div className="flex items-center gap-2 py-1">
              <input
                id="includeText"
                type="checkbox"
                checked={includeText}
                onChange={e => setIncludeText(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="includeText" className="text-sm font-medium text-slate-700 cursor-pointer">
                Include human-readable text below barcode
              </label>
            </div>
          )}

          {/* Color pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Foreground Color</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={fgColor} 
                  onChange={e => setFgColor(e.target.value)} 
                  className="h-9 w-12 rounded border border-slate-200 cursor-pointer" 
                />
                <span className="text-sm font-mono text-slate-600">{fgColor}</span>
              </div>
            </div>
            <div>
              <label className="label">Background Color</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={bgColor} 
                  onChange={e => setBgColor(e.target.value)} 
                  className="h-9 w-12 rounded border border-slate-200 cursor-pointer" 
                />
                <span className="text-sm font-mono text-slate-600">{bgColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Preview Panel */}
        <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-6 min-h-64 relative">
          
          {/* Error Banner */}
          {error && (
            <div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <span className="text-base font-bold">⚠️</span>
              <div>
                <p className="font-semibold">Format Error</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Idle Empty State */}
          {!text.trim() && (
            <p className="text-slate-400 text-sm">Enter text to generate the {selectedType.name}</p>
          )}

          {/* Canvas Rendering Target */}
          <div 
            style={{ 
              display: text.trim() && !error ? 'flex' : 'none', 
              flexDirection: 'column', 
              alignItems: 'center', 
              maxWidth: '100%', 
              overflow: 'auto',
              paddingTop: error ? '48px' : '0' 
            }}
          >
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center max-w-full overflow-auto">
              <canvas 
                ref={canvasRef} 
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto', 
                  display: 'block' 
                }} 
              />
            </div>
            {downloadUrl && (
              <button 
                onClick={handleDownload} 
                className="btn-primary mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-all"
              >
                Download PNG
              </button>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
