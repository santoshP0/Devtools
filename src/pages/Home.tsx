import { useRef, useEffect, useMemo } from 'react'
import ToolCard from '../components/ToolCard'
import { tools, categories } from '../lib/tools'

const ALL_CATS = categories

const CAT_EMOJIS: Record<string, string> = {
  All:       '📦',
  API:       '⚡',
  Data:      '📊',
  Security:  '🔐',
  Generator: '▦',
  Text:      '📝',
  Design:    '🎨',
  Media:     '🔍',
  Utils:     '⚙️',
  Frontend:  '📱',
  Backend:   '🎛️',
}

const CAT_STYLE: Record<string, { color: string; bg: string }> = {
  All:       { color: 'var(--sketch-text)', bg: 'var(--surface)' },
  API:       { color: 'var(--card-api-text)', bg: 'var(--card-api-bg)' },
  Data:      { color: 'var(--card-data-text)', bg: 'var(--card-data-bg)' },
  Security:  { color: 'var(--card-sec-text)', bg: 'var(--card-sec-bg)' },
  Generator: { color: 'var(--card-gen-text)', bg: 'var(--card-gen-bg)' },
  Text:      { color: 'var(--card-txt-text)', bg: 'var(--card-txt-bg)' },
  Design:    { color: 'var(--card-des-text)', bg: 'var(--card-des-bg)' },
  Media:     { color: 'var(--card-med-text)', bg: 'var(--card-med-bg)' },
  Utils:     { color: 'var(--card-utl-text)', bg: 'var(--card-utl-bg)' },
  Frontend:  { color: 'var(--card-front-text)', bg: 'var(--card-front-bg)' },
  Backend:   { color: 'var(--card-back-text)', bg: 'var(--card-back-bg)' },
}

interface Props {
  search: string
  setSearch: (v: string) => void
  activeCat: string
  setActiveCat: (v: string) => void
}

export default function Home({ search, setSearch, activeCat, setActiveCat }: Props) {
  const searchRef = useRef<HTMLInputElement>(null)

  const catCounts = useMemo(() => {
    const c: Record<string, number> = { All: tools.length }
    tools.forEach(t => { c[t.category] = (c[t.category] || 0) + 1 })
    return c
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return tools.filter(t => {
      const matchQ = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      const matchCat = q ? true : (activeCat === 'All' || t.category === activeCat)
      return matchCat && matchQ
    })
  }, [search, activeCat])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div 
      style={{ 
        minHeight: 'calc(100vh - 54px)', 
        marginTop: 54,
        background: 'var(--sketch-bg)',
        backgroundImage: 'radial-gradient(var(--sketch-dot) 1.2px, transparent 1.2px)',
        backgroundSize: '20px 20px',
        color: 'var(--sketch-text)',
        padding: '60px 24px 80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: "'Architects Daughter', var(--font-sans)",
      }}
    >
      <div style={{ width: '100%', maxWidth: 1200 }}>
        
        {/* Header Titles */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: 16, opacity: 0.6, letterSpacing: '0.05em' }}>
            — the whole collection —
          </span>
          <h1 style={{ 
            fontSize: 'clamp(36px, 6vw, 56px)', 
            fontWeight: 700, 
            margin: '8px 0 0 0', 
            letterSpacing: '-0.02em',
            lineHeight: 1.1 
          }}>
            everything on the bench
          </h1>
        </div>

        {/* Centered Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 800 }}>
            <span style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--sketch-text)', fontSize: 20, pointerEvents: 'none',
            }}>⌕</span>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="search the toolbox..."
              style={{
                width: '100%', 
                padding: '12px 16px 12px 48px', 
                fontSize: 18,
                background: 'var(--surface)',
                border: '2px solid var(--sketch-text)',
                boxShadow: '3px 3px 0px var(--sketch-text)',
                borderRadius: 4, 
                color: 'var(--sketch-text)',
                fontFamily: "'Architects Daughter', var(--font-sans)",
                outline: 'none',
                transition: 'all 0.15s ease-out',
              }}
              onFocus={e => {
                e.currentTarget.style.transform = 'translate(-1px, -1px)'
                e.currentTarget.style.boxShadow = '4px 4px 0px var(--sketch-text)'
              }}
              onBlur={e => {
                e.currentTarget.style.transform = 'translate(0, 0)'
                e.currentTarget.style.boxShadow = '3px 3px 0px var(--sketch-text)'
              }}
            />
          </div>
        </div>

        {/* Category Pills Selector */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 12, 
          flexWrap: 'wrap', 
          marginBottom: 36,
          maxWidth: 960,
          margin: '0 auto 40px'
        }}>
          {ALL_CATS.map(cat => {
            const active = activeCat === cat
            const styleInfo = CAT_STYLE[cat] || CAT_STYLE.Utils
            
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCat(cat)
                  setSearch('')
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Architects Daughter', var(--font-sans)",
                  border: '2px solid var(--sketch-text)',
                  background: active ? 'var(--sketch-text)' : 'var(--surface)',
                  color: active ? 'var(--sketch-bg)' : 'var(--sketch-text)',
                  boxShadow: active ? 'none' : '2px 2px 0px var(--sketch-text)',
                  transform: active ? 'translate(2px, 2px)' : 'translate(0, 0)',
                  transition: 'all 0.1s ease-out',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.transform = 'translate(-1px, -1px)'
                    e.currentTarget.style.boxShadow = '3px 3px 0px var(--sketch-text)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.transform = 'translate(0, 0)'
                    e.currentTarget.style.boxShadow = '2px 2px 0px var(--sketch-text)'
                  }
                }}
              >
                <span>{CAT_EMOJIS[cat]}</span>
                <span>{cat}</span>
                <span style={{ 
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  opacity: 0.8,
                  border: `1px solid ${active ? 'var(--sketch-bg)' : 'var(--sketch-text)'}`,
                  padding: '1px 5px',
                  borderRadius: 3,
                  marginLeft: 2,
                }}>
                  {catCounts[cat] ?? 0}
                </span>
              </button>
            )
          })}
        </div>

        {/* Separator Line */}
        <div style={{ 
          borderTop: '2px dashed var(--sketch-text)', 
          opacity: 0.3, 
          margin: '0 auto 32px',
          maxWidth: '100%',
        }} />

        {/* Grid Header / Counter */}
        <div style={{ marginBottom: 24, textAlign: 'left' }}>
          <span style={{ fontSize: 18, opacity: 0.8 }}>
            {search !== '' 
              ? `search matches (${filtered.length}) ↓` 
              : activeCat === 'All' 
                ? `all ${filtered.length} of them ↓` 
                : `${activeCat.toLowerCase()} tools (${filtered.length}) ↓`
            }
          </span>
        </div>

        {/* Unified Undivided Grid of Cards */}
        {filtered.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--sketch-text)', fontSize: 18, opacity: 0.6 }}>
            No tools matched your search "{search}"
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: 20 
          }}>
            {filtered.map((tool, i) => (
              <ToolCard key={tool.slug} tool={tool} index={i} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
