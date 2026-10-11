import { cssPath, tabIndexOf, tabOrder } from './dom'
import { accessibleName, roleOf } from './name'
import { RULES, type Context } from './rules'
import { SEVERITY_ORDER, type AuditElements, type AuditResult, type Issue, type Severity } from './types'

export interface AuditOutput {
  result: AuditResult
  elements: AuditElements
}

/** Runs every rule against `root` (the whole document by default). */
export function audit(doc: Document = document, root: Element = doc.documentElement): AuditOutput {
  const t0 = performance.now()
  const order = tabOrder(root)
  const index = new Map<Element, number>(order.map((el, i) => [el, i + 1]))
  const ctx: Context = { doc, root, order, stop: (el) => index.get(el) }

  const findings = RULES.flatMap((rule) => rule(ctx))
  // Worst first; a trap outranks other criticals because it blocks everything after it.
  const weight = (r: string) => (r === 'focus-trap' ? 0 : 1)
  findings.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || weight(a.rule) - weight(b.rule) || (a.stops[0] ?? 999) - (b.stops[0] ?? 999),
  )

  const elements: AuditElements = { stops: order, issues: new Map() }
  const issues: Issue[] = findings.map(({ elements: els, ...rest }, i) => {
    const id = `${rest.rule}-${i + 1}`
    elements.issues.set(id, els)
    return { ...rest, id, stops: [...new Set(rest.stops)].sort((a, b) => a - b) }
  })

  const counts: Record<Severity, number> = { critical: 0, serious: 0, moderate: 0 }
  issues.forEach((i) => counts[i.severity]++)

  return {
    result: {
      url: doc.location?.href ?? '',
      title: doc.title,
      at: new Date().toISOString(),
      stops: order.map((el, i) => ({ n: i + 1, selector: cssPath(el), role: roleOf(el), name: accessibleName(el).name, tabindex: tabIndexOf(el) })),
      issues,
      counts,
      ms: Math.round(performance.now() - t0),
    },
    elements,
  }
}
