import { useState, useMemo, useRef, useCallback, useEffect, MouseEvent as RMouseEvent } from 'react'
import ToolLayout from '../components/ToolLayout'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { open as openDialog } from '@tauri-apps/plugin-dialog'

// ── Persistence ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'devtools:log-prettifier:input'
function loadSaved(): string { try { return localStorage.getItem(STORAGE_KEY) ?? '' } catch { return '' } }
function saveToDisk(v: string) { try { localStorage.setItem(STORAGE_KEY, v) } catch {} }

// ── Level colours ─────────────────────────────────────────────────────────────
const LEVEL_COLOR: Record<string, string> = {
  ERROR:'#f87171', FATAL:'#f87171', CRITICAL:'#f87171',
  WARN:'#fbbf24',  WARNING:'#fbbf24',
  INFO:'#34d399',  LOG:'#34d399',
  DEBUG:'#60a5fa',
  VERBOSE:'#a78bfa', TRACE:'#94a3b8',
}
const LEVEL_BG: Record<string, string> = {
  ERROR:'rgba(248,113,113,0.12)', FATAL:'rgba(248,113,113,0.12)', CRITICAL:'rgba(248,113,113,0.12)',
  WARN:'rgba(251,191,36,0.12)',   WARNING:'rgba(251,191,36,0.12)',
  INFO:'rgba(52,211,153,0.1)',    LOG:'rgba(52,211,153,0.1)',
  DEBUG:'rgba(96,165,250,0.1)',
  VERBOSE:'rgba(167,139,250,0.1)', TRACE:'rgba(148,163,184,0.08)',
}
const CANONICAL: Record<string, string> = { WARNING:'WARN', FATAL:'ERROR', CRITICAL:'ERROR', VERBOSE:'TRACE', LOG:'INFO' }
function canonicalize(l: string) { return CANONICAL[l] ?? l }

function detectLevel(text: string): string {
  const LEVELS = ['CRITICAL','FATAL','ERROR','WARNING','WARN','INFO','VERBOSE','DEBUG','TRACE','LOG']
  const up = text.toUpperCase()
  for (const l of LEVELS) if (up.includes(l)) return l
  return ''
}

// ── LogLine type ──────────────────────────────────────────────────────────────
interface LogLine {
  raw: string
  level: string        // canonical: ERROR/WARN/INFO/DEBUG/TRACE
  displayLevel: string // original token shown in badge
  time: string
  source: string
  msg: string
  logPrefix?: string   // text before inline JSON (e.g. ":: Received message")
  isJson: boolean
  isStack: boolean
}

// ── Multi-line JSON chunker ───────────────────────────────────────────────────
// Groups lines that form a balanced brace/bracket block into one chunk
function isSingleLineJson(s: string): boolean {
  try { JSON.parse(s); return true } catch { return false }
}

