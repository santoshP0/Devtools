import { useEffect, useState, type CSSProperties } from 'react'
import { appVersion, checkForUpdate, inDesktopApp, AvailableUpdate } from '../lib/updater'
import { useIsDark } from '../hooks/useIsDark'

const REPO_URL = 'https://github.com/santoshP0/Devtools'
const SITE_URL = 'https://devtools-9fsp.onrender.com'

type CheckState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'uptodate' }
  | { kind: 'available'; update: AvailableUpdate }
  | { kind: 'installing'; pct: number | null }
  | { kind: 'error' }

export default function About() {
  const [version, setVersion] = useState('')
  const [state, setState] = useState<CheckState>({ kind: 'idle' })
  const dark = useIsDark()

  useEffect(() => { appVersion().then(setVersion) }, [])

  const check = async () => {
    setState({ kind: 'checking' })
    try {
      const u = await checkForUpdate()
      setState(u ? { kind: 'available', update: u } : { kind: 'uptodate' })
    } catch {
      setState({ kind: 'error' })
    }
  }

  const install = async (u: AvailableUpdate) => {
    setState({ kind: 'installing', pct: 0 })
    try {
      await u.install!(p => setState({ kind: 'installing', pct: p }))
    } catch {
      setState({ kind: 'error' })
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 54px)', marginTop: 54,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '56px 24px 80px', color: 'var(--sketch-text)',
      fontFamily: "'Architects Daughter', var(--font-sans)",
    }}>
      <div style={{
        width: '100%', maxWidth: 460,
        background: 'var(--surface)', border: '2px solid var(--sketch-text)',
        boxShadow: '5px 5px 0px var(--sketch-text)', borderRadius: 12,
        padding: 30, textAlign: 'center',
      }}>
        <img src={dark ? '/AppIconDarkTheme.png' : '/AppIconLightTheme.png'} alt="DevToolbox" style={{ width: 64, height: 64, margin: '0 auto 12px' }} />
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>DevToolbox</h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.7 }}>
          version {version || '…'}{!inDesktopApp && ' · web'}
        </p>
        <p style={{ margin: '14px 0 0', fontSize: 14, opacity: 0.85, lineHeight: 1.6 }}>
          Free, local-first developer tools — 60+ utilities to format, convert, encode,
          generate and inspect, plus a video editor. Everything
          runs on your device; your files never leave it. Free and open source.
        </p>

        {/* Update check — desktop only */}
        {inDesktopApp && (
          <div style={{ marginTop: 22 }}>
            {(state.kind === 'idle' || state.kind === 'uptodate' || state.kind === 'checking' || state.kind === 'error') && (
              <button onClick={check} disabled={state.kind === 'checking'}
                style={btnPrimary}>
                {state.kind === 'checking' ? 'Checking…' : 'Check for updates'}
              </button>
            )}
            {state.kind === 'uptodate' && (
              <p style={{ margin: '10px 0 0', fontSize: 13, opacity: 0.7 }}>You're on the latest version ✓</p>
            )}
            {state.kind === 'error' && (
              <p style={{ margin: '10px 0 0', fontSize: 13, opacity: 0.7 }}>Couldn't check right now — try again later.</p>
            )}
            {state.kind === 'available' && (
              <>
                <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>v{state.update.version} is available</p>
                {state.update.install ? (
                  <button onClick={() => install(state.update)} style={btnPrimary}>Update &amp; restart</button>
                ) : (
                  <a href={`${REPO_URL}/releases/latest`} target="_blank" rel="noreferrer"
                    style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none' }}>
                    Download v{state.update.version}
                  </a>
                )}
              </>
            )}
            {state.kind === 'installing' && (
              <p style={{ margin: 0, fontSize: 14 }}>
                {state.pct === null ? 'Downloading…' : `Installing… ${Math.round(state.pct * 100)}%`}
              </p>
            )}
          </div>
        )}

        {!inDesktopApp && (
          <a href={`${REPO_URL}/releases/latest`} target="_blank" rel="noreferrer" style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none', marginTop: 22 }}>
            Get the desktop app
          </a>
        )}

        {/* Links */}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px dashed var(--sketch-text)', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
          <a href={SITE_URL} target="_blank" rel="noreferrer" style={link}>Website ↗</a>
          <a href={REPO_URL} target="_blank" rel="noreferrer" style={link}>Source on GitHub ↗</a>
          <a href={`${REPO_URL}/releases`} target="_blank" rel="noreferrer" style={link}>All releases ↗</a>
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer" style={link}>Report an issue ↗</a>
        </div>
      </div>
    </div>
  )
}

const btnPrimary: CSSProperties = {
  padding: '9px 18px', borderRadius: 6, cursor: 'pointer',
  background: 'var(--sketch-text)', color: 'var(--sketch-bg)',
  border: '2px solid var(--sketch-text)', fontSize: 14, fontWeight: 700,
  fontFamily: "'Architects Daughter', var(--font-sans)",
}
const link: CSSProperties = { color: 'var(--sketch-text)', textDecoration: 'none', opacity: 0.8 }
