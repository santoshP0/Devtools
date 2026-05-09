import { useState, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'

function toLocal(ts: number) {
  const d = new Date(ts * 1000)
  return d.toLocaleString()
}

function toIso(ts: number) {
  return new Date(ts * 1000).toISOString()
}

function relativeTime(ts: number) {
  const diff = Math.floor(Date.now() / 1000) - ts
  const abs = Math.abs(diff)
  const future = diff < 0
  if (abs < 60) return `${abs}s ${future ? 'from now' : 'ago'}`
  if (abs < 3600) return `${Math.floor(abs / 60)}m ${future ? 'from now' : 'ago'}`
  if (abs < 86400) return `${Math.floor(abs / 3600)}h ${future ? 'from now' : 'ago'}`
  return `${Math.floor(abs / 86400)}d ${future ? 'from now' : 'ago'}`
}

export default function UnixTimestamp() {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000))
  const [tsInput, setTsInput] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [tsResult, setTsResult] = useState<{ local: string; iso: string; relative: string } | null>(null)
  const [dateResult, setDateResult] = useState<{ ts: number } | null>(null)
  const [tsError, setTsError] = useState('')
  const [dateError, setDateError] = useState('')

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const convertTs = () => {
    setTsError('')
    const n = Number(tsInput.trim())
    if (!tsInput.trim() || isNaN(n)) { setTsError('Enter a valid integer timestamp'); return }
    setTsResult({ local: toLocal(n), iso: toIso(n), relative: relativeTime(n) })
  }

  const convertDate = () => {
    setDateError('')
    if (!dateInput.trim()) { setDateError('Enter a date/time string'); return }
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) { setDateError('Invalid date format'); return }
    setDateResult({ ts: Math.floor(d.getTime() / 1000) })
  }

  const copy = (val: string) => navigator.clipboard.writeText(val)

  return (
    <ToolLayout title="Unix Timestamp" description="Convert between Unix timestamps and human-readable dates.">
      <div className="flex flex-col gap-6 flex-1">

        <div className="tool-panel flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Current Unix Time</div>
            <div className="text-3xl font-mono font-bold text-slate-900">{now}</div>
            <div className="text-sm text-slate-500 mt-1">{toLocal(now)} · {toIso(now)}</div>
          </div>
          <button onClick={() => copy(String(now))} className="copy-btn">Copy</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="tool-panel flex flex-col gap-4">
            <div className="text-sm font-semibold text-slate-700">Timestamp → Date</div>
            <div>
              <label className="label">Unix Timestamp (seconds)</label>
              <div className="flex gap-2">
                <input
                  value={tsInput}
                  onChange={e => setTsInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && convertTs()}
                  placeholder="e.g. 1719878400"
                  className="tool-input flex-1"
                />
                <button onClick={convertTs} className="btn-primary whitespace-nowrap">Convert</button>
              </div>
              {tsError && <p className="text-red-600 text-xs mt-1">{tsError}</p>}
            </div>
            {tsResult && (
              <div className="space-y-3">
                {[
                  { label: 'Local', value: tsResult.local },
                  { label: 'ISO 8601', value: tsResult.iso },
                  { label: 'Relative', value: tsResult.relative },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2">
                    <div>
                      <div className="text-xs text-slate-500">{label}</div>
                      <div className="font-mono text-sm text-slate-800">{value}</div>
                    </div>
                    <button onClick={() => copy(value)} className="copy-btn">Copy</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="tool-panel flex flex-col gap-4">
            <div className="text-sm font-semibold text-slate-700">Date → Timestamp</div>
            <div>
              <label className="label">Date / Time String</label>
              <div className="flex gap-2">
                <input
                  value={dateInput}
                  onChange={e => setDateInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && convertDate()}
                  placeholder="e.g. 2024-07-01 12:00:00"
                  className="tool-input flex-1"
                />
                <button onClick={convertDate} className="btn-primary whitespace-nowrap">Convert</button>
              </div>
              {dateError && <p className="text-red-600 text-xs mt-1">{dateError}</p>}
            </div>
            {dateResult && (
              <div className="space-y-3">
                {[
                  { label: 'Unix Timestamp (s)', value: String(dateResult.ts) },
                  { label: 'Unix Timestamp (ms)', value: String(dateResult.ts * 1000) },
                  { label: 'Relative', value: relativeTime(dateResult.ts) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2">
                    <div>
                      <div className="text-xs text-slate-500">{label}</div>
                      <div className="font-mono text-sm text-slate-800">{value}</div>
                    </div>
                    <button onClick={() => copy(value)} className="copy-btn">Copy</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