// Count net brace/bracket depth for a single line (skips string contents)
function lineDepth(line: string): number {
  let d = 0, inStr = false, esc = false
  for (const ch of line) {
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{' || ch === '[') d++
    else if (ch === '}' || ch === ']') d--
  }
  return d
}

function chunkRawInput(raw: string): string[] {
  const rawLines = raw.split('\n')
  const chunks: string[] = []
  let depth = 0
  let buffer: string[] = []

  for (const line of rawLines) {
    const t = line.trim()
    if (!t) continue

    if (depth === 0) {
      const d = lineDepth(t)
      if (d > 0) {
        // This line opens a block (starts OR ends with { / [)
        buffer = [line]
        depth = d
      } else {
        chunks.push(line)
      }
    } else {
      buffer.push(line)
      depth += lineDepth(line)
      if (depth <= 0) {
        depth = 0
        chunks.push(buffer.join('\n'))
        buffer = []
      }
    }
  }
  if (buffer.length > 0) chunks.push(buffer.join('\n'))
  return chunks
}

// ── Line parser ───────────────────────────────────────────────────────────────
function parseLine(chunk: string): LogLine {
  const trimmed = chunk.trim()

  // 1. JSON (single or multi-line block)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const obj = JSON.parse(trimmed)
      const rawLevel = (obj.level ?? obj.severity ?? obj.lvl ?? '').toString().toUpperCase()
      const displayLevel = rawLevel || 'JSON'
      const level = canonicalize(rawLevel) || 'INFO'
      return {
        raw: chunk, level, displayLevel,
        time: obj.time ?? obj.timestamp ?? obj['@timestamp'] ?? '',
        source: obj.service ?? obj.name ?? obj.logger ?? obj.component ?? '',
        msg: JSON.stringify(obj, null, 2),
        isJson: true, isStack: false,
      }
    } catch { /* fall through */ }
  }

  // 2. Stack trace
  if (/^\s+(at\s|\.\.\.|[\w$]+Error:|Caused by:)/.test(chunk)) {
    return { raw: chunk, level: 'TRACE', displayLevel: 'TRACE', time: '', source: '', msg: trimmed, isJson: false, isStack: true }
  }

  // 3. ISO-8601 timestamp prefix: 2024-01-15T10:23:44Z / 2024-01-15 10:23:44.123
  const isoM = trimmed.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+/)
  if (isoM) {
    const rest = trimmed.slice(isoM[0].length)
    const lvlM = rest.match(/^(?:\[([A-Za-z]+)\]|([A-Za-z]+)(?=\s))\s*/)
    const rawLevel = (lvlM?.[1] ?? lvlM?.[2] ?? '').toUpperCase()
    const detected = rawLevel && Object.keys(LEVEL_COLOR).includes(rawLevel) ? rawLevel : detectLevel(rest)
    const level = canonicalize(detected) || 'INFO'
    const afterLevel = lvlM ? rest.slice(lvlM[0].length) : rest
    const srcM = afterLevel.match(/^\[([^\]]+)\]\s+/)
    const msg = srcM ? afterLevel.slice(srcM[0].length) : afterLevel

    // Inline JSON: log line ends with { or [ and more lines follow
    const firstLineMsg = msg.split('\n')[0]
    const endsWithOpen = /[{[]\s*$/.test(firstLineMsg)
    if (endsWithOpen && chunk.includes('\n')) {
      const openIdx = firstLineMsg.search(/[{[]/)
      const logPrefix = firstLineMsg.slice(0, openIdx).trim()
      const jsonBody = firstLineMsg.slice(openIdx) + '\n' + chunk.split('\n').slice(1).join('\n')
      try {
        const obj = JSON.parse(jsonBody)
        return {
          raw: chunk, level, displayLevel: detected || level,
          time: isoM[1], source: srcM?.[1] ?? '',
          msg: JSON.stringify(obj, null, 2),
          logPrefix,
          isJson: true, isStack: false,
        }
      } catch { /* fall through to plain */ }
    }

    return {
      raw: chunk, level, displayLevel: detected || level,
      time: isoM[1], source: srcM?.[1] ?? '',
      msg,
      isJson: false, isStack: false,
    }
  }

  // 4. Logcat (Android): MM-DD HH:MM:SS.mmm  PID  TID L TAG: msg
  const logcatM = trimmed.match(/^(\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\.\d+)\s+\d+\s+\d+\s+([A-Za-z])\s+([^:]+):\s+(.*)$/)
  if (logcatM) {
    const map: Record<string,string> = { V:'TRACE', D:'DEBUG', I:'INFO', W:'WARN', E:'ERROR', F:'ERROR' }
    const lvl = logcatM[2].toUpperCase()
    return { raw: chunk, level: map[lvl] ?? 'INFO', displayLevel: lvl, time: logcatM[1], source: logcatM[3].trim(), msg: logcatM[4], isJson: false, isStack: false }
  }

  // 5. Python-style: LEVEL:logger:message
  const pyM = trimmed.match(/^([A-Z]+):([^:]+):(.+)$/)
  if (pyM && Object.keys(LEVEL_COLOR).includes(pyM[1]))
    return { raw: chunk, level: canonicalize(pyM[1]), displayLevel: pyM[1], time: '', source: pyM[2].trim(), msg: pyM[3].trim(), isJson: false, isStack: false }

  // 6. Bracket-style: [INFO] msg  /  [timestamp] [LEVEL] msg
  const bracketM = trimmed.match(/^\[([^\]]+)\]\s+(?:\[([^\]]+)\]\s+)?(.*)$/)
  if (bracketM) {
    const a = bracketM[1].toUpperCase(), b = bracketM[2]?.toUpperCase()
    if (Object.keys(LEVEL_COLOR).includes(a))
      return { raw: chunk, level: canonicalize(a), displayLevel: a, time: '', source: '', msg: `${b ? '['+b+'] ' : ''}${bracketM[3]}`, isJson: false, isStack: false }
    if (b && Object.keys(LEVEL_COLOR).includes(b))
      return { raw: chunk, level: canonicalize(b), displayLevel: b, time: bracketM[1], source: '', msg: bracketM[3], isJson: false, isStack: false }
  }

  // 7. Keyword scan
  const kw = detectLevel(trimmed)
  if (kw) return { raw: chunk, level: canonicalize(kw), displayLevel: kw, time: '', source: '', msg: trimmed, isJson: false, isStack: false }

  // 8. Plain / unknown
  return { raw: chunk, level: 'TRACE', displayLevel: '···', time: '', source: '', msg: chunk, isJson: false, isStack: false }
}

