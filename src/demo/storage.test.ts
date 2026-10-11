import { DEFAULTS, load, save } from './storage'

const mem = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

describe('demo storage', () => {
  it('falls back to defaults when empty or broken', () => {
    const s = mem()
    expect(load(s)).toEqual(DEFAULTS)
    s.setItem('focus-lens:demo:v1', '{nope')
    expect(load(s)).toEqual(DEFAULTS)
  })

  it('round-trips and drops unknown values', () => {
    const s = mem()
    save({ layers: ['order', 'headings'], fixed: ['email-label'], panel: false }, s)
    expect(load(s)).toEqual({ layers: ['order', 'headings'], fixed: ['email-label'], panel: false })
    s.setItem('focus-lens:demo:v1', JSON.stringify({ layers: ['order', 'lasers', 3], fixed: ['email-label', 'email-label', 'rm -rf'], panel: 'yes' }))
    expect(load(s)).toEqual({ layers: ['order'], fixed: ['email-label'], panel: true })
  })

  it('survives storage that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('full')
      },
    }
    expect(load(broken)).toEqual(DEFAULTS)
    expect(() => save(DEFAULTS, broken)).not.toThrow()
  })
})
