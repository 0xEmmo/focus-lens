import { composite, contrastRatio, formatRatio, isLargeText, parseColor, suggestFix, toHex, type RGBA } from './color'
import { cssPath, isIgnored, isRendered, isTabbable, tabIndexOf, visibleText } from './dom'
import { accessibleName, roleOf } from './name'
import { commonAncestor, findTraps } from './traps'
import type { Issue } from './types'

export interface Context {
  doc: Document
  root: Element
  order: HTMLElement[]
  /** 1-based stop number for an element, if it's a stop. */
  stop: (el: Element) => number | undefined
}

/** A found issue plus the elements it points at. */
export type Finding = Omit<Issue, 'id'> & { elements: Element[] }

const quote = (s: string) => `“${s}”`

function describe(el: Element): string {
  const n = accessibleName(el).name || visibleText(el, 30)
  return n || `<${el.tagName.toLowerCase()}>`
}

/* 2.1.2 No Keyboard Trap ------------------------------------------------- */

export function focusTraps(ctx: Context): Finding[] {
  return findTraps(ctx.order).map((trap) => {
    const els = trap.loop.map((i) => ctx.order[i]!)
    const box = commonAncestor(els)
    const name = (box && (accessibleName(box).name || box.querySelector('h1,h2,h3,h4,[role="heading"]')?.textContent?.trim())) || 'this widget'
    const stops = trap.loop.map((i) => i + 1)
    const cycle = [...stops, stops[0]].join(' → ')
    return {
      rule: 'focus-trap',
      severity: 'critical',
      title: `Keyboard gets stuck in ${quote(name)}`,
      wcag: ['2.1.2 No Keyboard Trap'],
      selector: box ? cssPath(box) : cssPath(els[0]!),
      stops,
      detail: `Tab cycles ${cycle} and never reaches the rest of the page${trap.escapes ? ', though Escape gets you out' : ', and Escape does nothing'}.`,
      fix: trap.escapes
        ? 'Let Tab leave the widget, or make it a proper modal dialog with a visible way to close it.'
        : 'Let Escape close the widget and return focus to the button that opened it. Only trap focus in a real modal, and only while it is open.',
      code: trap.escapes ? undefined : "if (e.key === 'Escape') { close(); launcher.focus() }",
      trap: { loop: stops, escapes: trap.escapes },
      elements: box ? [box, ...els] : els,
    }
  })
}

/* 4.1.2 Name, Role, Value; 1.3.1 Info and Relationships ------------------- */

const NEEDS_NAME = new Set([
  'button',
  'link',
  'textbox',
  'searchbox',
  'combobox',
  'checkbox',
  'radio',
  'slider',
  'switch',
  'tab',
  'menuitem',
  'spinbutton',
  'listbox',
  'generic',
  'img',
])

