import { useRef, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ToolCard from '../components/ToolCard'
import ToolIcon from '../components/ToolIcon'
import { tools, categories } from '../lib/tools'
import { useFavorites } from '../lib/storage'
import { useSettings } from '../lib/settings'

const ALL_CATS = categories

// lucide line icons — match the app's line-icon theme (inherit currentColor)
const CAT_ICONS: Record<string, string> = {
  All:       'LayoutGrid',
  API:       'Zap',
  Data:      'Database',
  Security:  'ShieldCheck',
  Generator: 'WandSparkles',
  Text:      'Type',
  Design:    'Palette',
  Media:     'Image',
  Utils:     'Wrench',
  Frontend:  'AppWindow',
  Backend:   'Server',
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
  const [searchFocused, setSearchFocused] = useState(false)
  const { favorites, toggleFavorite } = useFavorites()
  const { settings } = useSettings()

  // Starred tools, in the order they appear in the toolbox (stable, not by
  // when they were starred) so the rail doesn't reshuffle on every toggle.
  const favTools = useMemo(
    () => tools.filter(t => favorites.includes(t.slug)),
    [favorites],
  )

  const catCounts = useMemo(() => {
    const c: Record<string, number> = { All: tools.length }
    tools.forEach(t => { c[t.category] = (c[t.category] || 0) + 1 })
    return c
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return tools.filter(t => {
      const matchQ = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.keywords?.some(k => k.includes(q))
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
        padding: '40px 24px 80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: "'Architects Daughter', var(--font-sans)",
      }}
    >
      <div style={{ width: '100%', maxWidth: 1200 }}>

        {/* Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            width: '100%', maxWidth: 800,
            borderRadius: 4, border: '2px solid var(--sketch-text)',
            boxShadow: searchFocused ? '4px 4px 0px var(--sketch-text)' : '3px 3px 0px var(--sketch-text)',
            background: 'var(--surface)',
            transform: searchFocused ? 'translate(-1px, -1px)' : 'none',
            transition: 'all 0.15s ease-out',
            overflow: 'hidden',
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'0 0 0 14px', flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke={searchFocused ? 'var(--sketch-text)' : 'var(--text-muted)'}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: 'stroke 0.15s' }}>
                <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
              </svg>
            </div>
            <input
              ref={searchRef}
              className="input-bare"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="search the toolbox..."
              style={{
                flex: 1, minWidth: 0,
                padding: '12px 12px',
                fontSize: 18,
                color: 'var(--sketch-text)',
                fontFamily: "'Architects Daughter', var(--font-sans)",
              }}
            />
            {search && (
              <button className="btn-icon" onClick={() => { setSearch(''); searchRef.current?.focus() }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, flexShrink: 0, marginRight: 6,
                color: 'var(--text-muted)', borderRadius: 4,
              }} aria-label="Clear search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
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
                <ToolIcon name={CAT_ICONS[cat]} size={16} />
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

        {/* Favourites rail + tools grid (rail is opt-out via Settings) */}
        <div className="home-layout">
          {settings.favoritesQuickAccess && (
            <aside className="fav-rail">
              <FavoritesPanel favTools={favTools} onRemove={toggleFavorite} />
            </aside>
          )}

          <div className="home-main">
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
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 20,
              }}>
                {filtered.map((tool, i) => (
                  <ToolCard key={tool.slug} tool={tool} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// Quick-access rail of starred tools. Star a tool on its card and it lands here
// so the ones you actually use aren't buried in the full grid.
function FavoritesPanel({ favTools, onRemove }: { favTools: typeof tools; onRemove: (slug: string) => void }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '2px solid var(--sketch-text)',
      boxShadow: '4px 4px 0px var(--sketch-text)',
      borderRadius: 4,
      padding: '16px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>★</span>
        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Architects Daughter', var(--font-sans)" }}>favourites</span>
        {favTools.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)', opacity: 0.7, border: '1px solid var(--sketch-text)', borderRadius: 3, padding: '1px 5px' }}>
            {favTools.length}
          </span>
        )}
      </div>

      {favTools.length === 0 ? (
        <p style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.7, margin: 0, fontFamily: 'var(--font-sans)' }}>
          Tap the ★ on any tool to pin it here for one-click access.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {favTools.map(tool => (
            <div key={tool.slug} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Link
                to={`/${tool.slug}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0,
                  padding: '7px 8px', borderRadius: 4,
                  color: 'var(--sketch-text)', textDecoration: 'none',
                  fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ToolIcon name={tool.icon} size={16} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tool.name}</span>
              </Link>
              <span
                role="button"
                tabIndex={0}
                onClick={() => onRemove(tool.slug)}
                onKeyDown={e => { if (e.key === 'Enter') onRemove(tool.slug) }}
                title="Remove from favourites"
                aria-label={`Remove ${tool.name} from favourites`}
                style={{
                  flexShrink: 0, cursor: 'pointer', fontSize: 13, lineHeight: 1,
                  opacity: 0.5, padding: '4px 6px', borderRadius: 4,
                  color: 'var(--sketch-text)',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
              >
                ✕
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
