import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'

interface Parsed { method: string; url: string; headers: Record<string,string>; body: string | null }

function parseCurl(curl: string): Parsed | null {
  try {
    const s = curl.replace(/\\\n/g, ' ').replace(/\s+/g, ' ').trim()
    if (!s.toLowerCase().startsWith('curl')) return null
    const urlM = s.match(/['"]?(https?:\/\/[^\s'"]+)['"]?/)
    const url = urlM ? urlM[1] : ''
    const methodM = s.match(/-X\s+([A-Z]+)/i)
    const method = methodM ? methodM[1].toUpperCase() : (s.includes('-d ') ? 'POST' : 'GET')
    const headers: Record<string,string> = {}
    const hRe = /-H\s+['"]([^'"]+)['"]/g; let hm
    while ((hm = hRe.exec(s)) !== null) {
      const [k,...rest] = hm[1].split(/:\s*/); if (k) headers[k.trim()] = rest.join(': ').trim()
    }
    const bodyM = s.match(/(?:-d|--data(?:-raw|-binary)?)\s+['"](.+?)['"](?:\s|$)/)
    return { method, url, headers, body: bodyM ? bodyM[1] : null }
  } catch { return null }
}

function toFetch(p: Parsed): string {
  const hdrs = Object.entries(p.headers)
  const hStr = hdrs.length ? `,\n  headers: {\n${hdrs.map(([k,v])=>`    "${k}": "${v}"`).join(',\n')}\n  }` : ''
  const bStr = p.body ? `,\n  body: ${/^\s*[{[]/.test(p.body) ? `JSON.stringify(${p.body})` : `"${p.body}"`}` : ''
  const methStr = p.method !== 'GET' ? `,\n  method: "${p.method}"` : ''
  return `const response = await fetch("${p.url}", {${methStr}${hStr}${bStr}\n});\nconst data = await response.json();\nconsole.log(data);`
}

function toAxios(p: Parsed): string {
  const hdrs = Object.entries(p.headers)
  const hStr = hdrs.length ? `,\n  headers: {\n${hdrs.map(([k,v])=>`    "${k}": "${v}"`).join(',\n')}\n  }` : ''
  const bStr = p.body ? `,\n  data: ${/^\s*[{[]/.test(p.body) ? p.body : `"${p.body}"`}` : ''
  return `const response = await axios.${p.method.toLowerCase()}("${p.url}", {${hStr}${bStr}\n});\nconsole.log(response.data);`
}

const SAMPLE = `curl -X POST "https://api.example.com/users" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer mytoken123" \\\n  -d '{"name":"Alice","email":"alice@example.com"}'`

export default function CurlFetchConverterPage() {
  const [input, setInput] = useState(SAMPLE)
  const [target, setTarget] = useState<'fetch'|'axios'>('fetch')
  const parsed = useMemo(() => parseCurl(input), [input])
  const output = useMemo(() => {
    if (!parsed) return ''
    return target === 'fetch' ? toFetch(parsed) : toAxios(parsed)
  }, [parsed, target])

  return (
    <ToolLayout title="cURL ↔ Fetch/Axios" description="Convert cURL commands to fetch() or axios JavaScript code instantly">
      <div className="one-col">
        <div style={{ display:'flex', gap:8 }}>
          {(['fetch','axios'] as const).map(t => (
            <button key={t} className={`seg-btn ${target === t ? 'active' : ''}`} onClick={() => setTarget(t)}>{t}</button>
          ))}
        </div>
        <div className="two-col">
          <div>
            <div className="section-label">cURL Command</div>
            <textarea value={input} onChange={e => setInput(e.target.value)} style={{ minHeight:260, fontSize:13 }} spellCheck={false} />
            {!parsed && input.trim() && <div className="error-msg" style={{ marginTop:8 }}>⚠ Could not parse cURL command</div>}
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div className="section-label">{target === 'fetch' ? 'fetch()' : 'axios'} code</div>
              {output && <CopyBtn text={output} />}
            </div>
            <pre className="code-out" style={{ minHeight:260, color:'oklch(0.80 0.14 75)' }}>{output || <span style={{ color:'var(--text-muted)' }}>Paste a curl command ←</span>}</pre>
          </div>
        </div>
        {parsed && (
          <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px' }}>
            <div className="section-label">Parsed</div>
            <div style={{ fontSize:12, fontFamily:'var(--font-mono)', lineHeight:1.9, display:'flex', gap:24, flexWrap:'wrap' }}>
              <span><span style={{ color:'var(--text-muted)' }}>method: </span><span style={{ color:'var(--accent)' }}>{parsed.method}</span></span>
              <span><span style={{ color:'var(--text-muted)' }}>headers: </span><span style={{ color:'var(--text-dim)' }}>{Object.keys(parsed.headers).length}</span></span>
              <span><span style={{ color:'var(--text-muted)' }}>body: </span><span style={{ color:'var(--text-dim)' }}>{parsed.body ? `${parsed.body.length} chars` : 'none'}</span></span>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
