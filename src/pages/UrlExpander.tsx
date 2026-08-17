import { useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'

interface Hop { url: string; status: number; status_text: string }
interface ExpandResult { hops: Hop[]; final_url: string; meta_refresh: string | null; truncated: boolean }

// Well-known shorteners — worth calling out, since a chain that ends on one
// means something is still hidden behind it.
const SHORTENERS = new Set([
  'bit.ly', 't.co', 'tinyurl.com', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly',
  'cutt.ly', 'shorturl.at', 'rb.gy', 'lnkd.in', 't.ly', 'shrtco.de', 'tiny.cc', 'bl.ink',
])

const hostOf = (u: string) => { try { return new URL(u).hostname } catch { return '' } }
const protoOf = (u: string) => { try { return new URL(u).protocol } catch { return '' } }

interface Warning { level: 'danger' | 'warn'; text: string }

/** Everything worth flagging about where this link actually goes. */
function analyze(r: ExpandResult): Warning[] {
  const out: Warning[] = []
  const first = r.hops[0]?.url ?? ''
  const startHost = hostOf(first)
  const endHost = hostOf(r.final_url)

  if (r.meta_refresh) {
    out.push({ level: 'danger', text: `The final page redirects again via meta refresh to ${r.meta_refresh} — this hop never appears in the HTTP chain.` })
  }
  if (r.truncated) {
    out.push({ level: 'danger', text: 'Redirect chain hit the hop limit or looped. This link may be deliberately evasive.' })
  }
  if (protoOf(r.final_url) === 'http:') {
    out.push({ level: 'danger', text: 'The destination is plain HTTP — traffic to it is unencrypted.' })
  }
  if (r.hops.some(h => protoOf(h.url) === 'https:') && protoOf(r.final_url) === 'http:') {
    out.push({ level: 'danger', text: 'The chain downgrades from HTTPS to HTTP partway through.' })
  }
  // Punycode / IDN homographs — "аpple.com" with a Cyrillic а renders as ASCII
  if (endHost.split('.').some(p => p.startsWith('xn--'))) {
    out.push({ level: 'danger', text: `The destination host is an internationalized domain (${endHost}). These can imitate a familiar name using look-alike characters.` })
  }
  if (SHORTENERS.has(endHost)) {
    out.push({ level: 'warn', text: `The chain ends on a shortener (${endHost}) — the real destination is still hidden.` })
  }
  if (startHost && endHost && startHost !== endHost) {
    out.push({ level: 'warn', text: `Starts on ${startHost} and ends on ${endHost}.` })
  }
  const creds = (() => { try { const u = new URL(r.final_url); return !!(u.username || u.password) } catch { return false } })()
  if (creds) out.push({ level: 'danger', text: 'The destination URL embeds credentials (user:pass@host) — a classic disguise trick.' })
  if (r.final_url.length > 300) {
    out.push({ level: 'warn', text: 'The destination is unusually long, often a sign of heavy tracking parameters.' })
  }
  return out
}

const statusColor = (s: number) =>
  s >= 300 && s < 400 ? 'var(--cat-txt)' : s < 300 ? 'oklch(0.62 0.17 145)' : 'var(--cat-sec)'

export default function UrlExpander() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<ExpandResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const expand = async () => {
    const input = url.trim()
    if (!input) return
    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`
    setLoading(true); setError(''); setResult(null)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      setResult(await invoke<ExpandResult>('expand_url', { url: withScheme }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setLoading(false)
  }

  // The browser can't follow a cross-origin redirect or read its Location
  // header, so there is no meaningful web fallback for this tool.
  if (!isTauri()) {
    return (
      <ToolLayout title="URL Expander" description="Reveal where a shortened link actually goes — desktop app exclusive.">
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🔗</div>
          <p style={{ maxWidth: 520, margin: '0 auto' }}>
            Browsers can't read where a cross-origin redirect leads — CORS hides the
            <code> Location </code> header and the final URL. Every web-based expander
            has to send your link to someone else's server to work around that.
          </p>
          <p style={{ maxWidth: 520, margin: '12px auto 0' }}>
            The desktop app follows the chain locally, so the link is never handed to a third party.
          </p>
        </div>
      </ToolLayout>
    )
  }

  const warnings = result ? analyze(result) : []

  return (
    <ToolLayout
      title="URL Expander"
      description="See exactly where a shortened link leads — every redirect hop — without opening it."
    >
      <div className="one-col">
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && expand()}
            placeholder="bit.ly/example  ·  paste a shortened link"
            spellCheck={false}
            style={{ flex: 1, fontSize: 14, fontFamily: 'var(--font-mono)' }}
          />
          <button className="btn btn-primary" onClick={expand} disabled={loading} style={{ minWidth: 100 }}>
            {loading ? 'Following…' : 'Expand'}
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Requests are sent from your machine with no cookies, and the page is never rendered — nothing runs.
        </div>

        {error && <div className="error-msg">⚠ {error}</div>}

        {result && (
          <>
            {/* Destination */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div className="section-label" style={{ margin: 0 }}>
                  Destination · {result.hops.length} hop{result.hops.length === 1 ? '' : 's'}
                </div>
                <CopyBtn text={result.final_url} />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, wordBreak: 'break-all', color: 'var(--accent)' }}>
                {result.final_url}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {hostOf(result.final_url)}
              </div>
            </div>

            {/* Findings */}
            {warnings.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {warnings.map((w, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.55,
                    padding: '10px 14px', borderRadius: 10,
                    border: `1px solid ${w.level === 'danger' ? 'oklch(0.40 0.10 25)' : 'var(--border)'}`,
                    background: w.level === 'danger' ? 'oklch(0.17 0.05 25)' : 'var(--surface)',
                    color: w.level === 'danger' ? 'var(--cat-sec)' : 'var(--text-dim)',
                  }}>
                    <span>{w.level === 'danger' ? '⚠' : 'ℹ'}</span>
                    <span>{w.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Chain */}
            <div>
              <div className="section-label">Redirect chain</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.hops.map((h, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: 22 }}>
                      {i + 1}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, minWidth: 34,
                      color: statusColor(h.status),
                    }}>{h.status}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, wordBreak: 'break-all', color: 'var(--text)' }}>{h.url}</span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {hostOf(h.url)}{h.status_text ? ` · ${h.status_text}` : ''}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!result && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
            Paste a shortened link to see every redirect and where it ends up.
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
