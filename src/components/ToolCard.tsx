import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Tool } from '../lib/tools'

const CATS: Record<string, { color: string; bg: string; glow: string }> = {
  Data:      { color: 'var(--cat-data)', bg: 'var(--cat-data-bg)', glow: 'oklch(0.72 0.15 220)' },
  Security:  { color: 'var(--cat-sec)',  bg: 'var(--cat-sec-bg)',  glow: 'oklch(0.72 0.16 25)'  },
  Generator: { color: 'var(--cat-gen)',  bg: 'var(--cat-gen-bg)',  glow: 'oklch(0.72 0.15 145)' },
  Text:      { color: 'var(--cat-txt)',  bg: 'var(--cat-txt-bg)',  glow: 'oklch(0.80 0.14 75)'  },
  Design:    { color: 'var(--cat-des)',  bg: 'var(--cat-des-bg)',  glow: 'oklch(0.72 0.16 300)' },
  Media:     { color: 'var(--cat-med)',  bg: 'var(--cat-med-bg)',  glow: 'oklch(0.72 0.16 195)' },
  Utils:     { color: 'var(--cat-utl)',  bg: 'var(--cat-utl-bg)',  glow: 'oklch(0.72 0.14 260)' },
}

export default function ToolCard({ tool, index = 0 }: { tool: Tool; index?: number }) {
  const [hovered, setHovered] = useState(false)
  const cat = CATS[tool.category] ?? CATS.Utils

  return (
    <Link
      to={`/${tool.slug}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 12,
        padding: 20,
        borderRadius: 'var(--radius-lg)',
        background: hovered ? 'var(--surface2)' : 'var(--surface)',
        border: `1px solid ${hovered ? cat.glow + '66' : 'var(--border)'}`,
        boxShadow: hovered
          ? `0 8px 32px ${cat.glow}22, 0 0 0 1px ${cat.glow}22`
          : '0 1px 4px oklch(0 0 0 / 0.3)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all var(--transition)',
        cursor: 'pointer',
        textDecoration: 'none',
        position: 'relative',
        animation: 'fadeUp 0.4s ease both',
        animationDelay: `${index * 0.04}s`,
      }}
    >
      {/* Icon + arrow */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `linear-gradient(135deg, ${cat.bg}, ${cat.glow}22)`,
          border: `1px solid ${cat.glow}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: cat.color, flexShrink: 0,
          letterSpacing: '-0.02em',
        }}>
          {tool.icon}
        </div>
        <span style={{
          opacity: hovered ? 1 : 0.25,
          color: 'var(--text-muted)', fontSize: 18,
          transition: 'opacity var(--transition)',
        }}>→</span>
      </div>

      {/* Name + description */}
      <div>
        <div style={{
          fontWeight: 600, fontSize: 15, marginBottom: 4,
          color: 'var(--text)', fontFamily: 'var(--font-sans)',
        }}>
          {tool.name}
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-dim)',
          lineHeight: 1.5, fontFamily: 'var(--font-sans)',
        }}>
          {tool.description}
        </div>
      </div>

      {/* Category badge */}
      <div>
        <span style={{
          display: 'inline-block', borderRadius: 100,
          fontSize: 11, fontWeight: 600,
          letterSpacing: '0.06em', padding: '3px 9px',
          color: cat.color, background: cat.bg,
          fontFamily: 'var(--font-sans)',
        }}>
          {tool.category}
        </span>
      </div>
    </Link>
  )
}
