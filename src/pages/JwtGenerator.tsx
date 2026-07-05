import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'

/* ── Base64-URL helpers ── */
function base64UrlEncode(data: Uint8Array | string): string {
  const str = typeof data === 'string'
    ? btoa(unescape(encodeURIComponent(data)))
    : btoa(String.fromCharCode(...data))
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - str.length % 4) % 4, '=')
  return decodeURIComponent(atob(padded).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''))
}

/* ── HMAC signing via Web Crypto ── */
async function signHMAC(algorithm: string, secret: string, data: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: algorithm }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return base64UrlEncode(new Uint8Array(sig))
}

const ALGORITHMS = [
  { label: 'HS256', hash: 'SHA-256' },
  { label: 'HS384', hash: 'SHA-384' },
  { label: 'HS512', hash: 'SHA-512' },
] as const

type AlgLabel = typeof ALGORITHMS[number]['label']

/* ── Shared inline styles ── */
const sectionBox: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: 16,
}
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-dim)',
  marginBottom: 6,
  fontFamily: 'var(--font-sans)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}
const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 100,
  padding: 10,
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface2)',
  color: 'var(--text)',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  resize: 'vertical',
  outline: 'none',
}
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface2)',
  color: 'var(--text)',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  outline: 'none',
}
const tokenOutputStyle: React.CSSProperties = {
  ...textareaStyle,
  minHeight: 80,
  wordBreak: 'break-all' as const,
  whiteSpace: 'pre-wrap',
}

