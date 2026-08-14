import { syncWindowTheme } from './windowTheme'

export type Theme = 'light' | 'dark'

// Apply a theme everywhere: the <html> attribute (drives all CSS + useIsDark),
// the saved preference, the favicon, and the native window chrome on desktop.
export function applyTheme(next: Theme) {
  document.documentElement.dataset.theme = next
  try { localStorage.setItem('dt-theme', next) } catch { /* ignore */ }
  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (favicon) favicon.href = next === 'dark' ? '/AppIconDarkTheme.png' : '/AppIconLightTheme.png'
  syncWindowTheme(next)
}

// Animated theme switch: the new theme reveals in an expanding circle from the
// click point via the View Transitions API. Falls back to an instant switch
// where it's unsupported (older WebKit) or when reduced-motion is requested.
export function switchTheme(next: Theme, origin?: { x: number; y: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startVT = (document as any).startViewTransition?.bind(document)
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!startVT || !origin || reduce) {
    applyTheme(next)
    return
  }
  const { x, y } = origin
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
  const vt = startVT(() => applyTheme(next))
  vt.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        // pseudoElement isn't in the DOM typings yet
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { duration: 480, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' } as any,
      )
    })
    .catch(() => { /* transition aborted — theme already applied */ })
}
