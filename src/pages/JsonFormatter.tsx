import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

export default function JsonFormatter() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [indent, setIndent] = useState<number | string>(2)
  const [copied, setCopied] = useState(false)

  const process = (minify: boolean) => {
    if (!input.trim()) return
    try {
      const parsed = JSON.parse(input)
      setOutput(minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent === '\t' ? '\t' : Number(indent)))
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
    <ToolLayout title="JSON Formatter" description="Format, validate and minify JSON data." fullWidth>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, flex: 1, minHeight: 0 }}>

        {/* Input */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <label className="label">Input JSON</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={'{\n  "hello": "world"\n}'}
            className="tool-textarea"
            style={{ flex: 1, minHeight: 0, resize: 'none' }}
            spellCheck={false}
          />
        </div>

        {/* Center actions */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8, width: 112, flexShrink: 0 }}>
          <button onClick={() => process(false)} className="btn-ghost" style={{ width: '100%' }}>Format</button>
          <button onClick={() => process(true)} className="btn-ghost" style={{ width: '100%' }}>Minify</button>
          <button onClick={validate} className="btn-ghost" style={{ width: '100%' }}>Validate</button>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Indent</span>
            <select
              value={indent}
              onChange={e => setIndent(e.target.value === '\t' ? '\t' : Number(e.target.value))}
              className="tool-select"
              style={{ width: '100%' }}
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={'\t'}>Tab</option>
            </select>
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <button onClick={clear} className="btn-ghost" style={{ width: '100%', fontSize: 12 }}>Clear</button>
        </div>

        {/* Output */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
            <label className="label" style={{ margin: 0 }}>Output</label>
            {output && !error && (
              <button onClick={copy} className="copy-btn">{copied ? '✓ Copied' : 'Copy'}</button>
            )}
          </div>
          {error ? (
            <div style={{
              flex: 1, minHeight: 0,
              border: '1px solid oklch(0.65 0.18 25 / 0.35)',
              borderRadius: 10, padding: 16,
              background: 'oklch(0.65 0.18 25 / 0.08)',
              color: 'oklch(0.70 0.18 25)',
              fontSize: 13, fontFamily: 'var(--font-mono)',
              overflowY: 'auto',
            }}>
              ✗ {error}
            </div>
          ) : (
            <textarea
              value={output}
              readOnly
              className="tool-textarea"
              style={{ flex: 1, minHeight: 0, resize: 'none' }}
              spellCheck={false}
            />
          )}
        </div>

      </div>
    </ToolLayout>
  )
}