// ── Resizable textarea ────────────────────────────────────────────────────────
function ResizableTextarea({ value, onChange, onDrop }: {
  value: string; onChange: (v: string) => void; onDrop: (e: React.DragEvent) => void
}) {
  const [height, setHeight] = useState(120)
  const dragging = useRef(false)
  const startY = useRef(0), startH = useRef(120)

  const onMouseDown = (e: RMouseEvent) => {
    dragging.current = true; startY.current = e.clientY; startH.current = height
    document.body.style.cursor = 'row-resize'; document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setHeight(Math.max(60, Math.min(600, startH.current + e.clientY - startY.current)))
    }
    const onUp = () => { dragging.current = false; document.body.style.cursor = ''; document.body.style.userSelect = '' }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  return (
    <div onDrop={onDrop} onDragOver={e => e.preventDefault()} style={{ flexShrink: 0 }}>
      <textarea
        value={value} onChange={e => onChange(e.target.value)}
        placeholder="Paste logs here, or drag-and-drop a .log / .txt file…"
        style={{ height, fontSize: 13, width: '100%', boxSizing: 'border-box', borderStyle: 'dashed', resize: 'none', display: 'block', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        spellCheck={false}
      />
      <div
        onMouseDown={onMouseDown} title="Drag to resize"
        style={{
          height: 12, cursor: 'row-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface2)', borderRadius: '0 0 8px 8px',
          border: '1px solid var(--border)', borderTop: 'none', transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--border)'}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface2)'}
      >
        <span style={{ display: 'block', width: 36, height: 3, borderRadius: 2, background: 'var(--text-muted)', opacity: 0.45 }} />
      </div>
    </div>
  )
}

// ── Virtual log list ──────────────────────────────────────────────────────────
const ROW_H = 36
const OVERSCAN = 20

function LevelBadge({ level, display }: { level: string; display: string }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700, fontFamily: 'var(--font-mono)',
      minWidth: 44, textAlign: 'center', flexShrink: 0, lineHeight: '16px',
      background: LEVEL_BG[level] ?? LEVEL_BG[display] ?? 'rgba(148,163,184,0.08)',
      color: LEVEL_COLOR[level] ?? LEVEL_COLOR[display] ?? '#94a3b8',
      border: `1px solid ${(LEVEL_COLOR[level] ?? LEVEL_COLOR[display] ?? '#94a3b8')}33`,
    }}>
      {display || level}
    </span>
  )
}

