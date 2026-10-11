import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** The demo web app: the sample page with the Focus Lens panel docked beside it. */
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Focus Lens: keyboard accessibility audits',
        short_name: 'Focus Lens',
        description: 'See a page the way a keyboard does: tab order, focus traps, missing names and contrast, drawn on the page.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#161616',
        theme_color: '#161616',
        categories: ['developer', 'productivity', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,jpg}'],
        // The extension download is for online use; no need to keep it on the device.
        globIgnores: ['**/*.zip'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/sample/, /\.zip$/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        sample: resolve(import.meta.dirname, 'sample.html'),
      },
    },
  },
})
