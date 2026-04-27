import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

export default function UuidGenerator() {
  const [uuids, setUuids] = useState<string[]>([])
  const [count, setCount] = useState(5)
  const [copied, setCopied] = useState('')
  const [copiedAll, setCopiedAll] = useState(false)

  const generate = () => {
    setUuids(Array.from({ length: count }, () => crypto.randomUUID()))
  }

  const copy = async (id: string) => {
    await navigator.clipboard.writeText(id)
    setCopied(id)
    setTimeout(() => setCopied(''), 1500)
  }

  const copyAll = async () => {
    await navigator.clipboard.writeText(uuids.join('\n'))
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1500)
  }

  return (
    <ToolLayout title="UUID Generator" description="Generate cryptographically random UUID v4 strings.">
      <div className="space-y-4">
        <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex-1">
            <label className="label">How many?</label>
            <div className="flex gap-2 flex-wrap">
              {[1, 5, 10, 25, 50].map(n => (
                <button key={n} onClick={() => setCount(n)} className={count === n ? 'btn-primary' : 'btn-secondary'}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button onClick={generate} className="btn-primary">Generate</button>
        </div>

        {uuids.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-500">{uuids.length} UUIDs generated</span>
              <button onClick={copyAll} className="copy-btn">{copiedAll ? '✓ Copied all' : 'Copy all'}</button>
            </div>
            <div className="space-y-1.5">
              {uuids.map(id => (
                <div key={id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-2.5 group">
                  <span className="font-mono text-sm text-slate-700">{id}</span>
                  <button onClick={() => copy(id)} className="copy-btn ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    {copied === id ? '✓' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {uuids.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-white border border-slate-200 rounded-xl">
            Click Generate to create UUIDs
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
