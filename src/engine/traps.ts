import { isTabbable } from './dom'

export interface Trap {
  /** Indices into the tab order that keep cycling. */
  loop: number[]
  /** Whether Escape lets you out. */
  escapes: boolean
}

function key(target: Element, k: string, shift = false): KeyboardEvent {
  const view = target.ownerDocument.defaultView!
  const e = new view.KeyboardEvent('keydown', { key: k, code: k === 'Tab' ? 'Tab' : k, shiftKey: shift, bubbles: true, cancelable: true, composed: true })
  target.dispatchEvent(e)
  return e
}

/**
 * Finds keyboard traps by asking the page. For each stop we focus it and send a
 * Tab keydown. Most widgets that trap focus do it in a keydown handler that
 * cancels the event and moves focus themselves, so if focus lands somewhere
 * other than the next stop in the natural order, we follow it. A walk that
 * comes back on itself without reaching the rest of the page is a trap. Then
 * we try Escape, which is what WCAG 2.1.2 expects to work.
 *
 * Synthetic events can't move focus on their own, so nothing a real user
 * would do is skipped; this only sees traps made in script, which is where
 * they come from.
 */
export function findTraps(order: readonly HTMLElement[]): Trap[] {
  if (order.length < 2) return []
  const doc = order[0]!.ownerDocument
  const before = doc.activeElement as HTMLElement | null
  const index = new Map(order.map((el, i) => [el, i]))

  /** Where Tab from stop i really goes, or null for the natural next stop. */
  const hijacked = new Map<number, number>()
  order.forEach((el, i) => {
    el.focus({ preventScroll: true })
    if (doc.activeElement !== el) return
    const e = key(el, 'Tab')
    if (!e.defaultPrevented) return
    const to = index.get(doc.activeElement as HTMLElement)
    if (to !== undefined && to !== i + 1) hijacked.set(i, to)
  })

  const traps: Trap[] = []
  const seen = new Set<number>()
  for (const [start, to] of hijacked) {
    if (seen.has(start) || to > start) continue
    // Walk from the jump target; if we arrive back at `start` and never left the range, it loops.
    const loop: number[] = []
    let i = to
    let guard = 0
    while (guard++ < order.length + 1) {
      loop.push(i)
      if (i === start) break
      i = hijacked.get(i) ?? i + 1
      if (i >= order.length || i < to) break
    }
    if (loop[loop.length - 1] !== start) continue
    loop.forEach((n) => seen.add(n))

    // Escape: does focus leave, or does the widget go away?
    const first = order[loop[0]!]!
    const container = commonAncestor(loop.map((n) => order[n]!))
    first.focus({ preventScroll: true })
    key(first, 'Escape')
    const active = doc.activeElement
    const stillInside = !!active && !!container?.contains(active) && active !== doc.body
    const escapes = !stillInside || !container || !isTabbable(first)
    traps.push({ loop, escapes })
  }

  if (before && before !== doc.body && typeof before.focus === 'function') before.focus({ preventScroll: true })
  else (doc.activeElement as HTMLElement | null)?.blur?.()
  return traps
}

export function commonAncestor(els: readonly Element[]): Element | null {
  if (!els.length) return null
  let node: Element | null = els[0]!
  while (node && !els.every((e) => node!.contains(e))) node = node.parentElement
  return node
}
