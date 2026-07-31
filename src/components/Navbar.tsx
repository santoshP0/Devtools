import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { tools } from '../lib/tools'
import { syncWindowTheme } from '../lib/windowTheme'
import OsIcon, { Os } from './OsIcon'

const REPO_URL = 'https://github.com/santoshP0/Devtools'

function assetInfo(name: string): { os: Os; label: string } | null {
  if (name.endsWith('.dmg')) {
    // per-arch mac builds — label by the chip so users pick the right one
    if (name.includes('aarch64') || name.includes('arm64')) return { os: 'mac', label: 'macOS (Apple chip)' }
    if (name.includes('x64') || name.includes('x86_64') || name.includes('intel')) return { os: 'mac', label: 'macOS (Intel)' }
    return { os: 'mac', label: 'macOS' } // fallback (e.g. a universal build)
  }
  if (name.endsWith('.exe')) return { os: 'windows', label: 'Windows' }
  if (name.endsWith('.AppImage')) return { os: 'linux', label: 'Linux (AppImage)' }
  if (name.endsWith('.deb')) return { os: 'linux', label: 'Linux (deb)' }
  return null
}

export default function Navbar() {
  const { pathname } = useLocation()
  const slug = pathname.split('/').filter(Boolean)[0]
  const tool = slug ? tools.find(t => t.slug === slug) : null
  // hide the download button when already running inside the desktop app
  const inApp = '__TAURI_INTERNALS__' in window

  const [dark, setDark] = useState(() =>
    document.documentElement.dataset.theme === 'dark'
  )
  const [dlOpen, setDlOpen] = useState(false)
  const [macHelp, setMacHelp] = useState(false)
  const [assets, setAssets] = useState<{ os: Os; label: string; url: string }[] | null>(null)

  const loadAssets = () => {
    if (assets) return
    fetch('https://api.github.com/repos/santoshP0/Devtools/releases/latest')
      .then(r => r.json())
      .then(j => setAssets(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((j.assets ?? []) as any[])
          .map(a => { const info = assetInfo(a.name); return info && { ...info, url: a.browser_download_url as string } })
          .filter((a): a is { os: Os; label: string; url: string } => Boolean(a))
      ))
      .catch(() => setAssets([]))
  }
  const openDownload = () => { setDlOpen(true); loadAssets() }
  const toggleDownload = () => { setDlOpen(o => !o); loadAssets() }

  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('dt-theme', next)
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (favicon) favicon.href = next === 'dark' ? '/AppIconDarkTheme.png' : '/AppIconLightTheme.png'
    syncWindowTheme(next)
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
        {/* Download desktop app — opens on hover */}
        {!inApp && (
          <div style={{ position: 'relative' }}
            onMouseEnter={openDownload}
            onMouseLeave={() => { setDlOpen(false); setMacHelp(false) }}
          >
            <button
              onClick={toggleDownload}
              title="Download the desktop app — includes exclusive tools like the FFmpeg Media Compressor"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 4,
                background: 'var(--surface)',
                border: '2px solid var(--sketch-text)',
                boxShadow: '2px 2px 0px var(--sketch-text)',
                cursor: 'pointer', fontSize: 13, color: 'var(--sketch-text)',
                fontFamily: "'Architects Daughter', var(--font-sans)",
                fontWeight: 700,
                transition: 'all 0.1s ease-out',
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
              <span style={{ fontSize: 14, lineHeight: 1 }}>⬇</span>
              <span className="hidden sm:inline">get app</span>
            </button>
            {dlOpen && (
              // Outer wrapper touches the button (top:100%) with transparent
              // paddingTop as a hover bridge — so crossing the visual gap to the
              // menu stays inside the hover area and doesn't close it.
              <div style={{ position: 'absolute', right: 0, top: '100%', paddingTop: 8, zIndex: 61 }}>
                <div style={{
                  background: 'var(--surface)', border: '2px solid var(--sketch-text)',
                  borderRadius: 6, boxShadow: '3px 3px 0px var(--sketch-text)',
                  minWidth: 210, padding: 6,
                  display: 'flex', flexDirection: 'column',
                }}>
                  {assets === null && (
                    <span style={{ padding: '8px 10px', fontSize: 12, opacity: 0.7 }}>loading…</span>
                  )}
                  {assets?.map(a => (
                    <a key={a.url} href={a.url}
                      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', fontSize: 13, color: 'var(--sketch-text)', textDecoration: 'none', borderRadius: 4, fontWeight: 700 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <OsIcon os={a.os} />
                      {a.label}
                    </a>
                  ))}
                  {assets?.some(a => a.os === 'mac') && (
                    <div style={{ borderTop: '1px dashed var(--sketch-text)', marginTop: 4, paddingTop: 4 }}>
                      <button
                        onClick={() => setMacHelp(o => !o)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                          padding: '6px 10px', fontSize: 12, color: 'var(--sketch-text)',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          fontFamily: "'Architects Daughter', var(--font-sans)", fontWeight: 700, opacity: 0.85,
                        }}
                      >
                        <span>🍎 macOS says it can't open it?</span>
                        <span style={{ fontSize: 10 }}>{macHelp ? '▲' : '▼'}</span>
                      </button>
                      {macHelp && (
                        <div style={{ padding: '4px 10px 8px', fontSize: 12, color: 'var(--sketch-text)', opacity: 0.9, lineHeight: 1.5 }}>
                          <p style={{ margin: '0 0 6px', opacity: 0.75 }}>
                            The app isn't signed with Apple yet, so macOS blocks it once. To allow it:
                          </p>
                          <ol style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <li>Drag <b>DevToolbox</b> into <b>Applications</b> and double-click it.</li>
                            <li>When it says <i>"Apple could not verify…"</i>, click <b>Done</b>.</li>
                            <li>Open <b>System Settings → Privacy &amp; Security</b>.</li>
                            <li>Scroll down and click <b>Open Anyway</b> next to DevToolbox.</li>
                            <li>Click <b>Open Anyway</b> again and enter your Mac password.</li>
                          </ol>
                          <p style={{ margin: '6px 0 0', opacity: 0.6 }}>
                            Prefer Terminal? Run:<br />
                            <code style={{ fontSize: 11 }}>xattr -dr com.apple.quarantine /Applications/DevToolbox.app</code>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <a href={`${REPO_URL}/releases/latest`} target="_blank" rel="noreferrer"
                    style={{ padding: '8px 10px', fontSize: 12, color: 'var(--sketch-text)', textDecoration: 'none', opacity: 0.7, borderTop: '1px dashed var(--sketch-text)', marginTop: 4 }}
                  >
                    all downloads →
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

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
          <span style={{ position: 'relative', width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={dark ? 'sun' : 'moon'}
                initial={{ rotate: -90, opacity: 0, scale: 0.4 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ fontSize: 14, lineHeight: 1, position: 'absolute' }}
              >
                {dark ? '☀️' : '🌙'}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="hidden sm:inline">{dark ? 'light' : 'dark'}</span>
        </button>
      </div>
    </nav>
  )
}