function LogRow({ line, idx, expandedJson, toggleJson }: {
  line: LogLine; idx: number; expandedJson: Set<number>; toggleJson: (i: number) => void
}) {
  if (line.isStack) return (
    <div style={{ padding: '3px 16px 3px 72px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', lineHeight: '22px', borderBottom: '1px solid var(--border)' }}>
      {line.msg}
    </div>
  )

  if (line.isJson) {
    const expanded = expandedJson.has(idx)
    // Preview: use logPrefix if set (inline JSON after log msg), else peek inside obj
    let preview = line.logPrefix ?? ''
    if (!preview) {
      try { const o = JSON.parse(line.raw); preview = o.msg ?? o.message ?? o.event ?? '' } catch {}
    }
    return (
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div onClick={() => toggleJson(idx)} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 16px', cursor: 'pointer', minHeight: ROW_H }}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface2)'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
          <LevelBadge level={line.level} display={line.displayLevel || 'JSON'} />
          {line.time   && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{line.time.slice(0,19).replace('T',' ')}</span>}
          {line.source && <span style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}>[{line.source}]</span>}
          <span style={{ fontSize: 13, color: 'var(--text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview || '(JSON object)'}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }}>{expanded ? '▲' : '▼'} JSON</span>
        </div>
        {expanded && (
          <pre style={{ margin: 0, padding: '0 16px 12px 72px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface)', overflowX: 'auto' }}>
            {line.msg}
          </pre>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 16px', minHeight: ROW_H, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
      <LevelBadge level={line.level} display={line.displayLevel} />
      {line.time   && <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, lineHeight: '20px' }}>{line.time.slice(11,19) || line.time.slice(0,19)}</span>}
      {line.source && <span style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0, lineHeight: '20px' }}>[{line.source}]</span>}
      <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: '20px', flex: 1, wordBreak: 'break-word' }}>{line.msg}</span>
    </div>
  )
}

