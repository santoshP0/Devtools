import { useState, useRef, useEffect, useMemo, useDeferredValue } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import ToolLayout from '../components/ToolLayout'
import SearchInput from '../components/SearchInput'
import { useClipboardCopy } from '../hooks/useClipboardCopy'
import { useNativeDrop } from '../hooks/useNativeDrop'
import { saveFile } from '../lib/saveFile'
import { useToast } from '../components/Toast'
import { isTextFile } from '../lib/fileValidation'
import { findLiteralMatches, replaceAllLiteral } from '../lib/textSearch'
import { loadNotesSnapshot, saveNotesEmergency, saveNotesSnapshot } from '../lib/notesStorage'
import {
  Check, ChevronDown, ChevronUp, Copy, Download, NotebookPen,
  Plus, Replace, Search, Trash2, X,
} from 'lucide-react'
import './Notes.css'

interface Note {
  id: string
  title: string
  content: string
  color: string
  createdAt: number
  updatedAt: number
}

interface NoteColor { name: string; swatch: string }

const COLORS: NoteColor[] = [
  { name: 'default', swatch: '#64748b' },
  { name: 'yellow', swatch: '#d19a16' },
  { name: 'blue', swatch: '#3b82f6' },
  { name: 'green', swatch: '#22a06b' },
  { name: 'pink', swatch: '#db6b97' },
  { name: 'purple', swatch: '#8b6bd8' },
]

const MAX_RENDERED_HIGHLIGHTS = 1500

