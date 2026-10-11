import { audit } from '../../src/engine/audit'
import type { AuditElements } from '../../src/engine/types'
import { createOverlay, type Overlay } from '../../src/overlay/overlay'
import { isRequest, type AuditReply } from './protocol'

declare global {
  interface Window {
    __focusLens?: true
  }
}

// Injected on demand, possibly more than once: only wire up the first time.
if (!window.__focusLens) {
  window.__focusLens = true
  let overlay: Overlay | null = null
  let elements: AuditElements | null = null

  chrome.runtime.onMessage.addListener((msg: unknown, _sender, reply: (r: unknown) => void) => {
    if (!isRequest(msg)) return
    switch (msg.type) {
      case 'fl:ping':
        reply({ ok: true })
        break
      case 'fl:audit': {
        let out: AuditReply
        try {
          const run = audit(document)
          elements = run.elements
          overlay ??= createOverlay(null)
          overlay.setLayers(msg.layers)
          overlay.show(run.result, run.elements)
          out = { ok: true, result: run.result }
        } catch (e) {
          out = { ok: false, error: e instanceof Error ? e.message : String(e) }
        }
        reply(out)
        break
      }
      case 'fl:layers':
        overlay?.setLayers(msg.layers)
        reply({ ok: true })
        break
      case 'fl:highlight': {
        overlay?.highlight(msg.id)
        const el = msg.id ? elements?.issues.get(msg.id)?.[0] : null
        if (el?.isConnected) el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
        reply({ ok: true })
        break
      }
      case 'fl:clear':
        overlay?.destroy()
        overlay = null
        elements = null
        reply({ ok: true })
        break
    }
  })
}
