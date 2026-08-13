import { Link, useLocation } from 'react-router-dom'
import { tools } from '../lib/tools'
import { useIsDark } from '../hooks/useIsDark'

// macOS desktop uses an overlay titlebar, so we pad left to clear the traffic
// lights. Only matters inside the app on a Mac.
function isMacUA() {
  if (typeof navigator === 'undefined') return false
  return /mac/.test(`${navigator.userAgent} ${navigator.platform ?? ''}`.toLowerCase())
}

export default function Navbar() {
  const { pathname } = useLocation()
  const slug = pathname.split('/').filter(Boolean)[0]
  const tool = slug ? tools.find(t => t.slug === slug) : null
  const inApp = '__TAURI_INTERNALS__' in window
  const dark = useIsDark()

  return (
    // desktop: the nav doubles as the titlebar — data-tauri-drag-region makes the
    // window drag and double-click zoom like any native app.
    <nav data-tauri-drag-region style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: 54,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
      paddingLeft: inApp && isMacUA() ? 84 : 24,
      background: 'var(--sketch-bg)',
      borderBottom: '2px solid var(--sketch-text)',
    }}>
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link to="/" style={{
          width: 34, height: 34, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textDecoration: 'none',
        }}>
          <img src={dark ? '/AppIconDarkTheme.png' : '/AppIconLightTheme.png'} alt="DevToolbox" style={{ width: 34, height: 34, objectFit: 'contain' }} />
        </Link>

        {tool ? (
          <>
            <Link
              to="/"
              style={{
                fontSize: 13, color: 'var(--sketch-text)', textDecoration: 'none',
                fontFamily: "'Architects Daughter', var(--font-sans)",
                transition: 'opacity 0.18s', display: 'flex', alignItems: 'center', gap: 5,
                fontWeight: 700, opacity: 0.7,
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
            >
              ← all tools
            </Link>
            <span style={{ color: 'var(--sketch-text)', opacity: 0.3, fontSize: 18, lineHeight: 1 }}>|</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--sketch-text)', fontFamily: "'Architects Daughter', var(--font-sans)" }}>
              {tool.name.toLowerCase()}
            </span>
          </>
        ) : (
          <Link to="/" style={{
            fontSize: 18, fontWeight: 700,
            fontFamily: "'Architects Daughter', var(--font-sans)",
            textDecoration: 'none', color: 'var(--sketch-text)',
          }}>
            devtoolbox
          </Link>
        )}
      </div>

      {/* Right side — theme, downloads and about all live in Settings now; the
          nav just gets you there. */}
      <Link
        to="/settings"
        title="Settings — theme, favourites, downloads, about"
        aria-label="Settings"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 4,
          background: 'var(--surface)', border: '2px solid var(--sketch-text)',
          boxShadow: '2px 2px 0px var(--sketch-text)',
          color: 'var(--sketch-text)', textDecoration: 'none',
          fontFamily: "'Architects Daughter', var(--font-sans)", fontWeight: 700, fontSize: 13,
          transition: 'all 0.1s ease-out',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-1px,-1px)'; e.currentTarget.style.boxShadow = '3px 3px 0px var(--sketch-text)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = '2px 2px 0px var(--sketch-text)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span className="hidden sm:inline">settings</span>
      </Link>
    </nav>
  )
}
