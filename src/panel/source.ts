import type { AuditResult, Issue } from '../engine/types'
import type { Layer } from '../overlay/overlay'

/** Where audits come from: the demo page in this tab, or the active tab via the extension. */
export interface AuditSource {
  run(): Promise<AuditResult>
  setLayers(layers: readonly Layer[]): void
  /** Outline an issue's elements and scroll them into view; null clears. */
  highlight(issueId: string | null): void
  clear(): void
}

/** Only the demo can repair the page it audits. */
export interface FixSupport {
  label(issue: Issue): string | null
  apply(issue: Issue): void
  reset(): void
  fixed: number
  total: number
}

export class AuditError extends Error {}
