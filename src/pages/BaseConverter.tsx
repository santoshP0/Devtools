import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

type Base = 'dec' | 'hex' | 'bin' | 'oct'

const BASES: { key: Base; label: string; radix: number; prefix: string }[] = [
  { key: 'dec', label: 'Decimal', radix: 10, prefix: '' },
  { key: 'hex', label: 'Hexadecimal', radix: 16, prefix: '0x' },
  { key: 'bin', label: 'Binary', radix: 2, prefix: '0b' },
  { key: 'oct', label: 'Octal', radix: 8, prefix: '0o' },
]

export default function BaseConverter() {
  const [values, setValues] = useState<Record<Base, string>>({ dec: '', hex: '', bin: '', oct: '' })
  const [error, setError] = useState('')

  const handleChange = (key: Base, raw: string) => {
    setError('')
    const val = raw.trim()
    if (!val) {
      setValues({ dec: '', hex: '', bin: '', oct: '' })
      return
    }
    const base = BASES.find(b => b.key === key)!
    const n = parseInt(val.replace(/^0[xXbBoO]/, ''), base.radix)
    if (isNaN(n) || n < 0) {
      setError(`Invalid ${base.label} value`)
      setValues(prev => ({ ...prev, [key]: raw }))
      return
    }
    setValues({
      dec: String(n),
      hex: n.toString(16).toUpperCase(),
      bin: n.toString(2),
      oct: n.toString(8),
    })
  }

  const copy = (val: string) => navigator.clipboard.writeText(val)

  return (
    <ToolLayout title="Number Base Converter" description="Convert numbers between decimal, hexadecimal, binary, and octal.">
      <div className="flex flex-col gap-6 flex-1">
        {error && (
          <div className="border border-red-200 rounded-xl p-3 bg-red-50 text-red-400 text-sm">✗ {error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BASES.map(({ key, label, prefix }) => (
            <div key={key} className="tool-panel flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="label mb-0">{label}</label>
                {values[key] && <button onClick={() => copy(values[key])} className="copy-btn">Copy</button>}
              </div>
              <div className="flex items-center gap-2">
                {prefix && <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200">{prefix}</span>}
                <input
                  value={values[key]}
                  onChange={e => handleChange(key, e.target.value)}
                  placeholder={key === 'dec' ? '255' : key === 'hex' ? 'FF' : key === 'bin' ? '11111111' : '377'}
                  className="tool-input flex-1 font-mono"
                  spellCheck={false}
                />
              </div>
            </div>
          ))}
        </div>

        {values.dec && !error && (
          <div className="tool-panel">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">Representations</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {BASES.map(({ key, label, prefix }) => (
                <div key={key} className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-500 mb-1">{label}</div>
                  <div className="font-mono font-bold text-slate-800 text-sm break-all">{prefix}{values[key]}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
