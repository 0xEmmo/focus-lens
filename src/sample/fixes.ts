/** Every deliberate flaw in the sample page, and the fix the demo can apply for it. */
export type FixKey =
  'chat-trap' | 'chat-close' | 'email-label' | 'pay-contrast' | 'terms-tabindex' | 'signin-focus' | 'showtime-button' | 'heading-level' | 'main-landmark'

export const FIX_LABEL: Record<FixKey, string> = {
  'chat-trap': 'Escape now closes the chat and Tab can leave it',
  'chat-close': 'The close button is a real button named “Close chat”',
  'email-label': 'The email field has a visible label',
  'pay-contrast': 'The Pay button fill is #B85C19, 4.58:1',
  'terms-tabindex': 'Terms no longer has tabindex="3"',
  'signin-focus': 'Sign in shows its focus ring again',
  'showtime-button': 'The 20:15 showtime is a button',
  'heading-level': '“About the film” is an h2',
  'main-landmark': 'The page content is wrapped in <main>',
}

export const ALL_FIXES = Object.keys(FIX_LABEL) as FixKey[]

/** Matches a reported issue back to the flaw that caused it. */
export function fixFor(rule: string, elements: readonly Element[]): FixKey | null {
  if (rule === 'no-main') return 'main-landmark'
  for (const el of elements) {
    const key = el.closest('[data-fix]')?.getAttribute('data-fix')
    if (key && key in FIX_LABEL) {
      // The chat container carries the trap; its close button carries the name.
      if (rule === 'focus-trap') return 'chat-trap'
      return key as FixKey
    }
  }
  return null
}
