import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'
import { useClipboardCopy } from '../hooks/useClipboardCopy'

const conversions = [
  { label: 'UPPER CASE', fn: (s: string) => s.toUpperCase() },
  { label: 'lower case', fn: (s: string) => s.toLowerCase() },
  { label: 'Title Case', fn: (s: string) => s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) },
  { label: 'Sentence case', fn: (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() },
  {
    label: 'camelCase',
    fn: (s: string) => s.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()),
  },
  {
    label: 'PascalCase',
    fn: (s: string) => {
      const camel = s.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
      return camel.charAt(0).toUpperCase() + camel.slice(1)
    },
  },
  {
    label: 'snake_case',
    fn: (s: string) => s.trim()
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')
      .toLowerCase(),
  },
  {
    label: 'kebab-case',
    fn: (s: string) => s.trim()
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-')
      .toLowerCase(),
  },
  {
    label: 'CONSTANT_CASE',
    fn: (s: string) => s.trim()
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')
      .toUpperCase(),
  },
  {
    label: 'dot.case',
    fn: (s: string) => s.trim()
      .replace(/([a-z])([A-Z])/g, '$1.$2')
      .replace(/[^a-zA-Z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .replace(/\.+/g, '.')
      .toLowerCase(),
  },
]

export default function TextCase() {
  const [input, setInput] = useState('')
  const { copied: copiedLabel, copy } = useClipboardCopy()

  return (
    <ToolLayout title="Text Case Converter" description="Convert text between camelCase, snake_case, kebab-case, and more.">
      <div className="space-y-4">
        <div>
          <label className="label">Input Text</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type or paste text to convert…"
            className="tool-textarea h-28"
          />
        </div>

        {input && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {conversions.map(({ label, fn }) => {
              const result = fn(input)
              return (
                <div key={label} className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-500">{label}</span>
                    <button onClick={() => copy(result, label)} className="copy-btn">
                      {copiedLabel === label ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-sm font-mono text-slate-800 break-all">{result}</p>
                </div>
              )
            })}
          </div>
        )}

        {!input && (
          <div className="text-center py-10 text-slate-400 bg-white border border-slate-200 rounded-xl">
            Enter text above to see all case conversions
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
