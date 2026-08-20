import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Tool } from '../lib/tools'
import { useFavorites } from '../lib/storage'
import ToolIcon from './ToolIcon'

const MotionLink = motion.create(Link)

const CAT_STYLES: Record<string, { bg: string; text: string }> = {
  API:       { bg: 'var(--card-api-bg)',       text: 'var(--card-api-text)' },
  Data:      { bg: 'var(--card-data-bg)',      text: 'var(--card-data-text)' },
  Security:  { bg: 'var(--card-sec-bg)',       text: 'var(--card-sec-text)' },
  Generator: { bg: 'var(--card-gen-bg)',       text: 'var(--card-gen-text)' },
  Text:      { bg: 'var(--card-txt-bg)',       text: 'var(--card-txt-text)' },
  Design:    { bg: 'var(--card-des-bg)',       text: 'var(--card-des-text)' },
  Media:     { bg: 'var(--card-med-bg)',       text: 'var(--card-med-text)' },
  Utils:     { bg: 'var(--card-utl-bg)',       text: 'var(--card-utl-text)' },
  Frontend:  { bg: 'var(--card-front-bg)',     text: 'var(--card-front-text)' },
  Backend:   { bg: 'var(--card-back-bg)',      text: 'var(--card-back-text)' },
}

interface ToolCardProps {
  tool: Tool
  index: number
  /** Enables drag-to-rearrange. Off while searching, where order means relevance. */
  sortable?: boolean
  /** Rendered inside the drag overlay — no sortable wiring, no click handling. */
  overlay?: boolean
  /** Edit mode: wobble, and don't navigate on click. */
  editing?: boolean
}

export default function ToolCard({ tool, index, sortable, overlay, editing }: ToolCardProps) {
  const [hovered, setHovered] = useState(false)
  const catStyle = CAT_STYLES[tool.category] || CAT_STYLES.Utils
  const { isFavorite, toggleFavorite } = useFavorites()
  const fav = isFavorite(tool.slug)
  // A drag that ends on this card must not also follow the link.
  const draggedRef = useRef(false)

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: tool.slug, disabled: !sortable })

  const displayIndex = `#${String(index + 1).padStart(2, '0')}`

  // dnd-kit drives the drag from a pointer sensor on this wrapper. The card
  // itself stays a link, so a plain click still opens the tool.
  return (
    <div
      data-tile=""
      ref={overlay ? undefined : setNodeRef}
      {...(sortable && !overlay ? attributes : {})}
      {...(sortable && !overlay ? listeners : {})}
      onClickCapture={(e: React.MouseEvent) => {
        // In edit mode a tap rearranges rather than opens; let the click bubble
        // so the page can leave edit mode.
        if (editing || draggedRef.current) e.preventDefault()
      }}
      style={{
        display: 'flex',
        transform: CSS.Transform.toString(transform),
        transition,
        // The original slot stays as a gap while its card rides the overlay.
        opacity: isDragging ? 0.35 : 1,
        borderRadius: 4,
        touchAction: sortable ? 'none' : undefined,
        cursor: overlay ? 'grabbing' : sortable ? 'grab' : 'pointer',
        zIndex: isDragging ? 2 : undefined,
      }}
    >
    <MotionLink
      to={`/${tool.slug}`}
      className={editing && !overlay ? 'tool-tile tile-jiggle' : 'tool-tile'}
      draggable={false}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={sortable ? undefined : { y: -3, x: -3 }}
      whileTap={sortable ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        // stagger so the tiles don't wobble in lockstep
        animationDelay: `${(index % 6) * 0.05}s`,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 20px 20px',
        borderRadius: 4,
        background: catStyle.bg,
        border: '2px solid var(--sketch-text)',
        boxShadow: hovered
          ? '6px 6px 0px var(--sketch-text)'
          : '4px 4px 0px var(--sketch-text)',
        cursor: 'inherit',
        textDecoration: 'none',
        position: 'relative',
        minHeight: 180,
      }}
    >
      {/* Tape Graphic */}
      <div 
        style={{
          position: 'absolute',
          top: -7,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 54,
          height: 14,
          background: 'rgba(0, 0, 0, 0.08)',
          // No backdrop-filter here: it forces a GPU layer and a framebuffer
          // read-back per card, and with the whole grid on screen that was ~70
          // of them compositing non-stop. A 1px blur on a translucent strip is
          // not worth it.
          borderLeft: '1px dashed rgba(0, 0, 0, 0.15)',
          borderRight: '1px dashed rgba(0, 0, 0, 0.15)',
          borderRadius: 1,
        }}
        className="dark:bg-white/10 dark:border-white/10"
      />

      {/* Card Header: Shorthand/Icon + Index & Pin */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        {/* Big icon chip — the fast way to spot a tool at a glance */}
        <div style={{
          width: 52, height: 52, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 12,
          background: catStyle.text,
          color: catStyle.bg,
          border: '2px solid var(--sketch-text)',
        }}>
          <ToolIcon name={tool.icon} size={30} strokeWidth={2.1} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: catStyle.text,
            opacity: 0.6,
          }}>
            {displayIndex}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleFavorite(tool.slug)
            }}
            title={fav ? 'Remove from favourites' : 'Add to favourites'}
            aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
            aria-pressed={fav}
            style={{
              background: fav ? catStyle.text : 'transparent',
              border: `2px solid ${catStyle.text}`,
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 16,
              color: fav ? catStyle.bg : catStyle.text,
              padding: 0,
              lineHeight: 1,
              transition: 'transform 0.12s ease, background 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.18)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {fav ? '★' : '☆'}
          </button>
        </div>
      </div>

      {/* Main Metadata & Divider */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{
            fontFamily: "'Architects Daughter', var(--font-sans)",
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--sketch-text)',
            margin: '0 0 6px 0',
            lineHeight: 1.2,
          }}>
            {tool.name}
          </h3>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--sketch-text)',
            opacity: 0.8,
            margin: 0,
            lineHeight: 1.4,
          }}>
            {tool.description}
          </p>
        </div>

        {/* Bottom Metadata & dotted separator */}
        <div style={{ marginTop: 14 }}>
          <div style={{
            borderTop: '1px dashed var(--sketch-text)',
            opacity: 0.25,
            marginBottom: 10,
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'lowercase',
              fontFamily: 'var(--font-sans)',
              color: catStyle.text,
            }}>
              {tool.category.toLowerCase()}
            </span>
          </div>
        </div>
      </div>
    </MotionLink>
    </div>
  )
}
