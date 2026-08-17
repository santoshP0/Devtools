import { useRef, useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import ToolLayout from '../components/ToolLayout'
import { useClipboardCopy } from '../hooks/useClipboardCopy'
import { useNativeDrop } from '../hooks/useNativeDrop'

const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const
// Files also get MD5 (the classic checksum); MD5 isn't in Web Crypto, so it's desktop-only.
const ORDER = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']

async function digest(algorithm: string, data: ArrayBuffer | string) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const buf = await crypto.subtle.digest(algorithm, bytes)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function HashGenerator() {
  const [input, setInput] = useState('')
  const [hashes, setHashes] = useState<Record<string, string>>({})
  const [source, setSource] = useState('')          // what was hashed: 'text' or a file name
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const { copied: copiedKey, copy } = useClipboardCopy()

  const generate = async () => {
    if (!input) return
    setLoading(true); setError('')
    const results: Record<string, string> = {}
    for (const alg of ALGORITHMS) results[alg] = await digest(alg, input)
    setHashes(results); setSource('text'); setLoading(false)
  }

  // Desktop: hash the file on disk in Rust — one streaming pass, any size, plus MD5.
  const hashPath = async (path: string) => {
    setLoading(true); setError('')
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const out = await invoke<Record<string, string>>('hash_file', { path })
      setHashes(out); setSource(path.split(/[\\/]/).pop() || 'file')
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    setLoading(false)
  }
  const hashFileNative = async () => {
    setError('')
    const { open } = await import('@tauri-apps/plugin-dialog')
    const path = await open({ multiple: false, directory: false })
    if (typeof path === 'string') hashPath(path)
  }
  // Desktop: Finder drag-drop straight to a native streaming hash.
  useNativeDrop(items => { if (items[0]) hashPath(items[0].path) })

  // Web: read the file into memory and hash with Web Crypto (SHA only, no MD5).
  const hashFileWeb = async (file: File) => {
    setLoading(true); setError('')
    try {
      const buf = await file.arrayBuffer()
      const results: Record<string, string> = {}
      for (const alg of ALGORITHMS) results[alg] = await digest(alg, buf)
      setHashes(results); setSource(file.name)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    setLoading(false)
  }

  return (
    <ToolLayout title="Hash Generator" description="Hash text or a file — SHA family via Web Crypto, plus streamed MD5/SHA for any-size files on desktop.">
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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={generate} disabled={!input || loading} className="btn-primary">
            {loading ? 'Hashing…' : 'Hash Text'}
          </button>
          <button
            onClick={() => (isTauri() ? hashFileNative() : fileRef.current?.click())}
            disabled={loading}
            className="btn"
          >
            Hash a File…
          </button>
          <input
            ref={fileRef}
            type="file"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) hashFileWeb(f); e.target.value = '' }}
          />
        </div>
        {error && <div className="error-msg">⚠ {error}</div>}

        {Object.keys(hashes).length > 0 && (
          <div className="space-y-3">
            {source && source !== 'text' && (
              <div className="section-label">Hashed <span style={{ fontFamily: 'var(--font-mono)' }}>{source}</span></div>
            )}
            {ORDER.filter(alg => hashes[alg]).map(alg => (
              <div key={alg} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-500">{alg}</span>
                  <button onClick={() => copy(hashes[alg], alg)} className="copy-btn">
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
