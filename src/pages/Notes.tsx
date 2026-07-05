import { useState, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'
import { useClipboardCopy } from '../hooks/useClipboardCopy'

interface Note {
  id: string
  title: string
  content: string
  color: string
  createdAt: number
  updatedAt: number
}

const COLORS = [
  { name: 'default', swatch: 'oklch(0.25 0.02 250)',  bg: 'oklch(0.97 0.01 250)',  border: 'oklch(0.87 0.02 250)',  text: '#1e1e2e' },
  { name: 'yellow',  swatch: 'oklch(0.78 0.16 90)',   bg: 'oklch(0.97 0.05 95)',   border: 'oklch(0.88 0.08 90)',   text: '#2a1a00' },
  { name: 'blue',    swatch: 'oklch(0.65 0.15 240)',  bg: 'oklch(0.96 0.04 235)',  border: 'oklch(0.86 0.07 235)',  text: '#00102d' },
  { name: 'green',   swatch: 'oklch(0.65 0.16 145)',  bg: 'oklch(0.96 0.05 145)',  border: 'oklch(0.86 0.08 145)',  text: '#001a0a' },
  { name: 'pink',    swatch: 'oklch(0.72 0.14 350)',  bg: 'oklch(0.97 0.04 355)',  border: 'oklch(0.87 0.07 350)',  text: '#2a001a' },
  { name: 'purple',  swatch: 'oklch(0.65 0.18 300)',  bg: 'oklch(0.96 0.04 300)',  border: 'oklch(0.86 0.07 300)',  text: '#1a002d' },
]

const STORAGE_KEY = 'devtoolbox-notes'

function loadNotes(): Note[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
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

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>(() => { const n = loadNotes(); return n })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const { copied: copiedNote, copy: copyNote } = useClipboardCopy(2000)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  const active = notes.find(n => n.id === activeId) ?? null

  const update = (id: string, patch: Partial<Note>) => {
    const updated = notes.map(n => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)
    setNotes(updated)
    saveNotes(updated)
  }

  const addNote = () => {
    const note = newNote()
    const updated = [note, ...notes]
    setNotes(updated)
    saveNotes(updated)
    setActiveId(note.id)
    setTimeout(() => contentRef.current?.focus(), 50)
  }

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    saveNotes(updated)
    if (activeId === id) setActiveId(updated[0]?.id ?? null)
    setConfirmDelete(null)
  }

  const filtered = notes.filter(n => {
    const q = search.toLowerCase()
    return !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  })

  const colorOf = (name: string) => COLORS.find(c => c.name === name) ?? COLORS[0]
  const activeColor = active ? colorOf(active.color) : COLORS[0]

  return (
    <ToolLayout title="Notes" description="Write and save multiple notes in your browser. Stored locally — never uploaded anywhere.">
      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={addNote} className="btn-primary" style={{ width: '100%' }}>+ New Note</button>

          <input
            type="search"
            placeholder="Search notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="tool-input"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', padding: '32px 0' }}>
                {search ? 'No notes match' : 'No notes yet — click New Note!'}
              </div>
            )}
            {filtered.map(note => {
              const c = colorOf(note.color)
              const isActive = activeId === note.id
              return (
                <button
                  key={note.id}
                  onClick={() => setActiveId(note.id)}
                  style={{
                    width: '100%', textAlign: 'left', borderRadius: 12, padding: '10px 12px',
                    border: `2px solid ${isActive ? c.swatch : 'var(--border)'}`,
                    background: isActive ? c.bg : 'var(--surface)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <p style={{ fontSize: 13, fontWeight: 600, color: isActive ? c.text : 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {note.title || <span style={{ color: isActive ? c.text + '80' : 'var(--text-muted)', fontStyle: 'italic' }}>Untitled</span>}
                  </p>
                  <p style={{ fontSize: 12, color: isActive ? c.text + 'aa' : 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {note.content || <span style={{ fontStyle: 'italic' }}>Empty</span>}
                  </p>
                  <p style={{ fontSize: 11, color: isActive ? c.text + '80' : 'var(--text-muted)', marginTop: 4 }}>{timeAgo(note.updatedAt)}</p>
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
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Select a note or create a new one</p>
              <button onClick={addNote} className="btn-primary">New Note</button>
            </div>
          ) : (
            <div style={{
              flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
              background: activeColor.bg,
              border: `1.5px solid ${activeColor.border}`,
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              {/* Toolbar */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 16px', flexShrink: 0,
                borderBottom: `1px solid ${activeColor.border}`,
                background: activeColor.bg,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {COLORS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => update(active.id, { color: c.name })}
                      title={c.name}
                      style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: c.bg,
                        border: `2px solid ${active.color === c.name ? c.swatch : c.border}`,
                        cursor: 'pointer',
                        boxShadow: active.color === c.name ? `0 0 0 2px ${c.swatch}44` : 'none',
                        transform: active.color === c.name ? 'scale(1.2)' : 'scale(1)',
                        transition: 'all 0.15s',
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: activeColor.text + 'aa' }}>
                  <span>{active.content.length} chars</span>
                  <span>Updated {timeAgo(active.updatedAt)}</span>
                  {confirmDelete === active.id ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>Delete?</span>
                      <button onClick={() => deleteNote(active.id)} style={{ color: 'oklch(0.65 0.18 25)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12 }}>Yes</button>
                      <button onClick={() => setConfirmDelete(null)} style={{ color: activeColor.text + 'aa', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12 }}>No</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDelete(active.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 16, opacity: 0.5, transition: 'opacity 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                    >🗑</button>
                  )}
                </div>
              </div>

              {/* Title */}
              <input
                type="text"
                value={active.title}
                onChange={e => update(active.id, { title: e.target.value })}
                placeholder="Note title…"
                style={{
                  width: '100%', padding: '14px 20px 6px',
                  fontSize: 18, fontWeight: 700,
                  color: activeColor.text,
                  background: activeColor.bg,
                  border: 'none', outline: 'none',
                  fontFamily: 'var(--font-sans)',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                }}
              />

              {/* Content */}
              <textarea
                ref={contentRef}
                value={active.content}
                onChange={e => update(active.id, { content: e.target.value })}
                placeholder="Start writing…"
                style={{
                  flex: 1, minHeight: 0,
                  width: '100%', padding: '6px 20px 16px',
                  fontSize: 14, lineHeight: 1.8,
                  color: activeColor.text + 'dd',
                  background: activeColor.bg,
                  border: 'none', outline: 'none', resize: 'none',
                  fontFamily: 'var(--font-sans)',
                  boxSizing: 'border-box',
                }}
                spellCheck
              />

              {/* Footer */}
              <div style={{
                padding: '8px 16px', flexShrink: 0,
                borderTop: `1px solid ${activeColor.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: activeColor.bg,
              }}>
                <span style={{ fontSize: 12, color: activeColor.text + '80' }}>
                  Created {new Date(active.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => copyNote(active.content)}
                  style={{ fontSize: 12, color: activeColor.text + '80', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = activeColor.swatch)}
                  onMouseLeave={e => (e.currentTarget.style.color = activeColor.text + '80')}
                >
                  {copiedNote ? '✓ Copied' : 'Copy text'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  )
}
