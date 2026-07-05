import { useState, useCallback, useRef } from 'react'
import { useToast } from '../components/Toast'

/**
 * Hook for clipboard copy with auto-reset "copied" state + toast notification.
 * `copied` is `true` (or the key string) while the feedback is showing.
 */
export function useClipboardCopy(timeout = 1500) {
  const [copied, setCopied] = useState<string | boolean>(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const toast = useToast()

  const copy = useCallback((text: string, key?: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key ?? true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), timeout)
      toast.show('Copied to clipboard')
    })
  }, [timeout, toast])

  return { copied, copy } as const
}
