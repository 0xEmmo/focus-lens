import type { AuditElements, AuditResult, Issue } from '../engine/types'
import { IGNORE_ATTR } from '../engine/dom'
import { formatRatio } from '../engine/color'
import { OVERLAY_CSS } from './styles'

export type Layer = 'order' | 'rings' | 'issues' | 'headings' | 'landmarks'
export const LAYERS: { id: Layer; label: string }[] = [
  { id: 'order', label: 'Tab order' },
  { id: 'rings', label: 'Focus rings' },
  { id: 'issues', label: 'Issues' },
  { id: 'headings', label: 'Headings' },
  { id: 'landmarks', label: 'Landmarks' },
]
export const DEFAULT_LAYERS: Layer[] = ['order', 'rings', 'issues']

export interface Overlay {
  show(result: AuditResult, elements: AuditElements): void
  setLayers(layers: readonly Layer[]): void
  highlight(issueId: string | null): void
  clear(): void
  destroy(): void
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

const SVG = 'http://www.w3.org/2000/svg'

/** The words on the page next to each problem. Short: they sit on top of someone's design. */
export function calloutText(issue: Issue): string {
  switch (issue.rule) {
    case 'focus-trap':
      return `Focus trap: Tab cycles ${[...issue.stops, issue.stops[0]].join(' → ')}`
    case 'missing-name':
      return 'No accessible name'
    case 'placeholder-label':
      return 'No label, placeholder only'
    case 'contrast':
      return `Contrast ${formatRatio(issue.contrast!.ratio)} · fails AA`
    case 'positive-tabindex':
      return `${issue.code?.split('  ')[0] ?? 'tabindex'} pulls focus here`
    case 'unreachable':
      return 'Not reachable by keyboard'
    case 'focus-hidden':
      return 'No visible focus'
    case 'heading-skip':
      return issue.title
    default:
      return ''
  }
}

/**
 * Draws Focus Lens over a page. Lives in a shadow root so the page's CSS can't
 * restyle it and ours can't leak out; never takes pointer events.
 * `container` is a scrolling element to draw inside, or null for the whole page.
 */
export function createOverlay(container: HTMLElement | null = null): Overlay {
  const doc = container?.ownerDocument ?? document
  const host = doc.createElement('div')
  host.setAttribute(IGNORE_ATTR, 'overlay')
  host.setAttribute('aria-hidden', 'true')
  Object.assign(host.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: '0',
    height: '0',
    pointerEvents: 'none',
    zIndex: '2147483646',
    overflow: 'visible',
  })
  ;(container ?? doc.documentElement).appendChild(host)
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `<style>${OVERLAY_CSS}</style><div class="root"></div>`
  const root = shadow.querySelector<HTMLDivElement>('.root')!

  let data: { result: AuditResult; elements: AuditElements } | null = null
  let layers = new Set<Layer>(DEFAULT_LAYERS)
  let focus: string | null = null
  let raf = 0

