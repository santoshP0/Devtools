import { Link, useLocation } from 'react-router-dom'
import { tools } from '../lib/tools'

export default function Navbar() {
  const { pathname } = useLocation()
  const slug = pathname.split('/').filter(Boolean)[0]
  const tool = slug ? tools.find(t => t.slug === slug) : null

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: 54,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px',
      background: 'oklch(0.10 0.025 250 / 0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* DT icon — always links home */}
        <Link to="/" style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--accent), var(--purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#000',
          fontFamily: 'var(--font-mono)', textDecoration: 'none',
        }}>DT</Link>

        {tool ? (
          /* Tool page: breadcrumb */
          <>
            <Link
              to="/"
              style={{
                fontSize: 13, color: 'var(--text-muted)',
                textDecoration: 'none', fontFamily: 'var(--font-sans)',
                transition: 'color 0.18s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              ← All Tools
            </Link>
            <span style={{ color: 'var(--border-hi)', fontSize: 18, lineHeight: 1 }}>|</span>
            <span style={{
              fontSize: 15, fontWeight: 600,
              color: 'var(--text)', fontFamily: 'var(--font-sans)',
            }}>
              {tool.name}
            </span>
          </>
        ) : (
          /* Home: show wordmark */
          <Link to="/" style={{
            fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-sans)',
            textDecoration: 'none', color: 'var(--text)',
          }}>
            DevToolbox
          </Link>
        )}
      </div>

      {/* Right side */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 13, color: 'var(--text-muted)',
        fontFamily: 'var(--font-sans)',
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--cat-gen)',
          display: 'inline-block',
          animation: 'pulseRing 2s infinite',
        }} />
        <span className="hidden sm:inline">No ads · No tracking · All in your browser</span>
      </div>
    </nav>
  )
}
