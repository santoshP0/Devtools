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
    // Keep body overflow hidden so double scrollbars don't appear;
    // the outer div below is the actual scroll container at full viewport width
    document.body.style.overflow = 'hidden'
    const slug = pathname.split('/').pop()
    if (slug) trackVisit(slug)

    return () => {
      document.title = 'DevToolbox – Free Developer Tools'
      document.body.style.overflow = ''
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
    }}>
      {/* Inner: constrains width + is a flex column so children can use flex:1 */}
      <div style={{
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
