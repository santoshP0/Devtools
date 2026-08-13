import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../lib/settings'
import { appVersion, inDesktopApp } from '../lib/updater'

const RELEASES_URL = 'https://github.com/santoshP0/Devtools/releases/latest'

export default function Settings() {
  const { settings, setSetting } = useSettings()
  const [version, setVersion] = useState('')

  useEffect(() => { appVersion().then(setVersion) }, [])

  return (
    <div style={{
      minHeight: 'calc(100vh - 54px)', marginTop: 54,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 24px 80px', color: 'var(--sketch-text)',
      fontFamily: "'Architects Daughter', var(--font-sans)",
    }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 700 }}>Settings</h1>
        <p style={{ margin: '0 0 28px', fontSize: 14, opacity: 0.7 }}>
          Preferences are saved on this device only.
        </p>

        {/* ── General — applies on web and in the desktop app ── */}
        <Section title="General">
          <ToggleRow
            title="Quick-access favourites"
            desc="Show your starred tools in a side panel on the home page and in the tool switcher drawer."
            checked={settings.favoritesQuickAccess}
            onChange={v => setSetting('favoritesQuickAccess', v)}
          />
          <Row
            title="Theme"
            desc="Switch between light and dark from the toggle in the top bar."
          >
            <span style={{ fontSize: 13, opacity: 0.6 }}>top bar →</span>
          </Row>
        </Section>

        {/* ── Desktop app — differentiated: real controls in the app,
             an explainer on the web ── */}
        <Section title="Desktop app">
          {inDesktopApp ? (
            <>
              <Row title="Version" desc="The installed DevToolbox build.">
                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', opacity: 0.8 }}>{version || '…'}</span>
              </Row>
              <Row title="Updates" desc="Check for and install new versions.">
                <Link to="/about" style={linkBtn}>Open About</Link>
              </Row>
              <p style={{ fontSize: 12.5, opacity: 0.6, margin: '4px 2px 0', lineHeight: 1.5 }}>
                More desktop-only options will land here over time.
              </p>
            </>
          ) : (
            <div style={{ fontSize: 13.5, opacity: 0.8, lineHeight: 1.6 }}>
              You're on the web version. The desktop app adds native tools (FFmpeg
              media compression, screen mirror) and its own settings — auto-updates
              and more to come.
              <div style={{ marginTop: 12 }}>
                <a href={RELEASES_URL} target="_blank" rel="noreferrer" style={linkBtn}>Get the desktop app</a>
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '2px solid var(--sketch-text)',
      boxShadow: '4px 4px 0px var(--sketch-text)', borderRadius: 10,
      padding: '6px 20px', marginBottom: 22,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.6, padding: '14px 0 4px' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({ title, desc, children }: { title: string; desc?: string; children?: ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 0', borderTop: '1px dashed var(--sketch-text)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        {desc && <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2, lineHeight: 1.45, fontFamily: 'var(--font-sans)' }}>{desc}</div>}
      </div>
      {children && <div style={{ flexShrink: 0 }}>{children}</div>}
    </div>
  )
}

function ToggleRow({ title, desc, checked, onChange }: {
  title: string; desc?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <Row title={title} desc={desc}>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </Row>
  )
}

// Native-feeling switch. A span (not a checkbox/button) so the global sketch
// form chrome doesn't reshape it; the sketch look is kept via border + shadow.
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      aria-label={label}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(!checked) } }}
      style={{
        display: 'inline-flex', alignItems: 'center',
        width: 46, height: 26, borderRadius: 999, padding: 2,
        border: '2px solid var(--sketch-text)',
        background: checked ? 'var(--sketch-text)' : 'var(--surface2)',
        boxShadow: '2px 2px 0px var(--sketch-text)',
        cursor: 'pointer', transition: 'background 0.15s',
        justifyContent: checked ? 'flex-end' : 'flex-start',
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: '50%',
        background: checked ? 'var(--sketch-bg)' : 'var(--sketch-text)',
        transition: 'all 0.15s',
      }} />
    </span>
  )
}

const linkBtn: CSSProperties = {
  display: 'inline-block', padding: '6px 14px', borderRadius: 6,
  background: 'var(--sketch-text)', color: 'var(--sketch-bg)',
  border: '2px solid var(--sketch-text)', fontSize: 13, fontWeight: 700,
  textDecoration: 'none', fontFamily: "'Architects Daughter', var(--font-sans)",
}
