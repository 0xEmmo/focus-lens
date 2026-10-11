export const RESTRICTED =
  /^(chrome|edge|about|devtools|chrome-extension|view-source):|^https:\/\/chrome\.google\.com\/webstore|^https:\/\/chromewebstore\.google\.com/

/** Explains, in plain words, why Chrome said no. */
export function explain(url: string | undefined, error: unknown): string {
  if (!url) return 'There’s no page in this tab to audit yet.'
  if (RESTRICTED.test(url)) return 'Chrome doesn’t let extensions read its own pages or the Web Store. Open a normal website and try again.'
  if (url.startsWith('file:')) return 'To audit local files, turn on “Allow access to file URLs” for Focus Lens in chrome://extensions.'
  const msg = error instanceof Error ? error.message : String(error)
  if (/permission|Cannot access|activeTab/i.test(msg))
    return 'Focus Lens needs your OK for this tab. Click the Focus Lens icon in the toolbar while you’re on the page, then run the audit.'
  return msg || 'The page didn’t answer. Reload it and try again.'
}
