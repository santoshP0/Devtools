import { useState, useMemo, useCallback, useRef, useEffect, useLayoutEffect } from 'react'

const CSV_SCROLL_STYLE = `
  .csv-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
  .csv-scroll::-webkit-scrollbar-track { background: var(--bg2); border-radius: 4px; }
  .csv-scroll::-webkit-scrollbar-thumb { background: var(--border-hi); border-radius: 5px; border: 2px solid var(--bg2); }
  .csv-scroll::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
  .csv-scroll::-webkit-scrollbar-corner { background: var(--bg2); }
`
import ToolLayout from '../components/ToolLayout'

/* ─── CSV Parser ─────────────────────────────────────────── */
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  try {
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    if (lines.length < 1) return { headers: [], rows: [] }
    const parseRow = (line: string): string[] => {
      const vals: string[] = []
      let cur = '', inQ = false
      for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (c === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
          else inQ = !inQ
        } else if (c === ',' && !inQ) { vals.push(cur); cur = '' }
        else cur += c
      }
      vals.push(cur)
      return vals.map(v => v.trim())
    }
    return { headers: parseRow(lines[0]), rows: lines.slice(1).map(parseRow) }
  } catch { return { headers: [], rows: [] } }
}

/* ─── Virtual List ────────────────────────────────────────── */
const ROW_H = 38
const OVERSCAN = 8

interface VirtualTableProps {
  headers: string[]
  rows: string[][]
  colWidths: number[]
  sortCol: number | null
  sortDir: 'asc' | 'desc'
  onSort: (i: number) => void
  onResizeStart: (i: number, x: number) => void
}

