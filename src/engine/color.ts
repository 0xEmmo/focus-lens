/** Colour maths for WCAG 2.2 contrast (success criteria 1.4.3 and 1.4.11). */

export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Parses the colour formats browsers hand back from getComputedStyle, plus hex for convenience. */
export function parseColor(input: string): RGBA | null {
  const s = input.trim().toLowerCase()
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  const hex = /^#([0-9a-f]{3,8})$/.exec(s)
  if (hex) {
    let h = hex[1]!
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('')
    if (h.length !== 6 && h.length !== 8) return null
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16)
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 }
  }
  const fn = /^rgba?\(([^)]+)\)$/.exec(s)
  if (fn) {
    const parts = fn[1]!
      .replace(/\s*\/\s*/, ' ')
      .split(/[\s,]+/)
      .filter(Boolean)
    if (parts.length < 3) return null
    const ch = (v: string) => (v.endsWith('%') ? (parseFloat(v) / 100) * 255 : parseFloat(v))
    const alpha = parts[3] === undefined ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])
    const [r, g, b] = parts.slice(0, 3).map(ch) as [number, number, number]
    if ([r, g, b, alpha].some(Number.isNaN)) return null
    return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a: clamp(alpha, 0, 1) }
  }
  return null
}

/** Paints `top` over `bottom`. */
export function composite(top: RGBA, bottom: RGBA): RGBA {
  const a = top.a + bottom.a * (1 - top.a)
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }
  const mix = (t: number, b: number) => (t * top.a + b * bottom.a * (1 - top.a)) / a
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a }
}

function channel(v: number) {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function luminance({ r, g, b }: RGBA): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: RGBA, b: RGBA): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** Rounded down to two places, the way checkers report it: 4.499 is a fail, not "4.5". */
export const formatRatio = (r: number) => `${(Math.floor(r * 100) / 100).toFixed(2)}:1`

export function toHex({ r, g, b }: RGBA): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.round(v).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  )
}

/** 18.66px bold or 24px regular counts as large text, needing only 3:1. */
export function isLargeText(fontSizePx: number, fontWeight: number): boolean {
  return fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700)
}

function toHsl({ r, g, b }: RGBA): [number, number, number] {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255]
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === rr ? (gg - bb) / d + (gg < bb ? 6 : 0) : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4
  return [h / 6, s, l]
}

function fromHsl(h: number, s: number, l: number): RGBA {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255, a: 1 }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue = (t: number) => {
    const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  return { r: hue(h + 1 / 3) * 255, g: hue(h) * 255, b: hue(h - 1 / 3) * 255, a: 1 }
}

export interface Suggestion {
  /** Which colour to change. A brand-coloured button keeps its white text and gets a deeper fill. */
  change: 'foreground' | 'background'
  color: RGBA
  ratio: number
}

/**
 * The smallest lightness change that passes, keeping hue and saturation so the
 * fix still looks like the brand. Changes whichever colour is more saturated.
 */
export function suggestFix(fg: RGBA, bg: RGBA, required: number): Suggestion | null {
  const change: Suggestion['change'] = toHsl(bg)[1] > toHsl(fg)[1] + 0.15 ? 'background' : 'foreground'
  const moving = change === 'foreground' ? fg : bg
  const fixed = change === 'foreground' ? bg : fg
  const [h, s, l] = toHsl(moving)
  // Move away from the fixed colour: darker against light, lighter against dark.
  const dir = luminance(fixed) > 0.18 ? -1 : 1
  for (let step = 1; step <= 100; step++) {
    const nl = clamp(l + dir * step * 0.005, 0, 1)
    const c = fromHsl(h, s, nl)
    const rounded = { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), a: 1 }
    const ratio = contrastRatio(rounded, fixed)
    if (ratio >= required + 0.05) return { change, color: rounded, ratio }
    if (nl === 0 || nl === 1) break
  }
  return null
}
