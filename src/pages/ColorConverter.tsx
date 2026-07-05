import { useState, useCallback } from 'react'
import ToolLayout from '../components/ToolLayout'
import { useClipboardCopy } from '../hooks/useClipboardCopy'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v] }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [Math.round(hue2rgb(p, q, h + 1/3) * 255), Math.round(hue2rgb(p, q, h) * 255), Math.round(hue2rgb(p, q, h - 1/3) * 255)]
}

function isValidHex(h: string) { return /^#[0-9a-fA-F]{6}$/.test(h) }

export default function ColorConverter() {
  const [hex, setHex] = useState('#2563eb')
  const [rgb, setRgb] = useState<[number, number, number]>([37, 99, 235])
  const [hsl, setHsl] = useState<[number, number, number]>([221, 83, 53])
  const { copied, copy } = useClipboardCopy()

  const fromHex = useCallback((h: string) => {
    if (!isValidHex(h)) return
    const r = hexToRgb(h)
    setRgb(r)
    setHsl(rgbToHsl(...r))
    setHex(h)
  }, [])

  const fromRgb = useCallback((r: [number, number, number]) => {
    setRgb(r)
    setHex(rgbToHex(...r))
    setHsl(rgbToHsl(...r))
  }, [])

  const fromHsl = useCallback((h: [number, number, number]) => {
    setHsl(h)
    const r = hslToRgb(...h)
    setRgb(r)
    setHex(rgbToHex(...r))
  }, [])

  const hexStr = hex
  const rgbStr = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
  const hslStr = `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`

  return (
    <ToolLayout title="Color Converter" description="Convert colors between HEX, RGB, and HSL formats.">
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="w-32 h-32 rounded-2xl shadow-md border border-slate-200 transition-colors" style={{ backgroundColor: hex }} />
        </div>

        <div className="space-y-3">
          {/* HEX */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-500">HEX</span>
              <button onClick={() => copy(hexStr, 'hex')} className="copy-btn">{copied === 'hex' ? '✓ Copied' : 'Copy'}</button>
            </div>
            <div className="flex items-center gap-3">
              <input type="color" value={hex} onChange={e => fromHex(e.target.value)} className="h-9 w-12 rounded border border-slate-200 cursor-pointer" />
              <input
                type="text"
                value={hex}
                onChange={e => fromHex(e.target.value)}
                maxLength={7}
                className="tool-input font-mono uppercase"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* RGB */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-500">RGB</span>
              <button onClick={() => copy(rgbStr, 'rgb')} className="copy-btn">{copied === 'rgb' ? '✓ Copied' : 'Copy'}</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(['R', 'G', 'B'] as const).map((c, i) => (
                <div key={c}>
                  <label className="text-xs text-slate-500 mb-1 block">{c} (0–255)</label>
                  <input
                    type="number" min={0} max={255}
                    value={rgb[i]}
                    onChange={e => { const next = [...rgb] as [number, number, number]; next[i] = Math.min(255, Math.max(0, Number(e.target.value))); fromRgb(next) }}
                    className="tool-input font-mono"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs font-mono text-slate-500 mt-2">{rgbStr}</p>
          </div>

          {/* HSL */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-500">HSL</span>
              <button onClick={() => copy(hslStr, 'hsl')} className="copy-btn">{copied === 'hsl' ? '✓ Copied' : 'Copy'}</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[['H', 0, 360], ['S', 0, 100], ['L', 0, 100]] .map(([c, min, max], i) => (
                <div key={c as string}>
                  <label className="text-xs text-slate-500 mb-1 block">{c} ({min}–{max}{c !== 'H' ? '%' : '°'})</label>
                  <input
                    type="number" min={min} max={max}
                    value={hsl[i]}
                    onChange={e => { const next = [...hsl] as [number, number, number]; next[i] = Math.min(max as number, Math.max(min as number, Number(e.target.value))); fromHsl(next) }}
                    className="tool-input font-mono"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs font-mono text-slate-500 mt-2">{hslStr}</p>
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
