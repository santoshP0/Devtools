import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { syncWindowTheme } from './lib/windowTheme'
import { isTauri } from '@tauri-apps/api/core'
import { installExternalLinkHandler } from './lib/externalLinks'

// autoUpdate + skipWaiting means a new build takes over as soon as it's found.
// The reload below applies it to the page that's already open, once.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    // Long-lived tabs would otherwise never notice a deploy.
    if (registration) setInterval(() => registration.update(), 60 * 60 * 1000)
  },
})
if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
  // Whether this page was already being served by a worker. On a first visit it
  // isn't: clientsClaim hands the page to the brand-new worker and fires
  // controllerchange, and reloading on that would bounce every new visitor for
  // no reason. Only an actual swap — one worker replacing another — matters.
  const hadController = Boolean(navigator.serviceWorker.controller)
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })
}

// Desktop: lock the window and let only the content pane scroll (see .app-shell
// in index.css). Set before first paint so there's no scrollbar flash.
if (isTauri()) {
  document.documentElement.classList.add('app-shell')
  // Native desktop app experience: disable default browser context menu (Inspect Element, etc.)
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault()
  })

  // Prevent mouse back/forward buttons (button 3 & 4) from navigating back to home
  ;['mousedown', 'mouseup', 'click', 'auxclick'].forEach(evt => {
    window.addEventListener(evt, (e: Event) => {
      const me = e as MouseEvent
      if (me.button === 3 || me.button === 4) {
        e.preventDefault()
        e.stopPropagation()
      }
    }, true)
  })

  // Prevent keyboard back shortcuts from kicking user to home
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    const isEditable = Boolean(target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ))

    if (e.key === 'Backspace') {
      if (!isEditable) e.preventDefault()
    }
    if (!isEditable && ((e.altKey && e.key === 'ArrowLeft') || ((e.metaKey || e.ctrlKey) && e.key === '['))) {
      e.preventDefault()
    }
  }, true)
}

// Route external links to the system browser (they do nothing in a webview).
installExternalLinkHandler()

// Match the native titlebar to the saved app theme on desktop launch
syncWindowTheme(localStorage.getItem('dt-theme') === 'dark' ? 'dark' : 'light')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Browser/PWA only: the desktop app uses the compact support button in the
// navbar instead of loading Buy Me a Coffee's floating web widget.
if (!isTauri()) {
  const buyMeACoffeeWidget = document.createElement('script')
  buyMeACoffeeWidget.src = 'https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js'
  buyMeACoffeeWidget.setAttribute('data-name', 'BMC-Widget')
  buyMeACoffeeWidget.setAttribute('data-cfasync', 'false')
  buyMeACoffeeWidget.setAttribute('data-id', 'santosh.pk')
  buyMeACoffeeWidget.setAttribute('data-description', 'Support me on Buy me a coffee!')
  buyMeACoffeeWidget.setAttribute('data-message', '')
  buyMeACoffeeWidget.setAttribute('data-color', '#5F7FFF')
  buyMeACoffeeWidget.setAttribute('data-position', 'Right')
  buyMeACoffeeWidget.setAttribute('data-x_margin', '18')
  buyMeACoffeeWidget.setAttribute('data-y_margin', '18')
  document.body.appendChild(buyMeACoffeeWidget)
}
