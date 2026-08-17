import { useState, useRef, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'
import { saveFile } from '../lib/saveFile'

interface KV { id: number; key: string; val: string; enabled: boolean }
type BodyMode = 'none'|'json'|'form'|'text'
interface SavedReq { id: number; name: string; method: string; url: string; headers: KV[]; params: KV[]; bodyMode: BodyMode; body: string }
interface Store { saved: SavedReq[]; env: KV[] }

// Collections + environment variables persist across launches. localStorage lives
// on disk in the desktop webview profile; Export/Import writes a shareable file.
const STORE_KEY = 'restclient-store'
function loadStore(): Store {
  try { const s = localStorage.getItem(STORE_KEY); if (s) return { saved: [], env: [], ...JSON.parse(s) } } catch { /* ignore */ }
  return { saved: [], env: [] }
}
function saveStore(s: Store) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)) } catch { /* ignore */ } }
// Replace {{name}} with an environment value; leave unknown vars untouched.
function subst(str: string, m: Record<string, string>) { return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in m ? m[k] : `{{${k}}}`)) }

const METHODS = ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']
const SAMPLE_URLS = ['https://jsonplaceholder.typicode.com/posts/1','https://jsonplaceholder.typicode.com/users','https://api.github.com/users/octocat']
const METHOD_COLORS: Record<string, string> = { GET:'var(--cat-gen)', POST:'var(--cat-txt)', PUT:'oklch(0.75 0.16 200)', PATCH:'var(--purple)', DELETE:'var(--cat-sec)', HEAD:'var(--text-dim)', OPTIONS:'var(--cat-utl)' }

function kvRow(id: number): KV { return { id, key: '', val: '', enabled: true } }

// Desktop app sends requests natively (no CORS); browser uses fetch (CORS-bound)
const NATIVE = '__TAURI_INTERNALS__' in window

