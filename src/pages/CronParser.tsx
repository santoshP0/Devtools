import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

const FIELD_NAMES = ['Minute', 'Hour', 'Day of Month', 'Month', 'Day of Week']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every day at noon', value: '0 12 * * *' },
  { label: 'Every weekday at 9am', value: '0 9 * * 1-5' },
  { label: 'Every Monday', value: '0 0 * * 1' },
  { label: 'Every Sunday', value: '0 0 * * 0' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: '1st of every month', value: '0 0 1 * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Twice daily', value: '0 0,12 * * *' },
]

function parseField(field: string, min: number, max: number): number[] | null {
  const values = new Set<number>()
  for (const part of field.split(',')) {
    if (part === '*') {
      for (let i = min; i <= max; i++) values.add(i)
    } else if (part.startsWith('*/')) {
      const step = parseInt(part.slice(2))
      if (isNaN(step) || step <= 0) return null
      for (let i = min; i <= max; i += step) values.add(i)
    } else if (part.includes('/')) {
      const [range, stepStr] = part.split('/')
      const step = parseInt(stepStr)
      if (isNaN(step) || step <= 0) return null
      const [lo, hi] = range.includes('-') ? range.split('-').map(Number) : [parseInt(range), max]
      for (let i = lo; i <= hi; i += step) values.add(i)
    } else if (part.includes('-')) {
      const [lo, hi] = part.split('-').map(Number)
      if (isNaN(lo) || isNaN(hi)) return null
      for (let i = lo; i <= hi; i++) values.add(i)
    } else {
      const n = parseInt(part)
      if (isNaN(n)) return null
      values.add(n)
    }
  }
  return [...values].sort((a, b) => a - b)
}

interface ParsedCron {
  minutes: number[]
  hours: number[]
  days: number[]
  months: number[]
  weekdays: number[]
}

function parseCron(expr: string): ParsedCron | null {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return null
  const minutes = parseField(parts[0], 0, 59)
  const hours = parseField(parts[1], 0, 23)
  const days = parseField(parts[2], 1, 31)
  const months = parseField(parts[3], 1, 12)
  const weekdays = parseField(parts[4], 0, 6)
  if (!minutes || !hours || !days || !months || !weekdays) return null
  return { minutes, hours, days, months, weekdays }
}

function nextRuns(cron: ParsedCron, count: number): Date[] {
  const results: Date[] = []
  const now = new Date()
  now.setSeconds(0, 0)
  now.setMinutes(now.getMinutes() + 1)

  const cur = new Date(now)
  let safety = 0

  while (results.length < count && safety++ < 500000) {
    if (!cron.months.includes(cur.getMonth() + 1)) {
      cur.setMonth(cur.getMonth() + 1, 1); cur.setHours(0, 0, 0, 0); continue
    }
    const dayMatch = cron.days.includes(cur.getDate())
    const wdMatch = cron.weekdays.includes(cur.getDay())
    const anyDay = cron.days.length === 31 && cron.weekdays.length === 7
    if (!(anyDay ? true : dayMatch || wdMatch)) {
      cur.setDate(cur.getDate() + 1); cur.setHours(0, 0, 0, 0); continue
    }
    if (!cron.hours.includes(cur.getHours())) {
      cur.setHours(cur.getHours() + 1, 0, 0, 0); continue
    }
    if (!cron.minutes.includes(cur.getMinutes())) {
      cur.setMinutes(cur.getMinutes() + 1); continue
    }
    results.push(new Date(cur))
    cur.setMinutes(cur.getMinutes() + 1)
  }
  return results
}

function describeField(field: string, index: number): string {
  if (field === '*') return `every ${FIELD_NAMES[index].toLowerCase()}`
  if (field.startsWith('*/')) return `every ${field.slice(2)} ${FIELD_NAMES[index].toLowerCase()}(s)`
  return `at ${FIELD_NAMES[index].toLowerCase()} ${field}`
}

