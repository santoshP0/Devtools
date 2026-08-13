import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { tools, categories } from '../lib/tools'
import { useFavorites } from '../lib/storage'
import { useSettings } from '../lib/settings'
import ToolIcon from './ToolIcon'

// Per-category text colours (same tokens the tool cards use) so each section
// header and its tool icons tint in that category's colour.
const CAT_TEXT: Record<string, string> = {
  API: 'var(--card-api-text)', Data: 'var(--card-data-text)', Security: 'var(--card-sec-text)',
  Generator: 'var(--card-gen-text)', Text: 'var(--card-txt-text)', Design: 'var(--card-des-text)',
  Media: 'var(--card-med-text)', Utils: 'var(--card-utl-text)', Frontend: 'var(--card-front-text)',
  Backend: 'var(--card-back-text)',
}
const catColor = (c: string) => CAT_TEXT[c] ?? 'var(--accent)'

// Non-blocking quick tool switcher: a floating tab opens a right-side drawer
// with favourites up top and the rest grouped by category. Complements Cmd+K.
export default function ToolSwitcher() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const activeSlug = pathname.split('/').filter(Boolean)[0]

  const { favorites } = useFavorites()
  const { settings } = useSettings()
  const favTools = useMemo(() => tools.filter(t => favorites.includes(t.slug)), [favorites])
  const showFavs = settings.favoritesQuickAccess && favTools.length > 0
  // Real categories (drop the synthetic "All"), only those with tools.
  const cats = useMemo(
    () => categories.filter(c => c !== 'All' && tools.some(t => t.category === c)),
    [],
  )
  const go = (slug: string) => { navigate(`/${slug}`); setOpen(false) }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // One tool row — tinted icon, active-state fill, subtle hover.
  const Row = ({ slug, name, icon, category, desc }: { slug: string; name: string; icon: string; category: string; desc: string }) => {
    const active = slug === activeSlug
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => go(slug)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(slug) } }}
        title={desc}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
          color: active ? 'var(--sketch-bg)' : 'var(--sketch-text)',
          background: active ? 'var(--sketch-text)' : 'transparent',
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface2)' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ display: 'inline-flex', flexShrink: 0, color: active ? 'var(--sketch-bg)' : catColor(category) }}>
          <ToolIcon name={icon} size={16} />
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      </div>
    )
  }

  const SectionLabel = ({ children, color }: { children: ReactNode; color?: string }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '10px 2px 6px', fontSize: 12, fontWeight: 700,
      letterSpacing: '0.05em', textTransform: 'uppercase',
      color: color ?? 'var(--text-muted)', fontFamily: 'var(--font-sans)',
    }}>
      {children}
    </div>
  )

  return (
    <>
      {/* Edge-anchored tab, flush to the right edge and vertically centered.
          A <div> (not <button>) so the app's global `button { …!important }`
          rules can't override the position or add a hover jump. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) } }}
        title="Quick switch tools"
        style={{
          position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 45,
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '12px 10px 12px 12px',
          borderRadius: '10px 0 0 10px',
          background: 'var(--surface)', color: 'var(--sketch-text)',
          border: '2px solid var(--sketch-text)', borderRight: 'none',
          boxShadow: '-2px 2px 0px var(--sketch-text)',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 13, lineHeight: 1, opacity: 0.6 }}>‹</span>
        <ToolIcon name="LayoutGrid" size={18} />
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 60 }}
            />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 61,
                width: 'min(340px, 85vw)',
                background: 'var(--surface)',
                borderLeft: '2px solid var(--sketch-text)',
                display: 'flex', flexDirection: 'column',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderBottom: '2px solid var(--sketch-text)', flexShrink: 0,
              }}>
                <span style={{
                  fontWeight: 700, fontSize: 16, color: 'var(--sketch-text)',
                  fontFamily: "'Architects Daughter', var(--font-sans)",
                }}>jump to a tool</span>
                <button onClick={() => setOpen(false)} className="btn-icon" title="Close" style={{ fontSize: 20, lineHeight: 1 }}>×</button>
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 24px 24px' }}>

                {/* Favourites — quick access, above the categories (opt-out via Settings) */}
                {showFavs && (
                  <div>
                    <SectionLabel><span style={{ fontSize: 13 }}>★</span><span>favourites</span></SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {favTools.map(t => (
                        <Row key={t.slug} slug={t.slug} name={t.name} icon={t.icon} category={t.category} desc={t.description} />
                      ))}
                    </div>
                    <div style={{ borderTop: '1px dashed var(--border)', margin: '12px 0 2px' }} />
                  </div>
                )}

                {/* The rest, grouped by category */}
                {cats.map(cat => (
                  <div key={cat}>
                    <SectionLabel color={catColor(cat)}>{cat}</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {tools.filter(t => t.category === cat).map(t => (
                        <Row key={t.slug} slug={t.slug} name={t.name} icon={t.icon} category={t.category} desc={t.description} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p style={{
                flexShrink: 0, padding: '10px 20px', margin: 0,
                fontSize: 11, color: 'var(--text-muted)', textAlign: 'center',
                borderTop: '1px dashed var(--border)',
                fontFamily: 'var(--font-sans)',
              }}>
                click a tool to open · esc to close
              </p>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
