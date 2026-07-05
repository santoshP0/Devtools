import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'

function prettyJSON(s: string) { try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return null } }
function prettyXML(s: string) {
  let indent = 0
  return s.replace(/>\s*</g, '>\n<').split('\n').map(line => {
    line = line.trim()
    if (!line) return ''
    if (line.startsWith('</')) indent = Math.max(0, indent - 1)
    const out = '  '.repeat(indent) + line
    if (!line.startsWith('</') && !line.endsWith('/>') && line.includes('<') && !line.includes('</')) indent++
    return out
  }).filter(Boolean).join('\n')
}

const SAMPLES = [
  { label:'JSON obj', val:'{"user":{"id":1,"name":"Alice","roles":["admin","user"],"active":true}}' },
  { label:'JSON arr', val:'[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]' },
  { label:'XML', val:'<users><user id="1"><name>Alice</name><email>alice@ex.com</email></user></users>' },
]

export default function ApiResponseFormatterPage() {
  const [input, setInput] = useState(SAMPLES[0].val)
  const [mode, setMode] = useState<'auto'|'json'|'xml'|'text'>('auto')

  const detect = (s: string) => { const t = s.trim(); if (t.startsWith('{') || t.startsWith('[')) return 'json'; if (t.startsWith('<')) return 'xml'; return 'text' }
  const effectiveMode = mode === 'auto' ? detect(input) : mode
  const json = effectiveMode === 'json' ? prettyJSON(input) : null
  const xml = effectiveMode === 'xml' ? prettyXML(input) : null
  const output = json ?? xml ?? input

  const stats = (() => {
    try {
      if (effectiveMode === 'json') {
        const o = JSON.parse(input)
        const keys = typeof o === 'object' && o !== null ? Object.keys(Array.isArray(o) ? o[0] || {} : o).length : 0
        return { type:'JSON', items: Array.isArray(o) ? o.length : 1, keys, size: input.length }
      }
    } catch {}
    return { type: effectiveMode.toUpperCase(), items: 0, keys: 0, size: input.length }
  })()

  return (
    <ToolLayout title="API Response Formatter" description="Prettify JSON, XML and API payloads with size stats">
      <div className="one-col">
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ display:'flex', gap:6 }}>
            {(['auto','json','xml','text'] as const).map(m => (
              <button key={m} className={`seg-btn ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>{m}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
            {SAMPLES.map(s => (
              <button key={s.label} onClick={() => setInput(s.val)} style={{ fontSize:11, padding:'4px 10px', borderRadius:100, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font-mono)' }}>{s.label}</button>
            ))}
          </div>
        </div>
        <div className="two-col">
          <div>
            <div className="section-label">Raw Input</div>
            <textarea value={input} onChange={e => setInput(e.target.value)} style={{ minHeight:300, fontSize:13 }} spellCheck={false} />
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div className="section-label">Formatted ({effectiveMode.toUpperCase()})</div>
              {output && <CopyBtn text={output} />}
            </div>
            {json === null && effectiveMode === 'json' && input.trim()
              ? <div className="error-msg">⚠ Invalid JSON</div>
              : <pre className="code-out" style={{ minHeight:300, color: effectiveMode==='json'?'oklch(0.80 0.14 220)':'var(--text)' }}>{output}</pre>
            }
          </div>
        </div>
        <div className="stat-grid">
          {[
            { val: stats.type,           key: 'Type' },
            { val: stats.size,           key: 'Bytes' },
            { val: Math.round(stats.size/1024*100)/100 + ' KB', key: 'Size' },
            { val: stats.items || '—',   key: Array.isArray(JSON.parse(input.trim() || 'null')) ? 'Items' : 'Object' },
          ].map(s => (
            <div className="stat-box" key={s.key}>
              <div className="stat-val" style={{ fontSize:18 }}>{s.val}</div>
              <div className="stat-key">{s.key}</div>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  )
}
