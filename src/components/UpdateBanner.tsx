import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { checkForUpdate, AvailableUpdate } from '../lib/updater'

// Checks for an update on launch (desktop only) and, if one exists, shows a
// themed banner offering a one-click install. No-op on the web.
export default function UpdateBanner() {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    checkForUpdate().then(u => { if (alive && u) setUpdate(u) })
    return () => { alive = false }
  }, [])

  if (!update || dismissed) return null

  const run = async () => {
    setBusy(true)
    setFailed(false)
    try {
      await update.install(setProgress) // relaunches on success
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
            Update available — v{update.version}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {busy
              ? `Downloading… ${Math.round(progress * 100)}%`
              : failed
                ? 'Update failed — try again or download manually.'
                : `You're on v${update.currentVersion}. Update and restart in one click.`}
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
            <button onClick={run}
              style={{
                padding: '7px 14px', borderRadius: 5, cursor: 'pointer',
                background: 'var(--sketch-text)', color: 'var(--sketch-bg)',
                border: '2px solid var(--sketch-text)', fontSize: 13, fontWeight: 700,
                fontFamily: "'Architects Daughter', var(--font-sans)", whiteSpace: 'nowrap',
              }}>
              {failed ? 'Retry' : 'Update'}
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
