import { useState, useCallback } from 'react'
import ToolLayout from '../components/ToolLayout'

const SAMPLE = `// Quick scratchpad
console.log("Hello, world!");
console.log("2 + 2 =", 2 + 2);
`

function formatTime(ms: number): string {
  if (ms < 0.001) return `${(ms * 1_000_000).toFixed(0)}ns`
  if (ms < 1) return `${(ms * 1000).toFixed(1)}µs`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function getSpeedColor(ms: number): string {
  if (ms < 1) return 'oklch(0.72 0.17 150)'    // green — fast
  if (ms < 50) return 'oklch(0.75 0.14 85)'     // yellow — ok
  if (ms < 200) return 'oklch(0.70 0.16 45)'    // orange — slow
  return 'oklch(0.65 0.18 25)'                   // red — very slow
}

interface LogEntry {
  type: 'log' | 'error' | 'warn'
  text: string
  time: string
}

export default function JsSandbox() {
  const [code, setCode] = useState(SAMPLE)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [error, setError] = useState('')
  const [execTime, setExecTime] = useState<number | null>(null)

  const runCode = useCallback(() => {
    setError('')
    setExecTime(null)
    const output: LogEntry[] = []
    const now = () => new Date().toLocaleTimeString([], { hour12: false })
    const mockConsole = {
      log: (...args: any[]) => output.push({ type: 'log', text: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '), time: now() }),
      error: (...args: any[]) => output.push({ type: 'error', text: args.join(' '), time: now() }),
      warn: (...args: any[]) => output.push({ type: 'warn', text: args.join(' '), time: now() }),
      info: (...args: any[]) => output.push({ type: 'log', text: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '), time: now() }),
      table: (...args: any[]) => output.push({ type: 'log', text: JSON.stringify(args[0], null, 2), time: now() }),
      time: () => {},
      timeEnd: () => {},
    }
    try {
      // INTENTIONAL: This is a JS sandbox tool. The user explicitly writes and runs code.
      // new Function() is used deliberately to execute user-provided JS in the browser context.
      // No external input is eval'd; the user types and runs their own code only.
      const fn = new Function('console', code) // eslint-disable-line no-new-func
      const t0 = performance.now()
      fn(mockConsole)
      const elapsed = performance.now() - t0
      setExecTime(elapsed)
      setLogs(output)
    } catch (e: any) {
      setError(e.message)
      setLogs(output)
    }
  }, [code])

  const speedColor = execTime !== null ? getSpeedColor(execTime) : null

  return (
    <ToolLayout title="JavaScript Sandbox" description="Lightweight playground to run and test JavaScript snippets in the browser." fullWidth>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1, minHeight: 0, height: 'calc(100dvh - 160px)', maxHeight: 'calc(100dvh - 160px)' }}>
        {/* Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
            <label className="label" style={{ margin: 0 }}>Script Editor</label>
            <button onClick={runCode} className="btn-primary" style={{ padding: '6px 20px' }}>Run (Ctrl+Enter)</button>
          </div>
          <textarea
            value={code} onChange={e => setCode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runCode() }}
            className="tool-textarea"
            style={{ flex: 1, minHeight: 0, fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7, resize: 'none' }}
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <label className="label" style={{ marginBottom: 8, flexShrink: 0 }}>Output</label>
          <div style={{
            flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 10, fontFamily: 'var(--font-mono)', fontSize: 12,
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)', padding: '6px 12px', flexShrink: 0,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                Console
              </span>
              {execTime !== null && (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: speedColor!,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: speedColor!, display: 'inline-block',
                  }} />
                  {formatTime(execTime)}
                </span>
              )}
            </div>

            {/* Logs */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {logs.length === 0 && !error && (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Console is empty…</span>
              )}
              {logs.map((entry, i) => (
                <div key={i} style={{
                  color: entry.type === 'error' ? 'oklch(0.70 0.18 25)' : entry.type === 'warn' ? 'oklch(0.75 0.14 70)' : 'var(--text-dim)',
                  borderBottom: '1px solid var(--border)', paddingBottom: 4,
                }}>
                  <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>
                    [{entry.time}]
                  </span>
                  {entry.type === 'error' && '❌ '}
                  {entry.type === 'warn' && '⚠ '}
                  {entry.text}
                </div>
              ))}
              {error && (
                <div style={{
                  color: 'oklch(0.70 0.18 25)', background: 'oklch(0.65 0.18 25 / 0.10)',
                  border: '1px solid oklch(0.65 0.18 25 / 0.35)', borderRadius: 6, padding: '6px 12px',
                }}>Error: {error}</div>
              )}
            </div>

            {/* Bottom Bar */}
            <div style={{
              padding: '8px 16px', borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>
                Live Output
              </span>
              <button
                onClick={() => { setLogs([]); setError(''); setExecTime(null) }}
                style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >Clear</button>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
