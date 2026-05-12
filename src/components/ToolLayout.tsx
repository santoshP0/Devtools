import { Link, useLocation } from 'react-router-dom'
import { ReactNode, useEffect } from 'react'
import { useHistory } from '../lib/storage'

interface Props {
  title: string
  description: string
  children: ReactNode
  fullWidth?: boolean
}

export default function ToolLayout({ title, description, children, fullWidth = false }: Props) {
  const { pathname } = useLocation()
  const { trackVisit } = useHistory()

  useEffect(() => {
    document.title = `${title} | DevToolbox`
    // Lock page scroll — tool panels scroll internally
    document.body.style.overflow = 'hidden'
    const slug = pathname.split('/').pop()
    if (slug) trackVisit(slug)

    return () => {
      document.title = 'DevToolbox – Free Developer Tools'
      document.body.style.overflow = ''
    }
  }, [title, pathname])

  return (
    // paddingTop:54 clears the fixed navbar; height:100dvh fills the viewport
    <div style={{ height: '100dvh', paddingTop: 54, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 32px', height: 58, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 16,
        background: 'oklch(0.13 0.025 250 / 0.95)',
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

      {/* Tool content — scrolls internally */}
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        padding: fullWidth ? '24px 32px' : '32px',
        maxWidth: fullWidth ? '100%' : 1200, width: '100%', margin: '0 auto',
        overflowY: 'auto',
        boxSizing: 'border-box',
        animation: 'fadeUp 0.35s ease both',
      }}>
        <p style={{
          fontSize: 14, color: 'var(--text-dim)',
          marginBottom: 24, fontFamily: 'var(--font-sans)',
          flexShrink: 0,
        }}>
          {description}
        </p>
        {children}
      </div>
    </div>
  )
}
