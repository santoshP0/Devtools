import { useRef, useEffect, useMemo } from 'react'
import ToolCard from '../components/ToolCard'
import HeroCanvas from '../components/HeroCanvas'
import { tools, categories } from '../lib/tools'

const ALL_CATS = ['All', ...categories]

const CAT_STYLE: Record<string, { color: string; bg: string; border: string; activeBg: string }> = {
  All:       { color: 'var(--bg)',       bg: 'var(--accent)',     border: 'var(--accent)',    activeBg: 'var(--accent)'    },
  Data:      { color: 'var(--cat-data)', bg: 'var(--cat-data-bg)',border: 'oklch(0.72 0.15 220 / 0.5)', activeBg: 'var(--cat-data-bg)' },
  Security:  { color: 'var(--cat-sec)',  bg: 'var(--cat-sec-bg)', border: 'oklch(0.72 0.16 25  / 0.5)', activeBg: 'var(--cat-sec-bg)'  },
  Generator: { color: 'var(--cat-gen)',  bg: 'var(--cat-gen-bg)', border: 'oklch(0.72 0.15 145 / 0.5)', activeBg: 'var(--cat-gen-bg)' },
  Text:      { color: 'var(--cat-txt)',  bg: 'var(--cat-txt-bg)', border: 'oklch(0.80 0.14 75  / 0.5)', activeBg: 'var(--cat-txt-bg)'  },
  Design:    { color: 'var(--cat-des)',  bg: 'var(--cat-des-bg)', border: 'oklch(0.72 0.16 300 / 0.5)', activeBg: 'var(--cat-des-bg)' },
  Media:     { color: 'var(--cat-med)',  bg: 'var(--cat-med-bg)', border: 'oklch(0.72 0.16 195 / 0.5)', activeBg: 'var(--cat-med-bg)' },
  Utils:     { color: 'var(--cat-utl)',  bg: 'var(--cat-utl-bg)', border: 'oklch(0.72 0.14 260 / 0.5)', activeBg: 'var(--cat-utl-bg)' },
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
    return tools.filter(t => {
      const matchCat = activeCat === 'All' || t.category === activeCat
      const q = search.toLowerCase()
      const matchQ = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [search, activeCat])

  // ⌘K / Ctrl+K focuses search
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
          {/* Badge */}
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
            {tools.length} tools · Free forever · No sign-up
          </div>

          {/* Heading */}
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
            Fast, free browser tools for developers.<br />
            No ads, no tracking, no data leaves your device.
          </p>

          {/* Search */}
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
              placeholder="Search tools…"
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
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--accent-dim)'
                e.currentTarget.style.boxShadow = '0 0 0 4px oklch(0.78 0.18 195 / 0.12)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--border-hi)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
            <kbd style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 5, padding: '2px 6px',
              fontFamily: 'var(--font-mono)',
            }}>⌘K</kbd>
          </div>
        </div>
      </div>

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

      {/* ── Tool grid ── */}
      <div style={{
        padding: '20px 32px 60px',
        maxWidth: 1200, margin: '0 auto',
      }}>
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 0',
            color: 'var(--text-muted)', fontSize: 15,
            fontFamily: 'var(--font-sans)',
          }}>
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
