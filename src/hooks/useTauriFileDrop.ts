import { useEffect, useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'

/**
 * Native file drag-and-drop for the desktop app. Browser drops only expose a
 * File object, but the ffmpeg-backed tools need a real filesystem path — so we
 * listen to Tauri's webview drag-drop event, which hands us the dropped paths.
 *
 * Returns `dragging` for hover feedback. `onPath` fires with the first dropped
 * path (optionally filtered to the given lowercase extensions).
 */
export function useTauriFileDrop(onPath: (path: string) => void, exts?: string[]) {
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!isTauri()) return
    let unlisten: (() => void) | undefined
    let active = true

    import('@tauri-apps/api/webview')
      .then(({ getCurrentWebview }) =>
        getCurrentWebview().onDragDropEvent(event => {
          const p = event.payload as { type: string; paths?: string[] }
          if (p.type === 'drop') {
            setDragging(false)
            const path = p.paths?.[0]
            if (!path) return
            if (exts && exts.length) {
              const e = path.split('.').pop()?.toLowerCase() ?? ''
              if (!exts.includes(e)) return
            }
            onPath(path)
          } else if (p.type === 'leave' || p.type === 'cancel') {
            setDragging(false)
          } else {
            // 'enter' / 'over'
            setDragging(true)
          }
        }),
      )
      .then(fn => { if (active) unlisten = fn; else fn() })
      .catch(() => {})

    return () => { active = false; unlisten?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { dragging }
}
