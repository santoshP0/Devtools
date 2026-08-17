import { useEffect, useRef } from 'react'
import { isTauri } from '@tauri-apps/api/core'

export interface DroppedFile { path: string; file: File }

// Native drops give a path, not a File — so File.type would be empty and tools
// that gate on `type.startsWith('image/')` reject valid files. Infer it from ext.
const MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml', avif: 'image/avif',
  heic: 'image/heic', heif: 'image/heif', tif: 'image/tiff', tiff: 'image/tiff',
  csv: 'text/csv', tsv: 'text/tab-separated-values', json: 'application/json', txt: 'text/plain',
}
const mimeOf = (name: string) => MIME[(name.split('.').pop() || '').toLowerCase()] || ''

/**
 * Native OS file drag-drop for the desktop app. In the Tauri webview, Tauri
 * intercepts Finder/Explorer file drops and the HTML `onDrop` never fires — so
 * tools that rely on drag-drop are dead on desktop without this. It reads each
 * dropped path's bytes and wraps them in a File, so the tools' existing
 * File-based handlers work unchanged. No-op on web (HTML drag-drop works there).
 */
export function useNativeDrop(onDrop: (items: DroppedFile[]) => void, active = true) {
  const cb = useRef(onDrop)
  cb.current = onDrop
  useEffect(() => {
    if (!active || !isTauri()) return
    let un: (() => void) | undefined
    let disposed = false
    import('@tauri-apps/api/webview').then(({ getCurrentWebview }) => {
      getCurrentWebview()
        .onDragDropEvent(async e => {
          if (e.payload.type !== 'drop' || e.payload.paths.length === 0) return
          const { invoke } = await import('@tauri-apps/api/core')
          const items = await Promise.all(
            e.payload.paths.map(async path => {
              const buf = await invoke<ArrayBuffer>('read_file', { path })
              const name = path.split(/[\\/]/).pop() || 'file'
              return { path, file: new File([buf as BlobPart], name, { type: mimeOf(name) }) }
            }),
          )
          cb.current(items)
        })
        .then(f => { if (disposed) f(); else un = f })
    })
    return () => { disposed = true; un?.() }
  }, [active])
}

/**
 * Paste an image from the clipboard (⌘/Ctrl+V) straight into a tool — e.g. paste
 * a screenshot to convert or encode it. Uses the DOM paste event, so it works on
 * web and in the desktop webview with no extra dependency.
 */
export function usePasteImage(onImage: (file: File) => void, active = true) {
  const cb = useRef(onImage)
  cb.current = onImage
  useEffect(() => {
    if (!active) return
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const it of items) {
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const f = it.getAsFile()
          if (f) { e.preventDefault(); cb.current(f); return }
        }
      }
    }
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [active])
}
