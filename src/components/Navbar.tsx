import { useState, type CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { tools } from '../lib/tools'
import { syncWindowTheme } from '../lib/windowTheme'
import OsIcon, { Os } from './OsIcon'

const REPO_URL = 'https://github.com/santoshP0/Devtools'

// shared sketch-button styles for the download popup
const cardStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '12px 14px', borderRadius: 6,
  background: 'var(--surface)', border: '2px solid var(--sketch-text)',
  boxShadow: '3px 3px 0px var(--sketch-text)',
  color: 'var(--sketch-text)', textDecoration: 'none',
  transition: 'all 0.1s ease-out',
}
const rowStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '9px 12px', borderRadius: 5,
  color: 'var(--sketch-text)', textDecoration: 'none',
  transition: 'background 0.1s ease-out',
}
const lift = (e: { currentTarget: HTMLElement }) => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '5px 5px 0px var(--sketch-text)' }
const drop = (e: { currentTarget: HTMLElement }) => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = '3px 3px 0px var(--sketch-text)' }
const rowIn = (e: { currentTarget: HTMLElement }) => { e.currentTarget.style.background = 'var(--surface2)' }
const rowOut = (e: { currentTarget: HTMLElement }) => { e.currentTarget.style.background = 'transparent' }

function assetInfo(name: string): { os: Os; label: string } | null {
  if (name.endsWith('.dmg')) {
    // per-arch mac builds — label by the chip so users pick the right one
    if (name.includes('universal')) return { os: 'mac', label: 'macOS (Universal)' }
    if (name.includes('aarch64') || name.includes('arm64')) return { os: 'mac', label: 'macOS (Apple chip)' }
    if (name.includes('x64') || name.includes('x86_64') || name.includes('intel')) return { os: 'mac', label: 'macOS (Intel)' }
    return { os: 'mac', label: 'macOS' } // fallback
  }
  if (name.endsWith('.exe')) return { os: 'windows', label: 'Windows' }
  if (name.endsWith('.AppImage')) return { os: 'linux', label: 'Linux (AppImage)' }
  if (name.endsWith('.deb')) return { os: 'linux', label: 'Linux (deb)' }
  return null
}

