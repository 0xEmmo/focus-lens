/** DOM helpers shared by the rules. Everything here works on any document, in a page or a test. */

/** Our own overlay and panel never count as part of the page under audit. */
export const IGNORE_ATTR = 'data-focus-lens'

export function isIgnored(el: Element): boolean {
  return !!el.closest(`[${IGNORE_ATTR}]`)
}

export function isRendered(el: Element): boolean {
  if (el.closest('[hidden], [inert]')) return false
  if ('checkVisibility' in el && typeof el.checkVisibility === 'function') {
    return el.checkVisibility({ visibilityProperty: true } as CheckVisibilityOptions)
  }
  // jsdom: no layout, so walk up for display and visibility.
  const view = el.ownerDocument.defaultView
  if (!view) return true
  for (let n: Element | null = el; n; n = n.parentElement) {
    const s = view.getComputedStyle(n)
    if (s.display === 'none') return false
    if (n === el && (s.visibility === 'hidden' || s.visibility === 'collapse')) return false
  }
  return true
}

const NATURAL =
  'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, iframe, audio[controls], video[controls], [contenteditable]:not([contenteditable="false"])'

export function tabIndexOf(el: Element): number {
  const attr = el.getAttribute('tabindex')
  if (attr !== null && attr.trim() !== '' && !Number.isNaN(Number(attr))) return Math.trunc(Number(attr))
  return el.matches(NATURAL) ? 0 : -1
}

/** Can Tab land here? */
export function isTabbable(el: Element): boolean {
  if (isIgnored(el)) return false
  if ((el as HTMLButtonElement).disabled && el.matches('button, input, select, textarea, fieldset *')) return false
  if (el.closest('fieldset[disabled]') && el.matches('button, input, select, textarea')) return false
  if (tabIndexOf(el) < 0) return false
  // A <summary> only takes focus as the first summary of its <details>.
  if (el.tagName === 'SUMMARY' && el.parentElement?.querySelector(':scope > summary') !== el) return false
  return isRendered(el)
}

/** Positive tabindex first (ascending, ties in DOM order), then everything else in DOM order: the HTML sequential navigation order. */
export function tabOrder(root: ParentNode): HTMLElement[] {
  const all = [...root.querySelectorAll<HTMLElement>(`${NATURAL}, [tabindex]`)].filter(isTabbable)
  const positive = all.filter((el) => tabIndexOf(el) > 0).sort((a, b) => tabIndexOf(a) - tabIndexOf(b))
  return [...positive, ...all.filter((el) => tabIndexOf(el) === 0)]
}

/** A short, stable CSS path, good enough to find the element again and to paste into a ticket. */
export function cssPath(el: Element): string {
  const doc = el.ownerDocument
  if (el.id && doc.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) return `#${CSS.escape(el.id)}`
  const parts: string[] = []
  let node: Element | null = el
  while (node && node !== doc.documentElement && parts.length < 5) {
    if (node.id && doc.querySelectorAll(`#${CSS.escape(node.id)}`).length === 1) {
      parts.unshift(`#${CSS.escape(node.id)}`)
      break
    }
    let part = node.tagName.toLowerCase()
    const cls = [...node.classList].filter((c) => /^[a-z][\w-]*$/i.test(c)).slice(0, 2)
    if (cls.length) part += '.' + cls.join('.')
    const parent: Element | null = node.parentElement
    if (parent) {
      const same = [...parent.children].filter((c) => c.tagName === node!.tagName)
      if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`
    }
    parts.unshift(part)
    node = parent
  }
  return parts.join(' > ')
}

/** What a sighted keyboard user would read on the element, trimmed for display. */
export function visibleText(el: Element, max = 40): string {
  // innerText keeps the gaps between block children ("20:15 Screen 2", not "20:15Screen 2"); jsdom lacks it.
  const raw = (el as HTMLElement).innerText ?? el.textContent ?? ''
  const t = raw.replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max - 1) + '…' : t
}
