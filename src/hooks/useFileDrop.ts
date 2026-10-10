import { useState, useRef, useCallback } from 'react'
import { isTauri } from '@tauri-apps/api/core'

/**
 * Hook for drag-and-drop file handling with a hidden file input.
 * In desktop mode (Tauri), openPicker uses the native OS dialog with strict
 * extension filtering so macOS/Windows grey out unallowed file types.
 */
export function useFileDrop(onFile: (file: File) => void, accept?: string) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setDragging(false), [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }, [onFile])

  const openPicker = useCallback(async () => {
    if (isTauri() && accept) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog')
        const exts: string[] = []
        for (const part of accept.split(',')) {
          const trimmed = part.trim()
          if (trimmed.startsWith('.')) {
            exts.push(trimmed.slice(1).toLowerCase())
          } else if (trimmed === 'image/*' || trimmed.startsWith('image/')) {
            exts.push('png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'avif')
          } else if (trimmed === 'video/*' || trimmed.startsWith('video/')) {
            exts.push('mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v')
          }
        }
        if (exts.length > 0) {
          const res = await open({
            multiple: false,
            filters: [{
              name: 'Supported Files',
              extensions: Array.from(new Set(exts)),
            }],
          })
          if (typeof res === 'string' && res) {
            const { invoke } = await import('@tauri-apps/api/core')
            const buf = await invoke<ArrayBuffer>('read_file', { path: res })
            const name = res.split(/[\\/]/).pop() || 'file'
            onFile(new File(buf ? [buf as BlobPart] : [], name))
            return
          }
          if (res === null) return // User cancelled
        }
      } catch (err) {
        console.error('Failed to open native dialog in useFileDrop:', err)
      }
    }
    inputRef.current?.click()
  }, [accept, onFile])

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onFile(f)
    if (inputRef.current) inputRef.current.value = ''
  }, [onFile])

  return {
    dragging,
    inputRef,
    dragProps: { onDragOver, onDragLeave, onDrop },
    openPicker,
    onInputChange,
    accept,
  } as const
}
