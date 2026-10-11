import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { badges, expectAccessibleShell, isPhone, open, overlay, panel, sample, sampleFrame, showReport } from './helpers'

test('audits the sample on load and draws the tab order', async ({ page }, info) => {
  await open(page)
  await showReport(page, info)
  const score = panel(page).locator('.score')
  await expect(score).toContainText('20tab stops')
  await expect(score).toContainText('3critical')
  await expect(score).toContainText('9issues total')
  await expect(badges(page)).toHaveCount(20)
  await expect(panel(page).getByRole('button', { name: /Keyboard gets stuck in “Chat with Ember”/ })).toHaveAttribute('aria-expanded', 'true')
  await expectAccessibleShell(page)
})

test('the flaws it reports are real: axe agrees about the sample', async ({ page }) => {
  await page.goto('/sample.html')
  await expect(page.locator('.ember')).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  const ids = results.violations.map((v) => v.id)
  // axe accepts a placeholder as a name and can't see the script-made trap: that is the gap Focus Lens fills.
  expect(ids).toEqual(expect.arrayContaining(['color-contrast', 'tabindex', 'heading-order', 'landmark-one-main']))
})

test('the chat really traps the keyboard until it is fixed', async ({ page }, info) => {
  await open(page)
  const chat = sample(page).locator('.chat')
  await chat.getByRole('textbox', { name: 'Message' }).focus()
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab')
  expect(await sampleFrame(page).evaluate(() => !!document.activeElement?.closest('.chat'))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(chat).toBeVisible()

  await showReport(page, info)
  await panel(page).getByRole('button', { name: 'Fix it in the sample' }).click()
  await expect(page.locator('.announce')).toContainText('Escape now closes the chat')
  if (isPhone(info)) await page.locator('.sheet-bar').click()
  await chat.getByRole('textbox', { name: 'Message' }).focus()
  await page.keyboard.press('Escape')
  await expect(chat).toBeHidden()
  await expect(sample(page).getByRole('button', { name: 'Chat with Ada' })).toBeFocused()
})

test('fixing flaws re-runs the audit, persists, and can be undone', async ({ page }, info) => {
  await open(page)
  await showReport(page, info)
  const p = panel(page)
  await p.getByRole('button', { name: /Email field has no label/ }).click()
  await p.getByRole('button', { name: 'Fix it in the sample' }).click()
  await expect(page.locator('.announce')).toHaveText('Fixed: The email field has a visible label. 8 issues left.')
  await expect(sample(page).getByLabel('Email for your tickets')).toBeVisible()

  await page.reload()
  await expect(sample(page).locator('.ember')).toBeVisible()
  await showReport(page, info)
  await expect(p.locator('.score')).toContainText('8issues total')
  await expect(p.getByText(/1\/9 fixed/)).toBeVisible()
  await p.getByRole('button', { name: 'Undo fixes' }).click()
  await expect(p.locator('.score')).toContainText('9issues total')
})

test('fix everything and the page comes back clean', async ({ page }, info) => {
  await open(page)
  await showReport(page, info)
  const p = panel(page)
  for (let i = 0; i < 9; i++) {
    // Work down the list: open the top issue if it isn't already, then fix it.
    const top = p.locator('.iss-toggle').first()
    if ((await top.getAttribute('aria-expanded')) !== 'true') await top.click()
    await p.getByRole('button', { name: 'Fix it in the sample' }).first().click()
    await expect(p.getByText(`${i + 1}/9 fixed`)).toBeVisible()
  }
  await expect(p.getByText('No issues found')).toBeVisible()
  await expect(p.locator('.score')).toContainText('0critical')
})

test('layer toggles change the overlay and are remembered', async ({ page }, info) => {
  await open(page)
  await showReport(page, info)
  const order = panel(page).getByRole('button', { name: 'Tab order' })
  await order.click()
  await expect(order).toHaveAttribute('aria-pressed', 'false')
  await expect(badges(page)).toHaveCount(0)
  await panel(page).getByRole('button', { name: 'Headings' }).click()
  await expect(overlay(page).locator('.heading-tag')).toHaveText(['H1', 'H3'])
  await page.reload()
  await showReport(page, info)
  await expect(panel(page).getByRole('button', { name: 'Tab order' })).toHaveAttribute('aria-pressed', 'false')
  await expect(panel(page).getByRole('button', { name: 'Headings' })).toHaveAttribute('aria-pressed', 'true')
})

test('exports a Markdown report', async ({ page }, info) => {
  await open(page)
  await showReport(page, info)
  await panel(page).getByRole('button', { name: /Export report/ }).click()
  const [download] = await Promise.all([page.waitForEvent('download'), panel(page).getByRole('button', { name: /Markdown/ }).click()])
  expect(download.suggestedFilename()).toMatch(/^focus-lens-embercinemas\.ng-\d{4}-\d{2}-\d{2}\.md$/)
  const text = await (await download.createReadStream()).toArray()
  const md = Buffer.concat(text).toString('utf8')
  expect(md).toContain('# Focus Lens report: Book: The Ferryman of Epe')
  expect(md).toContain('### Keyboard gets stuck in “Chat with Ember”')
})

test('copies a GitHub issue to the clipboard', async ({ page }, info) => {
  test.skip(isPhone(info), 'Clipboard permissions are granted on the desktop project')
  await open(page)
  await panel(page).getByRole('button', { name: /Copy as GitHub issue/ }).click()
  await expect(panel(page).locator('.note')).toContainText('Copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('a11y: 9 keyboard and contrast issues on embercinemas.ng')
})

test('"Show on page" outlines the problem', async ({ page }, info) => {
  await open(page)
  await showReport(page, info)
  await panel(page).getByRole('button', { name: /Focus jumps to “Terms”/ }).click()
  await panel(page).getByRole('button', { name: 'Show on page' }).click()
  await expect(overlay(page).locator('.focus')).toHaveCount(1)
  await expect(sample(page).locator('.foot').getByRole('link', { name: 'Terms' })).toBeInViewport()
  if (isPhone(info)) {
    // The sheet gets out of the way and focus lands on its handle, not on nothing.
    await expect(page.locator('#sheet-panel')).toBeHidden()
    await expect(page.locator('.sheet-bar')).toBeFocused()
  }
})
