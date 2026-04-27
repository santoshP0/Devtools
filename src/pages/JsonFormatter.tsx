import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

export default function JsonFormatter() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [indent, setIndent] = useState(2)
  const [copied, setCopied] = useState(false)

  const process = (minify: boolean) => {
    if (!input.trim()) return
    try {
      const parsed = JSON.parse(input)
      setOutput(minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent))
      setError('')
    } catch (e) {
      setError((e as Error).message)
      setOutput('')
    }
  }

  const validate = () => {
    if (!input.trim()) return
    try {
      JSON.parse(input)
      setError('')
      setOutput('✓ Valid JSON')
    } catch (e) {
      setError((e as Error).message)
      setOutput('')
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const clear = () => { setInput(''); setOutput(''); setError('') }

  return (
    <ToolLayout title="JSON Formatter" description="Format, validate and minify JSON data.">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => process(false)} className="btn-primary">Format</button>
          <button onClick={() => process(true)} className="btn-secondary">Minify</button>
          <button onClick={validate} className="btn-secondary">Validate</button>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Indent:
            <select
              value={indent}
              onChange={e => setIndent(Number(e.target.value))}
              className="border border-slate-200 rounded-md px-2 py-1 text-sm bg-white"
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={1}>Tab</option>
            </select>
          </label>
          <button onClick={clear} className="btn-secondary ml-auto">Clear</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="label">Input JSON</label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={'{\n  "hello": "world"\n}'}
              className="tool-textarea h-80"
              spellCheck={false}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="label">Output</label>
              {output && !error && (
                <button onClick={copy} className="copy-btn">{copied ? '✓ Copied' : 'Copy'}</button>
              )}
            </div>
            {error ? (
              <div className="h-80 border border-red-200 rounded-lg p-3 bg-red-50 text-red-700 text-sm font-mono overflow-auto">
                ✗ {error}
              </div>
            ) : (
              <textarea
                value={output}
                readOnly
                className="tool-textarea h-80 bg-slate-50"
                spellCheck={false}
              />
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
