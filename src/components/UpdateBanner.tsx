import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { checkForUpdate, AvailableUpdate, RELEASES_URL, relaunchApp } from '../lib/updater'
import { useSettings } from '../lib/settings'

const actionStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 5, cursor: 'pointer',
  background: 'var(--sketch-text)', color: 'var(--sketch-bg)',
  border: '2px solid var(--sketch-text)', fontSize: 13, fontWeight: 700,
  fontFamily: "'Architects Daughter', var(--font-sans)", whiteSpace: 'nowrap',
  display: 'inline-block', textAlign: 'center',
}

const quietStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontSize: 13, opacity: 0.65, color: 'var(--sketch-text)',
  fontFamily: "'Architects Daughter', var(--font-sans)", padding: '6px 10px',
}

/**
 * Update prompt, bottom-right so it never sits over the content you're reading.
 *
 * Checks on launch but never downloads on its own: an update is offered and only
 * starts once it's accepted, because pulling ~10 MB and swapping the binary
 * underneath someone is not a decision to make for them.
 */
export default function UpdateBanner() {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [failed, setFailed] = useState(false)
  /** Downloaded and staged — it applies on the next restart. */
  const [staged, setStaged] = useState(false)
  const { settings } = useSettings()

  useEffect(() => {
    if (!settings.autoUpdate) return
    let alive = true
    checkForUpdate().then(u => { if (alive && u) setUpdate(u) })
    return () => { alive = false }
  }, [settings.autoUpdate])

  if (!update || dismissed) return null

  // Releases without updater artifacts can't self-install — link to the download.
  const canInstall = typeof update.install === 'function'

  const run = async () => {
    setBusy(true)
    setFailed(false)
    try {
      // Install without relaunching: finishing is the user's call, so a download
      // can never interrupt whatever they were doing.
      await update.install!(setProgress, false)
      setStaged(true)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const title = staged
    ? `v${update.version} is ready`
    : busy
      ? `Downloading v${update.version}`
      : `Update available — v${update.version}`

  const detail = busy
    ? `${Math.round(progress * 100)}% of the way there`
    : staged
      ? 'Restart to finish, whenever suits you.'
      : failed
        ? 'That did not work — try again, or download it manually.'
        : canInstall
          ? `You're on v${update.currentVersion}. Update now, or later from Settings.`
          : `You're on v${update.currentVersion}. Grab it from GitHub.`

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        style={{
          position: 'fixed', bottom: 20, right: 20,
          zIndex: 90, width: 320, maxWidth: 'calc(100vw - 40px)',
          background: 'var(--surface)', border: '2px solid var(--sketch-text)',
          boxShadow: '5px 5px 0px var(--sketch-text)', borderRadius: 10,
          padding: '14px 16px', color: 'var(--sketch-text)',
          fontFamily: "'Architects Daughter', var(--font-sans)",
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 20, lineHeight: 1.1 }}>{staged ? '✅' : '✨'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2, lineHeight: 1.45 }}>{detail}</div>
          </div>
        </div>

        {busy && (
          <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.round(progress * 100)}%`,
              background: 'var(--sketch-text)', transition: 'width 0.2s',
            }} />
          </div>
        )}

        {!busy && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 12 }}>
            <button onClick={() => setDismissed(true)} style={quietStyle}>
              {staged ? 'Not now' : 'Later'}
            </button>
            {staged ? (
              <button onClick={() => relaunchApp()} style={actionStyle}>Restart now</button>
            ) : canInstall ? (
              <button onClick={run} style={actionStyle}>{failed ? 'Try again' : 'Update now'}</button>
            ) : (
              <a href={RELEASES_URL} target="_blank" rel="noreferrer" style={{ ...actionStyle, textDecoration: 'none' }}>
                Download
              </a>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
