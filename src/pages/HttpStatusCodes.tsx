import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'

const HTTP_CODES = [
  { code:100, name:'Continue',                      desc:'Request received, continue.' },
  { code:101, name:'Switching Protocols',            desc:'Switching to new protocol.' },
  { code:200, name:'OK',                             desc:'Request succeeded.' },
  { code:201, name:'Created',                        desc:'Resource created successfully.' },
  { code:202, name:'Accepted',                       desc:'Request accepted, not yet completed.' },
  { code:204, name:'No Content',                     desc:'Successful, no response body.' },
  { code:206, name:'Partial Content',                desc:'Partial resource returned (Range requests).' },
  { code:301, name:'Moved Permanently',              desc:'Resource permanently moved to new URL.' },
  { code:302, name:'Found',                          desc:'Temporary redirect to another URL.' },
  { code:304, name:'Not Modified',                   desc:'Resource not changed; use cached version.' },
  { code:307, name:'Temporary Redirect',             desc:'Redirect, same method required.' },
  { code:308, name:'Permanent Redirect',             desc:'Permanent redirect, same method required.' },
  { code:400, name:'Bad Request',                    desc:'Server cannot parse the request.' },
  { code:401, name:'Unauthorized',                   desc:'Authentication required.' },
  { code:403, name:'Forbidden',                      desc:'Server refuses to authorize the request.' },
  { code:404, name:'Not Found',                      desc:'Resource not found.' },
  { code:405, name:'Method Not Allowed',             desc:'HTTP method not allowed for this route.' },
  { code:408, name:'Request Timeout',                desc:'Server timed out waiting for the request.' },
  { code:409, name:'Conflict',                       desc:'Request conflicts with current state.' },
  { code:410, name:'Gone',                           desc:'Resource permanently deleted.' },
  { code:413, name:'Payload Too Large',              desc:'Request body exceeds server limit.' },
  { code:415, name:'Unsupported Media Type',         desc:'Media type not supported.' },
  { code:422, name:'Unprocessable Entity',           desc:'Validation error on the request body.' },
  { code:429, name:'Too Many Requests',              desc:'Rate limit exceeded.' },
  { code:500, name:'Internal Server Error',          desc:'Unexpected server error.' },
  { code:501, name:'Not Implemented',                desc:'Server does not support this method.' },
  { code:502, name:'Bad Gateway',                    desc:'Invalid response from upstream server.' },
  { code:503, name:'Service Unavailable',            desc:'Server temporarily unavailable.' },
  { code:504, name:'Gateway Timeout',                desc:'Upstream server timed out.' },
  { code:507, name:'Insufficient Storage',           desc:'Server unable to store the representation.' },
]

const STATUS_COLORS: Record<number, string> = { 1:'var(--cat-utl)', 2:'var(--cat-gen)', 3:'var(--cat-txt)', 4:'var(--cat-sec)', 5:'oklch(0.72 0.16 25)' }
const STATUS_BG:     Record<number, string> = { 1:'var(--cat-utl-bg)', 2:'var(--cat-gen-bg)', 3:'var(--cat-txt-bg)', 4:'var(--cat-sec-bg)', 5:'oklch(0.17 0.05 25)' }

export default function HttpStatusCodesPage() {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('All')
  const groups = ['All','1xx Info','2xx Success','3xx Redirect','4xx Client Error','5xx Server Error']

  const filtered = useMemo(() => {
    return HTTP_CODES.filter(c => {
      const gn = Math.floor(c.code / 100)
      const matchGroup = group === 'All' || group.startsWith(String(gn))
      const q = search.toLowerCase()
      const matchQ = !q || String(c.code).includes(q) || c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
      return matchGroup && matchQ
    })
  }, [search, group])

  return (
    <ToolLayout title="HTTP Status Codes" description="Searchable reference for all HTTP 1xx–5xx status codes">
      <div className="one-col">
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by code or name…" style={{ flex:1, minWidth:200 }} />
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {groups.map(g => (
            <button key={g} onClick={() => setGroup(g)} style={{
              padding:'6px 14px', borderRadius:100, fontSize:12, fontWeight:500,
              border:'1px solid', cursor:'pointer', fontFamily:'var(--font-sans)', transition:'all 0.15s',
              background: group===g ? (g==='All'?'var(--accent-bg)':STATUS_BG[+g.charAt(0)]||'var(--accent-bg)') : 'transparent',
              color: group===g ? (g==='All'?'var(--accent)':STATUS_COLORS[+g.charAt(0)]||'var(--accent)') : 'var(--text-dim)',
              borderColor: group===g ? 'currentColor' : 'var(--border)',
            }}>{g}</button>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:10 }}>
          {filtered.map(c => {
            const g = Math.floor(c.code/100)
            return (
              <div key={c.code}
                onClick={() => navigator.clipboard.writeText(String(c.code))}
                style={{
                  display:'flex', gap:14, alignItems:'flex-start',
                  background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10,
                  padding:'13px 16px', cursor:'pointer', transition:'all 0.15s',
                }}
                onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=STATUS_COLORS[g]+'66';(e.currentTarget as HTMLDivElement).style.background='var(--surface2)'}}
                onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor='var(--border)';(e.currentTarget as HTMLDivElement).style.background='var(--surface)'}}>
                <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:18, color: STATUS_COLORS[g], minWidth:44, flexShrink:0 }}>{c.code}</span>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, marginBottom:3 }}>{c.name}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>{c.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </ToolLayout>
  )
}
