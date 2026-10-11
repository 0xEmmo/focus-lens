import AxeBuilder from '@axe-core/playwright'
import { expect, type Frame, type Page, type TestInfo } from '@playwright/test'

export const isPhone = (info: TestInfo) => info.project.name === 'phone'

/** The sample page, which runs in its own frame. */
export const sample = (page: Page) => page.frameLocator('iframe.sample-frame')
export const sampleFrame = (page: Page): Frame => page.frames().find((f) => f.url().includes('/sample.html'))!

/** Opens the demo with clean storage and waits for the first audit. */
export async function open(page: Page, path = '/') {
  await page.goto(path)
  await expect(sample(page).locator('.ember')).toBeVisible()
  await expect(page.locator('.sheet-sum .mono, .score').first()).toBeVisible()
}

/** On a phone, the report lives in a bottom sheet. */
export async function showReport(page: Page, info: TestInfo) {
  if (!isPhone(info)) return
  const bar = page.locator('.sheet-bar')
  if ((await bar.getAttribute('aria-expanded')) !== 'true') await bar.click()
  await expect(page.locator('#sheet-panel')).toBeVisible()
}

export const panel = (page: Page) => page.locator('section.fl')

/** The overlay sits in an open shadow root; Playwright's CSS locators pierce it. */
export const overlay = (page: Page) => sample(page).locator('[data-focus-lens="overlay"]')
export const badges = (page: Page) => overlay(page).locator('.badge')

/** The demo itself must be clean. The sample page is broken on purpose, so it is checked separately. */
export async function expectAccessibleShell(page: Page) {
  const results = await new AxeBuilder({ page }).exclude('.page').analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
}
