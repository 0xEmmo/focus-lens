/**
 * A pragmatic subset of the Accessible Name computation (accname 1.2): the
 * cases that matter for buttons, links and form fields, which is where a
 * missing name actually hurts.
 */

const IMPLICIT: [string, string][] = [
  ['a[href], area[href]', 'link'],
  ['button, summary, input[type="button"], input[type="submit"], input[type="reset"], input[type="image"]', 'button'],
  ['input[type="checkbox"]', 'checkbox'],
  ['input[type="radio"]', 'radio'],
  ['input[type="range"]', 'slider'],
  ['input[type="search"]', 'searchbox'],
  [
    'input:not([type]), input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input[type="password"], input[type="number"], textarea',
    'textbox',
  ],
  ['select', 'combobox'],
  ['img', 'img'],
  ['h1, h2, h3, h4, h5, h6', 'heading'],
  ['iframe', 'document'],
]

export function roleOf(el: Element): string {
  const explicit = el.getAttribute('role')?.trim().split(/\s+/)[0]
  if (explicit) return explicit
  for (const [sel, role] of IMPLICIT) if (el.matches(sel)) return role
  return 'generic'
}

const NAME_FROM_CONTENT = new Set(['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'option', 'heading', 'switch', 'cell', 'treeitem', 'tooltip'])

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

// Tag checks, not instanceof: the page may live in another frame (another realm) from the engine.
const isElement = (n: Node): n is Element => n.nodeType === 1
const isTag = <T extends Element>(n: Node, tag: string): n is T => isElement(n) && n.tagName === tag
const isImg = (n: Node): n is HTMLImageElement => isTag(n, 'IMG')
const isInput = (n: Node): n is HTMLInputElement => isTag(n, 'INPUT')

function textFrom(node: Node, seen: Set<Node>): string {
  if (seen.has(node)) return ''
  seen.add(node)
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  if (!isElement(node)) return ''
  if (node.getAttribute('aria-hidden') === 'true') return ''
  const view = node.ownerDocument.defaultView
  if (view && view.getComputedStyle(node).display === 'none') return ''
  const label = clean(node.getAttribute('aria-label'))
  if (label) return label
  if (isImg(node)) return node.alt
  if (node.tagName === 'svg') return clean(node.querySelector(':scope > title')?.textContent)
  if (isInput(node) && ['button', 'submit', 'reset'].includes(node.type)) return node.value
  let out = ''
  for (const child of node.childNodes) {
    const t = textFrom(child, seen)
    const block = isElement(child) && view && /^(block|flex|grid|list-item|table)/.test(view.getComputedStyle(child).display)
    out += block ? ` ${t} ` : t
  }
  return out
}

function labelsFor(el: Element): string {
  const doc = el.ownerDocument
  const parts: string[] = []
  if (el.id) doc.querySelectorAll(`label[for="${CSS.escape(el.id)}"]`).forEach((l) => parts.push(textFrom(l, new Set([el]))))
  const wrapping = el.closest('label')
  if (wrapping && !parts.length) parts.push(textFrom(wrapping, new Set([el])))
  return clean(parts.join(' '))
}

export interface NameResult {
  name: string
  /** Where the name came from; "placeholder" is reported as a problem. */
  source: 'aria-labelledby' | 'aria-label' | 'label' | 'alt' | 'content' | 'title' | 'placeholder' | 'value' | 'none'
}

export function accessibleName(el: Element): NameResult {
  const doc = el.ownerDocument
  const ids = clean(el.getAttribute('aria-labelledby'))
  if (ids) {
    const name = clean(
      ids
        .split(' ')
        .map((id) => doc.getElementById(id))
        .filter(Boolean)
        .map((n) => textFrom(n!, new Set()))
        .join(' '),
    )
    if (name) return { name, source: 'aria-labelledby' }
  }
  const label = clean(el.getAttribute('aria-label'))
  if (label) return { name: label, source: 'aria-label' }

  if (el.matches('input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]), select, textarea, meter, progress, output')) {
    const l = labelsFor(el)
    if (l) return { name: l, source: 'label' }
  }
  if (isInput(el) && ['button', 'submit', 'reset'].includes(el.type)) {
    const v = clean(el.value) || (el.type === 'submit' ? 'Submit' : el.type === 'reset' ? 'Reset' : '')
    if (v) return { name: v, source: 'value' }
  }
  if (isImg(el) || (isInput(el) && el.type === 'image')) {
    const alt = clean(el.getAttribute('alt'))
    if (alt) return { name: alt, source: 'alt' }
  }
  if (NAME_FROM_CONTENT.has(roleOf(el))) {
    const t = clean(textFrom(el, new Set()))
    if (t) return { name: t, source: 'content' }
  }
  const title = clean(el.getAttribute('title'))
  if (title) return { name: title, source: 'title' }
  // Chrome does fall back to placeholder, but it vanishes as you type and
  // isn't a label; we report it as one, flagged.
  const ph = clean(el.getAttribute('placeholder'))
  if (ph) return { name: ph, source: 'placeholder' }
  return { name: '', source: 'none' }
}
