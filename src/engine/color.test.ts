import { composite, contrastRatio, formatRatio, isLargeText, parseColor, suggestFix, toHex } from './color'

const c = (s: string) => parseColor(s)!

describe('parseColor', () => {
  it('reads computed-style and hex colours', () => {
    expect(c('rgb(227, 125, 51)')).toEqual({ r: 227, g: 125, b: 51, a: 1 })
    expect(c('rgba(0, 0, 0, 0.5)').a).toBe(0.5)
    expect(c('rgb(0 0 0 / 25%)').a).toBe(0.25)
    expect(c('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    expect(c('#00000080').a).toBeCloseTo(0.5, 2)
    expect(c('transparent').a).toBe(0)
    expect(parseColor('papayawhip')).toBeNull()
  })
})

describe('contrast', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio(c('#000'), c('#fff'))).toBeCloseTo(21, 5)
    expect(contrastRatio(c('#fff'), c('#fff'))).toBe(1)
    expect(contrastRatio(c('#767676'), c('#fff'))).toBeCloseTo(4.54, 2)
  })

  it('reports the mockup button the way a checker would', () => {
    expect(formatRatio(contrastRatio(c('#fff'), c('#E37D33')))).toBe('2.89:1')
    expect(formatRatio(4.4999)).toBe('4.49:1')
  })

  it('composites translucent colours over what is underneath', () => {
    const grey = composite(c('rgba(0,0,0,0.5)'), c('#fff'))
    expect(Math.round(grey.r)).toBe(128)
    expect(grey.a).toBe(1)
  })

  it('knows large text', () => {
    expect(isLargeText(24, 400)).toBe(true)
    expect(isLargeText(19, 700)).toBe(true)
    expect(isLargeText(19, 400)).toBe(false)
  })
})

describe('suggestFix', () => {
  it('deepens a saturated button fill and keeps white text', () => {
    const fix = suggestFix(c('#fff'), c('#E37D33'), 4.5)!
    expect(fix.change).toBe('background')
    expect(fix.ratio).toBeGreaterThanOrEqual(4.55)
    // Same family of orange, just deeper.
    expect(toHex(fix.color)).toMatch(/^#[A-C][0-9A-F]/)
  })

  it('darkens grey text on a light page', () => {
    const fix = suggestFix(c('#a4968a'), c('#ffffff'), 4.5)!
    expect(fix.change).toBe('foreground')
    expect(contrastRatio(fix.color, c('#fff'))).toBeGreaterThanOrEqual(4.5)
  })

  it('lightens text on a dark page', () => {
    const fix = suggestFix(c('#555'), c('#111'), 4.5)!
    expect(contrastRatio(fix.color, c('#111'))).toBeGreaterThanOrEqual(4.5)
    expect(fix.color.r).toBeGreaterThan(0x55)
  })
})