/* ── Component ── */
export default function JwtGenerator() {
  const [alg, setAlg] = useState<AlgLabel>('HS256')
  const [headerText, setHeaderText] = useState('{\n  "alg": "HS256",\n  "typ": "JWT"\n}')
  const [payloadText, setPayloadText] = useState('{\n\n}')
  const [secret, setSecret] = useState('my-super-secret')
  const [token, setToken] = useState('')
  const [genError, setGenError] = useState('')
  const [generating, setGenerating] = useState(false)

  // Decode tab
  const [decodeInput, setDecodeInput] = useState('')
  const [decodeResult, setDecodeResult] = useState<{ header: string; payload: string; signature: string } | null>(null)
  const [decodeError, setDecodeError] = useState('')

  const [activeTab, setActiveTab] = useState<'generate' | 'decode'>('generate')

  // Sync header alg when selector changes
  const handleAlgChange = (newAlg: AlgLabel) => {
    setAlg(newAlg)
    try {
      const h = JSON.parse(headerText)
      h.alg = newAlg
      setHeaderText(JSON.stringify(h, null, 2))
    } catch { /* leave header as-is if invalid JSON */ }
  }

  // Generate JWT
  const generate = async () => {
    setGenError('')
    setToken('')
    setGenerating(true)
    try {
      JSON.parse(headerText) // validate
      JSON.parse(payloadText) // validate
    } catch {
      setGenError('Header or payload is not valid JSON.')
      setGenerating(false)
      return
    }
    if (!secret) {
      setGenError('Secret key is required.')
      setGenerating(false)
      return
    }
    try {
      const algEntry = ALGORITHMS.find(a => a.label === alg)!
      const encodedHeader = base64UrlEncode(headerText.trim())
      const encodedPayload = base64UrlEncode(payloadText.trim())
      const signingInput = `${encodedHeader}.${encodedPayload}`
      const signature = await signHMAC(algEntry.hash, secret, signingInput)
      setToken(`${signingInput}.${signature}`)
    } catch (e: unknown) {
      setGenError(`Signing failed: ${e instanceof Error ? e.message : String(e)}`)
    }
    setGenerating(false)
  }

  // Decode JWT
  const decode = () => {
    setDecodeError('')
    setDecodeResult(null)
    const parts = decodeInput.trim().split('.')
    if (parts.length !== 3) {
      setDecodeError('Not a valid JWT - expected 3 parts separated by dots.')
      return
    }
    try {
      const header = JSON.stringify(JSON.parse(base64UrlDecode(parts[0])), null, 2)
      const payload = JSON.stringify(JSON.parse(base64UrlDecode(parts[1])), null, 2)
      setDecodeResult({ header, payload, signature: parts[2] })
    } catch {
      setDecodeError('Failed to decode JWT. Ensure it is a valid token.')
    }
  }

  // Expiry info from decoded payload
  const expiryInfo = useMemo(() => {
    if (!decodeResult) return null
    try {
      const p = JSON.parse(decodeResult.payload)
      if (!p.exp) return { status: 'no-expiry' as const }
      const expDate = new Date(p.exp * 1000)
      const expired = expDate < new Date()
      return { status: expired ? 'expired' as const : 'valid' as const, date: expDate }
    } catch { return null }
  }, [decodeResult])

  const tabBtn = (tab: 'generate' | 'decode', label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      style={{
        padding: '8px 20px',
        borderRadius: 8,
        border: '1px solid',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        fontWeight: 600,
        transition: 'all 0.15s',
        background: activeTab === tab ? 'var(--accent)' : 'transparent',
        color: activeTab === tab ? '#fff' : 'var(--text-dim)',
        borderColor: activeTab === tab ? 'var(--accent)' : 'var(--border)',
      }}
    >
      {label}
    </button>
  )

  return (
    <ToolLayout title="JWT Generator" description="Generate and sign JWT tokens, or decode existing ones.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 8 }}>
          {tabBtn('generate', 'Generate JWT')}
          {tabBtn('decode', 'Decode JWT')}
        </div>

        {activeTab === 'generate' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Algorithm selector */}
            <div style={sectionBox}>
              <label style={labelStyle}>Algorithm</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {ALGORITHMS.map(a => (
                  <button
                    key={a.label}
                    onClick={() => handleAlgChange(a.label)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: 8,
                      border: '1px solid',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      fontWeight: 600,
                      transition: 'all 0.15s',
                      background: alg === a.label ? 'var(--accent)' : 'transparent',
                      color: alg === a.label ? '#fff' : 'var(--text-dim)',
                      borderColor: alg === a.label ? 'var(--accent)' : 'var(--border)',
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Header */}
            <div style={sectionBox}>
              <label style={labelStyle}>Header</label>
              <textarea
                value={headerText}
                onChange={e => setHeaderText(e.target.value)}
                style={textareaStyle}
                spellCheck={false}
              />
            </div>

            {/* Payload */}
            <div style={sectionBox}>
              <label style={labelStyle}>Payload</label>
              <textarea
                value={payloadText}
                onChange={e => setPayloadText(e.target.value)}
                style={{ ...textareaStyle, minHeight: 140 }}
                placeholder='{\n  "sub": "user-123",\n  "name": "Alice"\n}'
                spellCheck={false}
              />
            </div>

            {/* Secret */}
            <div style={sectionBox}>
              <label style={labelStyle}>Secret Key</label>
              <input
                type="text"
                value={secret}
                onChange={e => setSecret(e.target.value)}
                style={inputStyle}
                placeholder="Enter your secret key..."
                spellCheck={false}
              />
            </div>

            {/* Generate button */}
            <button
              className="btn btn-primary btn-sm"
              onClick={generate}
              disabled={generating}
              style={{ alignSelf: 'flex-start', padding: '10px 28px', fontSize: 14 }}
            >
              {generating ? 'Signing...' : 'Generate JWT'}
            </button>

            {genError && (
              <div style={{
                padding: 12,
                borderRadius: 8,
                border: '1px solid #ef444480',
                background: '#ef444418',
                color: '#f87171',
                fontSize: 13,
              }}>
                {genError}
              </div>
            )}

            {token && (
              <div style={sectionBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Generated Token</label>
                  <CopyBtn text={token} label="Copy Token" />
                </div>
                <div style={tokenOutputStyle}>{token}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'decode' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={sectionBox}>
              <label style={labelStyle}>Paste JWT Token</label>
              <textarea
                value={decodeInput}
                onChange={e => setDecodeInput(e.target.value)}
                style={{ ...textareaStyle, minHeight: 100 }}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                spellCheck={false}
              />
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={decode}
              style={{ alignSelf: 'flex-start', padding: '10px 28px', fontSize: 14 }}
            >
              Decode
            </button>

            {decodeError && (
              <div style={{
                padding: 12,
                borderRadius: 8,
                border: '1px solid #ef444480',
                background: '#ef444418',
                color: '#f87171',
                fontSize: 13,
              }}>
                {decodeError}
              </div>
            )}

            {decodeResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Expiry indicator */}
                {expiryInfo && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    border: '1px solid',
                    ...(expiryInfo.status === 'expired' ? {
                      background: '#ef444418',
                      borderColor: '#ef444460',
                      color: '#f87171',
                    } : expiryInfo.status === 'valid' ? {
                      background: '#22c55e18',
                      borderColor: '#22c55e60',
                      color: '#4ade80',
                    } : {
                      background: 'var(--surface2)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-muted)',
                    }),
                  }}>
                    {expiryInfo.status === 'expired' && `Token expired — ${expiryInfo.date!.toLocaleString()}`}
                    {expiryInfo.status === 'valid' && `Token valid — expires ${expiryInfo.date!.toLocaleString()}`}
                    {expiryInfo.status === 'no-expiry' && 'No expiry claim (exp) found'}
                  </div>
                )}

                {/* Header */}
                <div style={sectionBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Header</label>
                    <CopyBtn text={decodeResult.header} />
                  </div>
                  <pre style={{
                    ...textareaStyle,
                    minHeight: 'auto',
                    margin: 0,
                    resize: 'none',
                    whiteSpace: 'pre-wrap',
                  }}>{decodeResult.header}</pre>
                </div>

                {/* Payload */}
                <div style={sectionBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Payload</label>
                    <CopyBtn text={decodeResult.payload} />
                  </div>
                  <pre style={{
                    ...textareaStyle,
                    minHeight: 'auto',
                    margin: 0,
                    resize: 'none',
                    whiteSpace: 'pre-wrap',
                  }}>{decodeResult.payload}</pre>
                </div>

                {/* Signature */}
                <div style={sectionBox}>
                  <label style={labelStyle}>Signature (encoded)</label>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    wordBreak: 'break-all',
                  }}>
                    {decodeResult.signature}
                  </div>
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Note: this tool decodes and displays the token contents. Signature verification requires the original secret.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
