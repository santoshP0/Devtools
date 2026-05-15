import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

const SAMPLE = `// Quick scratchpad
console.log("Hello, world!");
console.log("2 + 2 =", 2 + 2);
`

export default function JsSandbox() {
  const [code, setCode] = useState(SAMPLE)
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState('')

  const runCode = () => {
    setError('')
    const output: string[] = []

    const mockConsole = {
      log: (...args: any[]) => output.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      error: (...args: any[]) => output.push('❌ ' + args.join(' ')),
      warn: (...args: any[]) => output.push('⚠ ' + args.join(' ')),
    }

    try {
      // INTENTIONAL: This is a JS sandbox tool. The user explicitly writes and runs code.
      // new Function() is used deliberately to execute user-provided JS in the browser context.
      // No external input is eval'd; the user types and runs their own code only.
      const fn = new Function('console', code) // eslint-disable-line no-new-func
      fn(mockConsole)
      setLogs(output)
    } catch (e: any) {
      setError(e.message)
      setLogs(output)
    }
  }

  return (
    <ToolLayout title="JavaScript Sandbox" description="Lightweight playground to run and test JavaScript snippets in the browser." fullWidth>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
            <label className="label" style={{ margin: 0 }}>Script Editor</label>
            <button onClick={runCode} className="btn-primary" style={{ padding: '6px 20px' }}>Run (Ctrl+Enter)</button>
          </div>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runCode() }}
            className="tool-textarea"
            style={{ flex: 1, minHeight: 0, fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7, resize: 'none' }}
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <label className="label" style={{ marginBottom: 8, flexShrink: 0 }}>Console Output</label>
          <div style={{
            flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontFamily: 'var(--font-mono)', fontSize: 12,
          }}>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {logs.length === 0 && !error && (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Console is empty…</span>
              )}
              {logs.map((log, i) => (
                <div key={i} style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>
                    [{new Date().toLocaleTimeString([], { hour12: false })}]
                  </span>
                  {log}
                </div>
              ))}
              {error && (
                <div style={{
                  color: 'oklch(0.70 0.18 25)',
                  background: 'oklch(0.65 0.18 25 / 0.10)',
                  border: '1px solid oklch(0.65 0.18 25 / 0.35)',
                  borderRadius: 6, padding: '6px 12px',
                }}>
                  Error: {error}
                </div>
              )}
            </div>
            <div style={{
              padding: '8px 16px', borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>Live Output</span>
              <button
                onClick={() => { setLogs([]); setError('') }}
                style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
