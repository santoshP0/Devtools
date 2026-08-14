import { useLocalStorage } from './storage'

/**
 * App-wide user settings, persisted to localStorage and kept in sync across
 * every component (useLocalStorage broadcasts changes). Add new fields here
 * with a sensible default and they show up merged over any saved value, so
 * older saved blobs keep working as the settings list grows.
 */
export interface Settings {
  /** Show starred tools in the home rail and the tool switcher drawer. */
  favoritesQuickAccess: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  favoritesQuickAccess: true,
}

const KEY = 'devtoolbox-settings'

export function useSettings() {
  const [saved, setSaved] = useLocalStorage<Partial<Settings>>(KEY, {})
  const settings: Settings = { ...DEFAULT_SETTINGS, ...saved }

  const setSetting = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSaved(prev => ({ ...prev, [key]: value }))

  return { settings, setSetting }
}
