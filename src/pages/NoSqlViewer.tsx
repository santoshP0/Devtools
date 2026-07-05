import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'

const SAMPLE_DB = `{
  "users": [
    { "id": 1, "name": "Alice Smith", "email": "alice@example.com", "role": "admin", "active": true, "created": "2024-01-15" },
    { "id": 2, "name": "Bob Jones", "email": "bob@example.com", "role": "user", "active": true, "created": "2024-02-01" },
    { "id": 3, "name": "Carol White", "email": "carol@example.com", "role": "user", "active": false, "created": "2024-02-20" }
  ],
  "products": [
    { "id": "p1", "name": "Widget Pro", "price": 49.99, "stock": 150, "category": "tools" },
    { "id": "p2", "name": "Gadget Plus", "price": 99.99, "stock": 0, "category": "electronics" }
  ],
  "settings": {
    "siteName": "DevToolbox",
    "maxUpload": 10485760,
    "features": ["analytics", "email", "export"]
  }
}`

function JsonNode({ data, depth = 0, keyName }: { data: unknown; depth?: number; keyName?: string }) {
  const [open, setOpen] = useState(depth < 2)
  const isObj = typeof data === 'object' && data !== null && !Array.isArray(data)
  const isArr = Array.isArray(data)
  const isPrim = !isObj && !isArr

  if (isPrim) {
    const color = typeof data === 'string' ? 'oklch(0.72 0.15 145)' : typeof data === 'number' ? 'oklch(0.80 0.14 75)' : typeof data === 'boolean' ? 'var(--accent)' : 'var(--text-muted)'
    return (
      <span style={{ color, fontFamily:'var(--font-mono)', fontSize:13 }}>
        {typeof data === 'string' ? `"${data}"` : String(data)}
      </span>
    )
  }

  const entries = isArr ? (data as unknown[]).map((v,i) => [String(i), v]) : Object.entries(data as Record<string,unknown>)
  const bracket = isArr ? ['[',']'] : ['{','}']
  const count = entries.length

  return (
    <span>
      <span onClick={() => setOpen(o=>!o)} style={{ cursor:'pointer', userSelect:'none', color:'var(--text-muted)', fontSize:12 }}>
        {open ? '▾' : '▸'}
      </span>
      <span style={{ color:'var(--border-hi)', fontFamily:'var(--font-mono)', fontSize:13 }}>{bracket[0]}</span>
      {!open && <span onClick={() => setOpen(true)} style={{ color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:12, cursor:'pointer' }}> {count} {isArr?'items':'keys'} </span>}
      {open && (
        <div style={{ marginLeft:16, borderLeft:'1px solid var(--border)', paddingLeft:12 }}>
          {entries.map(([k, v], i) => (
            <div key={String(k)} style={{ margin:'3px 0' }}>
              {!isArr && <span style={{ color:'var(--accent)', fontFamily:'var(--font-mono)', fontSize:13 }}>{`"${String(k)}"`}: </span>}
              {isArr && <span style={{ color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:12 }}>{String(k)}: </span>}
              <JsonNode data={v} depth={depth+1} keyName={String(k)} />
              {i < entries.length - 1 && <span style={{ color:'var(--border-hi)' }}>,</span>}
            </div>
          ))}
        </div>
      )}
      <span style={{ color:'var(--border-hi)', fontFamily:'var(--font-mono)', fontSize:13 }}>{bracket[1]}</span>
    </span>
  )
}

export default function NoSqlViewerPage() {
  const [input, setInput] = useState(SAMPLE_DB)
  const [search, setSearch] = useState('')
  const [activeCol, setActiveCol] = useState<string | null>(null)

  const parsed = useMemo(() => {
    try { return JSON.parse(input) } catch { return null }
  }, [input])

  const collections = useMemo(() => {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return parsed ? { default: Array.isArray(parsed) ? parsed : [parsed] } : null
    }
    return parsed as Record<string, unknown>
  }, [parsed])

  const colNames = collections ? Object.keys(collections) : []
  const active = activeCol || colNames[0] || null
  const activeData = active && collections ? collections[active] : null
  const dataArr = Array.isArray(activeData) ? activeData : activeData ? [activeData] : []

  const filtered = useMemo(() => {
    if (!search) return dataArr
    return dataArr.filter(item => JSON.stringify(item).toLowerCase().includes(search.toLowerCase()))
  }, [dataArr, search])

  return (
    <ToolLayout title="NoSQL Viewer" description="Explore JSON documents like a lightweight NoSQL database viewer">
      <div className="two-col" style={{ alignItems:'flex-start' }}>
        <div>
          <div className="section-label">JSON Database</div>
          <textarea value={input} onChange={e => setInput(e.target.value)} style={{ minHeight:350, fontSize:12 }} spellCheck={false} />
          {!parsed && input.trim() && <div className="error-msg" style={{ marginTop:8 }}>⚠ Invalid JSON</div>}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {colNames.length > 0 && (
            <>
              <div>
                <div className="section-label">Collections ({colNames.length})</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {colNames.map(n => {
                    const col = collections![n]
                    const count = Array.isArray(col) ? col.length : 1
                    return (
                      <button key={n} onClick={() => setActiveCol(n)} style={{
                        padding:'7px 14px', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:13, transition:'all 0.15s',
                        background: active===n ? 'var(--accent-bg)' : 'transparent',
                        color: active===n ? 'var(--accent)' : 'var(--text-dim)',
                        borderColor: active===n ? 'var(--accent-dim)' : 'var(--border)',
                        fontFamily:'var(--font-sans)',
                      }}>{n} <span style={{ opacity:0.7, fontSize:11 }}>({count})</span></button>
                    )
                  })}
                </div>
              </div>
              {active && (
                <>
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search in ${active}…`} />
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>{filtered.length} of {dataArr.length} document{dataArr.length!==1?'s':''}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:460, overflowY:'auto' }}>
                    {filtered.map((doc, i) => (
                      <div key={i} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px', fontSize:13 }}>
                        <JsonNode data={doc} depth={0} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          {!collections && <div style={{ color:'var(--text-muted)', fontSize:14, textAlign:'center', padding:32 }}>Paste JSON data ←</div>}
        </div>
      </div>
    </ToolLayout>
  )
}
