import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../lib/settings'
import { appVersion, inDesktopApp } from '../lib/updater'
import { useIsDark } from '../hooks/useIsDark'
import { switchTheme } from '../lib/theme'

const REPO_URL = 'https://github.com/santoshP0/Devtools'
const RELEASES_URL = `${REPO_URL}/releases/latest`

interface Asset { os: 'mac' | 'windows' | 'linux'; label: string; url: string }
function assetInfo(name: string): { os: Asset['os']; label: string } | null {
  if (name.endsWith('.dmg')) {
    if (name.includes('universal')) return { os: 'mac', label: 'macOS (Universal)' }
    if (name.includes('aarch64') || name.includes('arm64')) return { os: 'mac', label: 'macOS (Apple chip)' }
    if (name.includes('x64') || name.includes('x86_64') || name.includes('intel')) return { os: 'mac', label: 'macOS (Intel)' }
    return { os: 'mac', label: 'macOS' }
  }
  if (name.endsWith('.exe')) return { os: 'windows', label: 'Windows' }
  if (name.endsWith('.AppImage')) return { os: 'linux', label: 'Linux (AppImage)' }
  if (name.endsWith('.deb')) return { os: 'linux', label: 'Linux (deb)' }
  return null
}

export default function Settings() {
  const { settings, setSetting } = useSettings()
  const dark = useIsDark()
  const [version, setVersion] = useState('')
  const [assets, setAssets] = useState<Asset[] | null>(null)

  useEffect(() => { appVersion().then(setVersion) }, [])
  useEffect(() => {
    if (inDesktopApp) return
    fetch(`https://api.github.com/repos/santoshP0/Devtools/releases/latest`)
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(j => setAssets(((j.assets ?? []) as any[])
        .map(a => { const i = assetInfo(a.name); return i && { ...i, url: a.browser_download_url as string } })
        .filter((a): a is Asset => Boolean(a))))
      .catch(() => setAssets([]))
  }, [])

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

        {/* ── Appearance ── */}
        <Section title="Appearance">
          <Row title="Theme" desc="Light or dark — applies everywhere instantly.">
            <Segmented
              value={dark ? 'dark' : 'light'}
              onChange={(v, origin) => switchTheme(v as 'light' | 'dark', origin)}
              options={[{ v: 'light', label: '☀ Light' }, { v: 'dark', label: '☾ Dark' }]}
            />
          </Row>
        </Section>

        {/* ── General ── */}
        <Section title="General">
          <ToggleRow
            title="Quick-access favourites"
            desc="Show your starred tools at the top of the home page and in the tool switcher."
            checked={settings.favoritesQuickAccess}
            onChange={v => setSetting('favoritesQuickAccess', v)}
          />
        </Section>

        {/* ── Get the app / Desktop app — differentiated ── */}
        {inDesktopApp ? (
          <Section title="Desktop app">
            <Row title="Version" desc="The installed DevToolbox build.">
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', opacity: 0.8 }}>{version || '…'}</span>
            </Row>
            <Row title="Updates" desc="Check for and install new versions.">
              <Link to="/about" style={linkBtn}>Check</Link>
            </Row>
          </Section>
        ) : (
          <Section title="Get the app">
            <div style={{ padding: '14px 0', borderTop: '1px dashed var(--sketch-text)' }}>
              <p style={{ fontSize: 13.5, opacity: 0.8, lineHeight: 1.6, margin: '0 0 12px' }}>
                The desktop app adds native tools — FFmpeg media compression, screen mirror — and works offline.
              </p>
              {assets === null && <span style={{ fontSize: 13, opacity: 0.6 }}>loading downloads…</span>}
              {assets && assets.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {assets.map(a => (
                    <a key={a.url} href={a.url} style={{ ...linkBtn, background: 'var(--surface)', color: 'var(--sketch-text)' }}>⬇ {a.label}</a>
                  ))}
                </div>
              )}
              {assets && assets.length === 0 && (
                <a href={RELEASES_URL} target="_blank" rel="noreferrer" style={linkBtn}>See all downloads →</a>
              )}
            </div>
          </Section>
        )}

        {/* ── About ── */}
        <Section title="About">
          <Row title="DevToolbox" desc="A fast, local-first box of developer tools — everything runs in your browser, nothing is uploaded.">
            {version && <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', opacity: 0.7 }}>v{version.replace(/^v/, '')}</span>}
          </Row>
          <Row title="Links">
            <span style={{ display: 'flex', gap: 8 }}>
              <a href={REPO_URL} target="_blank" rel="noreferrer" style={{ ...linkBtn, background: 'var(--surface)', color: 'var(--sketch-text)' }}>GitHub</a>
              <Link to="/about" style={linkBtn}>Full about →</Link>
            </span>
          </Row>
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
        cursor: 'pointer', transition: 'background 0.2s ease',
        justifyContent: 'flex-start',
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: '50%',
        background: checked ? 'var(--sketch-bg)' : 'var(--sketch-text)',
        transform: checked ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1), background 0.2s ease',
      }} />
    </span>
  )
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string, origin?: { x: number; y: number }) => void; options: { v: string; label: string }[] }) {
  return (
    <span style={{ display: 'inline-flex', border: '2px solid var(--sketch-text)', borderRadius: 8, overflow: 'hidden', boxShadow: '2px 2px 0px var(--sketch-text)' }}>
      {options.map((o, i) => {
        const active = value === o.v
        return (
          <span
            key={o.v}
            role="button"
            tabIndex={0}
            onClick={e => onChange(o.v, { x: e.clientX, y: e.clientY })}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(o.v) } }}
            style={{
              padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Architects Daughter', var(--font-sans)",
              borderLeft: i ? '2px solid var(--sketch-text)' : 'none',
              background: active ? 'var(--sketch-text)' : 'var(--surface)',
              color: active ? 'var(--sketch-bg)' : 'var(--sketch-text)',
            }}
          >
            {o.label}
          </span>
        )
      })}
    </span>
  )
}

const linkBtn: CSSProperties = {
  display: 'inline-block', padding: '6px 14px', borderRadius: 6,
  background: 'var(--sketch-text)', color: 'var(--sketch-bg)',
  border: '2px solid var(--sketch-text)', fontSize: 13, fontWeight: 700,
  textDecoration: 'none', fontFamily: "'Architects Daughter', var(--font-sans)",
}
