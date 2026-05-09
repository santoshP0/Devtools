import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

export default function UrlEncoder() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'component' | 'full'>('component')

  const encode = () => {
    setError('')
    try {
      setOutput(mode === 'component' ? encodeURIComponent(input) : encodeURI(input))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const decode = () => {
    setError('')
    try {
      setOutput(mode === 'component' ? decodeURIComponent(input) : decodeURI(input))
    } catch (e) {
      setError('Invalid encoded string: ' + (e as Error).message)
    }
  }

  const copy = () => navigator.clipboard.writeText(output)
  const swap = () => { setInput(output); setOutput('') }
  const clear = () => { setInput(''); setOutput(''); setError('') }

  return (
    <ToolLayout title="URL Encoder / Decoder" description="Encode and decode URL components and full URLs.">
      <div className="space-y-4">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex gap-2">
            <button onClick={encode} className="btn-secondary">Encode</button>
            <button onClick={decode} className="btn-secondary">Decode</button>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            Mode:
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" checked={mode === 'component'} onChange={() => setMode('component')} />
              Component
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" checked={mode === 'full'} onChange={() => setMode('full')} />
              Full URL
            </label>
          </div>
          <button onClick={clear} className="btn-secondary ml-auto">Clear</button>
        </div>

        <div>
          <label className="label">Input</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="https://example.com/search?q=hello world&lang=en"
            className="tool-textarea h-36"
            spellCheck={false}
          />
        </div>

        {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">✗ {error}</div>}

        {output && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="label">Output</label>
              <div className="flex gap-3">
                <button onClick={swap} className="copy-btn">Use as input</button>
                <button onClick={copy} className="copy-btn">Copy</button>
              </div>
            </div>
            <textarea value={output} readOnly className="tool-textarea h-36 bg-slate-50" spellCheck={false} />
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-4 text-sm">
          <p className="font-medium text-slate-700 mb-2">Quick reference</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-500 font-mono">
            {[['space', '%20'], ['&', '%26'], ['=', '%3D'], ['?', '%3F'], ['/', '%2F'], ['#', '%23'], ['+', '%2B'], ['@', '%40']].map(([c, e]) => (
              <span key={c}>{c} → {e}</span>
            ))}
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
