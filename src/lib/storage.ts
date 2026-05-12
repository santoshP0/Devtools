import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.error(error)
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue] as const
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
