import type { AuditResult } from '../../src/engine/types'
import type { Layer } from '../../src/overlay/overlay'
import { AuditError, type AuditSource } from '../../src/panel/source'
import contentScript from './content?script'
import { explain, RESTRICTED } from './explain'
import type { AuditReply, Request } from './protocol'

/** Audits a browser tab through the content script. */
export class TabSource implements AuditSource {
  private layers: readonly Layer[] = []
  readonly tabId: number
  readonly url: string | undefined

  constructor(tabId: number, url: string | undefined) {
    this.tabId = tabId
    this.url = url
  }

  private send<T>(msg: Request): Promise<T> {
    return chrome.tabs.sendMessage(this.tabId, msg) as Promise<T>
  }

  private async ping(): Promise<boolean> {
    try {
      await this.send({ type: 'fl:ping' })
      return true
    } catch {
      return false
    }
  }

  private async ensureInjected() {
    if (await this.ping()) return
    await chrome.scripting.executeScript({ target: { tabId: this.tabId }, files: [contentScript] })
    // The loader imports the real script as a module, so it starts listening a moment later.
    for (let i = 0; i < 40; i++) {
      if (await this.ping()) return
      await new Promise((r) => setTimeout(r, 50))
    }
    throw new Error('The page didn’t answer. Reload it and try again.')
  }

  async run(): Promise<AuditResult> {
    if (this.url && RESTRICTED.test(this.url)) throw new AuditError(explain(this.url, null))
    try {
      await this.ensureInjected()
    } catch (e) {
      throw new AuditError(explain(this.url, e))
    }
    const reply = await this.send<AuditReply>({ type: 'fl:audit', layers: [...this.layers] })
    if (!reply?.ok) throw new AuditError(reply?.error ?? 'The page didn’t answer. Reload it and try again.')
    return reply.result
  }

  setLayers(layers: readonly Layer[]) {
    this.layers = layers
    this.send({ type: 'fl:layers', layers: [...layers] }).catch(() => {})
  }

  highlight(id: string | null) {
    this.send({ type: 'fl:highlight', id }).catch(() => {})
  }

  clear() {
    this.send({ type: 'fl:clear' }).catch(() => {})
  }
}
