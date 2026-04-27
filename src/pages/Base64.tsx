import { useState, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'

export default function Base64() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'text' | 'file'>('text')
  const fileRef = useRef<HTMLInputElement>(null)

  const encode = () => {
    setError('')
    try {
      setOutput(btoa(unescape(encodeURIComponent(input))))
    } catch {
      setError('Encoding failed — ensure text is valid.')
    }
  }

  const decode = () => {
    setError('')
    try {
      setOutput(decodeURIComponent(escape(atob(input.trim()))))
    } catch {
      setError('Invalid Base64 string.')
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setOutput(result.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const copy = () => navigator.clipboard.writeText(output)
  const clear = () => { setInput(''); setOutput(''); setError('') }

  return (
    <ToolLayout title="Base64 Encoder / Decoder" description="Encode text or files to Base64, or decode Base64 strings.">
      <div className="space-y-4">
        <div className="flex gap-2 mb-2">
          {(['text', 'file'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={mode === m ? 'btn-primary' : 'btn-secondary'}
            >
              {m === 'text' ? 'Text' : 'File → Base64'}
            </button>
          ))}
        </div>

        {mode === 'file' ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center bg-white">
            <p className="text-slate-500 mb-4">Select a file to encode to Base64</p>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} className="btn-primary">Choose File</button>
          </div>
        ) : (
          <div>
            <label className="label">Input</label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Enter text to encode, or Base64 to decode…"
              className="tool-textarea h-40"
              spellCheck={false}
            />
            <div className="flex gap-2 mt-2">
              <button onClick={encode} className="btn-primary">Encode</button>
              <button onClick={decode} className="btn-secondary">Decode</button>
              <button onClick={clear} className="btn-secondary ml-auto">Clear</button>
            </div>
          </div>
        )}

        {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">✗ {error}</div>}

        {output && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="label">Output</label>
              <button onClick={copy} className="copy-btn">Copy</button>
            </div>
            <textarea value={output} readOnly className="tool-textarea h-40 bg-slate-50" spellCheck={false} />
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
