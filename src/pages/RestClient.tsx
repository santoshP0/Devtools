import { useState, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'

interface KV { id: number; key: string; val: string; enabled: boolean }

const METHODS = ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']
const SAMPLE_URLS = ['https://jsonplaceholder.typicode.com/posts/1','https://jsonplaceholder.typicode.com/users','https://api.github.com/users/octocat']
const METHOD_COLORS: Record<string, string> = { GET:'var(--cat-gen)', POST:'var(--cat-txt)', PUT:'oklch(0.75 0.16 200)', PATCH:'var(--purple)', DELETE:'var(--cat-sec)', HEAD:'var(--text-dim)', OPTIONS:'var(--cat-utl)' }

function kvRow(id: number): KV { return { id, key: '', val: '', enabled: true } }

export default function RestClientPage() {
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState(SAMPLE_URLS[0])
  const [headers, setHeaders] = useState<KV[]>([kvRow(1)])
  const [params, setParams] = useState<KV[]>([kvRow(1)])
  const [bodyMode, setBodyMode] = useState<'none'|'json'|'form'|'text'>('none')
  const [body, setBody] = useState('{\n  "title": "Hello World",\n  "body": "test post",\n  "userId": 1\n}')
  const [activeTab, setActiveTab] = useState<'headers'|'params'|'body'>('headers')

  const [response, setResponse] = useState<null | { status: number; statusText: string; time: number; size: number; headers: Record<string, string>; body: string }>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resTab, setResTab] = useState<'body'|'headers'>('body')
  const nextId = useRef(2)

  const addKV = (setter: React.Dispatch<React.SetStateAction<KV[]>>) => setter(r => [...r, kvRow(nextId.current++)])
  const removeKV = (setter: React.Dispatch<React.SetStateAction<KV[]>>, id: number) => setter(r => r.filter(x => x.id !== id))
  const updateKV = (setter: React.Dispatch<React.SetStateAction<KV[]>>, id: number, k: 'key'|'val'|'enabled', v: string|boolean) =>
    setter(r => r.map(x => x.id === id ? {...x,[k]:v} : x))

  const buildUrl = () => {
    const qs = params.filter(p => p.enabled && p.key).map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.val)}`).join('&')
    return url + (qs ? (url.includes('?') ? '&' : '?') + qs : '')
  }

  const send = async () => {
    if (!url.trim()) return
    setLoading(true); setError(''); setResponse(null)
    const t0 = Date.now()
    try {
      const hdrs: Record<string, string> = {}
      headers.filter(h => h.enabled && h.key).forEach(h => { hdrs[h.key] = h.val })
      if (bodyMode === 'json') hdrs['Content-Type'] = 'application/json'

      const opts: RequestInit = { method, headers: hdrs }
      if (bodyMode !== 'none' && !['GET','HEAD'].includes(method)) opts.body = body

      const res = await fetch(buildUrl(), opts)
      const elapsed = Date.now() - t0
      const text = await res.text()
      const resHdrs: Record<string, string> = {}
      res.headers.forEach((v, k) => { resHdrs[k] = v })
      let formatted = text
      try { formatted = JSON.stringify(JSON.parse(text), null, 2) } catch {}
      setResponse({ status: res.status, statusText: res.statusText, time: elapsed, size: new Blob([text]).size, headers: resHdrs, body: formatted })
    } catch(e: unknown) { setError(e instanceof Error ? e.message : String(e)) }
    setLoading(false)
  }

  const statusColor = (s: number) => s < 300 ? 'var(--cat-gen)' : s < 400 ? 'var(--cat-txt)' : 'var(--cat-sec)'

  const KVEditor = ({ rows, setter, placeholder = ['Key','Value'] }: { rows: KV[]; setter: React.Dispatch<React.SetStateAction<KV[]>>; placeholder?: [string,string] }) => (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      {rows.map(r => (
        <div key={r.id} style={{ display:'flex', gap:6, alignItems:'center' }}>
          <input type="checkbox" checked={r.enabled} onChange={e => updateKV(setter, r.id, 'enabled', e.target.checked)} style={{ width:16, height:16, flexShrink:0 }} />
          <input type="text" value={r.key} onChange={e => updateKV(setter, r.id, 'key', e.target.value)} placeholder={placeholder[0]} style={{ flex:1, fontSize:12 }} />
          <input type="text" value={r.val} onChange={e => updateKV(setter, r.id, 'val', e.target.value)} placeholder={placeholder[1]} style={{ flex:1.5, fontSize:12 }} />
          <button onClick={() => removeKV(setter, r.id)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18, padding:'0 4px', lineHeight:1 }}>×</button>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => addKV(setter)} style={{ alignSelf:'flex-start' }}>+ Add</button>
    </div>
  )

  return (
    <ToolLayout title="REST Client" description="Send HTTP requests and inspect responses right in your browser">
      <div className="one-col">
        {/* URL bar */}
        <div style={{ display:'flex', gap:8 }}>
          <select value={method} onChange={e => setMethod(e.target.value)} style={{ width:120, fontFamily:'var(--font-mono)', fontWeight:700, fontSize:13, color: METHOD_COLORS[method] }}>
            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://api.example.com/endpoint"
            onKeyDown={e => e.key === 'Enter' && send()} style={{ flex:1, fontSize:14 }} />
          <button className="btn btn-primary" onClick={send} disabled={loading} style={{ minWidth:90 }}>
            {loading ? '…' : 'Send'}
          </button>
        </div>

        {/* Quick URLs */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {SAMPLE_URLS.map(u => (
            <button key={u} onClick={() => setUrl(u)} style={{ fontSize:11, padding:'3px 10px', borderRadius:100, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font-mono)' }}>
              {u.replace('https://','')}
            </button>
          ))}
        </div>

        {/* Request tabs */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12 }}>
          <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--border)', padding:'0 4px' }}>
            {(['headers','params','body'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                padding:'10px 16px', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
                color: activeTab === t ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: activeTab === t ? '2px solid var(--accent)' : '2px solid transparent',
                fontFamily:'var(--font-sans)', textTransform:'capitalize', transition:'all 0.15s',
              }}>{t}{t === 'params' && params.filter(p=>p.enabled&&p.key).length > 0 ? ` (${params.filter(p=>p.enabled&&p.key).length})` : ''}</button>
            ))}
          </div>
          <div style={{ padding:'16px' }}>
            {activeTab === 'headers' && <KVEditor rows={headers} setter={setHeaders} placeholder={['Header-Name','value']} />}
            {activeTab === 'params' && <KVEditor rows={params} setter={setParams} placeholder={['param','value']} />}
            {activeTab === 'body' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', gap:8 }}>
                  {(['none','json','text','form'] as const).map(m => (
                    <button key={m} className={`seg-btn ${bodyMode === m ? 'active' : ''}`} onClick={() => setBodyMode(m)}>{m}</button>
                  ))}
                </div>
                {bodyMode !== 'none' && (
                  <textarea value={body} onChange={e => setBody(e.target.value)} style={{ minHeight:140, fontSize:13 }} spellCheck={false} />
                )}
              </div>
            )}
          </div>
        </div>

        {error && <div className="error-msg">⚠ {error}</div>}

        {/* Response */}
        {response && (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12 }}>
            {/* Status bar */}
            <div style={{ display:'flex', gap:16, alignItems:'center', padding:'12px 16px', borderBottom:'1px solid var(--border)', flexWrap:'wrap' }}>
              <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:16, color: statusColor(response.status) }}>{response.status} {response.statusText}</span>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>⏱ {response.time}ms</span>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>📦 {(response.size/1024).toFixed(1)} KB</span>
              <div style={{ marginLeft:'auto' }}><CopyBtn text={response.body} /></div>
            </div>
            {/* Response tabs */}
            <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--border)', padding:'0 4px' }}>
              {(['body','headers'] as const).map(t => (
                <button key={t} onClick={() => setResTab(t)} style={{
                  padding:'10px 16px', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
                  color: resTab === t ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: resTab === t ? '2px solid var(--accent)' : '2px solid transparent',
                  fontFamily:'var(--font-sans)', textTransform:'capitalize', transition:'all 0.15s',
                }}>{t}</button>
              ))}
            </div>
            <div style={{ padding:'16px' }}>
              {resTab === 'body' && <pre className="code-out" style={{ minHeight:200, maxHeight:420, overflow:'auto', fontSize:13 }}>{response.body}</pre>}
              {resTab === 'headers' && (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {Object.entries(response.headers).map(([k,v]) => (
                    <div key={k} style={{ display:'flex', gap:12, fontFamily:'var(--font-mono)', fontSize:12 }}>
                      <span style={{ color:'var(--accent)', minWidth:180, flexShrink:0 }}>{k}</span>
                      <span style={{ color:'var(--text-dim)', wordBreak:'break-all' }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
