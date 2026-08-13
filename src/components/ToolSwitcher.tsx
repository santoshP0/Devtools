import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { tools } from '../lib/tools'
import { useFavorites } from '../lib/storage'
import LineSidebar from './LineSidebar'
import ToolIcon from './ToolIcon'

// Per-category text + background colours (same tokens the tool cards use) so
// each item tints and gets a card-like highlight in its own category colour.
const CAT_TEXT: Record<string, string> = {
  API: 'var(--card-api-text)', Data: 'var(--card-data-text)', Security: 'var(--card-sec-text)',
  Generator: 'var(--card-gen-text)', Text: 'var(--card-txt-text)', Design: 'var(--card-des-text)',
  Media: 'var(--card-med-text)', Utils: 'var(--card-utl-text)', Frontend: 'var(--card-front-text)',
  Backend: 'var(--card-back-text)',
}
const CAT_BG: Record<string, string> = {
  API: 'var(--card-api-bg)', Data: 'var(--card-data-bg)', Security: 'var(--card-sec-bg)',
  Generator: 'var(--card-gen-bg)', Text: 'var(--card-txt-bg)', Design: 'var(--card-des-bg)',
  Media: 'var(--card-med-bg)', Utils: 'var(--card-utl-bg)', Frontend: 'var(--card-front-bg)',
  Backend: 'var(--card-back-bg)',
}
const catColor = (c: string) => CAT_TEXT[c] ?? 'var(--accent)'
const catBg = (c: string) => CAT_BG[c] ?? 'transparent'

// Non-blocking quick tool switcher: a floating button opens a right-side
// drawer with the hover-animated LineSidebar. Complements the Cmd+K palette.
export default function ToolSwitcher() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const activeSlug = pathname.split('/').filter(Boolean)[0]
  const activeIndex = tools.findIndex(t => t.slug === activeSlug)

  // Starred tools, in toolbox order, surfaced at the top of the drawer so the
  // ones you use are one click away from any page — same list as the Home rail.
  const { favorites } = useFavorites()
  const favTools = useMemo(() => tools.filter(t => favorites.includes(t.slug)), [favorites])
  const go = (slug: string) => { navigate(`/${slug}`); setOpen(false) }

  // Hover-driven auto-scroll of the drawer body: velocity grows toward the edges.
  const bodyRef = useRef<HTMLDivElement>(null)
  const velRef = useRef(0)
  const scrollRaf = useRef<number | null>(null)
  const scrollTick = () => {
    const el = bodyRef.current
    if (el && velRef.current !== 0) {
      const max = el.scrollHeight - el.clientHeight
      const nt = Math.max(0, Math.min(max, el.scrollTop + velRef.current))
      if (nt !== el.scrollTop) { el.scrollTop = nt; scrollRaf.current = requestAnimationFrame(scrollTick); return }
    }
    scrollRaf.current = null
  }
  const onBodyMove = (e: React.PointerEvent) => {
    const el = bodyRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const rel = (e.clientY - r.top) / r.height
    const dz = 0.2 // middle 40% = no scroll
    let v = 0
    if (rel < 0.5 - dz) v = -(((0.5 - dz) - rel) / (0.5 - dz))
    else if (rel > 0.5 + dz) v = (rel - (0.5 + dz)) / (0.5 - dz)
    velRef.current = Math.max(-1, Math.min(1, v)) * 10
    if (velRef.current !== 0 && scrollRaf.current == null) scrollRaf.current = requestAnimationFrame(scrollTick)
  }
  const onBodyLeave = () => { velRef.current = 0 }
  useEffect(() => () => { if (scrollRaf.current != null) cancelAnimationFrame(scrollRaf.current) }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

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

              {/* Body scrolls; the list itself is not a scroll container, so the
                  proximity math (offsetTop vs pointer) stays aligned. */}
              <div ref={bodyRef} className="no-scrollbar" onPointerMove={onBodyMove} onPointerLeave={onBodyLeave}
                style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 24px 24px' }}>

                {/* Favourites — quick access, above the full list */}
                {favTools.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0 8px', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
                      <span style={{ fontSize: 13 }}>★</span>
                      <span>favourites</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {favTools.map(t => (
                        <div
                          key={t.slug}
                          role="button"
                          tabIndex={0}
                          onClick={() => go(t.slug)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(t.slug) } }}
                          title={t.description}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                            color: t.slug === activeSlug ? 'var(--sketch-bg)' : 'var(--sketch-text)',
                            background: t.slug === activeSlug ? 'var(--sketch-text)' : 'transparent',
                            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => { if (t.slug !== activeSlug) e.currentTarget.style.background = 'var(--surface2)' }}
                          onMouseLeave={e => { if (t.slug !== activeSlug) e.currentTarget.style.background = 'transparent' }}
                        >
                          <ToolIcon name={t.icon} size={16} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop: '1px dashed var(--border)', margin: '14px 0 10px' }} />
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 4 }}>
                      all tools
                    </div>
                  </div>
                )}

                <LineSidebar
                  items={tools.map(t => t.name)}
                  itemAccents={tools.map(t => catColor(t.category))}
                  itemBg={tools.map(t => catBg(t.category))}
                  itemTitles={tools.map(t => t.description)}
                  textColor="var(--text-dim)"
                  markerColor="var(--border)"
                  markerLength={28}
                  markerGap={6}
                  itemGap={16}
                  fontSize={1}
                  proximityRadius={110}
                  maxShift={18}
                  smoothing={120}
                  defaultActive={activeIndex >= 0 ? activeIndex : null}
                  onItemClick={index => {
                    navigate(`/${tools[index].slug}`)
                    setOpen(false)
                  }}
                />
              </div>
              <p style={{
                flexShrink: 0, padding: '10px 20px', margin: 0,
                fontSize: 11, color: 'var(--text-muted)', textAlign: 'center',
                borderTop: '1px dashed var(--border)',
                fontFamily: 'var(--font-sans)',
              }}>
                move up / down to scroll · click a tool to open
              </p>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
