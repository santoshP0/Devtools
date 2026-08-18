import { useRef, useEffect, useMemo, useState } from 'react'
import ToolCard from '../components/ToolCard'
import FirstRunHint from '../components/FirstRunHint'
import ToolIcon from '../components/ToolIcon'
import { tools, categories } from '../lib/tools'
import { searchTools } from '../lib/toolSearch'
import { NATIVE_SHELL } from '../lib/shell'
import { useToolOrder } from '../lib/toolOrder'
import {
  DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors,
  useDroppable, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { useFavorites } from '../lib/storage'
import { useSettings } from '../lib/settings'

const ALL_CATS = categories

/** Droppable id for the favourites area, so a card can be dropped on its empty space. */
const FAV_ZONE = 'favourites-zone'

/** The favourites grid, which also accepts drops anywhere inside it. */
function FavZone({ active, children }: { active: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: FAV_ZONE })
  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20,
        padding: 10, margin: -10, borderRadius: 12,
        outline: isOver && active ? '3px dashed var(--sketch-text)' : 'none',
        background: isOver && active ? 'rgba(0,0,0,0.03)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      {children}
    </div>
  )
}

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
  /** Rearrange mode, toggled from the header. */
  editMode: boolean
  setEditMode: (v: boolean) => void
}

