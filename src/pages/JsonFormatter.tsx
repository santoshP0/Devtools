import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { isTauri, invoke } from '@tauri-apps/api/core'
import ToolLayout from '../components/ToolLayout'
import CodeEditor from '../components/CodeEditor'
import SearchInput from '../components/SearchInput'
import { monaco } from '../lib/monacoSetup'
import type { OnMount } from '@monaco-editor/react'
import { useClipboardCopy } from '../hooks/useClipboardCopy'
import { useIsDark } from '../hooks/useIsDark'
import { useNativeDrop } from '../hooks/useNativeDrop'
import { useOpenedFile } from '../lib/openWith'
import { useToast } from '../components/Toast'
import { isJsonFile, isTextFile } from '../lib/fileValidation'
import { ChevronRight, ChevronUp, ChevronDown, X, FolderTree, Code, Copy, Check, Search, Minimize2, Maximize2, Download, Route } from 'lucide-react'

// ─── Persistence ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'devtools:json-formatter:input'
function loadSaved() { try { return localStorage.getItem(STORAGE_KEY) ?? '' } catch { return '' } }
function saveToDisk(v: string) {
  // Only persist snippets under 150KB to keep main thread fast and avoid localStorage quota crashes
  if (v.length > 150_000) return
  try { localStorage.setItem(STORAGE_KEY, v) } catch {}
}

// ─── Error prettifier (fallback when Monaco markers unavailable) ──────────────
function prettifyJsonError(raw: string, input: string): JsonIssue {
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

  // Human-readable titles for common errors
  let title = 'Invalid JSON'
  const msg = raw.toLowerCase()
  if (msg.includes('unexpected end') || msg.includes('unterminated')) title = 'Unexpected end of input — JSON is incomplete'
  else if (msg.includes('unexpected token') || msg.includes('non-whitespace')) title = 'Unexpected character found'
  else if (msg.includes('bad escape')) title = 'Invalid escape sequence in string'
  else if (msg.includes('duplicate key')) title = 'Duplicate key in object'
  else if (msg.includes('expected') && msg.includes('colon')) title = 'Missing colon (:) between key and value'
  else if (msg.includes('expected') && msg.includes('comma')) title = 'Missing comma (,) between values'

  return { message: title, lineNo, colNo, frame: codeFrame(input, lineNo, colNo) }
}

type JsonIssue = { message: string; lineNo: number; colNo: number; frame: string }

// Code frame: the offending line with a caret under the exact column
function codeFrame(input: string, lineNo: number, colNo: number): string {
  if (lineNo <= 0) return ''
  let line = input.split('\n')[lineNo - 1] ?? ''
  let col = Math.max(1, colNo)
  // window long lines around the error column
  if (line.length > 74) {
    const start = Math.max(0, col - 38)
    line = (start > 0 ? '…' : '') + line.slice(start, start + 74) + (start + 74 < line.length ? '…' : '')
    col = col - start + (start > 0 ? 1 : 0)
  }
  const prefix = `${lineNo} | `
  return `${prefix}${line}\n${' '.repeat(prefix.length + col - 1)}^`
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
    <span
      role="button"
      tabIndex={0}
      onClick={e => { e.stopPropagation(); onClick() }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onClick() } }}
      className="json-tree-toggle"
      style={{
        width: 18,
        height: 18,
        color: colors.muted,
        userSelect: 'none',
      }}
      title={collapsed ? 'Expand' : 'Collapse'}
    >
      <ChevronRight
        size={13}
        strokeWidth={2.5}
        style={{
          transition: 'transform 0.15s ease',
          transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
        }}
      />
    </span>
  )
}

type JsonPrim = string | number | boolean | null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonVal = JsonPrim | JsonVal[] | { [k: string]: any }

function nodeHasQueryMatch(val: JsonVal, query: string, key?: string): boolean {
  if (!query) return false
  const q = query.toLowerCase()
  if (key && key.toLowerCase().includes(q)) return true
  if (val === null) return 'null'.includes(q)
  const t = typeof val
  if (t === 'string') return (val as string).toLowerCase().includes(q)
  if (t === 'number' || t === 'boolean') return String(val).toLowerCase().includes(q)
  return false
}

