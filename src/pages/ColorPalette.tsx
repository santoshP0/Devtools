import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'
import { useClipboardCopy } from '../hooks/useClipboardCopy'

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) / 255, g = ((n >> 8) & 0xff) / 255, b = (n & 0xff) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
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

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function textColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) / 255, g = ((n >> 8) & 0xff) / 255, b = (n & 0xff) / 255
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.45 ? '#1e293b' : '#ffffff'
}

type PaletteType = 'complementary' | 'triadic' | 'analogous' | 'split' | 'tetradic' | 'tints' | 'shades'

interface Swatch { hex: string; label: string }

function generatePalette(hex: string, type: PaletteType): Swatch[] {
  const [h, s, l] = hexToHsl(hex)
  switch (type) {
    case 'complementary':
      return [
        { hex, label: 'Base' },
        { hex: hslToHex(h + 180, s, l), label: 'Complement' },
      ]
    case 'triadic':
      return [
        { hex, label: 'Base' },
        { hex: hslToHex(h + 120, s, l), label: 'Triadic 1' },
        { hex: hslToHex(h + 240, s, l), label: 'Triadic 2' },
      ]
    case 'analogous':
      return [
        { hex: hslToHex(h - 30, s, l), label: '-30°' },
        { hex: hslToHex(h - 15, s, l), label: '-15°' },
        { hex, label: 'Base' },
        { hex: hslToHex(h + 15, s, l), label: '+15°' },
        { hex: hslToHex(h + 30, s, l), label: '+30°' },
      ]
    case 'split':
      return [
        { hex, label: 'Base' },
        { hex: hslToHex(h + 150, s, l), label: 'Split 1' },
        { hex: hslToHex(h + 210, s, l), label: 'Split 2' },
      ]
    case 'tetradic':
      return [
        { hex, label: 'Base' },
        { hex: hslToHex(h + 90, s, l), label: 'Tetra 1' },
        { hex: hslToHex(h + 180, s, l), label: 'Tetra 2' },
        { hex: hslToHex(h + 270, s, l), label: 'Tetra 3' },
      ]
    case 'tints':
      return Array.from({ length: 6 }, (_, i) => ({
        hex: hslToHex(h, s, l + (100 - l) * (i + 1) / 7),
        label: `Tint ${i + 1}`,
      }))
    case 'shades':
      return Array.from({ length: 6 }, (_, i) => ({
        hex: hslToHex(h, s, l - l * (i + 1) / 7),
        label: `Shade ${i + 1}`,
      }))
  }
}

const PALETTE_TYPES: { key: PaletteType; label: string }[] = [
  { key: 'complementary', label: 'Complementary' },
  { key: 'triadic', label: 'Triadic' },
  { key: 'analogous', label: 'Analogous' },
  { key: 'split', label: 'Split' },
  { key: 'tetradic', label: 'Tetradic' },
  { key: 'tints', label: 'Tints' },
  { key: 'shades', label: 'Shades' },
]

export default function ColorPalette() {
  const [color, setColor] = useState('#3b82f6')
  const [type, setType] = useState<PaletteType>('complementary')
  const { copied, copy } = useClipboardCopy()

  const palette = generatePalette(color, type)
  const [h, s, l] = hexToHsl(color)

  return (
    <ToolLayout title="Color Palette Generator" description="Generate complementary, triadic, analogous and more palettes from any color.">
      <div className="flex flex-col gap-6 flex-1">
        <div className="tool-panel flex flex-wrap gap-6 items-start">
          <div>
            <label className="label">Base Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-16 rounded-lg border border-slate-200 cursor-pointer" />
              <input
                type="text"
                value={color}
                onChange={e => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && setColor(e.target.value)}
                className="tool-input w-28 font-mono"
                maxLength={7}
              />
              <span className="text-sm text-slate-500 font-mono">hsl({h}, {s}%, {l}%)</span>
            </div>
          </div>

          <div>
            <label className="label">Palette Type</label>
            <div className="flex flex-wrap gap-2">
              {PALETTE_TYPES.map(({ key, label }) => (
                <button key={key} onClick={() => setType(key)} className={type === key ? 'btn-toggle btn-toggle-active' : 'btn-toggle'}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))' }}>
          {palette.map(({ hex, label }) => (
            <div key={hex + label} className="flex flex-col gap-2">
              <button
                onClick={() => copy(hex, hex)}
                className="w-full rounded-xl aspect-square flex flex-col items-center justify-center gap-1 shadow-sm border border-black/10 transition-transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: hex }}
              >
                <span className="text-xs font-semibold font-mono" style={{ color: textColor(hex) }}>
                  {copied === hex ? '✓' : hex.toUpperCase()}
                </span>
              </button>
              <div className="text-center text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        <div className="tool-panel">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">All Hex Values</div>
          <div className="flex flex-wrap gap-2">
            {palette.map(({ hex, label }) => (
              <button key={hex + label} onClick={() => copy(hex, hex)} className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 rounded-lg px-3 py-2 text-sm font-mono transition-colors border border-slate-200">
                <span className="w-4 h-4 rounded-sm border border-black/10 inline-block flex-shrink-0" style={{ backgroundColor: hex }} />
                {hex.toUpperCase()}
                <span className="text-slate-400 text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
