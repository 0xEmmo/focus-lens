import { ALL_FIXES, FIX_LABEL, fixFor } from './fixes'

describe('sample fixes', () => {
  it('has a label for every flaw', () => {
    expect(ALL_FIXES).toHaveLength(9)
    ALL_FIXES.forEach((k) => expect(FIX_LABEL[k]).toBeTruthy())
  })

  it('maps an issue back to the flaw behind it', () => {
    document.body.innerHTML = `<div data-fix="chat-trap"><span id="x" data-fix="chat-close">✕</span><input id="m"></div><input id="e" data-fix="email-label"><p id="other"></p>`
    const $ = (id: string) => document.getElementById(id)!
    expect(fixFor('placeholder-label', [$('e')])).toBe('email-label')
    expect(fixFor('missing-name', [$('x')])).toBe('chat-close')
    // The trap reports the container first, then its stops.
    expect(fixFor('focus-trap', [$('x').parentElement!, $('x'), $('m')])).toBe('chat-trap')
    expect(fixFor('no-main', [])).toBe('main-landmark')
    expect(fixFor('contrast', [$('other')])).toBeNull()
  })
})
