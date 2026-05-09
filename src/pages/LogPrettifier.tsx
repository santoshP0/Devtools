import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const click = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }
  return <button className="btn btn-ghost btn-sm" onClick={click}>{copied ? '✓ Copied' : label}</button>
}

const SAMPLE_LOG = `2024-01-15 10:23:44 INFO  [server] Server started on port 3000
2024-01-15 10:23:44 DEBUG [db] Connected to PostgreSQL — pool size: 10
2024-01-15 10:24:01 INFO  [auth] User login: alice@example.com (id=42)
2024-01-15 10:24:15 WARN  [rate-limit] Rate limit approaching for IP 192.168.1.100 (87/100)
2024-01-15 10:24:32 ERROR [api] Unhandled exception in POST /users: TypeError: Cannot read property 'id' of undefined
    at UserController.create (/app/controllers/user.js:45:23)
    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)
2024-01-15 10:24:33 INFO  [api] POST /users 500 12ms
{"level":"info","time":"2024-01-15T10:25:00.000Z","msg":"Health check","status":"ok","uptime":76}
{"level":"error","time":"2024-01-15T10:25:12.000Z","msg":"DB query failed","query":"SELECT * FROM users","err":"connection timeout"}
2024-01-15 10:25:30 INFO  [api] GET /health 200 3ms
2024-01-15 10:25:45 WARN  [memory] Heap usage at 78% (786MB / 1024MB)`

const LEVEL_COLORS: Record<string, string> = { ERROR:'var(--cat-sec)', WARN:'var(--cat-txt)', INFO:'var(--cat-gen)', DEBUG:'var(--cat-utl)', TRACE:'var(--text-muted)' }
const LEVEL_BG:     Record<string, string> = { ERROR:'var(--cat-sec-bg)', WARN:'var(--cat-txt-bg)', INFO:'var(--cat-gen-bg)', DEBUG:'var(--cat-utl-bg)', TRACE:'var(--surface2)' }

interface LogLine { raw: string; level: string; time: string; source: string; msg: string; isJson: boolean; isStack: boolean }

function parseLine(line: string): LogLine {
  // Try JSON
  try {
    const obj = JSON.parse(line.trim())
    const level = (obj.level || obj.severity || '').toUpperCase()
    return { raw:line, level, time:obj.time||obj.timestamp||'', source:obj.service||obj.name||'', msg:JSON.stringify(obj, null, 2), isJson:true, isStack:false }
  } catch {}
  // Stack trace
  if (line.match(/^\s+at\s/) || line.match(/^\s+\.\.\./)) return { raw:line, level:'TRACE', time:'', source:'', msg:line.trim(), isJson:false, isStack:true }
  // Standard log
  const m = line.match(/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[.\d]*Z?)\s+(ERROR|WARN|INFO|DEBUG|TRACE)\s+(?:\[([^\]]+)\]\s+)?(.*)$/)
  if (m) return { raw:line, level:m[2], time:m[1], source:m[3]||'', msg:m[4], isJson:false, isStack:false }
  return { raw:line, level:'INFO', time:'', source:'', msg:line, isJson:false, isStack:false }
}

export default function LogPrettifierPage() {
  const [input, setInput] = useState(SAMPLE_LOG)
  const [filter, setFilter] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [expandJson, setExpandJson] = useState<Set<number>>(new Set())

  const LEVELS = ['ERROR','WARN','INFO','DEBUG']
  const lines = useMemo(() => input.split('\n').filter(Boolean).map(parseLine), [input])
  const filtered = useMemo(() => lines.filter(l => {
    const levelOk = filter.length === 0 || filter.includes(l.level)
    const searchOk = !search || l.raw.toLowerCase().includes(search.toLowerCase())
    return levelOk && searchOk
  }), [lines, filter, search])

  const counts = useMemo(() => Object.fromEntries(LEVELS.map(l => [l, lines.filter(x => x.level === l).length])), [lines])
  const toggleFilter = (l: string) => setFilter(f => f.includes(l) ? f.filter(x => x !== l) : [...f, l])
  const toggleExpand = (i: number) => setExpandJson(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })

  return (
    <ToolLayout title="Log Prettifier" description="Colorize and parse application logs, JSON logs and stack traces">
      <div className="one-col">
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs…" style={{ width:220 }} />
          <div style={{ display:'flex', gap:6 }}>
            {LEVELS.map(l => (
              <button key={l} onClick={() => toggleFilter(l)} style={{
                padding:'5px 12px', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:12, fontWeight:600, transition:'all 0.15s',
                background: filter.includes(l) ? LEVEL_BG[l] : 'transparent',
                color: filter.includes(l) ? LEVEL_COLORS[l] : 'var(--text-dim)',
                borderColor: filter.includes(l) ? LEVEL_COLORS[l] : 'var(--border)',
                fontFamily:'var(--font-mono)',
              }}>{l} <span style={{ opacity:0.7 }}>({counts[l]||0})</span></button>
            ))}
          </div>
          <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:'auto' }}>{filtered.length} / {lines.length} lines</span>
        </div>
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste your logs here…" style={{ minHeight:120, fontSize:13 }} spellCheck={false} />
        <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', maxHeight:520, overflowY:'auto' }}>
          {filtered.map((line, i) => {
            if (line.isStack) return (
              <div key={i} style={{ padding:'2px 16px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)', lineHeight:1.6 }}>
                {line.msg}
              </div>
            )
            if (line.isJson) {
              const isExpanded = expandJson.has(i)
              let preview = ''
              try { const obj = JSON.parse(line.raw); preview = obj.msg || obj.message || '' } catch {}
              return (
                <div key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                  <div onClick={() => toggleExpand(i)} style={{ display:'flex', gap:10, alignItems:'center', padding:'8px 16px', cursor:'pointer', transition:'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background='var(--surface2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background='transparent'}>
                    <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:LEVEL_BG[line.level]||'var(--surface2)', color:LEVEL_COLORS[line.level]||'var(--text-dim)', fontWeight:700, fontFamily:'var(--font-mono)', minWidth:44, textAlign:'center' }}>{line.level||'JSON'}</span>
                    {line.time && <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{line.time}</span>}
                    <span style={{ fontSize:13, color:'var(--text-dim)', flex:1 }}>{preview}</span>
                    <span style={{ color:'var(--text-muted)', fontSize:11 }}>{isExpanded?'▲':'▼'} JSON</span>
                  </div>
                  {isExpanded && <pre style={{ margin:0, padding:'0 16px 12px 56px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-dim)', background:'var(--surface)' }}>{line.msg}</pre>}
                </div>
              )
            }
            return (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'7px 16px', borderBottom:'1px solid var(--border)', fontFamily:'var(--font-mono)' }}>
                <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:LEVEL_BG[line.level]||'var(--surface2)', color:LEVEL_COLORS[line.level]||'var(--text-dim)', fontWeight:700, minWidth:44, textAlign:'center', flexShrink:0 }}>{line.level}</span>
                {line.time && <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0, lineHeight:'18px' }}>{line.time.slice(11,19)}</span>}
                {line.source && <span style={{ fontSize:11, color:'var(--accent)', flexShrink:0, lineHeight:'18px' }}>[{line.source}]</span>}
                <span style={{ fontSize:13, color:'var(--text)', lineHeight:'18px', flex:1, wordBreak:'break-word' }}>{line.msg}</span>
              </div>
            )
          })}
        </div>
      </div>
    </ToolLayout>
  )
}
