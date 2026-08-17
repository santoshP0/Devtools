import { useEffect, useRef } from 'react'
import { isTauri } from '@tauri-apps/api/core'

/**
 * "Open with DevToolbox": a file opened from Finder/Explorer is routed to the
 * tool that handles its type. Rust queues the paths and emits `open-files`; the
 * bridge (mounted once in App) navigates, and the destination tool picks the
 * file up with useOpenedFile — which also covers the case where the tool mounts
 * after the event fired.
 */
const ROUTES: Record<string, string> = {
  json: '/json-formatter',
  csv: '/csv-viewer', tsv: '/csv-viewer',
  yaml: '/yaml-json', yml: '/yaml-json',
  toml: '/toml-json',
  xml: '/json-xml',
  md: '/markdown-preview', markdown: '/markdown-preview',
  log: '/log-prettifier',
  png: '/image-converter', jpg: '/image-converter', jpeg: '/image-converter',
  webp: '/image-converter', heic: '/image-converter', tiff: '/image-converter', tif: '/image-converter',
}

export const routeForFile = (path: string) => ROUTES[(path.split('.').pop() || '').toLowerCase()]

// Paths waiting for their tool to mount, keyed by route.
const pending = new Map<string, string[]>()

export function queueForRoute(route: string, path: string) {
  pending.set(route, [...(pending.get(route) ?? []), path])
}
export function takeForRoute(route: string): string[] {
  const v = pending.get(route) ?? []
  pending.delete(route)
  return v
}

/** Reads a queued path into a File (bytes come from Rust). */
async function fileFromPath(path: string): Promise<File> {
  const { invoke } = await import('@tauri-apps/api/core')
  const buf = await invoke<ArrayBuffer>('read_file', { path })
  return new File([buf as BlobPart], path.split(/[\\/]/).pop() || 'file')
}

/**
 * In a tool page: receive a file the user opened from Finder/Explorer. Fires
 * once per opened file, including one that arrived before this page mounted.
 */
export function useOpenedFile(route: string, onFile: (file: File, path: string) => void) {
  const cb = useRef(onFile)
  cb.current = onFile
  useEffect(() => {
    if (!isTauri()) return
    let cancelled = false
    const drain = async () => {
      for (const path of takeForRoute(route)) {
        const file = await fileFromPath(path)
        if (!cancelled) cb.current(file, path)
      }
    }
    drain()
    // A second file opened while this tool is already on screen.
    let un: (() => void) | undefined
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<string[]>('open-files', e => {
        for (const p of e.payload) if (routeForFile(p) === route) queueForRoute(route, p)
        drain()
      }).then(f => { if (cancelled) f(); else un = f })
    })
    return () => { cancelled = true; un?.() }
  }, [route])
}