  const boxOf = (el: Element): Box | null => {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) return null
    if (container) {
      const c = container.getBoundingClientRect()
      return {
        x: r.left - c.left + container.scrollLeft - container.clientLeft,
        y: r.top - c.top + container.scrollTop - container.clientTop,
        w: r.width,
        h: r.height,
      }
    }
    const view = doc.defaultView!
    return { x: r.left + view.scrollX, y: r.top + view.scrollY, w: r.width, h: r.height }
  }

  const div = (cls: string, box: Partial<Box> & { x: number; y: number }, text?: string) => {
    const d = doc.createElement('div')
    d.className = cls
    d.style.left = `${box.x}px`
    d.style.top = `${box.y}px`
    if (box.w !== undefined) d.style.width = `${box.w}px`
    if (box.h !== undefined) d.style.height = `${box.h}px`
    if (text) d.textContent = text
    root.appendChild(d)
    return d
  }

  function draw() {
    raf = 0
    root.replaceChildren()
    if (!data) return
    const { result, elements } = data
    const size = container
      ? { w: container.scrollWidth, h: container.scrollHeight }
      : { w: doc.documentElement.scrollWidth, h: doc.documentElement.scrollHeight }
    Object.assign(host.style, { width: `${size.w}px`, height: `${size.h}px` })

    // Stops that are part of a serious problem get red badges.
    const bad = new Set<number>()
    for (const i of result.issues) if (i.severity !== 'moderate' && i.rule !== 'contrast') i.stops.forEach((n) => bad.add(n))
    const trap = result.issues.find((i) => i.rule === 'focus-trap')
    const jumps = new Set(result.issues.filter((i) => i.rule === 'positive-tabindex').flatMap((i) => i.stops))
    const boxes = elements.stops.map(boxOf)

    if (layers.has('landmarks')) {
      for (const el of (container ?? doc).querySelectorAll(
        'header, nav, main, aside, footer, [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"], [role="dialog"], section[aria-label], form[aria-label]',
      )) {
        if (el.closest(`[${IGNORE_ATTR}]`)) continue
        const b = boxOf(el)
        if (!b) continue
        const name = el.getAttribute('role') ?? el.tagName.toLowerCase()
        div('landmark', b).appendChild(Object.assign(doc.createElement('span'), { textContent: name }))
      }
    }

    if (layers.has('headings')) {
      for (const el of (container ?? doc).querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')) {
        if (el.closest(`[${IGNORE_ATTR}]`)) continue
        const b = boxOf(el)
        if (!b) continue
        const level = el.getAttribute('aria-level') ?? el.tagName[1] ?? '?'
        div('heading', b)
        div('heading-tag', { x: b.x - 4, y: b.y - 4 }, `H${level}`)
      }
    }

    if (layers.has('rings')) {
      boxes.forEach((b, i) => b && div(`ring${bad.has(i + 1) ? ' bad' : ''}`, { x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8 }))
    }

    if (layers.has('order') && boxes.length) {
      const svg = doc.createElementNS(SVG, 'svg')
      svg.setAttribute('class', 'paths')
      svg.setAttribute('width', String(size.w))
      svg.setAttribute('height', String(size.h))
      svg.innerHTML = `<defs><marker id="fl-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#d6261b"/></marker></defs>`
      let calm = ''
      let alarm = ''
      for (let i = 0; i < boxes.length - 1; i++) {
        const a = boxes[i]
        const b = boxes[i + 1]
        if (!a || !b) continue
        const seg = `M${a.x + 4} ${a.y + 2}L${b.x + 4} ${b.y + 2}`
        if (jumps.has(i + 1) || jumps.has(i + 2) || (trap && trap.stops.includes(i + 1) && trap.stops.includes(i + 2))) alarm += seg
        else calm += seg
      }
      const path = (d: string, cls: string) => {
        if (!d) return
        const p = doc.createElementNS(SVG, 'path')
        p.setAttribute('d', d)
        p.setAttribute('class', cls)
        svg.appendChild(p)
      }
      path(calm, 'calm')
      path(alarm, 'alarm')
      if (trap && trap.stops.length > 1) {
        const last = boxes[trap.stops[trap.stops.length - 1]! - 1]
        const first = boxes[trap.stops[0]! - 1]
        if (last && first) path(`M${last.x + 4} ${last.y + 2}C${last.x + 50} ${last.y - 60} ${first.x + 60} ${first.y - 40} ${first.x + 8} ${first.y}`, 'loop')
      }
      root.appendChild(svg)
      boxes.forEach((b, i) => b && div(`badge${bad.has(i + 1) ? ' bad' : ''}`, { x: b.x + 4, y: b.y + 2 }, String(i + 1)))
    }

    if (layers.has('issues')) {
      const placed: Box[] = []
      const width = container ? container.clientWidth : doc.documentElement.clientWidth
      // On a narrow page every label at once is noise: show only the one being looked at.
      const narrow = width < 600
      for (const issue of result.issues) {
        if (narrow && issue.id !== focus) continue
        // Structure issues only get labels when you're looking at structure.
        if ((issue.rule === 'heading-skip' || issue.rule === 'no-main') && !layers.has('headings')) continue
        const els = elements.issues.get(issue.id) ?? []
        const target = els[0]
        if (!target) continue
        const b = boxOf(target)
        if (!b) continue
        if (issue.rule === 'focus-trap') div('flag', { x: b.x - 6, y: b.y - 6, w: b.w + 12, h: b.h + 12 })
        const text = calloutText(issue)
        if (!text) continue
        const red = issue.severity === 'critical' || issue.rule === 'positive-tabindex'
        const el = div(`callout${red ? ' red' : ''}`, { x: 0, y: 0 }, text)
        const w = el.offsetWidth || text.length * 7.6 + 18
        const h = el.offsetHeight || 24
        // Beside things that sit in a row, below fields, above everything else; flip if that leaves the page.
        const side = issue.rule === 'unreachable'
        const below = issue.rule === 'missing-name' || issue.rule === 'placeholder-label'
        let x = side ? b.x + b.w + 10 : issue.rule === 'focus-trap' ? b.x + b.w - w : issue.rule === 'positive-tabindex' ? b.x + Math.min(b.w, 50) : b.x
        let y = side ? b.y + b.h / 2 - h / 2 : below ? b.y + b.h + 10 : b.y - h - 10
        if (y < 2) y = b.y + b.h + 10
        if (side && x + w > width - 4) [x, y] = [b.x, b.y + b.h + 10]
        x = Math.max(4, Math.min(x, width - w - 4))
        const step = below || y > b.y ? h + 4 : -(h + 4)
        for (let guard = 0; guard < 6 && placed.some((p) => x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y); guard++) y += step
        placed.push({ x, y, w, h })
        el.style.left = `${x}px`
        el.style.top = `${y}px`
      }
    }

    if (focus) {
      for (const el of data.elements.issues.get(focus) ?? []) {
        const b = boxOf(el)
        if (b) div('focus', { x: b.x - 8, y: b.y - 8, w: b.w + 16, h: b.h + 16 })
      }
    }
  }

  const schedule = () => {
    if (!raf) raf = doc.defaultView!.requestAnimationFrame(draw)
  }
  const view = doc.defaultView!
  const ro = new ResizeObserver(schedule)
  ro.observe(container ?? doc.documentElement)
  // The page re-renders (a widget closes, a form shows an error): follow it.
  const mo = new MutationObserver(schedule)
  mo.observe(container ?? doc.body, { childList: true, subtree: true, characterData: true })
  view.addEventListener('resize', schedule)
  // Fixed-position widgets move as the page scrolls.
  ;(container ?? view).addEventListener('scroll', schedule, { passive: true })

  return {
    show(result, elements) {
      data = { result, elements }
      schedule()
    },
    setLayers(next) {
      layers = new Set(next)
      schedule()
    },
    highlight(id) {
      focus = id
      schedule()
    },
    clear() {
      data = null
      focus = null
      schedule()
    },
    destroy() {
      ro.disconnect()
      mo.disconnect()
      view.removeEventListener('resize', schedule)
      ;(container ?? view).removeEventListener('scroll', schedule)
      if (raf) view.cancelAnimationFrame(raf)
      host.remove()
    },
  }
}