// Best-effort OS guess from the browser so we can lead with the right download.
// Note: browsers can't tell Apple Silicon from Intel (both report "Intel Mac"),
// so Mac users still choose the chip themselves.
function detectOs(): Os | null {
  const ua = `${navigator.userAgent} ${navigator.platform ?? ''}`.toLowerCase()
  if (/iphone|ipad|android/.test(ua)) return null // mobile can't run the desktop app
  if (/mac/.test(ua)) return 'mac'
  if (/win/.test(ua)) return 'windows'
  if (/linux|x11|cros/.test(ua)) return 'linux'
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
  const [showOther, setShowOther] = useState(false)
  const [chipModal, setChipModal] = useState(false)
  const [assets, setAssets] = useState<{ os: Os; label: string; url: string }[] | null>(null)
  const userOs = detectOs()

  // mac chip options for the popup (only those present in the release show up)
  const macApple = assets?.find(a => a.label.includes('Apple'))
  const macIntel = assets?.find(a => a.label.includes('Intel'))
  const macUniversal = assets?.find(a => a.label.includes('Universal'))
    ?? assets?.find(a => a.os === 'mac' && a.label === 'macOS')
  const macOptions = [
    macApple && { url: macApple.url, title: 'Apple chip', sub: 'M1 · M2 · M3 · M4 — Macs from 2020+' },
    macIntel && { url: macIntel.url, title: 'Intel', sub: 'Macs made before 2020' },
    macUniversal && { url: macUniversal.url, title: 'Universal', sub: 'Runs on any Mac · larger download' },
  ].filter(Boolean) as { url: string; title: string; sub: string }[]

  // primary = the visitor's own OS; others go behind a toggle
  const primaryAssets = userOs && userOs !== 'mac' ? (assets ?? []).filter(a => a.os === userOs) : []
  const hasPrimary = userOs === 'mac' ? macOptions.length > 0 : primaryAssets.length > 0
  const otherAssets = (assets ?? []).filter(a =>
    userOs === 'mac' ? a.os !== 'mac' : !primaryAssets.includes(a),
  )

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
  const openModal = () => { setChipModal(true); setShowOther(false); loadAssets() }
  const closeModal = () => { setChipModal(false); setShowOther(false) }

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
        {/* Download desktop app — click opens the download popup */}
        {!inApp && (
          <button
            onClick={openModal}
            title="Download the desktop app — bundled ffmpeg, no setup"
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
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-1px, -1px)'; e.currentTarget.style.boxShadow = '3px 3px 0px var(--sketch-text)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = '2px 2px 0px var(--sketch-text)' }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>⬇</span>
            <span className="hidden sm:inline">get app</span>
          </button>
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

      {/* Download popup — OS-aware: Mac chip picker + other platforms */}
      <AnimatePresence>
        {chipModal && (
          <motion.div
            key="dl-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closeModal}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <motion.div
              key="dl-card"
              initial={{ scale: 0.9, y: 14, opacity: 0, rotate: -1.5 }}
              animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.9, y: 14, opacity: 0, rotate: -1.5 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--surface)', border: '2px solid var(--sketch-text)',
                boxShadow: '6px 6px 0px var(--sketch-text)', borderRadius: 10,
                padding: 26, maxWidth: 440, width: '100%',
                color: 'var(--sketch-text)', fontFamily: "'Architects Daughter', var(--font-sans)",
              }}
            >
              {/* header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={dark ? '/AppIconDarkTheme.png' : '/AppIconLightTheme.png'} alt="" style={{ width: 30, height: 30 }} />
                  <h3 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>
                    {userOs === 'mac' ? 'which mac chip?' : 'download the app'}
                  </h3>
                </div>
                <button onClick={closeModal} aria-label="Close"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, color: 'var(--sketch-text)', opacity: 0.55, padding: 4 }}>
                  ✕
                </button>
              </div>
              <p style={{ margin: '0 0 18px', fontSize: 13.5, opacity: 0.7, lineHeight: 1.55 }}>
                DevToolbox for desktop — ffmpeg is bundled in, nothing to install.
                {userOs === 'mac' && ' Pick your chip, or Universal if unsure (Apple menu → About This Mac).'}
              </p>

              {assets === null && <span style={{ fontSize: 13, opacity: 0.7 }}>loading downloads…</span>}

              {/* primary picks for the visitor's OS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {userOs === 'mac'
                  ? macOptions.map(o => (
                      <a key={o.title} href={o.url} onClick={closeModal} style={cardStyle} onMouseEnter={lift} onMouseLeave={drop}>
                        <OsIcon os="mac" />
                        <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <span style={{ fontSize: 16, fontWeight: 700 }}>{o.title}</span>
                          <span style={{ fontSize: 11.5, opacity: 0.65 }}>{o.sub}</span>
                        </span>
                        <span style={{ fontSize: 16 }}>⬇</span>
                      </a>
                    ))
                  : primaryAssets.map(a => (
                      <a key={a.url} href={a.url} onClick={closeModal} style={cardStyle} onMouseEnter={lift} onMouseLeave={drop}>
                        <OsIcon os={a.os} />
                        <span style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>{a.label}</span>
                        <span style={{ fontSize: 16 }}>⬇</span>
                      </a>
                    ))}

                {/* unknown OS (e.g. mobile) — show everything as primary cards */}
                {!hasPrimary && userOs !== 'mac' && otherAssets.map(a => (
                  <a key={a.url} href={a.url} onClick={closeModal} style={cardStyle} onMouseEnter={lift} onMouseLeave={drop}>
                    <OsIcon os={a.os} />
                    <span style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>{a.label}</span>
                    <span style={{ fontSize: 16 }}>⬇</span>
                  </a>
                ))}

                {assets && !hasPrimary && otherAssets.length === 0 && (
                  <span style={{ fontSize: 13, opacity: 0.7 }}>No downloads published yet — check back shortly.</span>
                )}
              </div>

              {/* other platforms, tucked behind a toggle when we have a primary */}
              {hasPrimary && otherAssets.length > 0 && (
                <div style={{ marginTop: 14, borderTop: '1px dashed var(--sketch-text)', paddingTop: 10 }}>
                  <button onClick={() => setShowOther(o => !o)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: 0.75, color: 'var(--sketch-text)', fontFamily: "'Architects Daughter', var(--font-sans)", padding: 2 }}>
                    <span>other platforms</span>
                    <span style={{ fontSize: 11 }}>{showOther ? '▲' : '▼'}</span>
                  </button>
                  {showOther && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                      {otherAssets.map(a => (
                        <a key={a.url} href={a.url} onClick={closeModal} style={rowStyle} onMouseEnter={rowIn} onMouseLeave={rowOut}>
                          <OsIcon os={a.os} /><span style={{ fontWeight: 700, fontSize: 13.5 }}>{a.label}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <a href={`${REPO_URL}/releases/latest`} target="_blank" rel="noreferrer"
                style={{ display: 'inline-block', marginTop: 16, fontSize: 12.5, opacity: 0.55, color: 'var(--sketch-text)', textDecoration: 'none' }}>
                all downloads →
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
