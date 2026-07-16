import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      includeAssets: ['AppIconLightTheme.png', 'AppIconDarkTheme.png'],
      manifest: {
        name: 'DevToolbox',
        short_name: 'DevToolbox',
        description: 'Elite Developer Utilities - Offline First',
        theme_color: '#0a0a0c',
        icons: [
          {
            src: 'AppIconLightTheme.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    include: ['qrcode'],
  },
  server: {
    // keep vite's watcher out of the Rust build output — it's huge and
    // makes dev startup hang after a tauri build
    watch: { ignored: ['**/src-tauri/**'] },
  },
})
