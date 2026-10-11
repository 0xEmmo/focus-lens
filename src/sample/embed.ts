/** Messages between the demo and the sample page in its frame (same origin only). */
export type EmbedMessage = { type: 'ember:ready' } | { type: 'ember:fixes'; fixes: string[] } | { type: 'ember:rendered'; fixes: string[] }

export const isEmbedMessage = (m: unknown): m is EmbedMessage =>
  typeof m === 'object' && m !== null && typeof (m as { type?: unknown }).type === 'string' && (m as { type: string }).type.startsWith('ember:')
