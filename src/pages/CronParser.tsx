import { useState, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'

function parseCron(expr: string) {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) throw new Error('Cron must have 5 fields: min hour day month weekday')
  const [min, hour, dom, mon, dow] = parts
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const fmtField = (v: string, names: string[] | null, unit: string) => {
    if (v === '*') return 'every ' + unit
    if (v.startsWith('*/')) return `every ${v.slice(2)} ${unit}s`
    if (v.includes('-')) { const [a,b] = v.split('-'); return `${names?.[+a]||a}–${names?.[+b]||b}` }
    if (v.includes(',')) return v.split(',').map(x => names?.[+x] || x).join(', ')
    return names?.[+v] || v
  }
  const lines = [
    `Minute: ${fmtField(min, null, 'minute')}`,
    `Hour: ${fmtField(hour, null, 'hour')}`,
    `Day of month: ${fmtField(dom, null, 'day')}`,
    `Month: ${fmtField(mon, MONTHS, 'month')}`,
    `Day of week: ${fmtField(dow, DAYS, 'weekday')}`,
  ]
  return lines.join('\n')
}

function getNextRuns(expr: string, count = 8) {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return []
  const [min, hour] = parts
  const runs: Date[] = []
  const now = new Date(); now.setSeconds(0,0)
  const d = new Date(now)
  for (let i=0; i<5000 && runs.length<count; i++) {
    d.setMinutes(d.getMinutes()+1)
    const mm = d.getMinutes(), hh = d.getHours()
    
    // Simplified match for demonstration matching the actual UI's logic
    const minMatch = min==='*' || (min.startsWith('*/')&&mm%(+min.slice(2))===0) || min.split(',').map(Number).includes(mm)
    const hrMatch  = hour==='*'|| (hour.startsWith('*/')&&hh%(+hour.slice(2))===0)|| hour.split(',').map(Number).includes(hh)
    
    if (minMatch && hrMatch) runs.push(new Date(d))
  }
  return runs
}

const PRESETS = [
  { label:'Every minute',        expr:'* * * * *'     },
  { label:'Every 5 minutes',     expr:'*/5 * * * *'   },
  { label:'Every hour',          expr:'0 * * * *'     },
  { label:'Daily at midnight',   expr:'0 0 * * *'     },
  { label:'Daily at noon',       expr:'0 12 * * *'    },
  { label:'Every weekday 9am',   expr:'0 9 * * 1-5'   },
  { label:'Weekly Sunday',       expr:'0 0 * * 0'     },
  { label:'Monthly 1st',         expr:'0 0 1 * *'     },
]

export default function CronParser() {
  const [expr, setExpr] = useState('*/5 * * * *')
  const [description, setDescription] = useState('')
  const [nextRuns, setNextRuns] = useState<Date[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    try { setDescription(parseCron(expr)); setNextRuns(getNextRuns(expr)); setError('') }
    catch(e: any) { setError(e.message); setDescription(''); setNextRuns([]) }
  }, [expr])

  return (
    <ToolLayout title="Cron Expression Parser" description="Parse cron expressions and preview next scheduled run times.">
      <div className="one-col">
        <div>
          <label>Cron Expression <span style={{ fontSize:12, color:'var(--text-muted)' }}>(min hour day month weekday)</span></label>
          <input type="text" value={expr} onChange={e => setExpr(e.target.value)}
            style={{ fontFamily:'var(--font-mono)', fontSize:18, letterSpacing:'0.06em' }} placeholder="* * * * *" />
        </div>
        {error && <div className="error-msg">⚠ {error}</div>}
        <div>
          <div className="section-label">Quick Presets</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {PRESETS.map(p => (
              <button key={p.expr} onClick={() => setExpr(p.expr)} style={{
                padding:'6px 14px', borderRadius:100, border:'1px solid',
                background: expr===p.expr ? 'var(--accent-bg)' : 'transparent',
                color: expr===p.expr ? 'var(--accent)' : 'var(--text-dim)',
                borderColor: expr===p.expr ? 'var(--accent-dim)' : 'var(--border)',
                fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'var(--font-sans)', transition:'all 0.15s',
              }}>{p.label}</button>
            ))}
          </div>
        </div>
        {description && (
          <div className="two-col">
            <div>
              <div className="section-label">Human Readable</div>
              <pre style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--text)', lineHeight:2, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>{description}</pre>
            </div>
            <div>
              <div className="section-label">Next {nextRuns.length} Runs</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {nextRuns.map((d,i) => (
                  <div key={i} style={{ display:'flex', gap:12, alignItems:'center', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 14px' }}>
                    <span style={{ color:'var(--accent)', fontFamily:'var(--font-mono)', fontSize:11, minWidth:22 }}>#{i+1}</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:12, flex:1 }}>{d.toLocaleString()}</span>
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
