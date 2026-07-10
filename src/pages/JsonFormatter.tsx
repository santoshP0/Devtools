import { useState, useEffect, useCallback } from 'react'
import ToolLayout from '../components/ToolLayout'
import { useClipboardCopy } from '../hooks/useClipboardCopy'

// ─── Persistence ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'devtools:json-formatter:input'
function loadSaved() { try { return localStorage.getItem(STORAGE_KEY) ?? '' } catch { return '' } }
function saveToDisk(v: string) { try { localStorage.setItem(STORAGE_KEY, v) } catch {} }

// ─── Error prettifier ─────────────────────────────────────────────────────────
function prettifyJsonError(raw: string, input: string): { title: string; detail: string; lineNo: number; colNo: number } {
  // Extract position from different browser error formats
  let pos = -1
  let lineNo = 0
  let colNo = 0

  // "at position N" (Chrome/V8)
  const posM = raw.match(/at position (\d+)/i)
  if (posM) pos = Number(posM[1])

  // "(line N column N)" (Firefox / newer V8)
  const lcM = raw.match(/\(line (\d+) column (\d+)\)/i)
  if (lcM) { lineNo = Number(lcM[1]); colNo = Number(lcM[2]) }

  // Derive line/col from position if we have it
  if (pos >= 0 && (lineNo === 0)) {
    const before = input.slice(0, pos)
    const parts = before.split('\n')
    lineNo = parts.length
    colNo = (parts[parts.length - 1]?.length ?? 0) + 1
  }

  // Extract a snippet around the problem
  let snippet = ''
  if (pos >= 0) {
    const start = Math.max(0, pos - 20)
    const end = Math.min(input.length, pos + 20)
    const before = input.slice(start, pos).replace(/\n/g, '↵')
    const after  = input.slice(pos, end).replace(/\n/g, '↵')
    snippet = `…${before}⚑${after}…`
  }

  // Human-readable titles for common errors
  let title = 'Invalid JSON'
  const msg = raw.toLowerCase()
  if (msg.includes('unexpected end') || msg.includes('unterminated')) title = 'Unexpected end of input — JSON is incomplete'
  else if (msg.includes('unexpected token') || msg.includes('non-whitespace')) title = 'Unexpected character found'
  else if (msg.includes('bad escape')) title = 'Invalid escape sequence in string'
  else if (msg.includes('duplicate key')) title = 'Duplicate key in object'
  else if (msg.includes('expected') && msg.includes('colon')) title = 'Missing colon (:) between key and value'
  else if (msg.includes('expected') && msg.includes('comma')) title = 'Missing comma (,) between values'

  const detail = [
    lineNo > 0 ? `Line ${lineNo}, column ${colNo}` : '',
    snippet ? `Near: ${snippet}` : '',
  ].filter(Boolean).join('  ·  ')

  return { title, detail, lineNo, colNo }
}

// ─── Collapsible JSON Tree ────────────────────────────────────────────────────
interface ColorTheme {
  key: string
  str: string
  num: string
  bool: string
  null: string
  punct: string
  muted: string
}

const PALETTES = {
  dark: {
    key:    '#60a5fa',
    str:    '#4ade80',
    num:    '#fb923c',
    bool:   '#c084fc',
    null:   '#94a3b8',
    punct:  '#cbd5e1',
    muted:  '#64748b',
  },
  light: {
    key:    '#1d4ed8',
    str:    '#15803d',
    num:    '#c2410c',
    bool:   '#7e22ce',
    null:   '#475569',
    punct:  '#334155',
    muted:  '#64748b',
  }
}

function ToggleArrow({ collapsed, onClick, colors }: { collapsed: boolean; onClick: () => void; colors: ColorTheme }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        width: 16,
        height: 16,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: colors.muted,
        fontSize: 9,
        transition: 'transform 0.15s ease',
        transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
        userSelect: 'none',
        outline: 'none',
      }}
    >
      ▶
    </button>
  )
}

