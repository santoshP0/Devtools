import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

function b64decode(str: string) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - str.length % 4) % 4, '=')
  return JSON.parse(decodeURIComponent(atob(padded).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')))
}

export default function JwtDecoder() {
  const [token, setToken] = useState('')
  const [result, setResult] = useState<{ header: object; payload: object; signature: string } | null>(null)
  const [error, setError] = useState('')

  const decode = () => {
    setError('')
    setResult(null)
    const parts = token.trim().split('.')
    if (parts.length !== 3) { setError('Not a valid JWT — expected 3 parts separated by dots.'); return }
    try {
      setResult({ header: b64decode(parts[0]), payload: b64decode(parts[1]), signature: parts[2] })
    } catch {
      setError('Failed to decode JWT. Ensure it is a valid token.')
    }
  }

  const expiry = result?.payload && 'exp' in (result.payload as Record<string, unknown>)
    ? new Date((result.payload as Record<string, number>).exp * 1000)
    : null

  const isExpired = expiry ? expiry < new Date() : null

  return (
    <ToolLayout title="JWT Decoder" description="Decode and inspect JSON Web Token headers and payloads.">
      <div className="space-y-4">
        <div>
          <label className="label">JWT Token</label>
          <textarea
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Paste your JWT here…"
            className="tool-textarea h-28"
            spellCheck={false}
          />
        </div>
        <button onClick={decode} className="btn-primary">Decode</button>

        {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">✗ {error}</div>}

        {result && (
          <div className="space-y-4">
            {expiry && (
              <div className={`text-sm rounded-lg p-3 border ${isExpired ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                {isExpired ? '✗ Token expired' : '✓ Token valid'} — expires {expiry.toLocaleString()}
              </div>
            )}

            {(['header', 'payload'] as const).map(part => (
              <div key={part}>
                <div className="flex justify-between items-center mb-1">
                  <label className="label capitalize">{part}</label>
                  <button onClick={() => navigator.clipboard.writeText(JSON.stringify(result[part], null, 2))} className="copy-btn">Copy</button>
                </div>
                <pre className="bg-white border border-slate-200 rounded-lg p-3 text-xs font-mono overflow-x-auto text-slate-700">
                  {JSON.stringify(result[part], null, 2)}
                </pre>
              </div>
            ))}

            <div>
              <label className="label">Signature (encoded)</label>
              <p className="bg-white border border-slate-200 rounded-lg p-3 text-xs font-mono break-all text-slate-500">
                {result.signature}
              </p>
            </div>

            <p className="text-xs text-slate-400">Note: this tool only decodes the token — it does not verify the signature.</p>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
