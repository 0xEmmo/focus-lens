import type { AuditResult } from '../../src/engine/types'
import type { Layer } from '../../src/overlay/overlay'

export type Request =
  | { type: 'fl:ping' }
  | { type: 'fl:audit'; layers: Layer[] }
  | { type: 'fl:layers'; layers: Layer[] }
  | { type: 'fl:highlight'; id: string | null }
  | { type: 'fl:clear' }

export type AuditReply = { ok: true; result: AuditResult } | { ok: false; error: string }

export const isRequest = (m: unknown): m is Request =>
  typeof m === 'object' && m !== null && typeof (m as { type?: unknown }).type === 'string' && (m as { type: string }).type.startsWith('fl:')
