import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { checkForUpdate, AvailableUpdate, RELEASES_URL, relaunchApp } from '../lib/updater'
import { useSettings } from '../lib/settings'

/**
 * Update dialog, in the shape people already know from desktop apps: a centred
 * sheet with the version, what changed, and an explicit choice. A toast in the
 * corner reads as an ad and gets ignored; a new binary is worth a real prompt.
 *
 * It checks on launch but downloads nothing until it's accepted — then it
 * installs in the background and restarts into the new version.
 */

/** Turn a GitHub release body into plain lines worth showing. */
function readNotes(body?: string): string[] {
  if (!body) return []
  return body
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && !l.startsWith('---'))
    .map(l => l.replace(/^[-*]\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1'))
    .filter(l => !/^see all downloads/i.test(l))
    .slice(0, 8)
}

const btnBase: React.CSSProperties = {
  padding: '9px 18px', borderRadius: 6, cursor: 'pointer',
  border: '2px solid var(--sketch-text)', fontSize: 14, fontWeight: 700,
  fontFamily: "'Architects Daughter', var(--font-sans)", whiteSpace: 'nowrap',
}

export default function UpdateBanner() {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(0)
  const [received, setReceived] = useState(0)
  const [failed, setFailed] = useState(false)
  const [staged, setStaged] = useState(false)
  const { settings } = useSettings()

  useEffect(() => {
    if (!settings.autoUpdate) return
    let alive = true
    checkForUpdate().then(u => { if (alive && u) setUpdate(u) })
    return () => { alive = false }
  }, [settings.autoUpdate])

  // Esc postpones, like any dialog — but not mid-download, where dismissing
  // would abandon an install in progress.
  useEffect(() => {
    if (!update || busy) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDismissed(true) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [update, busy])

  if (!update || dismissed) return null


  const canInstall = typeof update.install === 'function'
  const notes = readNotes(update.notes)

  const run = async () => {
    setBusy(true)
    setFailed(false)
    try {
      // Accepting is the consent — download, install, and restart into the new
      // version without asking a second time.
      await update.install!((fraction, bytes) => { setProgress(fraction); setReceived(bytes) }, true)
      setStaged(true)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={() => { if (!busy) setDismissed(true) }}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Software update"
          initial={{ y: 14, scale: 0.98, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 440,
            background: 'var(--surface)',
            border: '2px solid var(--sketch-text)',
            boxShadow: '7px 7px 0px var(--sketch-text)',
            borderRadius: 12, overflow: 'hidden',
            color: 'var(--sketch-text)',
            fontFamily: "'Architects Daughter', var(--font-sans)",
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '20px 22px 0' }}>
            <div style={{
              width: 46, height: 46, flexShrink: 0, borderRadius: 11,
              border: '2px solid var(--sketch-text)', background: 'var(--sketch-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            }}>{staged ? '✅' : '✨'}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.2 }}>
                {staged ? 'Update installed' : 'A new version is available'}
              </div>
              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                {update.currentVersion} → {update.version}
              </div>
            </div>
          </div>

          {/* What changed */}
          {notes.length > 0 && !busy && !staged && (
            <div style={{
              margin: '16px 22px 0', padding: '12px 14px',
              background: 'var(--sketch-bg)', border: '1px solid var(--border)', borderRadius: 8,
              maxHeight: 190, overflowY: 'auto',
            }}>
              <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 7, letterSpacing: 0.3 }}>WHAT'S NEW</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontFamily: 'var(--font-sans)' }}>
                {notes.map((n, i) => (
                  <li key={i} style={{ fontSize: 13, lineHeight: 1.55, opacity: 0.85, marginBottom: 4 }}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Progress */}
          {busy && (
            <div style={{ margin: '18px 22px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>{progress === 1 ? 'Installing…' : 'Downloading…'}</span>
                <span style={{ fontFamily: 'var(--font-mono)', opacity: 0.75 }}>
                  {progress === null
                    ? `${(received / 1048576).toFixed(1)} MB`
                    : `${Math.round(progress * 100)}%`}
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--sketch-bg)', border: '2px solid var(--sketch-text)', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  className={progress === null ? 'bar-indeterminate' : undefined}
                  style={progress === null
                    ? { height: '100%', width: '35%', background: 'var(--sketch-text)' }
                    : {
                        height: '100%', width: `${Math.max(3, Math.round(progress * 100))}%`,
                        background: 'var(--sketch-text)', transition: 'width 0.25s ease-out',
                      }}
                />
              </div>
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 8, fontFamily: 'var(--font-sans)' }}>
                The app restarts into the new version when this finishes.
              </div>
            </div>
          )}

          {failed && !busy && (
            <div style={{ margin: '16px 22px 0', fontSize: 13, color: 'var(--cat-sec)', fontFamily: 'var(--font-sans)' }}>
              The update could not be installed. Try again, or download it manually.
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 22px 20px' }}>
            {busy ? (
              <span style={{ fontSize: 13, opacity: 0.6, alignSelf: 'center' }}>Please keep the app open…</span>
            ) : staged ? (
              <button
                onClick={() => relaunchApp()}
                style={{ ...btnBase, background: 'var(--sketch-text)', color: 'var(--sketch-bg)' }}
              >
                Restart now
              </button>
            ) : (
              <>
                <button
                  onClick={() => setDismissed(true)}
                  style={{ ...btnBase, background: 'transparent', color: 'var(--sketch-text)', borderColor: 'transparent' }}
                >
                  Remind me later
                </button>
                {canInstall ? (
                  <button onClick={run} style={{ ...btnBase, background: 'var(--sketch-text)', color: 'var(--sketch-bg)', boxShadow: '3px 3px 0px var(--sketch-text)' }}>
                    {failed ? 'Try again' : 'Install update'}
                  </button>
                ) : (
                  <a
                    href={RELEASES_URL} target="_blank" rel="noreferrer"
                    onClick={() => setDismissed(true)}
                    style={{ ...btnBase, background: 'var(--sketch-text)', color: 'var(--sketch-bg)', textDecoration: 'none', boxShadow: '3px 3px 0px var(--sketch-text)' }}
                  >
                    Download
                  </a>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
