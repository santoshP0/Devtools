// Sync the native window titlebar with the app theme (desktop only).
// Without this the macOS/Windows titlebar keeps the system appearance,
// which can render a light bar with white (invisible) title text.
// No-op in the browser; dynamic import keeps the Tauri API out of the web bundle.
export async function syncWindowTheme(theme: 'light' | 'dark') {
  if (!('__TAURI_INTERNALS__' in window)) return
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().setTheme(theme)
  } catch {
    // permission missing or not in a window context — leave chrome as-is
  }
}
