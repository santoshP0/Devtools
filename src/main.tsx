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
if (isTauri()) document.documentElement.classList.add('app-shell')

// Route external links to the system browser (they do nothing in a webview).
installExternalLinkHandler()

// Match the native titlebar to the saved app theme on desktop launch
syncWindowTheme(localStorage.getItem('dt-theme') === 'dark' ? 'dark' : 'light')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
