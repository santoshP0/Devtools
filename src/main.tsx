import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { syncWindowTheme } from './lib/windowTheme'
import { isTauri } from '@tauri-apps/api/core'
import { installExternalLinkHandler } from './lib/externalLinks'

registerSW({ immediate: true })

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
