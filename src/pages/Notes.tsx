import { useState, useEffect, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'

interface Note {
  id: string
  title: string
  content: string
  color: string
  createdAt: number
  updatedAt: number
}

const COLORS = [
  { name: 'white', bg: 'bg-white', border: 'border-slate-200', active: 'ring-slate-400' },
  { name: 'yellow', bg: 'bg-yellow-50', border: 'border-yellow-200', active: 'ring-yellow-400' },
  { name: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', active: 'ring-blue-400' },
  { name: 'green', bg: 'bg-green-50', border: 'border-green-200', active: 'ring-green-400' },
  { name: 'pink', bg: 'bg-pink-50', border: 'border-pink-200', active: 'ring-pink-400' },
  { name: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', active: 'ring-purple-400' },
]

const STORAGE_KEY = 'devtoolbox-notes'

function loadNotes(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

function newNote(): Note {
  return {
    id: crypto.randomUUID(),
    title: '',
    content: '',
    color: 'white',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>()
  const contentRef = useRef<HTMLTextAreaElement>(null)

  const active = notes.find(n => n.id === activeId) ?? null

  useEffect(() => {
    saveNotes(notes)
  }, [notes])

  const update = (id: string, patch: Partial<Note>) => {
    clearTimeout(saveTimeout.current)
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n))
  }

  const addNote = () => {
    const note = newNote()
    setNotes(prev => [note, ...prev])
    setActiveId(note.id)
    setTimeout(() => contentRef.current?.focus(), 50)
  }

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    if (activeId === id) setActiveId(null)
    setConfirmDelete(null)
  }

  const filtered = notes.filter(n => {
    const q = search.toLowerCase()
    return !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  })

  const colorOf = (name: string) => COLORS.find(c => c.name === name) ?? COLORS[0]

  return (
    <ToolLayout title="Notes" description="Write and save multiple notes in your browser. Stored locally — never uploaded anywhere.">
      <div className="flex gap-4 h-[600px]">

        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-3">
          <button onClick={addNote} className="btn-primary w-full flex items-center justify-center gap-2">
            <span className="text-lg leading-none">+</span> New Note
          </button>

          <input
            type="search"
            placeholder="Search notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="tool-input"
          />

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filtered.length === 0 && (
              <div className="text-center text-sm text-slate-400 py-8">
                {search ? 'No notes match your search' : 'No notes yet — click New Note!'}
              </div>
            )}
            {filtered.map(note => {
              const c = colorOf(note.color)
              return (
                <button
                  key={note.id}
                  onClick={() => setActiveId(note.id)}
                  className={`w-full text-left rounded-xl border p-3 transition-all ${c.bg} ${c.border} ${activeId === note.id ? `ring-2 ${c.active}` : 'hover:shadow-sm'}`}
                >
                  <p className="font-medium text-sm text-slate-800 truncate">
                    {note.title || <span className="text-slate-400 italic">Untitled</span>}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {note.content || <span className="italic">Empty</span>}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{timeAgo(note.updatedAt)}</p>
                </button>
              )
            })}
          </div>

          <div className="text-xs text-slate-400 text-center">
            {notes.length} note{notes.length !== 1 ? 's' : ''} · saved locally
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0">
          {!active ? (
            <div className="h-full bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-3">
              <span className="text-4xl">📝</span>
              <p className="text-sm">Select a note or create a new one</p>
              <button onClick={addNote} className="btn-primary">New Note</button>
            </div>
          ) : (
            <div className={`h-full rounded-xl border flex flex-col ${colorOf(active.color).bg} ${colorOf(active.color).border}`}>
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-inherit">
                <div className="flex items-center gap-1.5">
                  {COLORS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => update(active.id, { color: c.name })}
                      title={c.name}
                      className={`w-5 h-5 rounded-full border transition-all ${c.bg} ${c.border} ${active.color === c.name ? `ring-2 ring-offset-1 ${c.active}` : 'hover:scale-110'}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{active.content.length} chars</span>
                  <span>Updated {timeAgo(active.updatedAt)}</span>
                  {confirmDelete === active.id ? (
                    <span className="flex items-center gap-2">
                      <span className="text-slate-600">Delete?</span>
                      <button onClick={() => deleteNote(active.id)} className="text-red-600 font-medium hover:text-red-700">Yes</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-slate-500 hover:text-slate-700">No</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDelete(active.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Delete note">
                      🗑
                    </button>
                  )}
                </div>
              </div>

              {/* Title */}
              <input
                type="text"
                value={active.title}
                onChange={e => update(active.id, { title: e.target.value })}
                placeholder="Note title…"
                className="w-full px-4 pt-3 pb-1 text-lg font-semibold text-slate-800 bg-transparent border-none focus:outline-none placeholder:text-slate-300"
              />

              {/* Content */}
              <textarea
                ref={contentRef}
                value={active.content}
                onChange={e => update(active.id, { content: e.target.value })}
                placeholder="Start writing…"
                className="flex-1 w-full px-4 py-2 text-sm text-slate-700 bg-transparent border-none focus:outline-none resize-none placeholder:text-slate-300 leading-relaxed"
                spellCheck
              />

              {/* Footer */}
              <div className="px-4 py-2 border-t border-inherit flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  Created {new Date(active.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(active.content)}
                  className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
                >
                  Copy text
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  )
}
