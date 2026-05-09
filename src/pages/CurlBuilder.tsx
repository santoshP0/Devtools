import { useState, useMemo, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const click = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }
  return <button className="btn btn-ghost btn-sm" onClick={click}>{copied ? '✓ Copied' : label}</button>
}

interface Header { id: number; key: string; val: string }

export default function CurlBuilderPage() {
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('https://api.example.com/users')
  const [headers, setHeaders] = useState<Header[]>([
    { id:1, key:'Content-Type', val:'application/json' },
    { id:2, key:'Authorization', val:'Bearer YOUR_TOKEN' },
  ])
  const [body, setBody] = useState('{\n  "name": "Alice",\n  "email": "alice@example.com"\n}')
  const [followRedirects, setFollowRedirects] = useState(true)
  const [verbose, setVerbose] = useState(false)
  const [auth, setAuth] = useState({ user:'', pass:'' })
  const nextId = useRef(3)

  const curl = useMemo(() => {
    const parts = ['curl']
    if (verbose) parts.push('-v')
    if (followRedirects) parts.push('-L')
    parts.push(`-X ${method}`)
    headers.filter(h=>h.key&&h.val).forEach(h => parts.push(`  -H "${h.key}: ${h.val}"`))
    if (auth.user && auth.pass) parts.push(`  -u "${auth.user}:${auth.pass}"`)
    if (['POST','PUT','PATCH'].includes(method) && body.trim()) parts.push(`  -d '${body.replace(/'/g,"'\\''")}'`)
    parts.push(`  "${url}"`)
    return parts.join(' \\\n')
  }, [method, url, headers, body, followRedirects, verbose, auth])

  const addHeader = () => setHeaders(h => [...h, { id:nextId.current++, key:'', val:'' }])
  const removeHeader = (id: number) => setHeaders(h => h.filter(x=>x.id!==id))
  const updateHeader = (id: number, k: 'key'|'val', v: string) => setHeaders(h=>h.map(x=>x.id===id?{...x,[k]:v}:x))

  return (
    <ToolLayout title="Curl Builder" description="Build and export curl commands from a visual form">
      <div className="two-col">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label>Method</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].map(m => (
                <button key={m} onClick={()=>setMethod(m)} style={{
                  padding:'7px 14px', borderRadius:8, border:'1px solid', cursor:'pointer',
                  fontFamily:'var(--font-mono)', fontSize:12, fontWeight:600, transition:'all 0.15s',
                  background: method===m ? 'var(--accent-bg)' : 'transparent',
                  color: method===m ? 'var(--accent)' : 'var(--text-dim)',
                  borderColor: method===m ? 'var(--accent-dim)' : 'var(--border)',
                }}>{m}</button>
              ))}
            </div>
          </div>
          <div>
            <label>URL</label>
            <input type="text" value={url} onChange={e=>setUrl(e.target.value)} style={{ fontSize:13 }} placeholder="https://api.example.com/endpoint" />
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <label style={{ marginBottom:0 }}>Headers</label>
              <button className="btn btn-ghost btn-sm" onClick={addHeader}>+ Add</button>
            </div>
            {headers.map(h => (
              <div key={h.id} style={{ display:'flex', gap:6, marginBottom:7 }}>
                <input type="text" value={h.key} onChange={e=>updateHeader(h.id,'key',e.target.value)} placeholder="Header-Name" style={{ flex:1, fontSize:12 }} />
                <input type="text" value={h.val} onChange={e=>updateHeader(h.id,'val',e.target.value)} placeholder="value" style={{ flex:1.5, fontSize:12 }} />
                <button onClick={()=>removeHeader(h.id)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18, padding:'0 4px' }}>×</button>
              </div>
            ))}
          </div>
          {['POST','PUT','PATCH'].includes(method) && (
            <div>
              <label>Request Body</label>
              <textarea value={body} onChange={e=>setBody(e.target.value)} style={{ minHeight:120, fontSize:13 }} spellCheck={false} />
            </div>
          )}
          <div>
            <label>Basic Auth</label>
            <div style={{ display:'flex', gap:8 }}>
              <input type="text" value={auth.user} onChange={e=>setAuth(a=>({...a,user:e.target.value}))} placeholder="username" style={{ flex:1, fontSize:13 }} />
              <input type="password" value={auth.pass} onChange={e=>setAuth(a=>({...a,pass:e.target.value}))} placeholder="password" style={{ flex:1, fontSize:13 }} />
            </div>
          </div>
          <div style={{ display:'flex', gap:16 }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:0, fontSize:13 }}>
              <input type="checkbox" checked={followRedirects} onChange={e=>setFollowRedirects(e.target.checked)} />
              Follow redirects (-L)
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:0, fontSize:13 }}>
              <input type="checkbox" checked={verbose} onChange={e=>setVerbose(e.target.checked)} />
              Verbose (-v)
            </label>
          </div>
        </div>
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div className="section-label">Generated Curl Command</div>
            <CopyBtn text={curl} />
          </div>
          <pre className="code-out large" style={{ fontSize:13, color:'var(--cat-gen)', lineHeight:1.9 }}>{curl}</pre>
        </div>
      </div>
    </ToolLayout>
  )
}
