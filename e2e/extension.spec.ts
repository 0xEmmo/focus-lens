import { test as base, chromium, expect, type BrowserContext, type Worker } from '@playwright/test'
import { resolve } from 'node:path'

const EXT = resolve(import.meta.dirname, '../dist-ext')

/** A Chromium profile with the unpacked extension loaded. */
const test = base.extend<{ context: BrowserContext; worker: Worker; extensionId: string }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
      viewport: { width: 1280, height: 860 },
    })
    await use(context)
    await context.close()
  },
  worker: async ({ context }, use) => {
    await use(context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker')))
  },
  extensionId: async ({ worker }, use) => {
    await use(new URL(worker.url()).host)
  },
})

async function openPanelFor(context: BrowserContext, worker: Worker, extensionId: string, url: string) {
  const page = await context.newPage()
  await page.goto(url)
  const tabId = await worker.evaluate(async (u) => (await chrome.tabs.query({})).find((t) => t.url === u)?.id, page.url())
  const side = await context.newPage()
  await side.goto(`chrome-extension://${extensionId}/sidepanel.html?tab=${tabId}`)
  return { page, side }
}

test('audits a real tab and draws on it', async ({ context, worker, extensionId, baseURL }) => {
  const { page, side } = await openPanelFor(context, worker, extensionId, `${baseURL}/sample.html`)
  await expect(page.getByRole('heading', { name: 'The Ferryman of Epe' })).toBeVisible()
  await expect(side.getByText('localhost:4176')).toBeVisible()
  await side.getByRole('button', { name: 'Run audit' }).click()
  await expect(side.locator('.score')).toContainText('9issues total')
  await expect(side.getByRole('button', { name: /Keyboard gets stuck in “Chat with Ember”/ })).toBeVisible()
  await expect(page.locator('[data-focus-lens="overlay"] .badge')).toHaveCount(20)

  await side.getByRole('button', { name: 'Tab order' }).click()
  await expect(page.locator('[data-focus-lens="overlay"] .badge')).toHaveCount(0)

  await side.getByRole('button', { name: /Focus jumps to “Terms”/ }).click()
  await side.getByRole('button', { name: 'Show on page' }).click()
  await expect(page.locator('[data-focus-lens="overlay"] .focus')).toHaveCount(1)
})

test('says plainly when Chrome will not let it in', async ({ context, worker, extensionId }) => {
  const { side } = await openPanelFor(context, worker, extensionId, 'chrome://version/')
  await side.getByRole('button', { name: 'Run audit' }).click()
  await expect(side.getByRole('alert')).toContainText('Chrome doesn’t let extensions read its own pages')
})

test('the manifest asks for as little as it can', async () => {
  const { readFileSync } = await import('node:fs')
  const manifest = JSON.parse(readFileSync(resolve(EXT, 'manifest.json'), 'utf8'))
  expect(manifest.manifest_version).toBe(3)
  expect(manifest.permissions.sort()).toEqual(['activeTab', 'scripting', 'sidePanel', 'storage'])
  expect(manifest.side_panel.default_path).toBe('sidepanel.html')
})
