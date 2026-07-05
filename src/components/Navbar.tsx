import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { tools } from '../lib/tools'

export default function Navbar() {
  const { pathname } = useLocation()
  const slug = pathname.split('/').filter(Boolean)[0]
  const tool = slug ? tools.find(t => t.slug === slug) : null

  const [dark, setDark] = useState(() =>
    document.documentElement.dataset.theme === 'dark'
  )

  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('dt-theme', next)
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (favicon) favicon.href = next === 'dark' ? '/AppIconDarkTheme.png' : '/AppIconLightTheme.png'
    setDark(!dark)
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: 54,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
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
                fontSize: 13, color: 'var(--sketch-text)',
                textDecoration: 'none',
                fontFamily: "'Architects Daughter', var(--font-sans)",
                transition: 'opacity 0.18s',
                display: 'flex', alignItems: 'center', gap: 5,
                fontWeight: 700,
                opacity: 0.7,
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
            >
              ← all tools
            </Link>
            <span style={{ color: 'var(--sketch-text)', opacity: 0.3, fontSize: 18, lineHeight: 1 }}>|</span>
            <span style={{
              fontSize: 15, fontWeight: 700,
              color: 'var(--sketch-text)',
              fontFamily: "'Architects Daughter', var(--font-sans)",
            }}>
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

      {/* Right side */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        fontSize: 12, color: 'var(--sketch-text)',
        fontFamily: "'Architects Daughter', var(--font-sans)",
        fontWeight: 600,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--card-gen-text)',
          display: 'inline-block',
          border: '1px solid var(--sketch-text)',
        }} />
        <span className="hidden sm:inline" style={{ opacity: 0.7 }}>local toolbox · 100% private</span>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 4,
            background: 'var(--surface)', 
            border: '2px solid var(--sketch-text)',
            boxShadow: '2px 2px 0px var(--sketch-text)',
            cursor: 'pointer', fontSize: 13, color: 'var(--sketch-text)',
            fontFamily: "'Architects Daughter', var(--font-sans)", 
            fontWeight: 700,
            transition: 'all 0.1s ease-out', marginLeft: 4,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translate(-1px, -1px)'
            e.currentTarget.style.boxShadow = '3px 3px 0px var(--sketch-text)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translate(0, 0)'
            e.currentTarget.style.boxShadow = '2px 2px 0px var(--sketch-text)'
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>{dark ? '☀️' : '🌙'}</span>
          <span className="hidden sm:inline">{dark ? 'light' : 'dark'}</span>
        </button>
      </div>
    </nav>
  )
}