function VirtualTable({ headers, rows, colWidths, sortCol, sortDir, onSort, onResizeStart }: VirtualTableProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewH, setViewH] = useState(500)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setViewH(e.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const totalH = rows.length * ROW_H
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN)
  const endIdx = Math.min(rows.length - 1, Math.ceil((scrollTop + viewH) / ROW_H) + OVERSCAN)
  const visibleRows = rows.slice(startIdx, endIdx + 1)
  const totalW = colWidths.reduce((a, b) => a + b, 0)

  return (
    <>
      <style>{CSV_SCROLL_STYLE}</style>
      <div
        ref={containerRef}
        className="csv-scroll"
        onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}
        style={{
          overflow: 'auto',
          flex: 1,
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          minHeight: 0,
        }}
      >
      <div style={{ minWidth: totalW }}>
        {/* Sticky Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg2)',
          borderBottom: '2px solid var(--border)',
          display: 'flex',
        }}>
          {/* Row # header */}
          <div style={{
            width: 52, minWidth: 52, flexShrink: 0,
            padding: '10px 8px', fontSize: 10, fontWeight: 700,
            color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.08em', textAlign: 'center',
            borderRight: '1px solid var(--border)',
          }}>#</div>

          {headers.map((h, i) => (
            <div
              key={i}
              onClick={() => onSort(i)}
              style={{
                width: colWidths[i], minWidth: colWidths[i], flexShrink: 0,
                padding: '10px 12px',
                fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.07em',
                color: sortCol === i ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer', userSelect: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                position: 'relative', overflow: 'hidden',
                borderRight: i < headers.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{h}</span>
              <span style={{ marginLeft: 6, opacity: sortCol === i ? 1 : 0.3, fontSize: 12, flexShrink: 0 }}>
                {sortCol === i ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
              </span>
              {/* Resize handle */}
              <div
                onMouseDown={e => { e.stopPropagation(); onResizeStart(i, e.clientX) }}
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute', right: 0, top: 0, bottom: 0,
                  width: 6, cursor: 'col-resize', zIndex: 2,
                  background: 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-dim)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              />
            </div>
          ))}
        </div>

        {/* Virtual spacer + rows */}
        <div style={{ position: 'relative', height: totalH }}>
          <div style={{ position: 'absolute', top: startIdx * ROW_H, left: 0, right: 0 }}>
            {visibleRows.map((row, vi) => {
              const ri = startIdx + vi
              return (
                <div
                  key={ri}
                  style={{
                    display: 'flex',
                    height: ROW_H,
                    borderBottom: '1px solid var(--border)',
                    background: ri % 2 === 0 ? 'transparent' : 'var(--surface2)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = ri % 2 === 0 ? 'transparent' : 'var(--surface2)')}
                >
                  {/* Row number */}
                  <div style={{
                    width: 52, minWidth: 52, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    borderRight: '1px solid var(--border)',
                  }}>
                    {ri + 1}
                  </div>
                  {headers.map((_, ci) => (
                    <div
                      key={ci}
                      title={row[ci] ?? ''}
                      style={{
                        width: colWidths[ci], minWidth: colWidths[ci], flexShrink: 0,
                        padding: '0 12px',
                        display: 'flex', alignItems: 'center',
                        fontFamily: 'var(--font-mono)', fontSize: 12.5,
                        color: ci === 0 ? 'var(--text)' : 'var(--text-dim)',
                        overflow: 'hidden',
                        borderRight: ci < headers.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row[ci] ?? ''}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {rows.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px 0',
            color: 'var(--text-muted)', fontSize: 14,
            fontFamily: 'var(--font-sans)',
          }}>
            No rows match your search
          </div>
        )}
      </div>
    </div>
    </>
  )
}

/* ─── Main Component ──────────────────────────────────────── */
export default function CsvViewerPage() {
  const [rawCsv, setRawCsv] = useState('')
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [colWidths, setColWidths] = useState<number[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resizingRef = useRef<{ col: number; startX: number; startW: number } | null>(null)

  /* ── Parse ── */
  const { headers, rows } = useMemo(() => parseCSV(rawCsv), [rawCsv])

  /* ── Auto col widths on parse ── */
  useEffect(() => {
    if (headers.length === 0) { setColWidths([]); return }
    setColWidths(headers.map(h => Math.max(120, Math.min(300, h.length * 10 + 60))))
  }, [headers.length])

  /* ── Filter + Sort ── */
  const filtered = useMemo(() => {
    let r = rows
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(row => row.some(c => c.toLowerCase().includes(q)))
    }
    if (sortCol !== null) {
      r = [...r].sort((a, b) => {
        const av = a[sortCol] ?? '', bv = b[sortCol] ?? ''
        const an = parseFloat(av), bn = parseFloat(bv)
        const cmp = !isNaN(an) && !isNaN(bn) ? an - bn : av.localeCompare(bv)
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return r
  }, [rows, search, sortCol, sortDir])

  /* ── Load file ── */
  const loadFile = useCallback((file: File) => {
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text = (e.target?.result as string) ?? ''
      setRawCsv(text)
      setSearch('')
      setSortCol(null)
      setSortDir('asc')
    }
    reader.readAsText(file)
  }, [])

  /* ── Drag & Drop ── */
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(true)
  }, [])
  const onDragLeave = useCallback(() => setIsDragging(false), [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) loadFile(f)
  }, [loadFile])

  /* ── Sort ── */
  const handleSort = useCallback((i: number) => {
    setSortCol(prev => {
      if (prev === i) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return i }
      setSortDir('asc'); return i
    })
  }, [])

  /* ── Column Resize ── */
  const onResizeStart = useCallback((col: number, startX: number) => {
    resizingRef.current = { col, startX, startW: colWidths[col] }

    const onMove = (e: MouseEvent) => {
      if (!resizingRef.current) return
      const dx = e.clientX - resizingRef.current.startX
      const newW = Math.max(80, resizingRef.current.startW + dx)
      setColWidths(prev => { const c = [...prev]; c[resizingRef.current!.col] = newW; return c })
    }
    const onUp = () => {
      resizingRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [colWidths])

  /* ── Paste handler ── */
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text/plain')
    if (text) {
      setRawCsv(text)
      setFileName('pasted data')
      setSearch('')
      setSortCol(null)
    }
  }, [])

  /* ── Export ── */
  const handleExport = useCallback(() => {
    if (!rawCsv) return
    const blob = new Blob([rawCsv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = fileName || 'data.csv'; a.click()
    URL.revokeObjectURL(url)
  }, [rawCsv, fileName])

  /* ─── Render ──────────────────────────────────────────────── */
  const hasData = headers.length > 0

  return (
    <ToolLayout title="CSV Viewer" description="Open large CSV files instantly with virtual scrolling, sortable columns, and lightning-fast search">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 180px)', minHeight: 480 }}>

        {/* ── Top bar: upload + search + stats ── */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* File upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = '' }}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 10v3h12v-3M8 2v8M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Open File
          </button>

          {/* Paste CSV btn */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              navigator.clipboard.readText().then(t => {
                if (t) { setRawCsv(t); setFileName('pasted'); setSearch(''); setSortCol(null) }
              }).catch(() => {})
            }}
            title="Paste CSV from clipboard"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <rect x="4" y="2" width="9" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M6 2V1.5A1.5 1.5 0 017.5 0h1A1.5 1.5 0 0110 1.5V2" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            Paste
          </button>

          {/* Search */}
          {hasData && (
            <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 340 }}>
              <span style={{
                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none',
              }}>⌕</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search all columns…"
                style={{ paddingLeft: 30, width: '100%', height: 34, fontSize: 13 }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 2,
                  }}
                >×</button>
              )}
            </div>
          )}

          {hasData && (
            <>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{filtered.length.toLocaleString()}</span>
                {filtered.length !== rows.length && ` / ${rows.length.toLocaleString()}`} rows
                {' · '}{headers.length} cols
              </span>

              {fileName && (
                <span style={{
                  fontSize: 11, color: 'var(--text-muted)',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '3px 8px',
                  maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-mono)',
                }}>
                  📄 {fileName}
                </span>
              )}

              <button
                className="btn btn-ghost btn-sm"
                onClick={handleExport}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v8M5 7l3 3 3-3M2 12v1.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Export
              </button>
            </>
          )}
        </div>

        {/* ── Drop Zone (shown when no data) ── */}
        {!hasData && (
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 20,
              border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 16,
              background: isDragging ? 'var(--accent-bg)' : 'var(--surface)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              userSelect: 'none',
            }}
          >
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32,
              boxShadow: '0 4px 24px var(--border)',
              transition: 'transform 0.2s',
              transform: isDragging ? 'scale(1.08)' : 'scale(1)',
            }}>
              📊
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>
                {isDragging ? 'Drop your CSV here' : 'Open a CSV File'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
                Drag &amp; drop, click to browse, or paste from clipboard
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                Handles millions of rows instantly with virtual scrolling
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['.csv', '.tsv', '.txt'].map(ext => (
                <span key={ext} style={{
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '3px 8px', color: 'var(--text-muted)',
                }}>{ext}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Or paste area (fallback) ── */}
        {!hasData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="section-label">Or paste CSV directly</span>
            <textarea
              placeholder={`name,age,city\nAlice,30,New York\nBob,25,London`}
              style={{ minHeight: 90, fontSize: 12, resize: 'vertical' }}
              onPaste={handlePaste}
              onChange={e => {
                const v = e.target.value
                if (v.includes(',') || v.includes('\t')) {
                  setRawCsv(v); setFileName('pasted'); setSearch(''); setSortCol(null)
                }
              }}
            />
          </div>
        )}

        {/* ── Virtual Table ── */}
        {hasData && colWidths.length === headers.length && (
          <VirtualTable
            headers={headers}
            rows={filtered}
            colWidths={colWidths}
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={handleSort}
            onResizeStart={onResizeStart}
          />
        )}

        {/* ── Stats bar at bottom when data loaded ── */}
        {hasData && (
          <div style={{
            display: 'flex', gap: 16, flexWrap: 'wrap',
            padding: '8px 14px',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontSize: 12, color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            <span>Rows: <b style={{ color: 'var(--text)' }}>{rows.length.toLocaleString()}</b></span>
            <span>Cols: <b style={{ color: 'var(--text)' }}>{headers.length}</b></span>
            {search && <span>Filtered: <b style={{ color: 'var(--accent)' }}>{filtered.length.toLocaleString()}</b></span>}
            {sortCol !== null && <span>Sorted by: <b style={{ color: 'var(--accent)' }}>{headers[sortCol]} {sortDir === 'asc' ? '↑' : '↓'}</b></span>}
            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
              Drag column edges to resize · Click headers to sort
            </span>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
