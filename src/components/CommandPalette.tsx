import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { tools } from '../lib/tools'

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query === '' ? tools.slice(0, 8) : tools.filter(t => 
    t.name.toLowerCase().includes(query.toLowerCase()) || 
    t.category.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  const handleSelect = (slug: string) => {
    navigate(`/${slug}`)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => (i + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      handleSelect(filtered[selectedIndex].slug)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="flex items-center px-4 py-3 border-b border-slate-800">
          <span className="text-slate-500 mr-3">⌕</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder-slate-500 text-sm"
            placeholder="Type a tool name or category..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className="text-[10px] text-slate-600 border border-slate-800 px-1.5 py-0.5 rounded uppercase">Esc</kbd>
        </div>

        <div className="max-h-[320px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">No tools found for "{query}"</div>
          ) : (
            filtered.map((tool, i) => (
              <button
                key={tool.slug}
                onClick={() => handleSelect(tool.slug)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                  i === selectedIndex ? 'bg-accent/10 border-accent/20' : 'hover:bg-slate-800/50'
                }`}
                style={{
                  border: i === selectedIndex ? '1px solid var(--accent-dim)' : '1px solid transparent'
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-[12px] font-mono border border-slate-700">
                    {tool.icon}
                  </span>
                  <div className="text-left">
                    <div className={`text-sm font-medium ${i === selectedIndex ? 'text-accent' : 'text-slate-200'}`}>{tool.name}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">{tool.category}</div>
                  </div>
                </div>
                {i === selectedIndex && <span className="text-[10px] text-accent font-bold uppercase tracking-widest">Enter ↵</span>}
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-600">
          <div className="flex gap-4">
            <span><kbd className="bg-slate-900 px-1 rounded">↑↓</kbd> Navigate</span>
            <span><kbd className="bg-slate-900 px-1 rounded">↵</kbd> Select</span>
          </div>
          <span>DevToolbox Commands</span>
        </div>
      </div>
    </div>
  )
}
