import { useState, useRef, useCallback } from 'react'

/**
 * Hook for drag-and-drop file handling with a hidden file input.
 * Returns drag state, input ref, event handlers, and a picker trigger.
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

  const openPicker = useCallback(() => inputRef.current?.click(), [])

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
