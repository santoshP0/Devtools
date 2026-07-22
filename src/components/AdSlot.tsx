import { useEffect, useRef } from 'react'

const CLIENT = 'ca-pub-7177654317581740'

// Ad unit IDs from AdSense → Ads → By ad unit. Fill these in after creating
// the units; an empty id renders nothing in production (never an empty <ins>).
export const AD_SLOTS = {
  railLeft: '',
  railRight: '',
} as const

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

// No ads inside the desktop app — it ships without a network ad surface.
const IN_APP = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export default function AdSlot({ slot, className, style }: {
  slot: string
  className?: string
  style?: React.CSSProperties
}) {
  const pushed = useRef(false)

  useEffect(() => {
    if (IN_APP || !slot || pushed.current) return
    pushed.current = true // StrictMode runs effects twice; only push once per <ins>
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // adsbygoogle.js blocked or not loaded yet — leave the slot empty
    }
  }, [slot])

  if (IN_APP) return null

  // Without a unit id, show a labelled placeholder while developing so the
  // layout is visible, and render nothing at all in production.
  if (!slot) {
    if (!import.meta.env.DEV) return null
    return (
      <div className={className} style={{
        ...style,
        border: '1px dashed var(--border)',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)',
      }}>
        Ad slot
      </div>
    )
  }

  return (
    <ins
      className={`adsbygoogle ${className ?? ''}`}
      style={{ display: 'block', ...style }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}
