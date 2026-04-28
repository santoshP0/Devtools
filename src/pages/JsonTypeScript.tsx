import { useState, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const click = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }
  return <button className="btn btn-ghost btn-sm" onClick={click}>{copied ? '✓ Copied' : label}</button>
}

function inferType(val: unknown, name: string): string {
  if (val === null) return 'null'
  if (typeof val === 'boolean') return 'boolean'
  if (typeof val === 'number') return 'number'
  if (typeof val === 'string') return 'string'
  if (Array.isArray(val)) {
    if (val.length === 0) return 'unknown[]'
    const types = [...new Set(val.map(v => inferType(v, name)))]
    return `${types.length === 1 ? types[0] : types.join(' | ')}[]`
  }
  if (typeof val === 'object') {
    const iName = (name || 'Root').replace(/[^a-zA-Z0-9]/g,'').replace(/^\d/,'_$&')
    return iName.charAt(0).toUpperCase() + iName.slice(1)
  }
  return 'unknown'
}

function buildInterfaces(val: unknown, name = 'Root', interfaces = new Map<string, string>()) {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) return
  const iName = (name || 'Root').replace(/[^a-zA-Z0-9]/g,'').replace(/^\d/,'_$&')
  const cap = iName.charAt(0).toUpperCase() + iName.slice(1)
  if (interfaces.has(cap)) return
  const fields: string[] = []
  Object.entries(val as Record<string, unknown>).forEach(([k, v]) => {
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `"${k}"`
    const t = inferType(v, k)
    const optional = v === null || v === undefined ? '?' : ''
    fields.push(`  ${safeKey}${optional}: ${t};`)
    if (v && typeof v === 'object' && !Array.isArray(v)) buildInterfaces(v, k, interfaces)
    if (Array.isArray(v)) v.forEach(item => { if (item && typeof item === 'object' && !Array.isArray(item)) buildInterfaces(item, k.replace(/s$/, ''), interfaces) })
  })
  interfaces.set(cap, `export interface ${cap} {\n${fields.join('\n')}\n}`)
}

export default function JsonTypeScriptPage() {
  const SAMPLE = '{"user":{"id":1,"name":"Alice","email":"alice@example.com","active":true,"tags":["admin","user"],"address":{"city":"NYC","zip":"10001"}}}'
  const [input, setInput] = useState(SAMPLE)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [rootName, setRootName] = useState('Root')

  useEffect(() => {
    if (!input.trim()) { setOutput(''); setError(''); return }
    try {
      const obj = JSON.parse(input)
      const interfaces = new Map<string, string>()
      const topName = (rootName || 'Root').replace(/[^a-zA-Z0-9]/g,'').replace(/^\d/,'_$&')
      const cap = topName.charAt(0).toUpperCase() + topName.slice(1)
      if (typeof obj === 'object' && !Array.isArray(obj)) buildInterfaces(obj, cap, interfaces)
      else if (Array.isArray(obj) && obj[0] && typeof obj[0] === 'object') buildInterfaces(obj[0], cap, interfaces)
      const all = [...interfaces.values()].reverse()
      setOutput(all.join('\n\n') || `export type ${cap} = ${inferType(obj, cap)};`)
      setError('')
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); setOutput('') }
  }, [input, rootName])

  return (
    <ToolLayout title="JSON → TypeScript" description="Generate TypeScript interfaces from any JSON object">
      <div className="one-col">
        <div style={{ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div style={{ flex:1, maxWidth:200 }}>
            <label>Root Interface Name</label>
            <input type="text" value={rootName} onChange={e => setRootName(e.target.value)} style={{ fontFamily:'var(--font-mono)' }} />
          </div>
        </div>
        <div className="two-col">
          <div>
            <div className="section-label">JSON Input</div>
            <textarea value={input} onChange={e => setInput(e.target.value)} style={{ minHeight:320, fontSize:13 }} spellCheck={false} />
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div className="section-label">TypeScript Interfaces</div>
              {output && <CopyBtn text={output} />}
            </div>
            {error ? <div className="error-msg">⚠ {error}</div> : (
              <pre className="code-out" style={{ minHeight:320, color:'oklch(0.75 0.14 220)' }}>{output}</pre>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
