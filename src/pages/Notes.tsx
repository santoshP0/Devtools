import { useState, useRef, useEffect, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'
import SearchInput from '../components/SearchInput'
import { useClipboardCopy } from '../hooks/useClipboardCopy'
import { useIsDark } from '../hooks/useIsDark'
import { useNativeDrop } from '../hooks/useNativeDrop'
import { saveFile } from '../lib/saveFile'
import { Search, ChevronUp, ChevronDown, X, Replace } from 'lucide-react'

interface Note {
  id: string
  title: string
  content: string
  color: string
  createdAt: number
  updatedAt: number
}

interface Shade { bg: string; border: string; text: string }
interface NoteColor { name: string; swatch: string; light: Shade; dark: Shade }

// Each note colour carries a light and a dark shade. Dark mode used to reuse the
// light pastel backgrounds, which washed out to a milky overlay over the dark
// app — now dark gets its own deep, tinted surfaces with readable ink.
const COLORS: NoteColor[] = [
  { name: 'default', swatch: 'oklch(0.60 0.02 250)',
    light: { bg: 'oklch(0.98 0.005 250)', border: 'oklch(0.88 0.02 250)', text: '#1e1e2e' },
    dark:  { bg: '#211e18', border: '#413b31', text: '#e0dccf' } },
  { name: 'yellow', swatch: 'oklch(0.78 0.16 90)',
    light: { bg: 'oklch(0.97 0.05 95)', border: 'oklch(0.88 0.08 90)', text: '#2a1a00' },
    dark:  { bg: '#26200f', border: '#4a3d1a', text: '#e8d9a8' } },
  { name: 'blue', swatch: 'oklch(0.65 0.15 240)',
    light: { bg: 'oklch(0.96 0.04 235)', border: 'oklch(0.86 0.07 235)', text: '#00102d' },
    dark:  { bg: '#111c2b', border: '#28405c', text: '#b6cdea' } },
  { name: 'green', swatch: 'oklch(0.65 0.16 145)',
    light: { bg: 'oklch(0.96 0.05 145)', border: 'oklch(0.86 0.08 145)', text: '#001a0a' },
    dark:  { bg: '#0f2318', border: '#274a37', text: '#aed8bf' } },
  { name: 'pink', swatch: 'oklch(0.72 0.14 350)',
    light: { bg: 'oklch(0.97 0.04 355)', border: 'oklch(0.87 0.07 350)', text: '#2a001a' },
    dark:  { bg: '#2a1420', border: '#4e2740', text: '#e8bcd4' } },
  { name: 'purple', swatch: 'oklch(0.65 0.18 300)',
    light: { bg: 'oklch(0.96 0.04 300)', border: 'oklch(0.86 0.07 300)', text: '#1a002d' },
    dark:  { bg: '#1d1630', border: '#382a54', text: '#cbb8ea' } },
]

const STORAGE_KEY = 'devtoolbox-notes'

function loadNotes(): Note[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
function saveNotes(notes: Note[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  } catch (e) {
    // Browser storage is capped (~5 MB). Don't let hitting that throw out of
    // the save path and take the editor down with it.
    console.error('Could not save notes — storage is full or unavailable', e)
  }
}
function newNote(): Note {
  return { id: crypto.randomUUID(), title: '', content: '', color: 'default', createdAt: Date.now(), updatedAt: Date.now() }
}
function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

// ── inline line icons (native-feeling, no emoji) ──
const iconProps = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const TrashIcon = () => <svg {...iconProps}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
const CopyIcon = () => <svg {...iconProps}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
const CheckIcon = () => <svg {...iconProps}><polyline points="20 6 9 17 4 12" /></svg>
const ReplaceIcon = () => <svg {...iconProps}><path d="M14 4h5v5" /><path d="M19 4l-6 6" /><path d="M10 20H5v-5" /><path d="M5 20l6-6" /></svg>
const DownloadIcon = () => <svg {...iconProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>

export default function Notes() {
  const dark = useIsDark()
  const [notes, setNotes] = useState<Note[]>(() => loadNotes())
  // Open straight into a writable note: reuse the newest, or start a blank one.
  const [activeId, setActiveId] = useState<string | null>(() => loadNotes()[0]?.id ?? null)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showFind, setShowFind] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const { copied: copiedNote, copy: copyNote } = useClipboardCopy(2000)
  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const findRef = useRef<HTMLInputElement>(null)

  const active = notes.find(n => n.id === activeId) ?? null

  // Persist on every change — the ONE place notes are saved, always the latest
  // state. Previously each handler saved its own (stale-closure) array, so a fast
  // keystroke could overwrite a create/delete → notes "came back" on reload.
  useEffect(() => { saveNotes(notes) }, [notes])

  // Always keep an open note to write in, and keep activeId pointing at a note
  // that still exists — covers first mount, deletes, and emptying the list.
  useEffect(() => {
    if (notes.length === 0) {
      const note = newNote()
      setNotes([note]); setActiveId(note.id)
    } else if (!activeId || !notes.some(n => n.id === activeId)) {
      setActiveId(notes[0].id)
    }
  }, [notes, activeId])

  // Focus the title on first mount so you can just start typing.
  useEffect(() => {
    const t = setTimeout(() => titleRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  // VS Code-style: Cmd/Ctrl+F toggles find bar (opens & focuses if closed; hides if open); Esc closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        setShowFind(prev => {
          const next = !prev
          if (next) {
            setTimeout(() => { findRef.current?.focus(); findRef.current?.select() }, 0)
          } else {
            contentRef.current?.focus()
          }
          return next
        })
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault()
        setShowFind(true)
        setShowReplace(prev => !prev)
        setTimeout(() => { findRef.current?.focus(); findRef.current?.select() }, 0)
      } else if (e.key === 'Escape' && showFind) {
        e.preventDefault()
        setShowFind(false)
        contentRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showFind])

  // Step through every occurrence of findText one by one (Enter / ↓ / ↑), wrapping
  // around. Focus stays in the find box so repeated Enter keeps advancing; the
  // match is selected + scrolled into view in the note.
  const findStep = (dir: 1 | -1) => {
    const ta = contentRef.current
    if (!active || !findText || !ta) return
    const text = active.content
    const starts: number[] = []
    for (let i = text.indexOf(findText); i !== -1; i = text.indexOf(findText, i + findText.length)) starts.push(i)
    if (starts.length === 0) return
    const cur = ta.selectionStart
    const onMatch = starts.includes(cur) && text.slice(cur, cur + findText.length) === findText
    let target: number
    if (dir === 1) target = (onMatch ? starts.find(s => s > cur) : starts.find(s => s >= cur)) ?? starts[0]
    else target = (onMatch ? [...starts].reverse().find(s => s < cur) : [...starts].reverse().find(s => s <= cur)) ?? starts[starts.length - 1]
    // focus the textarea so the selection is actually highlighted (an unfocused
    // textarea's selection is invisible in WebKit), then select + scroll to it.
    ta.focus()
    ta.setSelectionRange(target, target + findText.length)
    const line = text.slice(0, target).split('\n').length - 1
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20
    ta.scrollTop = Math.max(0, line * lh - ta.clientHeight / 2)
  }
  const findNext = () => findStep(1)
  const findPrev = () => findStep(-1)

  // Every mutation is a functional update, so it acts on the latest state and can
  // never be clobbered by a concurrent change (typing while creating/deleting).
  const update = (id: string, patch: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n))
  }

  const addNote = () => {
    const note = newNote()
    setNotes(prev => [note, ...prev])
    setActiveId(note.id)
    setShowFind(false)
    setTimeout(() => titleRef.current?.focus(), 50)
  }

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    setActiveId(cur => (cur === id ? null : cur)) // the effect above reselects a valid note
    setConfirmDelete(null)
  }

  // Save as a real Markdown file — a native Save As on desktop, download on web.
  // Notes live in localStorage; exporting gives them a durable copy on disk.
  const downloadNote = (note: Note) => {
    const name = (note.title.trim() || 'untitled').replace(/[^\w\- ]+/g, '').trim() || 'untitled'
    const md = note.title.trim() ? `# ${note.title.trim()}\n\n${note.content}` : note.content
    saveFile(`${name}.md`, md, 'text/markdown')
  }

  // Desktop: drop .md/.txt files from Finder to import them as notes.
  useNativeDrop(async items => {
    const files = items.filter(i => /\.(md|markdown|txt)$/i.test(i.file.name))
    if (!files.length) return
    const imported: Note[] = []
    for (const f of files) {
      const text = await f.file.text()
      const heading = text.match(/^#\s+(.+)$/m)?.[1]
      imported.push({
        ...newNote(),
        title: heading ?? f.file.name.replace(/\.[^.]+$/, ''),
        content: heading ? text.replace(/^#\s+.+\n\n?/, '') : text,
      })
    }
    setNotes(n => [...imported, ...n])
    setActiveId(imported[0].id)
  })

  const colorOf = (name: string) => COLORS.find(c => c.name === name) ?? COLORS[0]
  const shade = (name: string): Shade => { const c = colorOf(name); return dark ? c.dark : c.light }
  const ac = active ? shade(active.color) : shade('default')

  // ── find & replace, scoped to the active note with case-insensitive matching ──
  const matches = useMemo(() => {
    if (!active || !findText) return []
    const content = active.content
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'gi')
    const indices: number[] = []
    let m: RegExpExecArray | null
    while ((m = regex.exec(content)) !== null) {
      indices.push(m.index)
      if (m.index === regex.lastIndex) regex.lastIndex++
    }
    return indices
  }, [active?.content, findText])

  const matchCount = matches.length
  const [matchIdx, setMatchIdx] = useState(0)

  useEffect(() => {
    if (matches.length === 0) setMatchIdx(0)
    else if (matchIdx >= matches.length) setMatchIdx(0)
  }, [matches.length, matchIdx])

  const replaceAll = () => {
    if (!active || !findText || matches.length === 0) return
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'gi')
    update(active.id, { content: active.content.replace(regex, replaceText) })
  }

  const replaceOne = () => {
    if (!active || !findText || matches.length === 0) return
    const ta = contentRef.current
    const selStart = ta ? ta.selectionStart : -1
    const selEnd = ta ? ta.selectionEnd : -1
    const isCurrent = matches.includes(selStart) && (selEnd - selStart === findText.length)
    const target = isCurrent ? selStart : (matches[matchIdx] ?? matches[0])

    const nextContent = active.content.slice(0, target) + replaceText + active.content.slice(target + findText.length)
    update(active.id, { content: nextContent })
    setTimeout(() => findStep(0 as any), 10)
  }

  const filtered = notes.filter(n => {
    const q = search.toLowerCase()
    return !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  })

  return (
    <ToolLayout title="Notes" description="Write and save notes right in your browser. Stored locally — never uploaded anywhere.">
      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={addNote} className="btn-primary" style={{ width: '100%' }}>+ New Note</button>

          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search notes…"
            containerStyle={{ width: '100%' }}
          />

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', padding: '32px 0' }}>
                {search ? 'No notes match' : 'No notes yet — click New Note!'}
              </div>
            )}
            {filtered.map(note => {
              const s = shade(note.color)
              const c = colorOf(note.color)
              const isActive = activeId === note.id
              return (
                <button
                  key={note.id}
                  onClick={() => { setActiveId(note.id); setShowFind(false) }}
                  style={{
                    width: '100%', textAlign: 'left', borderRadius: 12, padding: '10px 12px',
                    border: `2px solid ${isActive ? c.swatch : 'var(--border)'}`,
                    background: isActive ? s.bg : 'var(--surface)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <p style={{ fontSize: 13, fontWeight: 600, color: isActive ? s.text : 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {note.title || <span style={{ color: isActive ? s.text + '80' : 'var(--text-muted)', fontStyle: 'italic' }}>Untitled</span>}
                  </p>
                  <p style={{ fontSize: 12, color: isActive ? s.text + 'aa' : 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {note.content || <span style={{ fontStyle: 'italic' }}>Empty</span>}
                  </p>
                  <p style={{ fontSize: 11, color: isActive ? s.text + '80' : 'var(--text-muted)', marginTop: 4 }}>{timeAgo(note.updatedAt)}</p>
                </button>
              )
            })}
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', flexShrink: 0 }}>
            {notes.length} note{notes.length !== 1 ? 's' : ''} · saved locally
          </div>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {!active ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, gap: 12,
            }}>
              <span style={{ fontSize: 40 }}>📝</span>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Create a note to start writing</p>
              <button onClick={addNote} className="btn-primary">New Note</button>
            </div>
          ) : (
            <div className="notes-editor" style={{
              flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
              position: 'relative',
              background: ac.bg,
              border: `1.5px solid ${ac.border}`,
              borderRadius: 12,
              overflow: 'hidden',
              ['--note-ink' as string]: ac.text,
              ['--note-bg' as string]: ac.bg,
              ['--note-border' as string]: ac.border,
            } as React.CSSProperties}>
              {/* Toolbar */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 14px', flexShrink: 0, gap: 12,
                borderBottom: `1px solid ${ac.border}`,
                background: ac.bg,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {COLORS.map(c => {
                    const s = dark ? c.dark : c.light
                    const sel = active.color === c.name
                    return (
                      <span
                        key={c.name}
                        role="button"
                        tabIndex={0}
                        onClick={() => update(active.id, { color: c.name })}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); update(active.id, { color: c.name }) } }}
                        title={c.name}
                        aria-label={`${c.name} colour`}
                        style={{
                          display: 'inline-block',
                          width: 18, height: 18, borderRadius: '50%',
                          background: s.bg,
                          border: `2px solid ${sel ? c.swatch : s.border}`,
                          cursor: 'pointer',
                          outline: sel ? `2px solid ${c.swatch}` : 'none',
                          outlineOffset: 1,
                          transform: sel ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.15s',
                        }}
                      />
                    )
                  })}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconBtn
                    label={showFind ? 'Hide search (Cmd+F)' : 'Find in note (Cmd+F)'}
                    active={showFind}
                    color={ac.text}
                    swatch={colorOf(active.color).swatch}
                    onClick={() => {
                      setShowFind(prev => {
                        const next = !prev
                        if (next) setTimeout(() => { findRef.current?.focus(); findRef.current?.select() }, 0)
                        else contentRef.current?.focus()
                        return next
                      })
                    }}
                  >
                    <Search size={14} />
                  </IconBtn>
                  <IconBtn label={copiedNote ? 'Copied' : 'Copy text'} color={ac.text} swatch={colorOf(active.color).swatch}
                    onClick={() => copyNote(active.content)}>{copiedNote ? <CheckIcon /> : <CopyIcon />}</IconBtn>
                  <IconBtn label="Download .txt" color={ac.text} swatch={colorOf(active.color).swatch}
                    onClick={() => downloadNote(active)}><DownloadIcon /></IconBtn>
                  {confirmDelete === active.id ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: ac.text }}>
                      <span>Delete?</span>
                      <span role="button" tabIndex={0} onClick={() => deleteNote(active.id)}
                        onKeyDown={e => { if (e.key === 'Enter') deleteNote(active.id) }}
                        style={{ color: '#fff', background: 'oklch(0.60 0.18 25)', borderRadius: 5, cursor: 'pointer', padding: '4px 9px', fontSize: 12, fontWeight: 700 }}>Yes</span>
                      <span role="button" tabIndex={0} onClick={() => setConfirmDelete(null)}
                        onKeyDown={e => { if (e.key === 'Enter') setConfirmDelete(null) }}
                        style={{ color: ac.text, opacity: 0.7, cursor: 'pointer', padding: '4px 6px', fontSize: 12 }}>No</span>
                    </span>
                  ) : (
                    <IconBtn label="Delete note" color={ac.text} swatch="oklch(0.60 0.18 25)" danger
                      onClick={() => setConfirmDelete(active.id)}><TrashIcon /></IconBtn>
                  )}
                </div>
              </div>

              {/* Title */}
              <input
                ref={titleRef}
                type="text"
                className="notes-title"
                value={active.title}
                onChange={e => update(active.id, { title: e.target.value })}
                placeholder="Untitled"
                style={{ width: '100%', outline: 'none', flexShrink: 0, boxSizing: 'border-box' }}
              />

              {/* Content */}
              <textarea
                ref={contentRef}
                className="notes-content"
                value={active.content}
                onChange={e => update(active.id, { content: e.target.value })}
                onKeyDown={e => {
                  if (showFind && findText && e.key === 'Enter') {
                    const ta = e.currentTarget
                    if (active.content.slice(ta.selectionStart, ta.selectionEnd) === findText) {
                      e.preventDefault()
                      if (e.shiftKey) findPrev(); else findNext()
                    }
                  }
                }}
                placeholder="Start writing…"
                style={{ width: '100%', outline: 'none', boxSizing: 'border-box' }}
                spellCheck
              />

              {/* Floating Find & Replace Widget */}
              {showFind && (
                <div style={{
                  position: 'absolute',
                  top: 50,
                  right: 16,
                  zIndex: 30,
                  background: ac.bg,
                  border: `1.5px solid ${ac.border}`,
                  borderRadius: 10,
                  boxShadow: dark
                    ? '0 12px 32px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.3)'
                    : '0 12px 32px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.06)',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  maxWidth: 'calc(100% - 32px)',
                  minWidth: 320,
                  color: ac.text,
                  transition: 'all 0.15s ease',
                }}>
                  {/* Find Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <SearchInput
                      ref={findRef}
                      autoFocus
                      placeholder="Find in note…"
                      value={findText}
                      onChange={setFindText}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.shiftKey ? findPrev() : findNext()
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          setShowFind(false)
                          contentRef.current?.focus()
                        }
                      }}
                      badge={findText ? (
                        <span style={{
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          color: ac.text,
                          opacity: matchCount > 0 ? 0.75 : 0.4,
                          padding: '0 4px',
                          userSelect: 'none',
                          whiteSpace: 'nowrap',
                        }}>
                          {matchCount > 0 ? `${matchIdx + 1}/${matchCount}` : '0/0'}
                        </span>
                      ) : null}
                      containerStyle={{
                        flex: 1,
                        background: dark ? 'rgba(0, 0, 0, 0.28)' : 'rgba(255, 255, 255, 0.65)',
                        borderColor: ac.border,
                        color: ac.text,
                      }}
                      style={{ color: ac.text }}
                    />

                    <span
                      role="button"
                      tabIndex={0}
                      title="Previous match (Shift+Enter)"
                      onClick={findPrev}
                      className="notes-find-icon-btn"
                      style={{ color: ac.text }}
                    >
                      <ChevronUp size={14} />
                    </span>

                    <span
                      role="button"
                      tabIndex={0}
                      title="Next match (Enter)"
                      onClick={findNext}
                      className="notes-find-icon-btn"
                      style={{ color: ac.text }}
                    >
                      <ChevronDown size={14} />
                    </span>

                    <span
                      role="button"
                      tabIndex={0}
                      title={showReplace ? 'Hide Replace' : 'Toggle Replace (Cmd+H)'}
                      onClick={() => setShowReplace(v => !v)}
                      className={`notes-find-icon-btn ${showReplace ? 'active' : ''}`}
                      style={{ color: ac.text }}
                    >
                      <Replace size={13} />
                    </span>

                    <span
                      role="button"
                      tabIndex={0}
                      title="Close (Escape or Cmd+F)"
                      onClick={() => { setShowFind(false); contentRef.current?.focus() }}
                      className="notes-find-icon-btn"
                      style={{ color: ac.text }}
                    >
                      <X size={14} />
                    </span>
                  </div>

                  {/* Replace Row */}
                  {showReplace && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 2 }}>
                      <input
                        className="notes-find-input input-bare"
                        placeholder="Replace with…"
                        value={replaceText}
                        onChange={e => setReplaceText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            replaceAll()
                          }
                        }}
                        style={{
                          flex: 1,
                          background: dark ? 'rgba(0, 0, 0, 0.28)' : 'rgba(255, 255, 255, 0.65)',
                          borderColor: ac.border,
                          border: `1px solid ${ac.border}`,
                          borderRadius: 6,
                          padding: '5px 8px',
                          color: ac.text,
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={replaceOne}
                        disabled={!findText || matchCount === 0}
                        className="notes-find-action-btn"
                        title="Replace current match"
                        style={{
                          background: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                          borderColor: ac.border,
                          color: ac.text,
                        }}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={replaceAll}
                        disabled={!findText || matchCount === 0}
                        className="notes-find-action-btn"
                        title="Replace all occurrences"
                        style={{
                          background: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                          borderColor: ac.border,
                          color: ac.text,
                        }}
                      >
                        Replace All
                      </button>
                    </div>
                  )}
                </div>
              )}


              {/* Footer */}
              <div style={{
                padding: '8px 16px', flexShrink: 0,
                borderTop: `1px solid ${ac.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                background: ac.bg,
              }}>
                <span style={{ fontSize: 12, color: ac.text + '80' }}>
                  Created {new Date(active.createdAt).toLocaleDateString()}
                </span>
                <span style={{ fontSize: 12, color: ac.text + 'aa', display: 'flex', gap: 14 }}>
                  <span>{active.content.trim() ? active.content.trim().split(/\s+/).length : 0} words</span>
                  <span>{active.content.length} chars</span>
                  <span>Updated {timeAgo(active.updatedAt)}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  )
}

// Small, framed icon control that inherits the note's ink colour. Rendered as a
// span (not a <button>) so the global sketch button chrome — hard 2px border and
// offset shadow — can't override it; that chrome was the "delete/copy look bad".
function IconBtn({ children, label, onClick, color, swatch, active, danger }: {
  children: React.ReactNode; label: string; onClick: () => void
  color: string; swatch: string; active?: boolean; danger?: boolean
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      title={label}
      aria-label={label}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, borderRadius: 7,
        background: active ? swatch + '22' : 'transparent',
        border: `1.5px solid ${active ? swatch : color + '33'}`,
        color: danger ? swatch : color,
        cursor: 'pointer',
        opacity: active ? 1 : 0.8, transition: 'all 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = (danger ? swatch : color) + '18' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = active ? '1' : '0.8'; e.currentTarget.style.background = active ? swatch + '22' : 'transparent' }}
    >
      {children}
    </span>
  )
}
