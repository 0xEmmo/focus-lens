/**
 * Renders the app and extension icons from the lens mark.
 * Run with: npx tsx scripts/make-icons.ts (needs Playwright's Chromium).
 */
import { writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const mark = (size: number, pad: number, rounded: boolean) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  <rect width="24" height="24" rx="${rounded ? 6 : 0}" fill="#161616"/>
  <g transform="translate(${pad} ${pad}) scale(${(24 - pad * 2) / 24})" fill="none" stroke="#ffd400" stroke-linecap="round">
    <circle cx="11" cy="11" r="5.2" stroke-width="2.3"/>
    <path d="M15.2 15.2l4 4M8.6 11h4.8" stroke-width="2.3"/>
  </g>
</svg>`

const app = [
  { file: 'public/icons/icon-192.png', size: 192, pad: 1, rounded: true },
  { file: 'public/icons/icon-512.png', size: 512, pad: 1, rounded: true },
  // Maskable icons are cropped to a circle or squircle: keep the lens inside the safe zone.
  { file: 'public/icons/maskable-512.png', size: 512, pad: 4.5, rounded: false },
  { file: 'public/icons/apple-touch-icon.png', size: 180, pad: 3, rounded: false },
  ...[16, 32, 48, 128].map((size) => ({ file: `extension/public/icons/icon-${size}.png`, size, pad: size < 32 ? 0 : 1, rounded: true })),
]

writeFileSync('public/icons/favicon.svg', mark(32, 0.5, true).trim())
writeFileSync(
  'public/icons/sample-favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#7a1f2b"/><text x="16" y="23" font-family="Georgia,serif" font-weight="700" font-size="20" fill="#fbf7f2" text-anchor="middle">E</text></svg>`,
)
const browser = await chromium.launch()
const page = await browser.newPage()
for (const icon of app) {
  await page.setViewportSize({ width: icon.size, height: icon.size })
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${mark(icon.size, icon.pad, icon.rounded)}`)
  await page.locator('svg').screenshot({ path: icon.file, omitBackground: true })
}
await browser.close()