function VirtualLogList({ lines }: { lines: LogLine[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerH, setContainerH] = useState(600)
  const [expandedJson, setExpandedJson] = useState<Set<number>>(new Set())

  useEffect(() => {
    const el = containerRef.current; if (!el) return
    setContainerH(el.clientHeight)
    const ro = new ResizeObserver(() => setContainerH(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onScroll = useCallback(() => { if (containerRef.current) setScrollTop(containerRef.current.scrollTop) }, [])
  const toggleJson = (i: number) => setExpandedJson(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })

  const totalH = lines.length * ROW_H
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN)
  const endIdx   = Math.min(lines.length - 1, Math.ceil((scrollTop + containerH) / ROW_H) + OVERSCAN)

  return (
    <div ref={containerRef} onScroll={onScroll}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
      <div style={{ height: totalH, position: 'relative' }}>
        <div style={{ position: 'absolute', top: startIdx * ROW_H, left: 0, right: 0 }}>
          {lines.slice(startIdx, endIdx + 1).map((line, ri) => (
            <LogRow key={startIdx + ri} line={line} idx={startIdx + ri} expandedJson={expandedJson} toggleJson={toggleJson} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']

export default function LogPrettifierPage() {
  const [input, setInput] = useState<string>(() => loadSaved())
  const [filter, setFilter] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  // Desktop: a big file is parsed natively in Rust and lands here, bypassing the
  // textarea + localStorage + main-thread parse entirely. null → use typed input.
  const [fileLines, setFileLines] = useState<LogLine[] | null>(null)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // don't persist while a big file is loaded (input stays empty then anyway)
  useEffect(() => { const id = setTimeout(() => saveToDisk(input), 300); return () => clearTimeout(id) }, [input])

  const parsedInput = useMemo(() => { if (!input) return []; return chunkRawInput(input).map(parseLine) }, [input])
  const lines = fileLines ?? parsedInput

  // typing takes over from a loaded file
  const editInput = useCallback((v: string) => { setFileLines(null); setFileName(''); setInput(v) }, [])

  const filtered = useMemo(() => lines.filter(l => {
    const levelOk = filter.length === 0 || filter.includes(l.level)
    const searchOk = !search || l.raw.toLowerCase().includes(search.toLowerCase())
    return levelOk && searchOk
  }), [lines, filter, search])

  const counts = useMemo(() => {
    const c: Record<string,number> = {}
    for (const l of lines) c[l.level] = (c[l.level] ?? 0) + 1
    return c
  }, [lines])

  const toggleFilter = (l: string) => setFilter(f => f.includes(l) ? f.filter(x => x !== l) : [...f, l])

  const readFile = (file: File) => {
    setIsLoading(true)
    const r = new FileReader()
    r.onload = ev => { editInput((ev.target?.result as string) ?? ''); setIsLoading(false) }
    r.readAsText(file)
  }

  // Desktop → parse natively in Rust (handles 100 MB+ without choking the UI).
  // Web → fall back to the file input + FileReader.
  const openFile = async () => {
    if (!isTauri()) { fileRef.current?.click(); return }
    const path = await openDialog({ multiple: false, filters: [{ name: 'Logs', extensions: ['log', 'txt', 'json', 'ndjson', 'out'] }] })
    if (!path || Array.isArray(path)) return
    setIsLoading(true)
    try {
      const parsed = await invoke<LogLine[]>('parse_log_file', { path })
      setInput(''); saveToDisk(''); setFileLines(parsed); setFileName(path.split(/[/\\]/).pop() || '')
    } catch (e) { alert('Failed to read file: ' + e) }
    finally { setIsLoading(false) }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = '' }
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) readFile(f) }
  const clear = () => { setInput(''); setFileLines(null); setFileName(''); setFilter([]); setSearch(''); saveToDisk('') }

  return (
    <ToolLayout title="Log Viewer" description="Parse and colorize app logs, JSON logs, Logcat, stack traces — paste, or open big files (100 MB+ parsed natively on desktop)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs…" style={{ width: 200 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {LEVELS.map(l => (
              <button key={l} onClick={() => toggleFilter(l)} style={{
                padding: '5px 12px', borderRadius: 8, border: '1px solid', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, transition: 'all 0.15s', fontFamily: 'var(--font-mono)',
                background: filter.includes(l) ? LEVEL_BG[l] : 'transparent',
                color: filter.includes(l) ? LEVEL_COLOR[l] : 'var(--text-dim)',
                borderColor: filter.includes(l) ? LEVEL_COLOR[l] : 'var(--border)',
              }}>
                {l} <span style={{ opacity: 0.7 }}>({counts[l] ?? 0})</span>
              </button>
            ))}
          </div>
          <button onClick={openFile} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>📂 Open File</button>
          <input ref={fileRef} type="file" accept=".log,.txt,.json,text/*" style={{ display: 'none' }} onChange={handleFile} />
          {(input || fileLines) && <button onClick={clear} className="btn btn-ghost btn-sm" style={{ color: 'var(--cat-sec)' }}>✕ Clear</button>}
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filtered.length} / {lines.length} lines
            {fileLines
              ? fileName && <span style={{ opacity: 0.6, marginLeft: 6 }}>({fileName})</span>
              : lines.length > 0 && <span style={{ opacity: 0.6, marginLeft: 6 }}>({(input.length / 1024).toFixed(0)} KB)</span>}
          </span>
        </div>

        {/* Resizable input */}
        <ResizableTextarea value={input} onChange={editInput} onDrop={handleDrop} />

        {/* Loading */}
        {isLoading && <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 14 }}>⏳ Parsing file…</div>}

        {/* Log list */}
        {!isLoading && lines.length > 0 && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <VirtualLogList lines={filtered} />
          </div>
        )}

        {!isLoading && lines.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>
            No logs yet — paste or drop a file above
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