export function missingNames(ctx: Context): Finding[] {
  const out: Finding[] = []
  for (const el of ctx.order) {
    const role = roleOf(el)
    if (!NEEDS_NAME.has(role)) continue
    const { name, source } = accessibleName(el)
    const n = ctx.stop(el)!
    const isField = ['textbox', 'searchbox', 'combobox', 'spinbutton', 'listbox'].includes(role)
    if (source === 'placeholder') {
      const kind = name.replace(/^(enter|type|your)\s+/i, '').split(/\s+/)[0] ?? 'This'
      out.push({
        rule: 'placeholder-label',
        severity: 'critical',
        title: `${kind[0]!.toUpperCase()}${kind.slice(1)} field has no label`,
        wcag: ['1.3.1 Info and Relationships', '4.1.2 Name, Role, Value'],
        selector: cssPath(el),
        stops: [n],
        detail: `Only placeholder text (${quote(name)}) says what this is. It disappears as soon as someone types, is often too faint to read, and many screen readers skip it.`,
        fix: 'Give the field a visible <label>. Keep the placeholder for an example, if at all.',
        code: `<label for="${el.id || 'email'}">${kind[0]!.toUpperCase()}${kind.slice(1)}</label>`,
        elements: [el],
      })
    } else if (!name) {
      const text = visibleText(el, 20)
      const what = isField ? 'Form field' : role === 'generic' ? 'Focusable element' : role === 'link' ? 'Link' : role === 'img' ? 'Image' : 'Button'
      out.push({
        rule: 'missing-name',
        severity: 'critical',
        title: text ? `${quote(text)} has no accessible name` : `${what} has no accessible name`,
        wcag: ['4.1.2 Name, Role, Value'],
        selector: cssPath(el),
        stops: [n],
        detail:
          role === 'generic'
            ? `It takes focus but has no role or name, so a screen reader announces nothing useful${text ? `; the ${quote(text)} symbol isn't read as a word` : ''}.`
            : `A screen reader announces just ${quote(role)}, with no hint of what it does.`,
        fix:
          role === 'generic'
            ? 'Use a real <button> and give it an aria-label that says what it does.'
            : 'Add visible text, or an aria-label that matches what the control does.',
        code: role === 'generic' || role === 'button' ? `<button type="button" aria-label="Close chat">✕</button>` : undefined,
        elements: [el],
      })
    }
  }
  return out
}

/* 2.4.3 Focus Order ------------------------------------------------------- */

export function positiveTabindex(ctx: Context): Finding[] {
  return ctx.order
    .filter((el) => tabIndexOf(el) > 0)
    .map((el) => ({
      rule: 'positive-tabindex' as const,
      severity: 'serious' as const,
      title: `Focus jumps to ${quote(describe(el))}, then back`,
      wcag: ['2.4.3 Focus Order'],
      selector: cssPath(el),
      stops: [ctx.stop(el)!],
      detail: `tabindex="${tabIndexOf(el)}" puts this ahead of everything else, so the first Tab on the page lands here, far from where you'd expect, and the order no longer follows the layout.`,
      fix: 'Remove the positive tabindex and let the DOM order decide. Move the element in the markup if it should come earlier.',
      code: `tabindex="${tabIndexOf(el)}"  →  (remove)`,
      elements: [el],
    }))
}

/* 2.1.1 Keyboard ---------------------------------------------------------- */

export function unreachable(ctx: Context): Finding[] {
  const view = ctx.doc.defaultView!
  const out: Finding[] = []
  for (const el of ctx.root.querySelectorAll<HTMLElement>('body *')) {
    if (isIgnored(el) || isTabbable(el) || !isRendered(el)) continue
    if (el.matches('label, option, input, select, textarea, button, a[href]')) continue
    const explicitRole = el.getAttribute('role')
    const looksInteractive =
      el.hasAttribute('onclick') || (explicitRole !== null && ['button', 'link', 'tab', 'menuitem', 'checkbox', 'switch'].includes(explicitRole))
    const pointer = view.getComputedStyle(el).cursor === 'pointer' && view.getComputedStyle(el.parentElement ?? el).cursor !== 'pointer'
    if (!looksInteractive && !pointer) continue
    // Inside or around something focusable (a label, a link) is fine.
    if (el.closest('a[href], button, label, summary') || el.querySelector('a[href], button, input, select, textarea, [tabindex]')) continue
    if (!visibleText(el)) continue
    out.push({
      rule: 'unreachable',
      severity: 'moderate',
      title: `${quote(visibleText(el, 24))} can't be reached by keyboard`,
      wcag: ['2.1.1 Keyboard'],
      selector: cssPath(el),
      stops: [],
      detail: `It looks and acts clickable (${el.hasAttribute('onclick') ? 'onclick' : explicitRole ? `role="${explicitRole}"` : 'pointer cursor'}) but never takes focus, so keyboard and switch users can't choose it.`,
      fix: 'Make it a <button> (or a link if it navigates). A div with a click handler needs tabindex="0", a role and Enter and Space handling to match.',
      code: `<div onclick>  →  <button type="button">`,
      elements: [el],
    })
  }
  return out
}