function subtreeHasMatch(val: JsonVal, query: string, key?: string): boolean {
  if (!query) return false
  if (nodeHasQueryMatch(val, query, key)) return true
  if (val === null || typeof val !== 'object') return false
  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      if (subtreeHasMatch(val[i], query, String(i))) return true
    }
    return false
  }
  for (const [k, v] of Object.entries(val)) {
    if (subtreeHasMatch(v, query, k)) return true
  }
  return false
}

const CHUNK_SIZE = 40

interface JsonNodeProps {
  k?: string
  val: JsonVal
  depth: number
  last: boolean
  colors: ColorTheme
  filterQuery: string
  path?: string
}

const JsonNode = memo(function JsonNode({
  k,
  val,
  depth,
  last,
  colors,
  filterQuery,
  path = '',
}: JsonNodeProps) {
  // Collapsed by default for children (depth > 0) to avoid rendering tens of thousands of DOM elements
  const [collapsed, setCollapsed] = useState(() => depth > 0)
  const [copied, setCopied] = useState(false)
  const [copiedPath, setCopiedPath] = useState(false)
  const [displayLimit, setDisplayLimit] = useState(CHUNK_SIZE)

  // Current JSON path representation
  const currentPath = path || (k !== undefined ? k : '$')

  // When search query is active, auto-unfold parents that contain matching children
  useEffect(() => {
    if (filterQuery) {
      if (subtreeHasMatch(val, filterQuery, k)) {
        setCollapsed(false)
      }
    }
  }, [filterQuery, val, k])

  const copyVal = (e: React.MouseEvent) => {
    e.stopPropagation()
    const str = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)
    navigator.clipboard.writeText(str)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const copyPath = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(currentPath)
    setCopiedPath(true)
    setTimeout(() => setCopiedPath(false), 1500)
  }

  const comma = last ? '' : ','
  const isExpandable = val !== null && typeof val === 'object'
  const isArr = Array.isArray(val)
  const childKeys = isExpandable ? (isArr ? [] : Object.keys(val as object)) : []
  const childCount = isExpandable ? (isArr ? (val as JsonVal[]).length : childKeys.length) : 0
  const hasChildren = childCount > 0

  const toggleSlot = hasChildren ? (
    <ToggleArrow collapsed={collapsed} onClick={() => setCollapsed(!collapsed)} colors={colors} />
  ) : (
    <span style={{ width: 18, height: 18, display: 'inline-block' }} />
  )

  const highlightText = (text: string) => {
    if (!filterQuery) return text
    const idx = text.toLowerCase().indexOf(filterQuery.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: 'var(--accent-bg)', color: 'var(--text)', borderRadius: 2, padding: '0 1px' }}>
          {text.slice(idx, idx + filterQuery.length)}
        </mark>
        {text.slice(idx + filterQuery.length)}
      </>
    )
  }

  const keyEl = k !== undefined ? (
    <span style={{ marginRight: 6 }}>
      <span style={{ color: colors.key, fontWeight: 500 }}>"{highlightText(k)}"</span>
      <span style={{ color: colors.punct }}>:</span>
    </span>
  ) : null

  const copyBtn = (
    <button
      type="button"
      onClick={copyVal}
      title={copied ? 'Copied!' : isExpandable ? 'Copy JSON' : 'Copy value'}
      className={`json-tree-action-btn ${copied ? 'is-active' : ''}`}
      style={{
        marginLeft: 6,
        color: copied ? 'var(--accent)' : undefined,
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  )

  const copyPathBtn = (
    <button
      type="button"
      onClick={copyPath}
      title={copiedPath ? `Copied: ${currentPath}` : `Copy path: ${currentPath}`}
      className={`json-tree-action-btn ${copiedPath ? 'is-active' : ''}`}
      style={{
        marginLeft: 2,
        color: copiedPath ? 'var(--accent)' : undefined,
      }}
    >
      {copiedPath ? <Check size={11} /> : <Route size={11} />}
    </button>
  )

  // Primitive Values
  if (val === null || typeof val !== 'object') {
    let valEl: React.ReactNode = null
    if (val === null) valEl = <span style={{ color: colors.null, fontStyle: 'italic' }}>null</span>
    else if (typeof val === 'boolean') valEl = <span style={{ color: colors.bool, fontWeight: 600 }}>{String(val)}</span>
    else if (typeof val === 'number') valEl = <span style={{ color: colors.num, fontWeight: 500 }}>{val}</span>
    else if (typeof val === 'string') valEl = <span style={{ color: colors.str }}>"{highlightText(val)}"</span>

    return (
      <div
        className="json-tree-row"
        style={{ paddingLeft: depth * 18 }}
      >
        {Array.from({ length: depth }).map((_, i) => (
          <div key={i} className="json-tree-guide" style={{ left: i * 18 + 9 }} />
        ))}
        {toggleSlot}
        <div style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap' }}>
          {keyEl}
          {valEl}
          <span style={{ color: colors.punct }}>{comma}</span>
          {copyBtn}
          {copyPathBtn}
        </div>
      </div>
    )
  }

  // Arrays and Objects
  const openBrace = isArr ? '[' : '{'
  const closeBrace = isArr ? ']' : '}'
  const badgeLabel = isArr
    ? `${childCount} item${childCount !== 1 ? 's' : ''}`
    : `${childCount} key${childCount !== 1 ? 's' : ''}`

  // Matching child indices when search query is active
  const matchingIndices = useMemo(() => {
    if (!filterQuery) return null
    const matches: number[] = []
    if (isArr) {
      const arr = val as JsonVal[]
      for (let i = 0; i < arr.length; i++) {
        if (subtreeHasMatch(arr[i], filterQuery, String(i))) {
          matches.push(i)
        }
      }
    } else {
      const entries = Object.entries(val as Record<string, JsonVal>)
      for (let i = 0; i < entries.length; i++) {
        if (subtreeHasMatch(entries[i][1], filterQuery, entries[i][0])) {
          matches.push(i)
        }
      }
    }
    return matches
  }, [val, filterQuery, isArr])

  if (collapsed || !hasChildren) {
    return (
      <div
        className="json-tree-row"
        style={{ paddingLeft: depth * 18, cursor: hasChildren ? 'pointer' : 'default' }}
        onClick={hasChildren ? () => setCollapsed(false) : undefined}
      >
        {Array.from({ length: depth }).map((_, i) => (
          <div key={i} className="json-tree-guide" style={{ left: i * 18 + 9 }} />
        ))}
        {toggleSlot}
        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
          {keyEl}
          <span style={{ color: colors.punct }}>{openBrace}</span>
          {hasChildren && (
            <span className="json-tree-badge">
              {matchingIndices !== null ? `${matchingIndices.length} matches / ${childCount}` : badgeLabel}
            </span>
          )}
          <span style={{ color: colors.punct }}>{closeBrace}{comma}</span>
          {copyBtn}
          {copyPathBtn}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Opening line */}
      <div
        className="json-tree-row"
        style={{ paddingLeft: depth * 18 }}
      >
        {Array.from({ length: depth }).map((_, i) => (
          <div key={i} className="json-tree-guide" style={{ left: i * 18 + 9 }} />
        ))}
        {toggleSlot}
        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
          {keyEl}
          <span style={{ color: colors.punct }}>{openBrace}</span>
          <span className="json-tree-badge" style={{ opacity: 0.75 }}>
            {matchingIndices !== null ? `${matchingIndices.length} matches / ${childCount}` : badgeLabel}
          </span>
          {copyBtn}
          {copyPathBtn}
        </div>
      </div>

      {/* Children */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {matchingIndices !== null ? (
          matchingIndices.length === 0 ? (
            <div style={{ paddingLeft: (depth + 1) * 18 + 4, color: colors.muted, fontSize: 11, fontStyle: 'italic', padding: '2px 0 2px ' + ((depth + 1) * 18 + 4) + 'px' }}>
              (no matching items in this {isArr ? 'array' : 'object'})
            </div>
          ) : (
            matchingIndices.slice(0, displayLimit).map(idx => {
              if (isArr) {
                const item = (val as JsonVal[])[idx]
                return (
                  <JsonNode
                    key={idx}
                    val={item}
                    depth={depth + 1}
                    last={idx === childCount - 1}
                    colors={colors}
                    filterQuery={filterQuery}
                    path={currentPath ? `${currentPath}[${idx}]` : `[${idx}]`}
                  />
                )
              } else {
                const [ek, ev] = Object.entries(val as Record<string, JsonVal>)[idx]
                return (
                  <JsonNode
                    key={ek}
                    k={ek}
                    val={ev}
                    depth={depth + 1}
                    last={idx === childCount - 1}
                    colors={colors}
                    filterQuery={filterQuery}
                    path={currentPath ? `${currentPath}${/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(ek) ? `.${ek}` : `[${JSON.stringify(ek)}]`}` : ek}
                  />
                )
              }
            })
          )
        ) : isArr ? (
          (val as JsonVal[]).slice(0, displayLimit).map((item, i) => (
            <JsonNode
              key={i}
              val={item}
              depth={depth + 1}
              last={i === (val as JsonVal[]).length - 1}
              colors={colors}
              filterQuery={filterQuery}
              path={currentPath ? `${currentPath}[${i}]` : `[${i}]`}
            />
          ))
        ) : (
          Object.entries(val as Record<string, JsonVal>).slice(0, displayLimit).map(([ek, ev], i, arr) => (
            <JsonNode
              key={ek}
              k={ek}
              val={ev}
              depth={depth + 1}
              last={i === arr.length - 1}
              colors={colors}
              filterQuery={filterQuery}
              path={currentPath ? `${currentPath}${/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(ek) ? `.${ek}` : `[${JSON.stringify(ek)}]`}` : ek}
            />
          ))
        )}

        {/* Chunking / Pagination footer for large collections */}
        {((matchingIndices !== null ? matchingIndices.length : childCount) > displayLimit) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingLeft: (depth + 1) * 18 + 6,
            paddingTop: 4,
            paddingBottom: 4,
          }}>
            <span style={{ fontSize: 11, color: colors.muted, fontFamily: 'var(--font-mono)' }}>
              Showing {displayLimit} of {matchingIndices !== null ? matchingIndices.length : childCount}
            </span>
            <button
              type="button"
              onClick={() => setDisplayLimit(c => Math.min(matchingIndices !== null ? matchingIndices.length : childCount, c + CHUNK_SIZE))}
              className="btn-ghost"
              style={{ fontSize: 11, padding: '1px 8px' }}
            >
              +{Math.min(CHUNK_SIZE, (matchingIndices !== null ? matchingIndices.length : childCount) - displayLimit)} more
            </button>
            <button
              type="button"
              onClick={() => setDisplayLimit(matchingIndices !== null ? matchingIndices.length : childCount)}
              className="btn-ghost"
              style={{ fontSize: 11, padding: '1px 8px' }}
            >
              Show all ({matchingIndices !== null ? matchingIndices.length : childCount})
            </button>
          </div>
        )}
      </div>

      {/* Closing line */}
      <div className="json-tree-row" style={{ paddingLeft: depth * 18 }}>
        {Array.from({ length: depth }).map((_, i) => (
          <div key={i} className="json-tree-guide" style={{ left: i * 18 + 9 }} />
        ))}
        <span style={{ width: 18, height: 18, display: 'inline-block' }} />
        <span style={{ color: colors.punct }}>{closeBrace}{comma}</span>
      </div>
    </div>
  )
})

