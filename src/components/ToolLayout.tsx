import { Link } from 'react-router-dom'
import { ReactNode, useEffect } from 'react'

interface Props {
  title: string
  description: string
  children: ReactNode
}

const CATS: Record<string, { color: string; bg: string }> = {
  Data:      { color: 'var(--cat-data)', bg: 'var(--cat-data-bg)' },
  Security:  { color: 'var(--cat-sec)',  bg: 'var(--cat-sec-bg)'  },
  Generator: { color: 'var(--cat-gen)',  bg: 'var(--cat-gen-bg)'  },
  Text:      { color: 'var(--cat-txt)',  bg: 'var(--cat-txt-bg)'  },
  Design:    { color: 'var(--cat-des)',  bg: 'var(--cat-des-bg)'  },
  Media:     { color: 'var(--cat-med)',  bg: 'var(--cat-med-bg)'  },
  Utils:     { color: 'var(--cat-utl)',  bg: 'var(--cat-utl-bg)'  },
}

export default function ToolLayout({ title, description, children }: Props) {
  useEffect(() => {
    document.title = `${title} | DevToolbox`
    return () => { document.title = 'DevToolbox – Free Developer Tools' }
  }, [title])

  return (
    <div style={{ minHeight: 'calc(100dvh - 54px)', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky topbar */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 32px', height: 58,
        display: 'flex', alignItems: 'center', gap: 16,
        background: 'oklch(0.13 0.025 250 / 0.95)',
        position: 'sticky', top: 54, zIndex: 40,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        <Link
          to="/"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: 'var(--text-muted)',
            textDecoration: 'none',
            fontFamily: 'var(--font-sans)',
            transition: 'color var(--transition)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ← All Tools
        </Link>
        <span style={{ color: 'var(--border-hi)', fontSize: 18 }}>|</span>
        <span style={{
          fontSize: 16, fontWeight: 600,
          color: 'var(--text)', fontFamily: 'var(--font-sans)',
        }}>
          {title}
        </span>
      </div>

      {/* Tool content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: '32px',
        maxWidth: 1200, width: '100%', margin: '0 auto',
        animation: 'fadeUp 0.35s ease both',
      }}>
        <p style={{
          fontSize: 14, color: 'var(--text-dim)',
          marginBottom: 24, fontFamily: 'var(--font-sans)',
        }}>
          {description}
        </p>
        {children}
      </div>
    </div>
  )
}
