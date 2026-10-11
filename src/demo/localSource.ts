import { audit } from '../engine/audit'
import type { AuditElements, AuditResult } from '../engine/types'
import { createOverlay, type Layer, type Overlay } from '../overlay/overlay'
import type { AuditSource } from '../panel/source'

export const SAMPLE_URL = 'https://embercinemas.ng/lekki/book/the-ferryman-of-epe'
export const SAMPLE_TITLE = 'Book: The Ferryman of Epe'

/** Audits part of this very page (the sample) and draws the overlay inside its scroller. */
export class LocalSource implements AuditSource {
  private overlay: Overlay | null = null
  private elements: AuditElements | null = null
  private layers: readonly Layer[] = []
  private readonly scroller: HTMLElement
  private readonly root: () => Element | null
  private readonly reduced: () => boolean

  constructor(scroller: HTMLElement, root: () => Element | null, reducedMotion: () => boolean) {
    this.scroller = scroller
    this.root = root
    this.reduced = reducedMotion
  }

  async run(): Promise<AuditResult> {
    const root = this.root()
    if (!root) throw new Error('The sample page hasn’t loaded yet.')
    const { result, elements } = audit(document, root)
    this.elements = elements
    this.overlay ??= createOverlay(this.scroller)
    this.overlay.setLayers(this.layers)
    // Report it as the site it pretends to be, not as the demo.
    const page = { ...result, url: SAMPLE_URL, title: SAMPLE_TITLE }
    this.overlay.show(page, elements)
    return page
  }

  setLayers(layers: readonly Layer[]) {
    this.layers = layers
    this.overlay?.setLayers(layers)
  }

  highlight(id: string | null) {
    this.overlay?.highlight(id)
    const el = id ? this.elements?.issues.get(id)?.[0] : null
    if (el && el.isConnected) el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: this.reduced() ? 'auto' : 'smooth' })
  }

  elementsFor(id: string): Element[] {
    return this.elements?.issues.get(id) ?? []
  }

  clear() {
    this.overlay?.clear()
  }

  destroy() {
    this.overlay?.destroy()
    this.overlay = null
  }
}
