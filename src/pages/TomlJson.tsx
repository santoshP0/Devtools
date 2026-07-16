import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'
import { parse } from 'smol-toml'

function jsonToToml(obj: unknown, indent = 0): string {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error('Top-level value must be an object/table')
  }

  const lines: string[] = []
  const record = obj as Record<string, unknown>

  // Simple key-value pairs first (not nested objects or array-of-tables)
  for (const [k, v] of Object.entries(record)) {
    const key = /^[a-zA-Z0-9_-]+$/.test(k) ? k : JSON.stringify(k)
    if (v === null) continue
    if (typeof v === 'string') {
      lines.push(`${key} = ${JSON.stringify(v)}`)
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      lines.push(`${key} = ${v}`)
    } else if (Array.isArray(v) && (v.length === 0 || typeof v[0] !== 'object')) {
      lines.push(`${key} = [${v.map(x => typeof x === 'string' ? JSON.stringify(x) : String(x)).join(', ')}]`)
    }
  }

  // Nested tables
  for (const [k, v] of Object.entries(record)) {
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      const key = /^[a-zA-Z0-9_-]+$/.test(k) ? k : JSON.stringify(k)
      lines.push('')
      lines.push(`[${key}]`)
      const nested = v as Record<string, unknown>
      for (const [nk, nv] of Object.entries(nested)) {
        const nKey = /^[a-zA-Z0-9_-]+$/.test(nk) ? nk : JSON.stringify(nk)
        if (typeof nv === 'string') lines.push(`${nKey} = ${JSON.stringify(nv)}`)
        else if (typeof nv === 'number' || typeof nv === 'boolean') lines.push(`${nKey} = ${nv}`)
        else if (Array.isArray(nv) && (nv.length === 0 || typeof nv[0] !== 'object')) {
          lines.push(`${nKey} = [${nv.map(x => typeof x === 'string' ? JSON.stringify(x) : String(x)).join(', ')}]`)
        }
      }
    }
  }

  // Array of tables
  for (const [k, v] of Object.entries(record)) {
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
      const key = /^[a-zA-Z0-9_-]+$/.test(k) ? k : JSON.stringify(k)
      for (const item of v) {
        lines.push('')
        lines.push(`[[${key}]]`)
        for (const [ik, iv] of Object.entries(item as Record<string, unknown>)) {
          const iKey = /^[a-zA-Z0-9_-]+$/.test(ik) ? ik : JSON.stringify(ik)
          if (typeof iv === 'string') lines.push(`${iKey} = ${JSON.stringify(iv)}`)
          else if (typeof iv === 'number' || typeof iv === 'boolean') lines.push(`${iKey} = ${iv}`)
        }
      }
    }
  }

  return lines.join('\n').trim()
}

const SAMPLE_TOML = `[package]
name = "devtoolbox"
version = "1.0.0"
description = "Free developer tools"

[dependencies]
react = "^18.0.0"
typescript = "^5.0.0"

[[authors]]
name = "Santosh"
email = "santosh@example.com"

[[authors]]
name = "Contributor"
email = "contrib@example.com"`

export default function TomlJson() {
  const [toml, setToml] = useState(SAMPLE_TOML)
  const [json, setJson] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<'toml' | 'json' | null>(null)

  const tomlToJson = () => {
    setError('')
    try {
      const result = parse(toml)
      setJson(JSON.stringify(result, null, 2))
    } catch (e) {
      setError('TOML parse error: ' + (e as Error).message)
    }
  }

  const jsonToTomlFn = () => {
    setError('')
    try {
      const obj = JSON.parse(json)
      setToml(jsonToToml(obj))
    } catch (e) {
      setError('Conversion error: ' + (e as Error).message)
    }
  }

  const copy = async (which: 'toml' | 'json') => {
    await navigator.clipboard.writeText(which === 'toml' ? toml : json)
    setCopied(which)
    setTimeout(() => setCopied(null), 1500)
  }

  const panelStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', flex: 1,
  }
  const labelStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 6,
  }
  const taStyle: React.CSSProperties = {
    flex: 1, minHeight: 360, width: '100%', padding: 12, resize: 'vertical',
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13,
    lineHeight: 1.6, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <ToolLayout title="TOML ↔ JSON" description="Convert between TOML configuration files and JSON.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && (
          <div style={{ padding: '10px 14px', background: 'oklch(0.17 0.05 25)', border: '1px solid oklch(0.72 0.16 25)', borderRadius: 8, color: 'oklch(0.80 0.16 25)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
            ✗ {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={panelStyle}>
            <div style={labelStyle}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>TOML</span>
              <button onClick={() => copy('toml')} className="copy-btn">{copied === 'toml' ? '✓ Copied' : 'Copy'}</button>
            </div>
            <textarea value={toml} onChange={e => setToml(e.target.value)} spellCheck={false} style={taStyle} />
          </div>
          <div style={panelStyle}>
            <div style={labelStyle}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>JSON</span>
              <button onClick={() => copy('json')} className="copy-btn">{copied === 'json' ? '✓ Copied' : 'Copy'}</button>
            </div>
            <textarea value={json} onChange={e => setJson(e.target.value)} spellCheck={false} style={taStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={tomlToJson} className="btn-primary">TOML → JSON</button>
          <button onClick={jsonToTomlFn} className="btn-secondary">JSON → TOML</button>
        </div>
      </div>
    </ToolLayout>
  )
}