/* 1.4.3 Contrast (Minimum) ------------------------------------------------ */

function backgroundOf(el: Element): RGBA | null {
  const view = el.ownerDocument.defaultView!
  const layers: RGBA[] = []
  for (let n: Element | null = el; n; n = n.parentElement) {
    const s = view.getComputedStyle(n)
    // An image or gradient behind the text: we can't know the colour, so don't guess.
    if (s.backgroundImage && s.backgroundImage !== 'none') return null
    const c = parseColor(s.backgroundColor)
    if (c && c.a > 0) {
      layers.push(c)
      if (c.a >= 1) break
    }
  }
  let bg: RGBA = { r: 255, g: 255, b: 255, a: 1 }
  for (let i = layers.length - 1; i >= 0; i--) bg = composite(layers[i]!, bg)
  return bg
}

function opacityOf(el: Element): number {
  const view = el.ownerDocument.defaultView!
  let o = 1
  for (let n: Element | null = el; n; n = n.parentElement) o *= parseFloat(view.getComputedStyle(n).opacity || '1')
  return o
}

export function contrast(ctx: Context): Finding[] {
  const view = ctx.doc.defaultView!
  const groups = new Map<string, Finding>()
  for (const el of ctx.root.querySelectorAll<HTMLElement>('body *')) {
    if (isIgnored(el) || !isRendered(el) || el.matches('script, style, noscript, option, svg, svg *')) continue
    const own = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())
    if (!own) continue
    // Placeholder text is styled separately; inputs report their typed text colour.
    const s = view.getComputedStyle(el)
    const fgRaw = parseColor(s.color)
    const bg = backgroundOf(el)
    if (!fgRaw || !bg) continue
    const fg = composite({ ...fgRaw, a: fgRaw.a * opacityOf(el) }, bg)
    const size = parseFloat(s.fontSize) || 16
    const weight = parseInt(s.fontWeight, 10) || 400
    const large = isLargeText(size, weight)
    const required = large ? 3 : 4.5
    const ratio = contrastRatio(fg, bg)
    if (ratio >= required) continue
    const key = `${toHex(fg)}|${toHex(bg)}|${required}`
    const existing = groups.get(key)
    if (existing) {
      existing.elements.push(el)
      const n = ctx.stop(el.closest('a,button,[tabindex]') ?? el)
      if (n) existing.stops.push(n)
      continue
    }
    const fix = suggestFix(fg, bg, required)
    const text = visibleText(el, 28)
    const n = ctx.stop(el.closest('a,button,[tabindex]') ?? el)
    groups.set(key, {
      rule: 'contrast',
      severity: ratio < 3 ? 'serious' : 'moderate',
      title: `${quote(text)} text is ${formatRatio(ratio)}, fails AA`,
      wcag: ['1.4.3 Contrast (Minimum)'],
      selector: cssPath(el),
      stops: n ? [n] : [],
      detail: `${large ? 'Large' : 'Body-size'} text needs ${required}:1 against its background. In sunlight or on a cheap screen this washes out.`,
      fix: fix
        ? `Change the ${fix.change} to ${toHex(fix.color)}, the closest shade that passes.`
        : 'Darken the text or lighten the background until it passes.',
      code: fix ? `${fix.change === 'background' ? 'background' : 'color'}: ${toHex(fix.color)};` : undefined,
      contrast: {
        fg: toHex(fg),
        bg: toHex(bg),
        ratio,
        required,
        large,
        sample: text,
        fix: fix ? { change: fix.change, color: toHex(fix.color), ratio: fix.ratio } : null,
      },
      elements: [el],
    })
  }
  return [...groups.values()].map((f) =>
    f.elements.length > 1 ? { ...f, detail: `${f.detail} ${f.elements.length - 1} more element${f.elements.length > 2 ? 's' : ''} use the same colours.` } : f,
  )
}

/* 2.4.7 Focus Visible ----------------------------------------------------- */

