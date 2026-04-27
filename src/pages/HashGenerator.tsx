import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const

async function digest(algorithm: string, data: string) {
  const buf = await crypto.subtle.digest(algorithm, new TextEncoder().encode(data))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function HashGenerator() {
  const [input, setInput] = useState('')
  const [hashes, setHashes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [copiedKey, setCopiedKey] = useState('')

  const generate = async () => {
    if (!input) return
    setLoading(true)
    const results: Record<string, string> = {}
    for (const alg of ALGORITHMS) {
      results[alg] = await digest(alg, input)
    }
    setHashes(results)
    setLoading(false)
  }

  const copy = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 1500)
  }

  return (
    <ToolLayout title="Hash Generator" description="Generate cryptographic hashes using the Web Crypto API.">
      <div className="space-y-4">
        <div>
          <label className="label">Input Text</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.ctrlKey && generate()}
            placeholder="Enter text to hash…"
            className="tool-textarea h-32"
            spellCheck={false}
          />
        </div>
        <button onClick={generate} disabled={!input || loading} className="btn-primary">
          {loading ? 'Generating…' : 'Generate Hashes'}
        </button>

        {Object.keys(hashes).length > 0 && (
          <div className="space-y-3">
            {ALGORITHMS.map(alg => (
              <div key={alg} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-500">{alg}</span>
                  <button onClick={() => copy(alg, hashes[alg])} className="copy-btn">
                    {copiedKey === alg ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="font-mono text-xs break-all text-slate-700">{hashes[alg]}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
