import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { syncWindowTheme } from './lib/windowTheme'

registerSW({ immediate: true })

// Match the native titlebar to the saved app theme on desktop launch
syncWindowTheme(localStorage.getItem('dt-theme') === 'dark' ? 'dark' : 'light')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
