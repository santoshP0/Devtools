import { useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'

// native http_request result (desktop) — bypasses CORS via reqwest
interface HttpRes { status: number; status_text: string; headers: [string, string][]; time_ms: number }
interface Meta { status: number; statusText: string; timeMs: number }

const SENSITIVE = ['authorization','cookie','set-cookie','x-api-key','x-auth-token','x-access-token']
const HEADER_DOCS: Record<string, string> = {
  'content-type': 'Media type of the request/response body',
  'content-length': 'Size of the body in octets (bytes)',
  'authorization': 'Authentication credentials',
  'cache-control': 'Caching directives for both requests and responses',
  'cors': 'Cross-Origin Resource Sharing policy',
  'access-control-allow-origin': 'Specifies allowed origins for CORS',
  'x-content-type-options': 'Prevents MIME type sniffing',
  'x-frame-options': 'Controls iframe embedding',
  'strict-transport-security': 'Forces HTTPS (HSTS)',
  'x-xss-protection': 'Enables XSS filtering',
  'content-security-policy': 'Controls resource loading policies',
  'etag': 'Identifier for a specific version of a resource',
  'last-modified': 'Date when resource was last modified',
  'server': 'Web server software information',
  'x-powered-by': 'Technology powering the server (info leak risk)',
  'transfer-encoding': 'Form of encoding used to transfer body',
}

export default function HttpHeadersInspectorPage() {
  const [url, setUrl] = useState('https://httpbin.org/get')
  const [headers, setHeaders] = useState<Record<string, string> | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mask, setMask] = useState(true)

  const inspect = async () => {
    if (!url.trim()) return
    setLoading(true); setError(''); setHeaders(null); setMeta(null)
    try {
      if (isTauri()) {
        // desktop: native reqwest — any origin, real headers, no CORS. HEAD first,
        // fall back to GET for servers that reject HEAD (405/501).
        const { invoke } = await import('@tauri-apps/api/core')
        const send = (method: string) => invoke<HttpRes>('http_request', { req: { method, url, headers: [], body: null } })
        let r = await send('HEAD')
        if (r.status === 405 || r.status === 501) r = await send('GET')
        const hdrs: Record<string, string> = {}
        for (const [k, v] of r.headers) hdrs[k] = v
        setHeaders(hdrs)
        setMeta({ status: r.status, statusText: r.status_text, timeMs: r.time_ms })
      } else {
        const res = await fetch(url, { method: 'HEAD' }).catch(() => fetch(url))
        const hdrs: Record<string, string> = {}
        res.headers.forEach((v, k) => { hdrs[k] = v })
        setHeaders(hdrs)
        setMeta({ status: res.status, statusText: res.statusText, timeMs: 0 })
      }
    } catch(e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(isTauri() ? msg : `${msg} — the browser blocks cross-origin headers (CORS). The desktop app reads any URL.`)
    }
    setLoading(false)
  }

  const isSensitive = (k: string) => SENSITIVE.some(s => k.toLowerCase().includes(s))

  return (
    <ToolLayout title="HTTP Headers Inspector" description="Fetch and analyze HTTP response headers for any URL">
      <div className="one-col">
        <div style={{ display:'flex', gap:8 }}>
          <input type="text" value={url} onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && inspect()} placeholder="https://example.com" style={{ flex:1, fontSize:14 }} />
          <button className="btn btn-primary" onClick={inspect} disabled={loading}>{loading ? '…' : 'Inspect'}</button>
        </div>
        {error && <div className="error-msg">⚠ {error}</div>}
        {headers && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div className="section-label" style={{ display:'flex', alignItems:'center', gap:10 }}>
                {meta && (
                  <span style={{
                    fontFamily:'var(--font-mono)', fontWeight:700, fontSize:12, padding:'2px 8px', borderRadius:100,
                    color: meta.status < 400 ? 'oklch(0.62 0.17 145)' : 'var(--cat-sec)',
                    background: meta.status < 400 ? 'oklch(0.17 0.05 145)' : 'oklch(0.17 0.05 25)',
                  }}>{meta.status} {meta.statusText}</span>
                )}
                <span>{Object.keys(headers).length} headers{meta && meta.timeMs > 0 ? ` · ${meta.timeMs} ms` : ''}</span>
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:0, fontSize:13, cursor:'pointer' }}>
                <input type="checkbox" checked={mask} onChange={e => setMask(e.target.checked)} />
                Mask sensitive values
              </label>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {Object.entries(headers).map(([k, v]) => {
                const sensitive = isSensitive(k)
                const display = sensitive && mask ? '••••••••' : v
                const doc = HEADER_DOCS[k.toLowerCase()]
                return (
                  <div key={k} style={{
                    background:'var(--surface)', border:`1px solid ${sensitive ? 'oklch(0.40 0.10 25)' : 'var(--border)'}`,
                    borderRadius:10, padding:'12px 16px',
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                          <span style={{ fontFamily:'var(--font-mono)', fontWeight:600, fontSize:13, color: sensitive ? 'var(--cat-sec)' : 'var(--accent)' }}>{k}</span>
                          {sensitive && <span style={{ fontSize:10, padding:'1px 6px', background:'oklch(0.17 0.05 25)', color:'var(--cat-sec)', borderRadius:100, fontWeight:600 }}>SENSITIVE</span>}
                        </div>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--text-dim)', wordBreak:'break-all' }}>{display}</div>
                        {doc && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{doc}</div>}
                      </div>
                      <CopyBtn text={v} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
        {!headers && !loading && (
          <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)', fontSize:14 }}>
            Enter a URL and click Inspect to view response headers
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
