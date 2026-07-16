import { useLocation } from 'react-router-dom'
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
    const slug = pathname.split('/').pop()
    if (slug) trackVisit(slug)

    return () => {
      document.title = 'DevToolbox – Free Developer Tools'
    }
  }, [title, pathname])

  return (
    // Outer: full-viewport scroll container — scrollbar sits at screen edge,
    // and wheel events from anywhere on the page are captured here.
    <div style={{
      height: '100dvh',
      paddingTop: 54,
      boxSizing: 'border-box',
      overflowY: 'auto',
      overflowX: 'hidden',
      background: 'var(--sketch-bg)',
      backgroundImage: 'radial-gradient(var(--sketch-dot) 1.2px, transparent 1.2px)',
      backgroundSize: '20px 20px',
    }}>
      {/* Inner: constrains width + is a flex column so children can use flex:1.
          fullWidth: bounded to viewport height on desktop (.tool-inner-full) so
          panes with flex:1/minHeight:0 scroll internally instead of the page. */}
      <div className={fullWidth ? 'tool-inner-full' : undefined} style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        padding: fullWidth ? '24px 32px' : '32px',
        maxWidth: fullWidth ? '100%' : 1200,
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
        animation: 'fadeUp 0.35s ease both',
      }}>
        <p style={{
          fontSize: 14, color: 'var(--sketch-text)',
          marginBottom: 24, fontFamily: "'Architects Daughter', var(--font-sans)",
          opacity: 0.8,
          flexShrink: 0,
        }}>
          {description}
        </p>
        {children}
      </div>
    </div>
  )
}
