import { audit } from './audit'

function chatTrap(root: HTMLElement, withEscape: boolean) {
  const box = root.querySelector<HTMLElement>('#chat')!
  const stops = () => [...box.querySelectorAll<HTMLElement>('[tabindex="0"], input, button')]
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      const list = stops()
      const i = list.indexOf(document.activeElement as HTMLElement)
      e.preventDefault()
      list[(i + 1) % list.length]!.focus()
    }
    if (withEscape && e.key === 'Escape') {
      box.hidden = true
      document.getElementById('launcher')!.focus()
    }
  })
}

const PAGE = `
  <style>.signin:focus { outline: none }</style>
  <header><a href="#" class="logo">Ember</a><a href="#" class="signin">Sign in</a></header>
  <h1>The Ferryman of Epe</h1>
  <h3>Showtimes</h3>
  <button>14:00</button>
  <div class="time" style="cursor:pointer">20:15</div>
  <input placeholder="Email for your tickets">
  <button style="background:#e37d33;color:#ffffff">Pay ₦7,500</button>
  <footer><a href="#" tabindex="3">Terms</a></footer>
  <button id="launcher">Chat</button>
  <div id="chat" aria-label="Chat with Ember">
    <span tabindex="0">✕</span>
    <input aria-label="Message">
    <button>Send</button>
  </div>
`

describe('audit', () => {
  beforeEach(() => {
    document.body.innerHTML = PAGE
  })

  it('numbers the tab stops with the positive tabindex first', () => {
    const { result } = audit()
    expect(result.stops[0]).toMatchObject({ n: 1, name: 'Terms', tabindex: 3 })
    expect(result.stops.map((s) => s.name)).toEqual([
      'Terms',
      'Ember',
      'Sign in',
      '14:00',
      'Email for your tickets',
      'Pay ₦7,500',
      'Chat',
      '',
      'Message',
      'Send',
    ])
  })

  it('finds the chat trap, that Escape does nothing, and where it loops', () => {
    chatTrap(document.body, false)
    const { result, elements } = audit()
    const trap = result.issues.find((i) => i.rule === 'focus-trap')!
    expect(trap.title).toBe('Keyboard gets stuck in “Chat with Ember”')
    expect(trap.trap).toEqual({ loop: [8, 9, 10], escapes: false })
    expect(trap.detail).toContain('8 → 9 → 10 → 8')
    expect(elements.issues.get(trap.id)![0]!.id).toBe('chat')
    // The audit puts focus back where it found it.
    expect(document.activeElement).toBe(document.body)
  })

  it('still reports a trap that Escape closes, but less harshly', () => {
    chatTrap(document.body, true)
    const trap = audit().result.issues.find((i) => i.rule === 'focus-trap')!
    expect(trap.trap!.escapes).toBe(true)
    expect(trap.detail).toContain('Escape gets you out')
  })

  it('reports each kind of problem once, worst first', () => {
    chatTrap(document.body, false)
    const { result } = audit()
    expect(result.issues.map((i) => i.rule)).toEqual([
      'focus-trap',
      'placeholder-label',
      'missing-name',
      'positive-tabindex',
      'focus-hidden',
      'contrast',
      'unreachable',
      'heading-skip',
      'no-main',
    ])
    expect(result.counts).toEqual({ critical: 3, serious: 3, moderate: 3 })
  })

  it('writes useful titles and fixes', () => {
    const issues = audit().result.issues
    const byRule = (r: string) => issues.find((i) => i.rule === r)!
    expect(byRule('placeholder-label').title).toBe('Email field has no label')
    expect(byRule('missing-name').title).toBe('“✕” has no accessible name')
    expect(byRule('positive-tabindex').title).toBe('Focus jumps to “Terms”, then back')
    expect(byRule('unreachable').title).toBe('“20:15” can\u2019t be reached by keyboard'.replace('\u2019', "'"))
    const c = byRule('contrast')
    expect(c.title).toBe('“Pay ₦7,500” text is 2.89:1, fails AA')
    expect(c.contrast).toMatchObject({ fg: '#FFFFFF', bg: '#E37D33', required: 4.5 })
    expect(c.contrast!.fix!.change).toBe('background')
    expect(byRule('focus-hidden').title).toBe('No focus ring on “Sign in”')
  })

  it('comes back clean for a tidy page', () => {
    document.body.innerHTML = `<main><h1>Hi</h1><h2>There</h2><label for="e">Email</label><input id="e"><button>Send</button></main>`
    expect(audit().result.issues).toEqual([])
  })
})
