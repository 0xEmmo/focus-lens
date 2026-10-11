import { defineManifest } from '@crxjs/vite-plugin'
import pkg from '../package.json'

/**
 * activeTab + scripting: Focus Lens can only read a page after you click it
 * there. The e2e build adds host access so tests can drive it without a click.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'Focus Lens',
  short_name: 'Focus Lens',
  version: pkg.version,
  description: 'See a page the way a keyboard does: tab order, focus traps, missing names and contrast failures, drawn on the page.',
  icons: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' },
  action: { default_title: 'Open Focus Lens', default_icon: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' } },
  side_panel: { default_path: 'sidepanel.html' },
  background: { service_worker: 'src/background.ts', type: 'module' },
  permissions: ['activeTab', 'scripting', 'sidePanel', 'storage'],
  ...(process.env.FL_E2E ? { host_permissions: ['<all_urls>'] } : {}),
  minimum_chrome_version: '116',
})