export default function Home({ search, setSearch, activeCat, setActiveCat, editMode, setEditMode }: Props) {
  const searchRef = useRef<HTMLInputElement>(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const { favorites, addFavorite, reorderFavorites } = useFavorites()
  const { settings } = useSettings()
  const { ordered, reorder, resetCategory, hasCustomOrder } = useToolOrder()
  // the card currently being dragged, for the floating overlay
  const [dragSlug, setDragSlug] = useState<string | null>(null)
  // A few pixels of movement before a press becomes a drag, so clicking a card
  // still opens the tool.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  // Starred tools follow the saved favourites order, so dragging one into place
  // sticks. (Previously they were locked to toolbox order and ignored it.)
  const favTools = useMemo(
    () => favorites.map(slug => tools.find(t => t.slug === slug)).filter((t): t is typeof tools[number] => Boolean(t)),
    [favorites],
  )

  const catCounts = useMemo(() => {
    const c: Record<string, number> = { All: tools.length }
    tools.forEach(t => { c[t.category] = (c[t.category] || 0) + 1 })
    return c
  }, [])

  // Searching ranks across every category; browsing filters by the active one and
  // honours the arrangement saved for that category.
  const filtered = useMemo(() => {
    if (search.trim()) return searchTools(tools, search)
    const inCat = activeCat === 'All' ? tools : tools.filter(t => t.category === activeCat)
    return ordered(activeCat, inCat)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeCat, ordered])

  // Esc leaves rearrange mode, like any modal-ish state.
  useEffect(() => {
    if (!editMode) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditMode(false) }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [editMode, setEditMode])

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

  // Favourites lead the default view (not searching, "All"); the grid below then
  // drops them so nothing is listed twice.
  const showFav = settings.favoritesQuickAccess && favTools.length > 0 && search === '' && activeCat === 'All'
  const gridTools = showFav ? filtered.filter(t => !favorites.includes(t.slug)) : filtered

  // Rearranging is only meaningful when the list has a fixed order — while
  // searching, position means relevance, so dragging is off.
  const canDrag = editMode && search.trim() === ''
  const isFav = (slug: string) => favorites.includes(slug)

  /** Where a dropped card should land. */
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDragSlug(null)
    if (!over) return
    const from = String(active.id)
    const to = String(over.id)
    if (from === to) return

    // dropped anywhere in the favourites area (including its empty space)
    if (to === FAV_ZONE) { if (!isFav(from)) addFavorite(from); return }

    if (isFav(to)) {
      // onto a specific favourite: take that position
      if (isFav(from)) reorderFavorites(from, to)
      else { addFavorite(from); reorderFavorites(from, to) }
      return
    }
    if (isFav(from)) return // a favourite dragged into the grid stays put
    reorder(activeCat, gridTools, from, to)
  }

  const dragTool = dragSlug ? tools.find(t => t.slug === dragSlug) : null
  const favSlugs = favTools.map(t => t.slug)
  const gridSlugs = gridTools.map(t => t.slug)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }: DragStartEvent) => setDragSlug(String(active.id))}
      onDragCancel={() => setDragSlug(null)}
      onDragEnd={handleDragEnd}
    >
    <div 
      // Click anywhere that isn't a tile to leave rearrange mode. Tiles are
      // excluded so a drag (or a mis-tap on a card) doesn't kick you out.
      onClick={editMode ? (e: React.MouseEvent) => {
        if (!(e.target as HTMLElement).closest('[data-tile]')) setEditMode(false)
      } : undefined}
      style={{ 
        minHeight: 'calc(100vh - 54px)',
        // Desktop: the scrolling pane already starts below the fixed header, so
        // the page must not offset itself again.
        marginTop: NATIVE_SHELL ? 0 : 54,
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

        {/* One-time orientation, only on the unfiltered default view */}
        {search === '' && activeCat === 'All' && !editMode && <FirstRunHint />}

        {/* Favourites first */}
        {showFav && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>★</span>
              <span style={{ fontSize: 18, opacity: 0.85 }}>your favourites ({favTools.length})</span>
              {dragSlug && !isFav(dragSlug) && (
                <span style={{ fontSize: 13, opacity: 0.6 }}>— drop here to add</span>
              )}
            </div>
            <FavZone active={Boolean(dragSlug) && !isFav(dragSlug!)}>
              <SortableContext items={favSlugs} strategy={rectSortingStrategy}>
                {favTools.map((tool, i) => (
                  <ToolCard key={tool.slug} tool={tool} index={i} sortable={canDrag} editing={editMode} />
                ))}
              </SortableContext>
            </FavZone>
            <div style={{ borderTop: '2px dashed var(--sketch-text)', opacity: 0.3, margin: '36px auto 0', maxWidth: '100%' }} />
          </div>
        )}

        {/* Grid Header / Counter */}
        <div style={{ margin: showFav ? '28px 0 24px' : '0 0 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, opacity: 0.8 }}>
            {search !== ''
              ? `search matches (${gridTools.length}) ↓`
              : activeCat === 'All'
                ? (showFav ? `everything else (${gridTools.length}) ↓` : `all ${gridTools.length} of them ↓`)
                : `${activeCat.toLowerCase()} tools (${gridTools.length}) ↓`
            }
          </span>
          {canDrag && hasCustomOrder(activeCat) && (
            <button
              onClick={() => resetCategory(activeCat)}
              title={`Restore the default order for ${activeCat}`}
              style={{
                marginLeft: 'auto', background: 'transparent', border: '2px solid var(--sketch-text)',
                borderRadius: 999, padding: '3px 12px', fontSize: 12, cursor: 'pointer',
                color: 'var(--sketch-text)', fontFamily: "'Architects Daughter', var(--font-sans)",
              }}
            >
              reset order
            </button>
          )}
        </div>

        {/* Tools grid */}
        {gridTools.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--sketch-text)', fontSize: 18, opacity: 0.6 }}>
            {search ? `No tools matched your search "${search}"` : 'Nothing here yet.'}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 20,
          }}>
            <SortableContext items={gridSlugs} strategy={rectSortingStrategy}>
              {gridTools.map((tool, i) => (
                <ToolCard key={tool.slug} tool={tool} index={i} sortable={canDrag} editing={editMode} />
              ))}
            </SortableContext>
          </div>
        )}

      </div>
    </div>
    {/* The card you're holding, following the cursor. */}
    <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
      {dragTool ? (
        <div style={{ width: 280, cursor: 'grabbing', filter: 'drop-shadow(6px 10px 0 rgba(0,0,0,0.25))' }}>
          <ToolCard tool={dragTool} index={0} overlay />
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  )
}
