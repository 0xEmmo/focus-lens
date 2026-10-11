import { audit } from '../engine/audit'
import type { AuditElements, AuditResult } from '../engine/types'
import { createOverlay, type Layer, type Overlay } from '../overlay/overlay'
import type { AuditSource } from '../panel/source'

export const SAMPLE_URL = 'https://embercinemas.ng/lekki/book/the-ferryman-of-epe'
export const SAMPLE_TITLE = 'Book: The Ferryman of Epe'

/**
 * Audits the sample page in its frame, exactly as the extension audits a tab:
 * a separate document with its own scroll, styles and focus.
 */
export class FrameSource implements AuditSource {
  private overlay: Overlay | null = null
  private elements: AuditElements | null = null
  private layers: readonly Layer[] = []
  private readonly frame: HTMLIFrameElement

  constructor(frame: HTMLIFrameElement) {
    this.frame = frame
  }

  private get doc(): Document | null {
    return this.frame.contentDocument
  }

  async run(): Promise<AuditResult> {
    const doc = this.doc
    if (!doc?.querySelector('.ember')) throw new Error('The sample page hasn’t loaded yet. Reload to try again.')
    const { result, elements } = audit(doc)
    this.elements = elements
    // A reloaded frame takes the old overlay with it.
    if (this.overlay && !doc.querySelector('[data-focus-lens="overlay"]')) this.overlay = null
    this.overlay ??= createOverlay(null, doc)
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
    if (el?.isConnected)
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
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