type JsonPrim = string | number | boolean | null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonVal = JsonPrim | JsonVal[] | { [k: string]: any }

function JsonNode({ k, val, depth, last, colors }: {
  k?: string; val: JsonVal; depth: number; last: boolean; colors: ColorTheme
}) {
  const [collapsed, setCollapsed] = useState(false)
  const lineIndent = depth * 16
  const comma = last ? '' : ','
  
  const isExpandable = val !== null && typeof val === 'object'
  const hasChildren = isExpandable && (Array.isArray(val) ? val.length > 0 : Object.keys(val as object).length > 0)

  const toggleSlot = hasChildren ? (
    <ToggleArrow collapsed={collapsed} onClick={() => setCollapsed(!collapsed)} colors={colors} />
  ) : (
    <div style={{ width: 16 }} />
  )

  const keyEl = k !== undefined
    ? <span style={{ marginRight: 4 }}><span style={{ color: colors.key }}>"{ k }"</span><span style={{ color: colors.punct }}>:</span></span>
    : null

  // Primitive Values
  if (val === null || typeof val !== 'object') {
    let valEl: React.ReactNode = null
    if (val === null) valEl = <span style={{ color: colors.null }}>null</span>
    else if (typeof val === 'boolean') valEl = <span style={{ color: colors.bool }}>{String(val)}</span>
    else if (typeof val === 'number') valEl = <span style={{ color: colors.num }}>{val}</span>
    else if (typeof val === 'string') valEl = <span style={{ color: colors.str }}>"{val}"</span>

    return (
      <div style={{
        display: 'flex', alignItems: 'center', lineHeight: '22px',
        paddingLeft: lineIndent, fontFamily: 'var(--font-mono)'
      }}>
        {toggleSlot}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {keyEl}
          {valEl}
          <span style={{ color: colors.punct }}>{comma}</span>
        </div>
      </div>
    )
  }

  // Arrays
  if (Array.isArray(val)) {
    const empty = val.length === 0
    if (collapsed || empty) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', lineHeight: '22px',
          paddingLeft: lineIndent, fontFamily: 'var(--font-mono)'
        }}>
          {toggleSlot}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {keyEl}
            <span style={{ color: colors.punct }}>[</span>
            <span style={{ color: colors.muted, fontSize: 11, fontStyle: 'italic', margin: '0 4px' }}>
              {empty ? '' : `${val.length} item${val.length !== 1 ? 's' : ''}`}
            </span>
            <span style={{ color: colors.punct }}>]{comma}</span>
          </div>
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-mono)' }}>
        {/* Opening line */}
        <div style={{ display: 'flex', alignItems: 'center', lineHeight: '22px', paddingLeft: lineIndent }}>
          {toggleSlot}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {keyEl}
            <span style={{ color: colors.punct }}>[</span>
          </div>
        </div>
        
        {/* Children list */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {val.map((item, i) => (
            <JsonNode
              key={i}
              val={item as JsonVal}
              depth={depth + 1}
              last={i === val.length - 1}
              colors={colors}
            />
          ))}
        </div>

        {/* Closing line */}
        <div style={{ display: 'flex', alignItems: 'center', lineHeight: '22px', paddingLeft: lineIndent }}>
          <div style={{ width: 16 }} />
          <span style={{ color: colors.punct }}>]{comma}</span>
        </div>
      </div>
    )
  }

  // Objects
  const entries = Object.entries(val as Record<string, JsonVal>)
  const empty = entries.length === 0
  if (collapsed || empty) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', lineHeight: '22px',
        paddingLeft: lineIndent, fontFamily: 'var(--font-mono)'
      }}>
        {toggleSlot}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {keyEl}
          <span style={{ color: colors.punct }}>{'{'}</span>
          <span style={{ color: colors.muted, fontSize: 11, fontStyle: 'italic', margin: '0 4px' }}>
            {empty ? '' : `${entries.length} key${entries.length !== 1 ? 's' : ''}`}
          </span>
          <span style={{ color: colors.punct }}>{'}'}{comma}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-mono)' }}>
      {/* Opening line */}
      <div style={{ display: 'flex', alignItems: 'center', lineHeight: '22px', paddingLeft: lineIndent }}>
        {toggleSlot}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {keyEl}
          <span style={{ color: colors.punct }}>{'{'}</span>
        </div>
      </div>
      
      {/* Children list */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {entries.map(([ek, ev], i) => (
          <JsonNode
            key={ek}
            k={ek}
            val={ev as JsonVal}
            depth={depth + 1}
            last={i === entries.length - 1}
            colors={colors}
          />
        ))}
      </div>

      {/* Closing line */}
      <div style={{ display: 'flex', alignItems: 'center', lineHeight: '22px', paddingLeft: lineIndent }}>
        <div style={{ width: 16 }} />
        <span style={{ color: colors.punct }}>{'}'}{comma}</span>
      </div>
    </div>
  )
}

