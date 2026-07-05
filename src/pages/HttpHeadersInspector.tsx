import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mask, setMask] = useState(true)

  const inspect = async () => {
    if (!url.trim()) return
    setLoading(true); setError(''); setHeaders(null)
    try {
      const res = await fetch(url, { method: 'HEAD' }).catch(() => fetch(url))
      const hdrs: Record<string, string> = {}
      res.headers.forEach((v, k) => { hdrs[k] = v })
      setHeaders(hdrs)
    } catch(e: unknown) { setError(e instanceof Error ? e.message : 'Failed to fetch') }
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
              <div className="section-label">{Object.keys(headers).length} headers returned</div>
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
