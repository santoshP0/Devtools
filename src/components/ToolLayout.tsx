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
    // paddingTop:54 clears the fixed navbar (back button now lives in Navbar)
    <div style={{ height: '100dvh', paddingTop: 54, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
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
