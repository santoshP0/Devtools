import { useState, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'

declare const window: Window & { jsyaml?: { load: (s: string) => unknown; dump: (o: unknown, opts?: object) => string } }

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const click = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }
  return <button className="btn btn-ghost btn-sm" onClick={click}>{copied ? '✓ Copied' : label}</button>
}

function SegControl({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="option-row">
      {options.map(o => (
        <button key={o} className={`seg-btn ${value === o ? 'active' : ''}`} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  )
}

function YAMLJSON() {
  const SAMPLE_YAML = `name: DevToolbox\nversion: 2.0\nfeatures:\n  - yaml\n  - json\n  - free\nconfig:\n  port: 3000\n  debug: true`
  const [input, setInput] = useState(SAMPLE_YAML)
  const [dir, setDir] = useState('YAML → JSON')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!input.trim()) { setOutput(''); setError(''); return }
    try {
      if (dir === 'YAML → JSON') {
        const obj = window.jsyaml ? window.jsyaml.load(input) : JSON.parse(input)
        setOutput(JSON.stringify(obj, null, 2))
      } else {
        const obj = JSON.parse(input)
        setOutput(window.jsyaml ? window.jsyaml.dump(obj, { indent: 2 }) : JSON.stringify(obj))
      }
      setError('')
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); setOutput('') }
  }, [input, dir])

  const swap = () => { setDir(d => d === 'YAML → JSON' ? 'JSON → YAML' : 'YAML → JSON'); setInput(output) }

  return (
    <div>
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <SegControl options={['YAML → JSON','JSON → YAML']} value={dir} onChange={setDir} />
        <button className="btn btn-ghost btn-sm" onClick={swap}>⇄ Swap</button>
      </div>
      <div className="two-col">
        <div>
          <div className="section-label">Input ({dir.split(' → ')[0]})</div>
          <textarea value={input} onChange={e => setInput(e.target.value)} style={{ minHeight:320, fontSize:13 }} spellCheck={false} />
        </div>
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div className="section-label">Output ({dir.split(' → ')[1]})</div>
            {output && <CopyBtn text={output} />}
          </div>
          {error ? <div className="error-msg">⚠ {error}</div> : <pre className="code-out" style={{ minHeight:320 }}>{output}</pre>}
        </div>
      </div>
    </div>
  )
}

export default function YamlJsonPage() {
  return (
    <ToolLayout title="YAML ↔ JSON" description="Convert between YAML and JSON — great for K8s and CI/CD">
      <YAMLJSON />
    </ToolLayout>
  )
}
