import { expect, test } from '@playwright/test'
import { badges, expectAccessibleShell, isPhone, open, overlay, panel, sample } from './helpers'

test('the sample page works like a real booking page', async ({ page }) => {
  await open(page)
  const ember = sample(page).locator('.ember')
  await ember.getByRole('button', { name: 'Tue 13' }).click()
  await expect(ember.getByRole('button', { name: 'Tue 13' })).toHaveAttribute('aria-pressed', 'true')
  await ember.locator('.time', { hasText: '20:15' }).click()
  await ember.getByLabel('Tickets').selectOption('3')
  await expect(ember.getByRole('button', { name: 'Pay ₦11,250' })).toBeVisible()
  await ember.getByRole('button', { name: /Pay/ }).click()
  await expect(ember.getByText('Enter the email address your tickets should go to.')).toBeVisible()
  await ember.getByPlaceholder('Email for your tickets').fill('ada@example.com')
  await ember.getByRole('button', { name: /Pay/ }).click()
  await expect(ember.getByRole('status').filter({ hasText: 'Booked' })).toContainText('3 tickets for Tue 13 at 20:15, sent to ada@example.com')
})

test('chat replies', async ({ page }) => {
  await open(page)
  const chat = sample(page).locator('.chat')
  await chat.getByRole('textbox', { name: 'Message' }).fill('Can I pay by transfer?')
  await chat.getByRole('button', { name: 'Send' }).click()
  await expect(chat.locator('.bub.you')).toHaveText('Can I pay by transfer?')
  await expect(chat.locator('.bub.ada')).toHaveCount(2)
})

test('about and extension dialogs open, close on Escape and return focus', async ({ page }, info) => {
  await open(page)
  const about = isPhone(info) ? page.getByRole('button', { name: 'About Focus Lens' }) : page.getByRole('button', { name: 'About' })
  await about.click()
  const dlg = page.getByRole('dialog', { name: 'About Focus Lens' })
  await expect(dlg).toBeVisible()
  await expect(dlg.getByRole('link', { name: /refreshable braille display/i })).toHaveAttribute('href', /commons\.wikimedia\.org/)
  await expectAccessibleShell(page)
  await page.keyboard.press('Escape')
  await expect(dlg).toBeHidden()
  await expect(about).toBeFocused()

  await page.getByRole('button', { name: 'Get the extension' }).click()
  const ext = page.getByRole('dialog', { name: 'Use it on any site' })
  const link = ext.getByRole('link', { name: 'Download the extension (.zip)' })
  const res = await page.request.get((await link.getAttribute('href'))!)
  expect(res.status()).toBe(200)
  expect((await res.body()).subarray(0, 2).toString()).toBe('PK')
  await ext.getByRole('button', { name: 'Close' }).click()
  await expect(ext).toBeHidden()
})

test('closing the panel takes the overlay with it', async ({ page }, info) => {
  test.skip(isPhone(info), 'The phone report is a sheet, not a closable panel')
  await open(page)
  await expect(badges(page)).toHaveCount(20)
  await panel(page).getByRole('button', { name: 'Close Focus Lens' }).click()
  await expect(panel(page)).toHaveCount(0)
  await expect(badges(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Open Focus Lens' }).click()
  await expect(badges(page)).toHaveCount(20)
  await expect(page.getByRole('button', { name: 'Focus Lens', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('the phone sheet opens and closes', async ({ page }, info) => {
  test.skip(!isPhone(info), 'Phone layout only')
  await open(page)
  const bar = page.locator('.sheet-bar')
  await expect(bar).toContainText('9 issues')
  await expect(bar).toContainText('3 critical')
  await bar.click()
  await expect(bar).toHaveAttribute('aria-expanded', 'true')
  await expect(panel(page).getByRole('button', { name: 'Tab order' })).toBeVisible()
  await bar.click()
  await expect(page.locator('#sheet-panel')).toBeHidden()
})

test('works offline once installed', async ({ page, context }) => {
  await open(page)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // The first visit installs the worker; the second is controlled by it.
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await context.setOffline(true)
  await page.reload()
  await expect(sample(page).locator('.ember')).toBeVisible()
  await expect(page.locator('.sheet-sum .mono, .score').first()).toBeVisible()
  await expect(sample(page).locator('.poster img')).toHaveJSProperty('complete', true)
  expect(await sample(page).locator('.poster img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
  await context.setOffline(false)
})

test('respects reduced motion', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  if (isPhone(info)) await page.locator('.sheet-bar').click()
  await panel(page).getByRole('button', { name: 'Show on page' }).first().click()
  const focus = overlay(page).locator('.focus').first()
  await expect(focus).toBeVisible()
  expect(await focus.evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
})

test('the standalone sample page is there to try the extension on', async ({ page }) => {
  await page.goto('/sample.html')
  await expect(page.getByRole('heading', { name: 'The Ferryman of Epe' })).toBeVisible()
  await expect(page.locator('[data-focus-lens]')).toHaveCount(0)
})