function humanDescription(expr: string): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return ''
  if (expr === '* * * * *') return 'Every minute'
  if (expr === '0 * * * *') return 'Every hour at minute 0'
  if (expr === '0 0 * * *') return 'Every day at midnight'
  const [min, hour, dom, month, dow] = parts
  const chunks: string[] = []
  if (dow !== '*') chunks.push(`on ${dow.split(',').map(d => DAYS[parseInt(d)] ?? d).join(', ')}`)
  if (dom !== '*') chunks.push(`on day ${dom}`)
  if (month !== '*') chunks.push(`in ${month.split(',').map(m => MONTHS[parseInt(m) - 1] ?? m).join(', ')}`)
  if (hour !== '*') chunks.push(`at ${hour.padStart(2, '0')}:${min === '*' ? '00' : min.padStart(2, '0')}`)
  else if (min !== '*') chunks.push(describeField(min, 0))
  return chunks.length ? chunks.join(' ') : 'Custom schedule'
}

export default function CronParser() {
  const [expr, setExpr] = useState('0 9 * * 1-5')
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState<ParsedCron | null>(null)
  const [runs, setRuns] = useState<Date[]>([])

  const parse = () => {
    setError('')
    const result = parseCron(expr)
    if (!result) { setError('Invalid cron expression. Expected 5 fields: minute hour day month weekday'); setParsed(null); setRuns([]); return }
    setParsed(result)
    setRuns(nextRuns(result, 10))
  }

  return (
    <ToolLayout title="Cron Expression Parser" description="Parse cron expressions and preview next scheduled run times.">
      <div className="flex flex-col gap-6 flex-1">
        <div className="tool-panel flex flex-col gap-4">
          <div>
            <label className="label">Cron Expression</label>
            <div className="flex gap-2">
              <input
                value={expr}
                onChange={e => setExpr(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && parse()}
                placeholder="* * * * *"
                className="tool-input flex-1 font-mono text-base"
                spellCheck={false}
              />
              <button onClick={parse} className="btn-primary">Parse</button>
            </div>
            <div className="flex gap-2 mt-2 text-xs text-slate-400 font-mono">
              {['minute', 'hour', 'day', 'month', 'weekday'].map(f => (
                <span key={f} className="bg-slate-100 px-2 py-0.5 rounded">{f}</span>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Presets</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p.value} onClick={() => { setExpr(p.value); setError(''); setParsed(null); setRuns([]) }} className="btn-secondary text-xs py-1">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="border border-red-200 rounded-xl p-3 bg-red-50 text-red-400 text-sm">✗ {error}</div>}

        {parsed && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="tool-panel flex flex-col gap-4">
              <div className="text-sm font-semibold text-slate-700">Human Description</div>
              <div className="text-lg font-medium text-slate-800 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                {humanDescription(expr)}
              </div>

              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Field Breakdown</div>
                <div className="space-y-2">
                  {(['minutes','hours','days','months','weekdays'] as const).map((key, i) => (
                    <div key={key} className="flex justify-between items-start bg-slate-50 rounded-lg px-3 py-2 text-sm">
                      <span className="text-slate-500 font-medium w-28">{FIELD_NAMES[i]}</span>
                      <span className="font-mono text-slate-700 text-right text-xs">
                        {key === 'months'
                          ? parsed[key].map(m => MONTHS[m - 1]).join(', ')
                          : key === 'weekdays'
                          ? parsed[key].map(d => DAYS[d]).join(', ')
                          : parsed[key].length > 10
                          ? `${parsed[key][0]}–${parsed[key][parsed[key].length - 1]} (${parsed[key].length} values)`
                          : parsed[key].join(', ')
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="tool-panel flex flex-col gap-3">
              <div className="text-sm font-semibold text-slate-700">Next 10 Run Times</div>
              <div className="space-y-1.5">
                {runs.map((d, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2 text-sm">
                    <span className="font-mono text-slate-700">{d.toLocaleString()}</span>
                    <span className="text-xs text-slate-400">{d.toISOString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