function newNote(): Note {
  return { id: crypto.randomUUID(), title: '', content: '', color: 'default', createdAt: Date.now(), updatedAt: Date.now() }
}
function isNoteEmpty(note: Pick<Note, 'title' | 'content'>) {
  return !note.title.trim() && !note.content.trim()
}
function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [storageReady, setStorageReady] = useState(false)
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saved')
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showFind, setShowFind] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const { copied: copiedNote, copy: copyNote } = useClipboardCopy(2000)
  const { show } = useToast()
  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const findRef = useRef<HTMLInputElement>(null)
  const notesRef = useRef(notes)
  const saveRevisionRef = useRef(0)

  const active = useMemo(() => notes.find(n => n.id === activeId) ?? null, [notes, activeId])

  // Async startup keeps a large notebook from blocking the desktop app's first
  // paint. The loader also migrates data from the previous localStorage format.
  useEffect(() => {
    let disposed = false
    loadNotesSnapshot<Note>().then(stored => {
      if (disposed) return
      const initial = stored.length > 0 ? stored : [newNote()]
      notesRef.current = initial
      setNotes(initial)
      setActiveId(initial[0].id)
      setStorageReady(true)
    })
    return () => { disposed = true }
  }, [])

  // Persistence runs after typing pauses. IndexedDB is asynchronous, and its
  // write queue preserves edit order even if the device is temporarily busy.
  useEffect(() => {
    notesRef.current = notes
    if (!storageReady) return
    setSaveState('saving')
    const revision = ++saveRevisionRef.current
    const timer = window.setTimeout(() => {
      saveNotesSnapshot(notesRef.current)
        .then(() => {
          if (saveRevisionRef.current === revision) setSaveState('saved')
        })
        .catch(() => {
          if (saveRevisionRef.current === revision) setSaveState('error')
        })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [notes, storageReady])

  // Normal navigation gets an async flush. pagehide gets a last-chance fallback
  // because desktop webviews may cancel outstanding work as the window closes.
  useEffect(() => {
    const emergencySave = () => {
      if (notesRef.current.length > 0) saveNotesEmergency(notesRef.current)
    }
    window.addEventListener('pagehide', emergencySave)
    return () => {
      window.removeEventListener('pagehide', emergencySave)
      if (notesRef.current.length > 0) void saveNotesSnapshot(notesRef.current)
    }
  }, [])

  // Always keep an open note to write in, and keep activeId pointing at a note
  // that still exists — covers first mount, deletes, and emptying the list.
  useEffect(() => {
    if (!storageReady) return
    if (notes.length === 0) {
      const note = newNote()
      setNotes([note]); setActiveId(note.id)
    } else if (!activeId || !notes.some(n => n.id === activeId)) {
      setActiveId(notes[0].id)
    }
  }, [notes, activeId, storageReady])

  // Focus the title on first mount so you can just start typing.
  useEffect(() => {
    if (!storageReady) return
    const t = setTimeout(() => titleRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [storageReady])

  // Cmd/Ctrl+F always opens/focuses find. Escape is the predictable way out;
  // repeated Cmd/Ctrl+F should never unexpectedly close the search UI.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const replaceShortcut = (e.ctrlKey && !e.metaKey && key === 'h') || (e.metaKey && e.altKey && key === 'f')
      if (replaceShortcut) {
        e.preventDefault()
        setShowFind(true)
        setShowReplace(true)
        setTimeout(() => { findRef.current?.focus(); findRef.current?.select() }, 0)
      } else if ((e.metaKey || e.ctrlKey) && key === 'f') {
        e.preventDefault()
        setShowFind(true)
        setTimeout(() => { findRef.current?.focus(); findRef.current?.select() }, 0)
      } else if (e.key === 'Escape' && showFind) {
        e.preventDefault()
        setShowFind(false)
        contentRef.current?.focus()
      } else if (e.key === 'Escape' && confirmDelete) {
        e.preventDefault()
        setConfirmDelete(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showFind, confirmDelete])

  const syncHighlightScroll = (textarea: HTMLTextAreaElement) => {
    if (!highlightRef.current) return
    highlightRef.current.scrollTop = textarea.scrollTop
    highlightRef.current.scrollLeft = textarea.scrollLeft
  }

  // The textarea stays native for editing and keyboard behavior. Search adds a
  // background-only mirror, so matches are visible without duplicating glyphs.
  const selectMatch = (index: number, restoreFocus?: HTMLElement) => {
    const ta = contentRef.current
    if (!active || !findText || !ta || matches.length === 0) return
    const normalizedIndex = (index + matches.length) % matches.length
    const target = matches[normalizedIndex]
    setMatchIdx(normalizedIndex)
    if (!restoreFocus) ta.focus({ preventScroll: true })
    ta.setSelectionRange(target, target + findText.length)
    const line = active.content.slice(0, target).split('\n').length - 1
    const lineHeight = Number.parseFloat(getComputedStyle(ta).lineHeight) || 24
    ta.scrollTop = Math.max(0, line * lineHeight - ta.clientHeight / 2)
    syncHighlightScroll(ta)
    // Enter in the find field should navigate without handing typing to the
    // selected note text (which would replace the match on the next keypress).
    restoreFocus?.focus({ preventScroll: true })
  }
  const findNext = (restoreFocus?: HTMLElement) => selectMatch(matchIdx >= 0 ? matchIdx + 1 : 0, restoreFocus)
  const findPrev = (restoreFocus?: HTMLElement) => selectMatch(matchIdx >= 0 ? matchIdx - 1 : matches.length - 1, restoreFocus)

  // Every mutation is a functional update, so it acts on the latest state and can
  // never be clobbered by a concurrent change (typing while creating/deleting).
  const update = (id: string, patch: Partial<Note>) => {
    setNotes(prev => {
      const index = prev.findIndex(note => note.id === id)
      if (index < 0) return prev
      const next = prev.slice()
      next[index] = { ...prev[index], ...patch, updatedAt: Date.now() }
      return next
    })
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
    const invalid = items.filter(i => !isTextFile(i.file))
    if (invalid.length > 0 && invalid.length === items.length) {
      show(`Cannot open binary file (${invalid[0].file.name}) — Notes only supports text and markdown files.`)
      return
    }
    const files = items.filter(i => isTextFile(i.file) && /\.(md|markdown|txt)$/i.test(i.file.name))
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

  // ── find & replace, scoped to the active note with case-insensitive matching ──
  const matches = useMemo(() => {
    // A closed find bar must do zero search work while the user is typing.
    if (!showFind || !active || !findText) return []
    return findLiteralMatches(active.content, findText)
  }, [showFind, active?.id, active?.content, findText])

  const matchCount = matches.length
  const [matchIdx, setMatchIdx] = useState(-1)
  const displayedMatchIdx = matchCount > 0 ? Math.min(Math.max(matchIdx, 0), matchCount - 1) : -1

  useEffect(() => {
    setMatchIdx(matches.length > 0 ? 0 : -1)
    if (matches.length === 0) return

    // Reveal the first result immediately; the user should not have to press
    // Enter once just to discover where the initial match is.
    const frame = window.requestAnimationFrame(() => {
      if (findRef.current) selectMatch(0, findRef.current)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [active?.id, findText])

  useEffect(() => {
    if (matches.length === 0) setMatchIdx(-1)
    else if (matchIdx >= matches.length) setMatchIdx(matches.length - 1)
  }, [matches.length, matchIdx])

  const highlightedContent = useMemo(() => {
    if (!active || !findText || matches.length === 0) return null

    // Keep pathological one-character searches from creating tens of thousands
    // of DOM nodes. The current result is always included even beyond the cap.
    const renderedMatches = matches.length <= MAX_RENDERED_HIGHLIGHTS
      ? matches
      : Array.from(new Set([
          ...matches.slice(0, MAX_RENDERED_HIGHLIGHTS - 1),
          matches[matchIdx] ?? matches[0],
        ])).sort((a, b) => a - b)

    const parts: React.ReactNode[] = []
    let cursor = 0
    const currentOffset = matches[displayedMatchIdx]
    for (const offset of renderedMatches) {
      if (offset > cursor) parts.push(active.content.slice(cursor, offset))
      parts.push(
        <mark
          key={offset}
          className={offset === currentOffset ? 'is-current' : undefined}
        >
          {active.content.slice(offset, offset + findText.length)}
        </mark>,
      )
      cursor = offset + findText.length
    }
    if (cursor < active.content.length) parts.push(active.content.slice(cursor))
    parts.push(<span key="mirror-end">&#8203;</span>)
    return parts
  }, [active?.content, findText, matches, displayedMatchIdx])

  const replaceAll = () => {
    if (!active || !findText || matches.length === 0) return
    update(active.id, { content: replaceAllLiteral(active.content, findText, replaceText) })
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
    setMatchIdx(Math.min(Math.max(0, matchIdx), Math.max(0, matches.length - 2)))
  }

  const deferredSearch = useDeferredValue(search)
  const deferredNotes = useDeferredValue(notes)
  // Word counting is display-only and can follow urgent typing by a render.
  // Character count remains instant because string.length is constant-time.
  const deferredStatsContent = useDeferredValue(active?.content ?? '')
  const wordCount = useMemo(() => {
    const text = deferredStatsContent.trim()
    return text ? text.split(/\s+/).length : 0
  }, [deferredStatsContent])
  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLocaleLowerCase()
    return deferredNotes.filter(n => !q || n.title.toLocaleLowerCase().includes(q) || n.content.toLocaleLowerCase().includes(q))
  }, [deferredNotes, deferredSearch])

  return (
    <ToolLayout title="Notes" description="Write and save notes right in your browser. Stored locally — never uploaded anywhere." hideDescription fullWidth>
      <motion.div
        className="notebook-shell"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
      >
        <aside className="notebook-sidebar" aria-label="Notes list">
          <div className="notebook-sidebar-header">
            <div className="notebook-brand">
              <span className="notebook-brand-icon"><NotebookPen size={19} /></span>
              <div>
                <span className="notebook-eyebrow">Local notebook</span>
                <strong>My notes</strong>
              </div>
            </div>
            <motion.button
              type="button"
              className="notebook-new-button btn-icon"
              onClick={addNote}
              whileTap={{ scale: 0.94 }}
              title="New note"
              aria-label="New note"
            >
              <Plus size={16} />
            </motion.button>
          </div>

          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search your notes"
            aria-label="Search notes"
            containerClassName="notebook-list-search"
          />

          <div className="notebook-list">
            {filtered.map(note => {
                const noteColor = colorOf(note.color)
                const isActive = activeId === note.id
                return (
                  <button
                    key={note.id}
                    type="button"
                    className={`notebook-list-item btn-icon ${isActive ? 'is-active' : ''}`}
                    onClick={() => { setActiveId(note.id); setShowFind(false); setConfirmDelete(null) }}
                    aria-pressed={isActive}
                    style={{
                      ['--list-accent' as string]: noteColor.swatch,
                    } as React.CSSProperties}
                  >
                    <span className="notebook-list-marker" />
                    <span className="notebook-list-copy">
                      <strong>{note.title.trim() || 'Untitled note'}</strong>
                      <span>{note.content.trim() || 'No text yet'}</span>
                    </span>
                    <time>{isNoteEmpty(note) ? 'New' : timeAgo(note.updatedAt)}</time>
                  </button>
                )
              })}

            {filtered.length === 0 && (
              <div className="notebook-empty-list">
                <Search size={20} />
                <span>No notes found</span>
                <small>Try a different search.</small>
              </div>
            )}
          </div>

          <div className="notebook-sidebar-footer">
            <span>{notes.length} note{notes.length === 1 ? '' : 's'}</span>
            <span className={`notebook-saved-status is-${saveState}`}>
              <i /> {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : 'Saved locally'}
            </span>
          </div>
        </aside>

        <main className="notebook-main">
          {!storageReady ? (
            <div className="notebook-empty-editor notebook-loading-editor" aria-label="Loading notes">
              <NotebookPen size={30} />
              <strong>Opening notebook…</strong>
            </div>
          ) : !active ? (
            <div className="notebook-empty-editor">
              <NotebookPen size={34} />
              <strong>Your notebook is empty</strong>
              <span>Create a note and start writing.</span>
              <button type="button" onClick={addNote} className="notebook-empty-action btn-icon">
                <Plus size={16} /> New note
              </button>
            </div>
          ) : (
            <section
              className="notebook-editor"
              style={{
                ['--note-accent' as string]: colorOf(active.color).swatch,
              } as React.CSSProperties}
            >
              <header className={`notebook-toolbar ${showFind ? 'has-find' : ''}`}>
                <div className="notebook-document-state">
                  <span className="notebook-document-dot" />
                  <span>{isNoteEmpty(active) ? 'New note' : `Edited ${timeAgo(active.updatedAt)}`}</span>
                </div>

                <AnimatePresence initial={false}>
                  {showFind && (
                    <motion.div
                      className="notebook-findbar"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.14, ease: 'easeOut' }}
                    >
                      <div className="notebook-search-inner">
                        <div className="notebook-search-row">
                          <SearchInput
                            ref={findRef}
                            autoFocus
                            size="small"
                            placeholder="Find in this note"
                            aria-label="Find in note"
                            value={findText}
                            onChange={setFindText}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                e.shiftKey ? findPrev(e.currentTarget) : findNext(e.currentTarget)
                              } else if (e.key === 'Escape') {
                                e.preventDefault()
                                setShowFind(false)
                                contentRef.current?.focus()
                              }
                            }}
                            badge={findText ? (
                              <span className={`notebook-match-count ${matchCount === 0 ? 'is-empty' : ''}`} aria-live="polite">
                                {matchCount > 0 ? `${displayedMatchIdx + 1} / ${matchCount}` : 'No matches'}
                              </span>
                            ) : null}
                            containerClassName="notebook-find-field"
                          />
                          <div className="notebook-search-actions">
                            <NoteAction label="Previous match" disabled={matchCount === 0} onClick={() => findPrev()}><ChevronUp size={16} /></NoteAction>
                            <NoteAction label="Next match" disabled={matchCount === 0} onClick={() => findNext()}><ChevronDown size={16} /></NoteAction>
                            <NoteAction label={showReplace ? 'Hide replace' : 'Show replace'} active={showReplace} onClick={() => setShowReplace(v => !v)}><Replace size={15} /></NoteAction>
                            <NoteAction label="Close search" onClick={() => { setShowFind(false); contentRef.current?.focus() }}><X size={16} /></NoteAction>
                          </div>
                        </div>

                        <AnimatePresence initial={false}>
                          {showReplace && (
                            <motion.div
                              className="notebook-search-row notebook-replace-row"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                            >
                              <SearchInput
                                size="small"
                                icon={<Replace size={14} />}
                                placeholder="Replace with"
                                aria-label="Replace with"
                                value={replaceText}
                                onChange={setReplaceText}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    replaceOne()
                                  }
                                }}
                                containerClassName="notebook-find-field"
                              />
                              <div className="notebook-replace-actions">
                                <button type="button" className="notebook-replace-button btn-icon" disabled={matchCount === 0} onClick={replaceOne}>Replace</button>
                                <button type="button" className="notebook-replace-button btn-icon" disabled={matchCount === 0} onClick={replaceAll}>All</button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="notebook-actions">
                  {!showFind && (
                    <NoteAction
                      label="Find in note"
                      onClick={() => {
                        setShowFind(true)
                        setTimeout(() => { findRef.current?.focus(); findRef.current?.select() }, 0)
                      }}
                    >
                      <Search size={16} />
                    </NoteAction>
                  )}
                  <NoteAction label={copiedNote ? 'Copied' : 'Copy note'} onClick={() => copyNote(active.content)}>
                    {copiedNote ? <Check size={16} /> : <Copy size={16} />}
                  </NoteAction>
                  <NoteAction label="Download note" onClick={() => downloadNote(active)}>
                    <Download size={16} />
                  </NoteAction>

                  <span className="notebook-action-divider" />

                  <NoteAction
                    label="Delete note"
                    danger
                    active={confirmDelete === active.id}
                    onClick={() => setConfirmDelete(active.id)}
                  >
                    <Trash2 size={16} />
                  </NoteAction>
                </div>
              </header>

              <AnimatePresence initial={false}>
                {confirmDelete === active.id && (
                  <motion.div
                    className="notebook-delete-popover"
                    role="dialog"
                    aria-label="Delete note confirmation"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.14, ease: 'easeOut' }}
                  >
                    <span className="notebook-delete-icon"><Trash2 size={17} /></span>
                    <div className="notebook-delete-copy">
                      <strong>Delete this note?</strong>
                      <span>This action cannot be undone.</span>
                    </div>
                    <div className="notebook-delete-actions">
                      <button type="button" className="notebook-delete-cancel btn-icon" onClick={() => setConfirmDelete(null)}>Cancel</button>
                      <button type="button" className="notebook-delete-submit btn-icon" onClick={() => deleteNote(active.id)}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="notebook-paper">
                <input
                  ref={titleRef}
                  type="text"
                  className="notebook-title input-bare"
                  value={active.title}
                  onChange={e => update(active.id, { title: e.target.value })}
                  placeholder="Untitled note"
                  aria-label="Note title"
                />
                <div className="notebook-content-wrap">
                  {highlightedContent && (
                    <div ref={highlightRef} className="notebook-content-highlights" aria-hidden="true">
                      {highlightedContent}
                    </div>
                  )}
                  <textarea
                    ref={contentRef}
                    className="notebook-content"
                    value={active.content}
                    onChange={e => update(active.id, { content: e.target.value })}
                    onScroll={e => syncHighlightScroll(e.currentTarget)}
                    onKeyDown={e => {
                      if (!showFind || !findText) return
                      if (e.key === 'F3' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g')) {
                        e.preventDefault()
                        e.shiftKey ? findPrev() : findNext()
                      }
                    }}
                    placeholder="Start writing…"
                    aria-label="Note content"
                    spellCheck
                  />
                </div>
              </div>

              <footer className="notebook-statusbar">
                <span>Created {new Date(active.createdAt).toLocaleDateString()}</span>
                <div>
                  <span>{wordCount} words</span>
                  <span>{active.content.length} characters</span>
                  <span>{isNoteEmpty(active) ? 'Not edited yet' : `Edited ${timeAgo(active.updatedAt)}`}</span>
                </div>
              </footer>
            </section>
          )}
        </main>
      </motion.div>
    </ToolLayout>
  )
}

function NoteAction({ children, label, onClick, active, danger, disabled }: {
  children: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <motion.button
      type="button"
      className={`notebook-action btn-icon ${active ? 'is-active' : ''} ${danger ? 'is-danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active || undefined}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {children}
    </motion.button>
  )
}
