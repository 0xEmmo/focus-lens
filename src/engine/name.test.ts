import { accessibleName, roleOf } from './name'

const el = (s: string) => {
  document.body.innerHTML = s
  return document.querySelector('[data-t]')!
}

describe('accessible names', () => {
  it('prefers aria-labelledby, then aria-label', () => {
    expect(accessibleName(el(`<span id="l1">Pay</span><span id="l2">now</span><button data-t aria-labelledby="l1 l2" aria-label="x">?</button>`)).name).toBe(
      'Pay now',
    )
    expect(accessibleName(el(`<button data-t aria-label="Close chat">✕</button>`))).toEqual({ name: 'Close chat', source: 'aria-label' })
  })

  it('reads labels for form fields, by for= and by wrapping', () => {
    expect(accessibleName(el(`<label for="e">Email</label><input data-t id="e">`))).toEqual({ name: 'Email', source: 'label' })
    expect(accessibleName(el(`<label>Tickets <select data-t><option>2</option></select></label>`)).name).toBe('Tickets')
  })

  it('takes button and link names from content, including image alt, skipping aria-hidden', () => {
    expect(accessibleName(el(`<a data-t href="#"><img alt="Ember"> home <span aria-hidden="true">→</span></a>`)).name).toBe('Ember home')
    expect(accessibleName(el(`<button data-t><svg><title>Search</title></svg></button>`)).name).toBe('Search')
  })

  it('flags placeholder-only names', () => {
    expect(accessibleName(el(`<input data-t placeholder="Email for your tickets">`))).toEqual({ name: 'Email for your tickets', source: 'placeholder' })
  })

  it('finds nothing where there is nothing', () => {
    expect(accessibleName(el(`<button data-t><span aria-hidden="true">✕</span></button>`))).toEqual({ name: '', source: 'none' })
    expect(accessibleName(el(`<span data-t tabindex="0">✕</span>`)).source).toBe('none')
  })

  it('works out implicit roles', () => {
    expect(roleOf(el(`<a data-t href="#">x</a>`))).toBe('link')
    expect(roleOf(el(`<a data-t>x</a>`))).toBe('generic')
    expect(roleOf(el(`<input data-t type="email">`))).toBe('textbox')
    expect(roleOf(el(`<div data-t role="tab button">x</div>`))).toBe('tab')
  })
})
