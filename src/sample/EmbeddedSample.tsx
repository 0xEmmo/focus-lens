import { useEffect, useState } from 'react'
import { isEmbedMessage, type EmbedMessage } from './embed'
import { ALL_FIXES, type FixKey } from './fixes'
import { Sample } from './Sample'

const embedded = window.parent !== window
const post = (m: EmbedMessage) => window.parent.postMessage(m, location.origin)

/**
 * On its own, every flaw is left in: this page exists to be audited by the
 * extension. Inside the demo's frame, the demo says which flaws to fix.
 */
export function EmbeddedSample() {
  const [fixed, setFixed] = useState<ReadonlySet<FixKey>>(() => new Set())

  useEffect(() => {
    if (!embedded) return
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || !isEmbedMessage(e.data) || e.data.type !== 'ember:fixes') return
      setFixed(new Set(e.data.fixes.filter((f): f is FixKey => (ALL_FIXES as string[]).includes(f))))
    }
    window.addEventListener('message', onMessage)
    post({ type: 'ember:ready' })
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Tell the demo once the change is on screen, so it audits the new page and not the old one.
  useEffect(() => {
    if (embedded) requestAnimationFrame(() => post({ type: 'ember:rendered', fixes: [...fixed] }))
  }, [fixed])

  return <Sample fixed={fixed} />
}
