import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { checkForUpdate, AvailableUpdate, RELEASES_URL, relaunchApp } from '../lib/updater'
import { useSettings } from '../lib/settings'

const actionStyle: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 5, cursor: 'pointer',
  background: 'var(--sketch-text)', color: 'var(--sketch-bg)',
  border: '2px solid var(--sketch-text)', fontSize: 13, fontWeight: 700,
  fontFamily: "'Architects Daughter', var(--font-sans)", whiteSpace: 'nowrap',
  display: 'inline-block',
}

// Checks for an update on launch (desktop only) and shows a themed banner: a
// one-click install when the release ships updater artifacts, otherwise a link
// to the download so a new version is never silently missed.
export default function UpdateBanner() {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [failed, setFailed] = useState(false)
  /** Update downloaded and staged — it applies on the next restart. */
  const [staged, setStaged] = useState(false)
  const { settings } = useSettings()
  const autoUpdate = settings.autoUpdate

  useEffect(() => {
    let alive = true
    checkForUpdate().then(async u => {
      if (!alive || !u) return
      setUpdate(u)
      // Auto-update on launch: download and install in the background, but never
      // restart on our own — the user might be mid-task. We prompt instead.
      if (autoUpdate && u.install) {
        setBusy(true)
        try {
          await u.install(setProgress, false)
          if (alive) setStaged(true)
        } catch {
          if (alive) setFailed(true)
        } finally {
          if (alive) setBusy(false)
        }
      }
    })
    return () => { alive = false }
    // launch-time check only; changing the setting shouldn't re-trigger a download
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!update || dismissed) return null

  // Releases without updater artifacts can't self-install — link to the download.
  const canInstall = typeof update.install === 'function'

  const run = async () => {
    setBusy(true)
    setFailed(false)
    try {
      await update.install!(setProgress) // relaunches on success
    } catch {
      setBusy(false)
      setFailed(true)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 90, maxWidth: 460, width: 'calc(100% - 40px)',
          background: 'var(--surface)', border: '2px solid var(--sketch-text)',
          boxShadow: '5px 5px 0px var(--sketch-text)', borderRadius: 10,
          padding: '14px 16px', color: 'var(--sketch-text)',
          fontFamily: "'Architects Daughter', var(--font-sans)",
          display: 'flex', alignItems: 'center', gap: 14,
        }}
      >
        <span style={{ fontSize: 22, lineHeight: 1 }}>✨</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {staged ? `v${update.version} is ready` : `Update available — v${update.version}`}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {busy
              ? `Downloading v${update.version}… ${Math.round(progress * 100)}%`
              : staged
                ? 'Installed in the background — restart whenever you’re ready.'
                : failed
                  ? 'Update failed — try again or download manually.'
                  : canInstall
                    ? `You're on v${update.currentVersion}. Update and restart in one click.`
                    : `You're on v${update.currentVersion}. Grab the new version from GitHub.`}
          </div>
          {busy && (
            <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: 'var(--sketch-text)', transition: 'width 0.2s' }} />
            </div>
          )}
        </div>
        {!busy && (
          <>
            <button onClick={() => setDismissed(true)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, opacity: 0.6, color: 'var(--sketch-text)', fontFamily: "'Architects Daughter', var(--font-sans)" }}>
              later
            </button>
            {staged ? (
              <button onClick={() => relaunchApp()} style={actionStyle}>Restart</button>
            ) : canInstall ? (
              <button onClick={run} style={actionStyle}>{failed ? 'Retry' : 'Update'}</button>
            ) : (
              <a href={RELEASES_URL} target="_blank" rel="noreferrer" style={{ ...actionStyle, textDecoration: 'none' }}>
                Download
              </a>
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
