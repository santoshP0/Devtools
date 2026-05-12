import { useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import ToolCard from '../components/ToolCard'
import HeroCanvas from '../components/HeroCanvas'
import { tools, categories } from '../lib/tools'
import { useHistory, useFavorites } from '../lib/storage'

const ALL_CATS = categories

const CAT_STYLE: Record<string, { color: string; bg: string; border: string; activeBg: string }> = {
  All:       { color: 'var(--bg)',       bg: 'var(--accent)',     border: 'var(--accent)',    activeBg: 'var(--accent)'    },
  API:       { color: 'var(--accent)',   bg: 'var(--accent-bg)',  border: 'var(--accent-dim)',activeBg: 'var(--accent-bg)' },
  Data:      { color: 'var(--cat-data)', bg: 'var(--cat-data-bg)',border: 'oklch(0.72 0.15 220 / 0.5)', activeBg: 'var(--cat-data-bg)' },
  Security:  { color: 'var(--cat-sec)',  bg: 'var(--cat-sec-bg)', border: 'oklch(0.72 0.16 25  / 0.5)', activeBg: 'var(--cat-sec-bg)'  },
  Generator: { color: 'var(--cat-gen)',  bg: 'var(--cat-gen-bg)', border: 'oklch(0.72 0.15 145 / 0.5)', activeBg: 'var(--cat-gen-bg)' },
  Text:      { color: 'var(--cat-txt)',  bg: 'var(--cat-txt-bg)', border: 'oklch(0.80 0.14 75  / 0.5)', activeBg: 'var(--cat-txt-bg)'  },
  Design:    { color: 'var(--cat-des)',  bg: 'var(--cat-des-bg)', border: 'oklch(0.72 0.16 300 / 0.5)', activeBg: 'var(--cat-des-bg)' },
  Media:     { color: 'var(--cat-med)',  bg: 'var(--cat-med-bg)', border: 'oklch(0.72 0.16 195 / 0.5)', activeBg: 'var(--cat-med-bg)' },
  Utils:     { color: 'var(--cat-utl)',  bg: 'var(--cat-utl-bg)', border: 'oklch(0.72 0.14 260 / 0.5)', activeBg: 'var(--cat-utl-bg)' },
  Frontend:  { color: 'oklch(0.70 0.18 190)', bg: 'oklch(0.70 0.18 190 / 0.1)', border: 'oklch(0.70 0.18 190 / 0.5)', activeBg: 'oklch(0.70 0.18 190 / 0.1)' },
  Backend:   { color: 'oklch(0.65 0.12 160)', bg: 'oklch(0.65 0.12 160 / 0.1)', border: 'oklch(0.65 0.12 160 / 0.5)', activeBg: 'oklch(0.65 0.12 160 / 0.1)' },
}

interface Props {
  search: string
  setSearch: (v: string) => void
  activeCat: string
  setActiveCat: (v: string) => void
}

export default function Home({ search, setSearch, activeCat, setActiveCat }: Props) {
  const searchRef = useRef<HTMLInputElement>(null)
  const { recent } = useHistory()
  const { favorites } = useFavorites()

  const recentTools = useMemo(() => 
    recent.map(slug => tools.find(t => t.slug === slug)).filter(Boolean),
  [recent])

  const pinnedTools = useMemo(() => 
    tools.filter(t => favorites.includes(t.slug)),
  [favorites])

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
    <div style={{ paddingTop: 54 }}>

      {/* ── Hero ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg, oklch(0.10 0.025 250) 0%, oklch(0.12 0.03 250) 100%)',
        padding: '80px 32px 70px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        borderBottom: '1px solid var(--border)',
      }}>
        <HeroCanvas bgStyle="particles" />

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 600 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--accent-bg)', border: '1px solid var(--accent-dim)',
            borderRadius: 100, padding: '6px 16px', marginBottom: 28,
            fontSize: 13, fontWeight: 500, color: 'var(--accent)',
            fontFamily: 'var(--font-sans)',
            animation: 'fadeUp 0.5s ease both',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--accent)',
              animation: 'pulseRing 2s infinite',
              display: 'inline-block',
            }} />
            {tools.length} elite tools · Offline enabled
          </div>

          <h1 style={{
            fontSize: 'clamp(38px, 6vw, 64px)', fontWeight: 700,
            lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 16,
            background: 'linear-gradient(135deg, var(--text) 0%, var(--text-dim) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'fadeUp 0.5s 0.1s ease both',
            fontFamily: 'var(--font-sans)',
          }}>
            Developer Toolbox
          </h1>

          <p style={{
            fontSize: 17, color: 'var(--text-dim)', marginBottom: 36, lineHeight: 1.6,
            animation: 'fadeUp 0.5s 0.2s ease both',
            fontFamily: 'var(--font-sans)',
          }}>
            Pro-grade utilities for your daily workflow.<br />
            100% private. Works fully offline.
          </p>

          <div style={{
            position: 'relative', maxWidth: 480, margin: '0 auto',
            animation: 'fadeUp 0.5s 0.3s ease both',
          }}>
            <span style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', fontSize: 16, pointerEvents: 'none',
            }}>⌕</span>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tools… (⌘K)"
              style={{
                width: '100%', padding: '14px 52px', fontSize: 15,
                background: 'oklch(0.15 0.025 250 / 0.8)',
                border: '1px solid var(--border-hi)',
                borderRadius: 12, color: 'var(--text)',
                fontFamily: 'var(--font-sans)',
                backdropFilter: 'blur(8px)',
                outline: 'none',
                transition: 'box-shadow var(--transition), border-color var(--transition)',
              }}
            />
            <kbd style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 5, padding: '2px 6px',
              fontFamily: 'var(--font-mono)',
            }}>⌘P</kbd>
          </div>
        </div>
      </div>

      {/* ── Recents Bar ── */}
      {recentTools.length > 0 && search === '' && activeCat === 'All' && (
        <div className="bg-slate-900/50 border-b border-slate-800 px-8 py-3 animate-fade-in">
          <div className="max-w-[1200px] mx-auto flex items-center gap-4 overflow-x-auto custom-scrollbar whitespace-nowrap">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-2">Recent:</span>
            {recentTools.slice(0, 5).map((tool: any) => (
              <Link
                key={tool.slug}
                to={`/${tool.slug}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 hover:border-accent/40 hover:bg-slate-700/50 transition-all text-xs text-slate-300"
              >
                <span className="font-mono text-[10px] opacity-70">{tool.icon}</span>
                <span>{tool.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Category filter ── */}
      <div style={{
        padding: '24px 32px 0',
        display: 'flex', gap: 8, flexWrap: 'wrap',
        maxWidth: 1200, margin: '0 auto',
        animation: 'fadeIn 0.5s 0.4s ease both',
      }}>
        {ALL_CATS.map(cat => {
          const active = activeCat === cat
          const s = CAT_STYLE[cat] ?? CAT_STYLE.Utils
          return (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              style={{
                padding: '8px 16px', borderRadius: 100,
                fontSize: 13, fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'all var(--transition)',
                border: `1px solid ${active ? s.border : 'var(--border)'}`,
                background: active ? (cat === 'All' ? 'var(--accent)' : s.bg) : 'transparent',
                color: active ? (cat === 'All' ? 'var(--bg)' : s.color) : 'var(--text-dim)',
              }}
            >
              {cat}
              <span style={{ opacity: 0.65, marginLeft: 6, fontSize: 12 }}>
                {catCounts[cat] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ padding: '20px 32px 60px', maxWidth: 1200, margin: '0 auto' }}>
        
        {/* ── Pinned Section ── */}
        {pinnedTools.length > 0 && search === '' && activeCat === 'All' && (
          <div className="mb-12 animate-fade-in">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
              <span className="text-[#facc15]">★</span> Pinned Tools
              <div className="h-px flex-1 bg-slate-800" />
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 14,
            }}>
              {pinnedTools.map((tool, i) => (
                <ToolCard key={`pinned-${tool.slug}`} tool={tool} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* ── Main Grid ── */}
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
          {activeCat === 'All' ? 'All Tools' : activeCat}
          <div className="h-px flex-1 bg-slate-800" />
        </h2>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 15 }}>
            No tools match "{search}"
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 14,
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
