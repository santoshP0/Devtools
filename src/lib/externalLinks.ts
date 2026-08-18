import { isTauri } from '@tauri-apps/api/core'

/**
 * Make external links work in the desktop app.
 *
 * A Tauri webview has nowhere to send `target="_blank"`, so plain anchors are
 * silently inert — every GitHub, docs and download link in the app did nothing
 * when clicked. One delegated listener catches them all and hands the URL to the
 * OS, so links keep working without each page needing to know it's in the app.
 */
export function installExternalLinkHandler() {
  if (typeof window === 'undefined' || !isTauri()) return

  window.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return
    const a = (e.target as HTMLElement | null)?.closest?.('a') as HTMLAnchorElement | null
    if (!a) return
    const href = a.getAttribute('href') ?? ''
    // in-app routes and anchors stay with the router
    if (!/^(https?|mailto):/i.test(href)) return
    e.preventDefault()
    import('@tauri-apps/plugin-opener')
      .then(({ openUrl }) => openUrl(href))
      .catch(() => { /* nothing sensible to fall back to inside the webview */ })
  }, true) // capture, so it runs before React's handlers
}
