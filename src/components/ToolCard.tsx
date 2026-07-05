import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Tool } from '../lib/tools'
import { useFavorites } from '../lib/storage'
import ToolIcon from './ToolIcon'

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
}

export default function ToolCard({ tool, index }: ToolCardProps) {
  const [hovered, setHovered] = useState(false)
  const catStyle = CAT_STYLES[tool.category] || CAT_STYLES.Utils
  const { isFavorite, toggleFavorite } = useFavorites()
  const fav = isFavorite(tool.slug)

  const displayIndex = `#${String(index + 1).padStart(2, '0')}`

  return (
    <Link
      to={`/${tool.slug}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
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
        transform: hovered ? 'translate(-2px, -2px)' : 'translate(0, 0)',
        transition: 'all 0.15s ease-out',
        cursor: 'pointer',
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
          backdropFilter: 'blur(1px)',
          borderLeft: '1px dashed rgba(0, 0, 0, 0.15)',
          borderRight: '1px dashed rgba(0, 0, 0, 0.15)',
          borderRadius: 1,
        }}
        className="dark:bg-white/10 dark:border-white/10"
      />

      {/* Card Header: Shorthand/Icon + Index & Pin */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{
          fontSize: 24,
          fontWeight: 700,
          color: catStyle.text,
          fontFamily: 'var(--font-sans)',
        }}>
          <ToolIcon name={tool.icon} size={24} />
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
            style={{
              background: fav ? 'var(--sketch-text)' : 'transparent',
              border: '1.5px solid var(--sketch-text)',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 10,
              color: fav ? catStyle.bg : 'var(--sketch-text)',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ★
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
    </Link>
  )
}