function JsonTree({
  parsed,
  colors,
  filterQuery = '',
}: {
  parsed: JsonVal
  colors: ColorTheme
  filterQuery?: string
}) {
  return (
    <div className="json-tree-container" style={{ position: 'relative' }}>
      <div style={{ overflowX: 'auto', paddingLeft: 4 }}>
        <JsonNode
          val={parsed}
          depth={0}
          last={true}
          colors={colors}
          filterQuery={filterQuery}
        />
      </div>
    </div>
  )
}



// ─── Main Component ───────────────────────────────────────────────────────────
export default function JsonFormatter() {
  const [input, setInput]   = useState<string>(() => loadSaved())
  const [output, setOutput] = useState('')
  const [parsed, setParsed] = useState<JsonVal | null>(null)  // for tree view
  const [errors, setErrors] = useState<JsonIssue[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'valid' | 'error'>('idle')
  const [indent, setIndent] = useState<number | string>(2)
  const { copied, copy } = useClipboardCopy()
  const { show } = useToast()

  // Desktop: Finder drag-drop and "Open with DevToolbox" on a .json file.
  const loadFile = async (file: File) => {
    if (!isJsonFile(file) && !isTextFile(file)) {
      show(`Cannot open ${file.name} — JSON Formatter only supports JSON and text files.`)
      return
    }
    setInput(await file.text())
  }
  useNativeDrop(items => { if (items[0]) loadFile(items[0].file) })
  useOpenedFile('/json-formatter', loadFile)
  const [viewMode, setViewMode] = useState<'tree' | 'code'>('code')
  const [searchQuery, setSearchQuery] = useState('')
  const [matchCount, setMatchCount] = useState<number>(0)
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0)
  const matchesRef = useRef<monaco.editor.FindMatch[]>([])
  const searchDecosRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const outputEditorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const isDark = useIsDark()

  const colors = isDark ? PALETTES.dark : PALETTES.light

  // Highlight + jump to the error line in the input editor
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const errDecos = useRef<monaco.editor.IEditorDecorationsCollection | null>(null)
  const onEditorMount: OnMount = (editor) => {
    editorRef.current = editor
    errDecos.current = editor.createDecorationsCollection()
  }
  const markErrors = (issues: JsonIssue[] | null) => {
    if (!errDecos.current) return
    const lines = (issues ?? []).filter(i => i.lineNo > 0)
    if (!lines.length) { errDecos.current.clear(); return }
    errDecos.current.set(lines.map(i => ({
      range: new monaco.Range(i.lineNo, 1, i.lineNo, 1),
      options: { isWholeLine: true, className: 'json-error-line' },
    })))
    editorRef.current?.revealLineInCenter(lines[0].lineNo)
  }

  // Monaco's JSON language service marks every problem with a precise
  // message + position — far better than JSON.parse exception text.
  const collectIssues = (raw: string): JsonIssue[] => {
    const model = editorRef.current?.getModel()
    const markers = model ? monaco.editor.getModelMarkers({ resource: model.uri }) : []
    const issues = markers
      .filter(m => m.severity === monaco.MarkerSeverity.Error)
      .slice(0, 5)
      .map(m => ({ message: m.message, lineNo: m.startLineNumber, colNo: m.startColumn, frame: codeFrame(input, m.startLineNumber, m.startColumn) }))
    return issues.length ? issues : [prettifyJsonError(raw, input)]
  }

  // Persist input
  useEffect(() => {
    const id = setTimeout(() => saveToDisk(input), 300)
    return () => clearTimeout(id)
  }, [input])

  // Focus search input
  const triggerFind = useCallback(() => {
    searchInputRef.current?.focus()
    searchInputRef.current?.select()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && target.closest('.monaco-editor') && target.closest('.monaco-editor') === editorRef.current?.getDomNode()) {
        return
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        triggerFind()
      } else if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [triggerFind, searchQuery])

  // Search find & match calculation in Monaco Editor / Tree View
  useEffect(() => {
    if (!searchQuery.trim()) {
      setMatchCount(0)
      setCurrentMatchIndex(0)
      matchesRef.current = []
      searchDecosRef.current?.clear()
      return
    }

    if (viewMode === 'tree') {
      if (!output) {
        setMatchCount(0)
        return
      }
      const q = searchQuery.toLowerCase()
      const text = output.toLowerCase()
      let count = 0
      let pos = 0
      while ((pos = text.indexOf(q, pos)) !== -1) {
        count++
        pos += q.length
        if (count > 500) break
      }
      setMatchCount(count)
      setCurrentMatchIndex(count > 0 ? 1 : 0)
      return
    }

    if (!outputEditorRef.current) return

    const timer = setTimeout(() => {
      const model = outputEditorRef.current?.getModel()
      if (!model) return

      const matches = model.findMatches(searchQuery, false, false, false, null, true)
      matchesRef.current = matches
      setMatchCount(matches.length)

      if (matches.length > 0) {
        setCurrentMatchIndex(1)
        outputEditorRef.current?.setSelection(matches[0].range)
        outputEditorRef.current?.revealRangeInCenter(matches[0].range)

        searchDecosRef.current?.set(
          matches.map(m => ({
            range: m.range,
            options: {
              className: 'monaco-find-match-highlight',
              inlineClassName: 'monaco-find-match-highlight',
            },
          }))
        )
      } else {
        setCurrentMatchIndex(0)
        searchDecosRef.current?.clear()
      }
    }, 120)

    return () => clearTimeout(timer)
  }, [searchQuery, output, viewMode])

  const nextMatch = useCallback(() => {
    if (matchesRef.current.length === 0 || !outputEditorRef.current) return
    setCurrentMatchIndex(curr => {
      const next = (curr % matchesRef.current.length) + 1
      const match = matchesRef.current[next - 1]
      if (match) {
        outputEditorRef.current?.setSelection(match.range)
        outputEditorRef.current?.revealRangeInCenter(match.range)
      }
      return next
    })
  }, [])

  const prevMatch = useCallback(() => {
    if (matchesRef.current.length === 0 || !outputEditorRef.current) return
    setCurrentMatchIndex(curr => {
      const prev = curr - 1 < 1 ? matchesRef.current.length : curr - 1
      const match = matchesRef.current[prev - 1]
      if (match) {
        outputEditorRef.current?.setSelection(match.range)
        outputEditorRef.current?.revealRangeInCenter(match.range)
      }
      return prev
    })
  }, [])

  const handleViewModeChange = (mode: 'tree' | 'code') => {
    setViewMode(mode)
    if (mode === 'tree' && !parsed && output && output !== '✓ Valid JSON') {
      if (output.length < 2_500_000) {
        try { setParsed(JSON.parse(output)) } catch { setParsed(null) }
      }
    }
  }

  const process = useCallback(async (minify: boolean) => {
    if (!input.trim()) return
    if (isTauri()) {
      try {
        const res = await invoke<{
          ok: boolean
          output: string
          in_bytes: number
          out_bytes: number
          time_us: number
          keys_count: number
          depth: number
          error: { message: string; line: number; column: number } | null
        }>('json_process', {
          req: {
            input,
            mode: minify ? 'minify' : 'format',
            indent: indent === '\t' ? 0 : Number(indent),
            use_tabs: indent === '\t',
          },
        })
        if (res.ok) {
          setOutput(res.output)
          if (viewMode === 'tree' && !minify && res.output.length < 2_500_000) {
            try { setParsed(JSON.parse(res.output)) } catch { setParsed(null) }
          } else {
            setParsed(null)
          }
          setErrors(null)
          setStatus('valid')
          markErrors(null)
          return
        } else if (res.error) {
          const issues = [{
            message: res.error.message,
            lineNo: res.error.line,
            colNo: res.error.column,
            frame: codeFrame(input, res.error.line, res.error.column),
          }]
          setErrors(issues)
          setOutput('')
          setParsed(null)
          setStatus('error')
          markErrors(issues)
          return
        }
      } catch (e) {
        console.warn('Rust json_process error, falling back to JS:', e)
      }
    }

    try {
      const obj = JSON.parse(input)
      const out = minify ? JSON.stringify(obj) : JSON.stringify(obj, null, indent === '\t' ? '\t' : Number(indent))
      setOutput(out)
      if (viewMode === 'tree' && !minify && out.length < 2_500_000) {
        setParsed(obj as JsonVal)
      } else {
        setParsed(null)
      }
      setErrors(null)
      setStatus('valid')
      markErrors(null)
    } catch (e) {
      const issues = collectIssues((e as Error).message)
      setErrors(issues)
      setOutput('')
      setParsed(null)
      setStatus('error')
      markErrors(issues)
    }
  }, [input, indent, viewMode])

  const validate = useCallback(async () => {
    if (!input.trim()) return
    if (isTauri()) {
      try {
        const res = await invoke<{
          ok: boolean
          time_us: number
          error: { message: string; line: number; column: number } | null
        }>('json_process', {
          req: {
            input,
            mode: 'validate',
            indent: 2,
            use_tabs: false,
          },
        })
        if (res.ok) {
          setErrors(null)
          setOutput('✓ Valid JSON')
          setParsed(null)
          setStatus('valid')
          markErrors(null)
          return
        } else if (res.error) {
          const issues = [{
            message: res.error.message,
            lineNo: res.error.line,
            colNo: res.error.column,
            frame: codeFrame(input, res.error.line, res.error.column),
          }]
          setErrors(issues)
          setOutput('')
          setParsed(null)
          setStatus('error')
          markErrors(issues)
          return
        }
      } catch (e) {
        console.warn('Rust validate error, falling back to JS:', e)
      }
    }

    try {
      JSON.parse(input)
      setErrors(null)
      setOutput('✓ Valid JSON')
      setParsed(null)
      setStatus('valid')
      markErrors(null)
    } catch (e) {
      const issues = collectIssues((e as Error).message)
      setErrors(issues)
      setOutput('')
      setParsed(null)
      setStatus('error')
      markErrors(issues)
    }
  }, [input])

  const clear = () => { setInput(''); setOutput(''); setErrors(null); setParsed(null); setStatus('idle'); setSearchQuery(''); saveToDisk(''); markErrors(null) }

  const onInputChange = (v: string) => { setInput(v); errDecos.current?.clear() }

  const downloadJson = () => {
    if (!output) return
    const blob = new Blob([output], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'formatted.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const isValid = status === 'valid' && output && output !== '✓ Valid JSON'

  return (
    <ToolLayout title="JSON Formatter" description="Format, validate and minify JSON with syntax highlighting." fullWidth>
      <div className="tool-split">

        {/* ── Input ── */}
        <div className="split-pane">
          <label className="label">Input JSON</label>
          <CodeEditor
            language="json"
            value={input}
            onChange={onInputChange}
            onMount={onEditorMount}
            placeholder={'{ "hello": "world" }'}
            options={{
              wordWrap: 'on',
              scrollBeyondLastLine: false,
            }}
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
              {/* Tree / Code toggle */}
              {isValid && (
                <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {(['code', 'tree'] as const).map(m => (
                    <span
                      key={m}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleViewModeChange(m)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: viewMode === m ? 'var(--accent)' : 'transparent',
                        color: viewMode === m ? '#fff' : 'var(--text-dim)',
                        transition: 'all 0.12s',
                        userSelect: 'none',
                      }}
                    >
                      {m === 'tree' ? <><FolderTree size={12} /> Tree</> : <><Code size={12} /> Code</>}
                    </span>
                  ))}
                </div>
              )}
              {isValid && output && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {new Blob([output]).size < 1024
                    ? `${new Blob([output]).size} B`
                    : `${(new Blob([output]).size / 1024).toFixed(1)} KB`}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {status === 'valid' && (
                <span style={{ fontSize: 12, color: isDark ? '#4ade80' : '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 15 }}>✓</span> Valid JSON
                </span>
              )}
              {status === 'error' && (
                <span style={{ fontSize: 12, color: isDark ? '#f87171' : '#b91c1c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 15 }}>✗</span> Invalid JSON
                </span>
              )}
              {isValid && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {/* Search Bar with match count & prev/next cycling */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '0 4px',
                    height: 28,
                    gap: 2,
                  }}>
                    <Search size={13} style={{ color: 'var(--text-muted)', marginLeft: 4 }} />
                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (e.shiftKey) prevMatch()
                          else nextMatch()
                        } else if (e.key === 'Escape') {
                          setSearchQuery('')
                        }
                      }}
                      placeholder={viewMode === 'tree' ? 'Search tree...' : 'Find in output…'}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        fontSize: 12,
                        fontFamily: 'var(--font-sans)',
                        color: 'var(--text)',
                        width: 120,
                        padding: '0 4px',
                      }}
                    />
                    {searchQuery && (
                      <span style={{
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                        color: matchCount > 0 ? 'var(--text-muted)' : '#ef4444',
                        padding: '0 4px',
                        whiteSpace: 'nowrap',
                      }}>
                        {matchCount > 0 ? `${currentMatchIndex} of ${matchCount}` : '0 matches'}
                      </span>
                    )}
                    {searchQuery && matchCount > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={prevMatch}
                          title="Previous match (Shift+Enter)"
                          style={{ padding: '2px 3px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={nextMatch}
                          title="Next match (Enter)"
                          style={{ padding: '2px 3px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>
                    )}
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        title="Clear (Esc)"
                        style={{ padding: '2px 4px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <button onClick={downloadJson} className="copy-btn" title="Download formatted JSON">
                    <Download size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    Download
                  </button>
                  <button onClick={() => copy(output)} className="copy-btn">
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Error panel */}
          {errors && (() => {
            const errFg  = isDark ? '#f87171' : '#b91c1c'
            const errDim = isDark ? '#fca5a5' : '#7f1d1d'
            const chipBg = isDark ? 'rgba(248,113,113,0.15)' : 'rgba(185,28,28,0.12)'
            return (
              <div style={{
                borderRadius: 10, padding: '14px 16px', marginBottom: 12, flexShrink: 0,
                maxHeight: '45%', overflowY: 'auto',
                background: isDark ? 'rgba(248,113,113,0.08)' : '#fbe9e7',
                border: `1px solid ${isDark ? 'rgba(248,113,113,0.3)' : '#e8a49c'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18, lineHeight: 1, color: errFg }}>✗</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: errFg }}>
                    Invalid JSON{errors.length > 1 ? ` — ${errors.length} problems` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {errors.map((issue, i) => (
                    <div
                      key={i}
                      onClick={() => issue.lineNo > 0 && editorRef.current?.revealLineInCenter(issue.lineNo)}
                      title={issue.lineNo > 0 ? 'Click to jump to line' : undefined}
                      style={{ cursor: issue.lineNo > 0 ? 'pointer' : 'default' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        {issue.lineNo > 0 && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: chipBg, color: errFg, fontFamily: 'var(--font-mono)', fontWeight: 600, flexShrink: 0 }}>
                            Ln {issue.lineNo}, Col {issue.colNo}
                          </span>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 600, color: errFg }}>{issue.message}</span>
                      </div>
                      {issue.frame && (
                        <pre style={{
                          margin: 0, padding: '8px 10px', borderRadius: 6, overflowX: 'auto',
                          background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.75)',
                          color: errDim, fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.5,
                        }}>{issue.frame}</pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Validate success banner */}
          {status === 'valid' && output === '✓ Valid JSON' && (
            <div style={{
              borderRadius: 10, padding: '14px 16px', flexShrink: 0,
              background: isDark ? 'rgba(74,222,128,0.08)' : '#e6f4ea',
              border: `1px solid ${isDark ? 'rgba(74,222,128,0.3)' : '#a3d9b1'}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 22, color: isDark ? '#4ade80' : '#15803d' }}>✓</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#4ade80' : '#15803d' }}>Valid JSON</div>
                <div style={{ fontSize: 12, color: isDark ? '#86efac' : '#166534', marginTop: 2 }}>Your JSON is syntactically correct.</div>
              </div>
            </div>
          )}

          {/* Tree / Raw output */}
          {isValid && (
            viewMode === 'tree' ? (
              output.length > 2_500_000 ? (
                <div style={{
                  flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center',
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                }}>
                  <Code size={36} style={{ marginBottom: 12, opacity: 0.6 }} />
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                    Large JSON File ({new Blob([output]).size < 1048576 ? `${(new Blob([output]).size / 1024).toFixed(1)} KB` : `${(new Blob([output]).size / 1048576).toFixed(1)} MB`})
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 440, marginBottom: 16 }}>
                    Rendering tens of thousands of unvirtualized DOM nodes in Tree view causes heavy browser lag. Code view uses Monaco’s virtualized engine for instant 60fps scrolling and search.
                  </div>
                  <button
                    onClick={() => handleViewModeChange('code')}
                    className="copy-btn"
                    style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600 }}
                  >
                    Switch to Code View (Recommended)
                  </button>
                </div>
              ) : parsed ? (
                <div style={{
                  flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto',
                  border: isDark ? '1px solid rgba(74,222,128,0.25)' : '1px solid var(--border)',
                  borderRadius: 10, padding: 14,
                  background: 'var(--surface)',
                }}>
                  <JsonTree parsed={parsed} colors={colors} filterQuery={searchQuery} />
                </div>
              ) : (
                <div style={{
                  flex: 1, minHeight: 0, border: '1px dashed var(--border)', borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', fontSize: 13,
                }}>
                  Parsing tree...
                </div>
              )
            ) : (
              <CodeEditor
                language="json"
                value={output}
                onChange={() => {}}
                onMount={ed => {
                  outputEditorRef.current = ed
                  searchDecosRef.current = ed.createDecorationsCollection()
                }}
                options={{
                  readOnly: true,
                  lineNumbers: 'on',
                  folding: true,
                  minimap: { enabled: output.length < 200_000 },
                  scrollBeyondLastLine: false,
                  wordWrap: 'off',
                  renderWhitespace: 'none',
                }}
              />
            )
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
