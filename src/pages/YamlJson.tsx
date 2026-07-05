import { useState, useEffect } from 'react'
import yaml from 'js-yaml'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'

const SAMPLE_YAML = `name: DevToolbox
version: 2.0
features:
  - yaml
  - json
  - free
config:
  port: 3000
  debug: true
  tags:
    - dev
    - tools`

const SAMPLE_JSON = `{
  "name": "DevToolbox",
  "version": 2.0,
  "features": ["yaml", "json", "free"],
  "config": {
    "port": 3000,
    "debug": true,
    "tags": ["dev", "tools"]
  }
}`

type Dir = 'YAML → JSON' | 'JSON → YAML'

export default function YamlJsonPage() {
  const [dir, setDir] = useState<Dir>('YAML → JSON')
  const [input, setInput] = useState(SAMPLE_YAML)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!input.trim()) { setOutput(''); setError(''); return }
    try {
      if (dir === 'YAML → JSON') {
        const obj = yaml.load(input)
        setOutput(JSON.stringify(obj, null, 2))
      } else {
        const obj = JSON.parse(input)
        setOutput(yaml.dump(obj, { indent: 2, lineWidth: -1 }))
      }
      setError('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setOutput('')
    }
  }, [input, dir])

  const swap = () => {
    const nextDir: Dir = dir === 'YAML → JSON' ? 'JSON → YAML' : 'YAML → JSON'
    setDir(nextDir)
    setInput(output || (nextDir === 'YAML → JSON' ? SAMPLE_YAML : SAMPLE_JSON))
  }

  const loadSample = () => {
    setInput(dir === 'YAML → JSON' ? SAMPLE_YAML : SAMPLE_JSON)
    setError('')
  }

  return (
    <ToolLayout title="YAML ↔ JSON" description="Convert between YAML and JSON — great for K8s configs and CI/CD pipelines">
      <div className="one-col">
        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 0, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {(['YAML → JSON', 'JSON → YAML'] as Dir[]).map(d => (
              <button key={d} onClick={() => { setDir(d); setInput(d === 'YAML → JSON' ? SAMPLE_YAML : SAMPLE_JSON); setError('') }}
                style={{
                  padding: '8px 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                  background: dir === d ? 'var(--accent-bg)' : 'transparent',
                  color: dir === d ? 'var(--accent)' : 'var(--text-dim)',
                  borderRight: d === 'YAML → JSON' ? '1px solid var(--border)' : 'none',
                }}>{d}</button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={swap} title="Swap input and output">⇄ Swap</button>
          <button className="btn btn-ghost btn-sm" onClick={loadSample}>Load sample</button>
        </div>

        {/* Editor */}
        <div className="two-col">
          <div>
            <div className="section-label">
              Input — {dir.split(' → ')[0]}
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              style={{ minHeight: 340, fontSize: 13, fontFamily: 'var(--font-mono)' }}
              spellCheck={false}
              placeholder={dir === 'YAML → JSON' ? 'Paste YAML here…' : 'Paste JSON here…'}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div className="section-label">Output — {dir.split(' → ')[1]}</div>
              {output && <CopyBtn text={output} />}
            </div>
            {error ? (
              <div style={{
                background: 'oklch(0.17 0.05 25)', border: '1px solid oklch(0.35 0.10 25)',
                borderRadius: 10, padding: '14px 16px',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cat-sec)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Parse Error</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'oklch(0.85 0.10 25)', lineHeight: 1.6 }}>{error}</div>
              </div>
            ) : (
              <pre className="code-out" style={{ minHeight: 340, fontSize: 13, color: dir === 'YAML → JSON' ? 'oklch(0.75 0.14 220)' : 'oklch(0.80 0.14 75)' }}>
                {output || <span style={{ color: 'var(--text-muted)' }}>Output will appear here…</span>}
              </pre>
            )}
          </div>
        </div>

        {/* Stats footer */}
        {output && !error && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { val: input.split('\n').length, key: 'Input lines' },
              { val: output.split('\n').length, key: 'Output lines' },
              { val: `${input.length} B`, key: 'Input size' },
              { val: `${output.length} B`, key: 'Output size' },
            ].map(s => (
              <div key={s.key} className="stat-box" style={{ flex: 1, minWidth: 100 }}>
                <div className="stat-val" style={{ fontSize: 18 }}>{s.val}</div>
                <div className="stat-key">{s.key}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
