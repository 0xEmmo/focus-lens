import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './extension/manifest.config'

/** The Chrome extension: side panel, on-demand content script and a tiny service worker. */
export default defineConfig({
  root: resolve(import.meta.dirname, 'extension'),
  publicDir: resolve(import.meta.dirname, 'extension/public'),
  plugins: [react(), crx({ manifest })],
  build: {
    outDir: resolve(import.meta.dirname, 'dist-ext'),
    emptyOutDir: true,
  },
})
