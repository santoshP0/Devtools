import { useState, useEffect, useCallback } from 'react'

const SYNC_EVENT = 'devtoolbox:local-storage'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const read = useCallback((): T => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
    // initialValue is intentionally read once; callers pass a stable literal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const [storedValue, setStoredValue] = useState<T>(read)

  // Write through on set, then broadcast so every other hook bound to this key
  // (e.g. the favourites panel and the card stars) updates in the same tick.
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
        window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: key }))
      } catch (error) {
        console.error(error)
      }
      return next
    })
  }, [key])

  useEffect(() => {
    const sync = () => setStoredValue(prev => {
      const cur = read()
      return JSON.stringify(cur) === JSON.stringify(prev) ? prev : cur
    })
    const onCustom = (e: Event) => { if ((e as CustomEvent).detail === key) sync() }
    window.addEventListener(SYNC_EVENT, onCustom)
    window.addEventListener('storage', sync)  // sync across tabs too
    return () => {
      window.removeEventListener(SYNC_EVENT, onCustom)
      window.removeEventListener('storage', sync)
    }
  }, [key, read])

  return [storedValue, setValue] as const
}

export function useHistory() {
  const [recent, setRecent] = useLocalStorage<string[]>('recent-tools', [])

  const trackVisit = (slug: string) => {
    setRecent(prev => {
      const filtered = prev.filter(s => s !== slug)
      return [slug, ...filtered].slice(0, 10) // keep last 10
    })
  }

  return { recent, trackVisit }
}

export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<string[]>('favorite-tools', [])

  const toggleFavorite = (slug: string) => {
    setFavorites(prev => 
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
  }

  const isFavorite = (slug: string) => favorites.includes(slug)

  return { favorites, toggleFavorite, isFavorite }
}