function JsonTree({ parsed, colors }: { parsed: JsonVal; colors: ColorTheme }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.6, overflowX: 'auto' }}>
      <JsonNode val={parsed} depth={0} last={true} colors={colors} />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function JsonFormatter() {
  const [input, setInput]   = useState<string>(() => loadSaved())
  const [output, setOutput] = useState('')
  const [parsed, setParsed] = useState<JsonVal | null>(null)  // for tree view
  const [error, setError]   = useState<{ title: string; detail: string; lineNo: number; colNo: number } | null>(null)
  const [status, setStatus] = useState<'idle' | 'valid' | 'error'>('idle')
  const [indent, setIndent] = useState<number | string>(2)
  const { copied, copy } = useClipboardCopy()
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree')
  const [isDark, setIsDark] = useState(() => document.documentElement.dataset.theme === 'dark')

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.dataset.theme === 'dark')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const colors = isDark ? PALETTES.dark : PALETTES.light

  // Persist input
  useEffect(() => {
    const id = setTimeout(() => saveToDisk(input), 300)
    return () => clearTimeout(id)
  }, [input])

  const process = useCallback((minify: boolean) => {
    if (!input.trim()) return
    try {
      const obj = JSON.parse(input)
      const out = minify ? JSON.stringify(obj) : JSON.stringify(obj, null, indent === '\t' ? '\t' : Number(indent))
      setOutput(out)
      setParsed(minify ? null : obj as JsonVal)  // no tree for minified
      setError(null)
      setStatus('valid')
    } catch (e) {
      const raw = (e as Error).message
      setError(prettifyJsonError(raw, input))
      setOutput('')
      setParsed(null)
      setStatus('error')
    }
  }, [input, indent])

  const validate = useCallback(() => {
    if (!input.trim()) return
    try {
      JSON.parse(input)
      setError(null)
      setOutput('✓ Valid JSON')
      setParsed(null)
      setStatus('valid')
    } catch (e) {
      setError(prettifyJsonError((e as Error).message, input))
      setOutput('')
      setParsed(null)
      setStatus('error')
    }
  }, [input])

  const clear = () => { setInput(''); setOutput(''); setError(null); setParsed(null); setStatus('idle'); saveToDisk('') }

  const isValid = status === 'valid' && output && output !== '✓ Valid JSON'

  return (
    <ToolLayout title="JSON Formatter" description="Format, validate and minify JSON with syntax highlighting." fullWidth>
      <div className="tool-split">

        {/* ── Input ── */}
        <div className="split-pane">
          <label className="label">Input JSON</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={'{\n  "hello": "world"\n}'}
            className="tool-textarea"
            style={{ flex: 1, minHeight: 0, resize: 'none' }}
            spellCheck={false}
          />
        </div>

        {/* ── Center actions ── */}
        <div className="split-actions">
          <button onClick={() => process(false)} className="btn-ghost">Format →</button>
          <button onClick={() => process(true)}  className="btn-ghost">Minify →</button>
          <button onClick={validate}             className="btn-ghost">Validate</button>
          <div className="split-divider" />
          <div className="split-field" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Indent</span>
            <select value={indent} onChange={e => setIndent(e.target.value === '\t' ? '\t' : Number(e.target.value))} className="tool-select" style={{ width: '100%' }}>
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={'\t'}>Tab</option>
            </select>
          </div>
          <div className="split-divider" />
          <button onClick={clear} className="btn-ghost" style={{ fontSize: 12 }}>Clear</button>
        </div>

        {/* ── Output ── */}
        <div className="split-pane">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="label" style={{ margin: 0 }}>Output</label>
              {/* Tree / Raw toggle */}
              {isValid && parsed && (
                <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {(['tree', 'raw'] as const).map(m => (
                    <button key={m} onClick={() => setViewMode(m)} style={{
                      padding: '2px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: viewMode === m ? 'var(--accent)' : 'transparent',
                      color: viewMode === m ? '#fff' : 'var(--text-dim)',
                      transition: 'all 0.12s',
                    }}>{m === 'tree' ? '🌲 Tree' : '</> Raw'}</button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {status === 'valid' && (
                <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 15 }}>✓</span> Valid JSON
                </span>
              )}
              {status === 'error' && (
                <span style={{ fontSize: 12, color: '#f87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 15 }}>✗</span> Invalid JSON
                </span>
              )}
              {isValid && (
                <button onClick={() => copy(output)} className="copy-btn">{copied ? '✓ Copied' : 'Copy'}</button>
              )}
            </div>
          </div>

          {/* Error panel */}
          {error && (
            <div style={{
              borderRadius: 10, padding: '14px 16px', marginBottom: 12, flexShrink: 0,
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 20, lineHeight: 1, color: '#f87171', flexShrink: 0 }}>✗</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f87171', marginBottom: 4 }}>
                    {error.title}
                  </div>
                  {error.detail && (
                    <div style={{ fontSize: 12, color: '#fca5a5', fontFamily: 'var(--font-mono)', lineHeight: 1.5, wordBreak: 'break-all' }}>
                      {error.detail}
                    </div>
                  )}
                  {error.lineNo > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(248,113,113,0.15)', color: '#f87171', fontFamily: 'var(--font-mono)' }}>
                        Line {error.lineNo}
                      </span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(248,113,113,0.15)', color: '#f87171', fontFamily: 'var(--font-mono)' }}>
                        Col {error.colNo}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Validate success banner */}
          {status === 'valid' && output === '✓ Valid JSON' && (
            <div style={{
              borderRadius: 10, padding: '14px 16px', flexShrink: 0,
              background: 'rgba(74,222,128,0.08)',
              border: '1px solid rgba(74,222,128,0.3)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 22, color: '#4ade80' }}>✓</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#4ade80' }}>Valid JSON</div>
                <div style={{ fontSize: 12, color: '#86efac', marginTop: 2 }}>Your JSON is syntactically correct.</div>
              </div>
            </div>
          )}

          {/* Tree / Raw output */}
          {isValid && (
            <div style={{
              flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto',
              border: isDark ? '1px solid rgba(74,222,128,0.25)' : '1px solid var(--border)',
              borderRadius: 10, padding: 16,
              background: 'var(--surface)',
            }}>
              {viewMode === 'tree' && parsed
                ? <JsonTree parsed={parsed} colors={colors} />
                : <code style={{ display: 'block', whiteSpace: 'pre', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7, color: colors.str }}>{output}</code>
              }
            </div>
          )}

          {/* Idle empty state */}
          {status === 'idle' && (
            <div style={{
              flex: 1, minHeight: 0, border: '1px dashed var(--border)', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: 13,
            }}>
              Formatted output will appear here
            </div>
          )}
        </div>

      </div>
    </ToolLayout>
  )
}