export default function RestClientPage() {
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState(SAMPLE_URLS[0])
  const [headers, setHeaders] = useState<KV[]>([kvRow(1)])
  const [params, setParams] = useState<KV[]>([kvRow(1)])
  const [bodyMode, setBodyMode] = useState<BodyMode>('none')
  const [body, setBody] = useState('{\n  "title": "Hello World",\n  "body": "test post",\n  "userId": 1\n}')
  const [activeTab, setActiveTab] = useState<'headers'|'params'|'body'|'env'>('headers')
  const [saved, setSaved] = useState<SavedReq[]>(() => loadStore().saved)
  const [env, setEnv] = useState<KV[]>(() => { const e = loadStore().env; return e.length ? e : [kvRow(1)] })
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => { saveStore({ saved, env }) }, [saved, env])

  const [response, setResponse] = useState<null | { status: number; statusText: string; time: number; size: number; headers: Record<string, string>; body: string }>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resTab, setResTab] = useState<'body'|'headers'>('body')
  const nextId = useRef(2)

  const addKV = (setter: React.Dispatch<React.SetStateAction<KV[]>>) => setter(r => [...r, kvRow(nextId.current++)])
  const removeKV = (setter: React.Dispatch<React.SetStateAction<KV[]>>, id: number) => setter(r => r.filter(x => x.id !== id))
  const updateKV = (setter: React.Dispatch<React.SetStateAction<KV[]>>, id: number, k: 'key'|'val'|'enabled', v: string|boolean) =>
    setter(r => r.map(x => x.id === id ? {...x,[k]:v} : x))

  const envMap = () => { const m: Record<string, string> = {}; env.filter(e => e.enabled && e.key).forEach(e => { m[e.key] = e.val }); return m }
  const buildUrl = (m: Record<string, string>) => {
    const sUrl = subst(url, m)
    const qs = params.filter(p => p.enabled && p.key)
      .map(p => `${encodeURIComponent(subst(p.key, m))}=${encodeURIComponent(subst(p.val, m))}`).join('&')
    return sUrl + (qs ? (sUrl.includes('?') ? '&' : '?') + qs : '')
  }

  // Collections + env
  const saveCurrent = () => {
    const name = window.prompt('Save request as:', `${method} ${url}`)?.trim()
    if (!name) return
    setSaved(s => [...s, { id: Date.now(), name, method, url, headers, params, bodyMode, body }])
  }
  const loadReq = (id: number) => {
    const r = saved.find(x => x.id === id); if (!r) return
    setMethod(r.method); setUrl(r.url); setHeaders(r.headers); setParams(r.params); setBodyMode(r.bodyMode); setBody(r.body)
  }
  const delReq = (id: number) => setSaved(s => s.filter(x => x.id !== id))
  const exportCollection = () => saveFile('rest-collection.json', JSON.stringify({ saved, env }, null, 2), 'application/json')
  const importCollection = async (file: File) => {
    try {
      const p = JSON.parse(await file.text())
      if (Array.isArray(p.saved)) setSaved(s => [...s, ...p.saved])
      if (Array.isArray(p.env) && p.env.length) setEnv(p.env)
    } catch { setError('Invalid collection file') }
  }

  const send = async () => {
    if (!url.trim()) return
    setLoading(true); setError(''); setResponse(null)
    const t0 = Date.now()
    try {
      const m = envMap()
      const hdrs: Record<string, string> = {}
      headers.filter(h => h.enabled && h.key).forEach(h => { hdrs[subst(h.key, m)] = subst(h.val, m) })
      if (bodyMode === 'json') hdrs['Content-Type'] = 'application/json'
      const hasBody = bodyMode !== 'none' && !['GET','HEAD'].includes(method)
      const finalUrl = buildUrl(m)
      const sBody = subst(body, m)

      if (NATIVE) {
        const { invoke } = await import('@tauri-apps/api/core')
        const r = await invoke('http_request', { req: {
          method, url: finalUrl,
          headers: Object.entries(hdrs),
          body: hasBody ? sBody : null,
        }}) as { status: number; status_text: string; headers: [string,string][]; body: string; time_ms: number; size: number }
        const resHdrs: Record<string, string> = {}
        r.headers.forEach(([k, v]) => { resHdrs[k] = v })
        let formatted = r.body
        try { formatted = JSON.stringify(JSON.parse(r.body), null, 2) } catch {}
        setResponse({ status: r.status, statusText: r.status_text, time: r.time_ms, size: r.size, headers: resHdrs, body: formatted })
      } else {
        const opts: RequestInit = { method, headers: hdrs }
        if (hasBody) opts.body = sBody
        const res = await fetch(finalUrl, opts)
        const elapsed = Date.now() - t0
        const text = await res.text()
        const resHdrs: Record<string, string> = {}
        res.headers.forEach((v, k) => { resHdrs[k] = v })
        let formatted = text
        try { formatted = JSON.stringify(JSON.parse(text), null, 2) } catch {}
        setResponse({ status: res.status, statusText: res.statusText, time: elapsed, size: new Blob([text]).size, headers: resHdrs, body: formatted })
      }
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
    <ToolLayout title="REST Client" description={NATIVE ? 'Send HTTP requests natively — no CORS limits, any endpoint or header' : 'Send HTTP requests and inspect responses right in your browser'}>
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

        {/* Collections — save/load requests, export/import a shareable file */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={saveCurrent}>💾 Save request</button>
            <span style={{ marginLeft:'auto', display:'flex', gap:8 }}>
              <button className="btn btn-ghost btn-sm" onClick={exportCollection} disabled={!saved.length && env.every(e=>!e.key)}>⤓ Export</button>
              <button className="btn btn-ghost btn-sm" onClick={() => importRef.current?.click()}>⤒ Import</button>
              <input ref={importRef} type="file" accept="application/json,.json" style={{ display:'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) importCollection(f); e.target.value='' }} />
            </span>
          </div>
          {saved.length > 0 && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
              {saved.map(s => (
                <span key={s.id} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 4px 2px 10px', borderRadius:100, border:'1px solid var(--border)' }}>
                  <button onClick={() => loadReq(s.id)} title="Load request" style={{ background:'none', border:'none', color: METHOD_COLORS[s.method] || 'var(--text)', cursor:'pointer', fontSize:11, fontFamily:'var(--font-mono)', fontWeight:700, padding:0 }}>{s.name}</button>
                  <button onClick={() => delReq(s.id)} title="Delete" style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:15, lineHeight:1, padding:'0 2px' }}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Request tabs */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12 }}>
          <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--border)', padding:'0 4px' }}>
            {(['headers','params','body','env'] as const).map(t => (
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
            {activeTab === 'env' && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>Reference these anywhere with <code>{'{{name}}'}</code> — in the URL, headers, params, or body.</div>
                <KVEditor rows={env} setter={setEnv} placeholder={['VAR','value']} />
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