/** Reads same-origin stylesheets for :focus rules that remove the outline and put nothing back. */
export function hiddenFocus(ctx: Context): Finding[] {
  const offenders = new Map<Element, string>()
  const visit = (rules: CSSRuleList) => {
    for (const rule of rules) {
      if ('cssRules' in rule && !(rule instanceof CSSStyleRule)) {
        visit((rule as CSSGroupingRule).cssRules)
        continue
      }
      if (!(rule instanceof CSSStyleRule) || !/:focus/.test(rule.selectorText)) continue
      const st = rule.style
      const removes = st.outlineStyle === 'none' || st.outline === 'none' || st.outline === '0' || st.outlineWidth === '0px' || st.outlineWidth === '0'
      const replaces = !!(st.boxShadow || st.borderColor || st.backgroundColor || st.textDecoration || st.borderBottomColor || st.color)
      if (!removes || replaces) continue
      for (const part of rule.selectorText.split(',')) {
        const base = part.replace(/:focus(-visible|-within)?/g, '').trim() || '*'
        try {
          ctx.root.querySelectorAll(base).forEach((el) => {
            if (ctx.stop(el)) offenders.set(el, part.trim())
          })
        } catch {
          /* selector the engine can't match outside :focus; skip */
        }
      }
    }
  }
  for (const sheet of ctx.doc.styleSheets) {
    try {
      visit(sheet.cssRules)
    } catch {
      /* cross-origin sheet: unreadable by design */
    }
  }
  if (!offenders.size) return []
  const els = [...offenders.keys()]
  return [
    {
      rule: 'focus-hidden',
      severity: 'serious',
      title: els.length === 1 ? `No focus ring on ${quote(describe(els[0]!))}` : `${els.length} controls hide their focus ring`,
      wcag: ['2.4.7 Focus Visible'],
      selector: cssPath(els[0]!),
      stops: els.map((e) => ctx.stop(e)!).sort((a, b) => a - b),
      detail: `A stylesheet sets outline: none on ${[...new Set(offenders.values())].map((s) => `\`${s}\``).join(', ')} with nothing in its place, so a keyboard user can't see where they are.`,
      fix: 'Delete the outline reset, or replace it with a clear :focus-visible style of at least 2px with 3:1 contrast.',
      code: ':focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }',
      elements: els,
    },
  ]
}

/* 1.3.1 headings and 2.4.1 landmarks -------------------------------------- */

export function structure(ctx: Context): Finding[] {
  const out: Finding[] = []
  const heads = [...ctx.root.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, [role="heading"]')].filter((h) => !isIgnored(h) && isRendered(h))
  let last = 0
  for (const h of heads) {
    const level = h.getAttribute('aria-level') ? Number(h.getAttribute('aria-level')) : Number(h.tagName[1] ?? 2)
    if (last && level > last + 1) {
      out.push({
        rule: 'heading-skip',
        severity: 'moderate',
        title: `Heading jumps from h${last} to h${level}`,
        wcag: ['1.3.1 Info and Relationships'],
        selector: cssPath(h),
        stops: [],
        detail: `${quote(visibleText(h, 30))} is an h${level} straight after an h${last}. People who move by headings think they've missed a section.`,
        fix: `Make it an h${last + 1}, and style it however you like.`,
        elements: [h],
      })
    }
    last = level
  }
  if (!ctx.root.querySelector('main, [role="main"]')) {
    out.push({
      rule: 'no-main',
      severity: 'moderate',
      title: 'No main landmark',
      wcag: ['1.3.1 Info and Relationships', '2.4.1 Bypass Blocks'],
      selector: 'body',
      stops: [],
      detail:
        'Screen reader users can usually jump straight to the main content. Here there is nothing to jump to, so they wade through the header every time.',
      fix: 'Wrap the page content in <main>.',
      code: '<main id="content">…</main>',
      elements: [],
    })
  }
  return out
}

export const RULES = [focusTraps, missingNames, contrast, positiveTabindex, hiddenFocus, unreachable, structure]
