export type Severity = 'critical' | 'serious' | 'moderate'

export type RuleId =
  'focus-trap' | 'missing-name' | 'placeholder-label' | 'contrast' | 'positive-tabindex' | 'unreachable' | 'focus-hidden' | 'heading-skip' | 'no-main'

export interface TabStop {
  /** 1-based, as shown on the badges. */
  n: number
  selector: string
  role: string
  name: string
  tabindex: number
}

export interface ContrastInfo {
  fg: string
  bg: string
  ratio: number
  required: number
  large: boolean
  fix: { change: 'foreground' | 'background'; color: string; ratio: number } | null
  sample: string
}

export interface Issue {
  id: string
  rule: RuleId
  severity: Severity
  title: string
  wcag: string[]
  selector: string
  /** Tab stops involved, 1-based. */
  stops: number[]
  /** What goes wrong for a person, in a sentence or two. */
  detail: string
  /** What to change. */
  fix: string
  code?: string
  contrast?: ContrastInfo
  trap?: { loop: number[]; escapes: boolean }
}

export interface AuditResult {
  url: string
  title: string
  at: string
  stops: TabStop[]
  issues: Issue[]
  counts: Record<Severity, number>
  /** How long the audit took, so the UI can be honest about it. */
  ms: number
}

/** The live elements behind a result, which never leave the page. */
export interface AuditElements {
  stops: HTMLElement[]
  issues: Map<string, Element[]>
}

export const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, serious: 1, moderate: 2 }
