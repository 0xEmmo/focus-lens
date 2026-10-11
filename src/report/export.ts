import { formatRatio } from '../engine/color'
import type { AuditResult, Issue } from '../engine/types'

const SEV_LABEL = { critical: 'Critical', serious: 'Serious', moderate: 'Moderate' } as const

export function toJSON(result: AuditResult): string {
  return JSON.stringify({ tool: 'Focus Lens', version: 1, ...result }, null, 2)
}

function issueBlock(issue: Issue, heading = '###'): string {
  const lines = [
    `${heading} ${issue.title}`,
    '',
    `**${SEV_LABEL[issue.severity]}** · WCAG ${issue.wcag.join(', ')}${issue.stops.length ? ` · tab stop${issue.stops.length > 1 ? 's' : ''} ${issue.stops.join(', ')}` : ''}`,
    '',
  ]
  lines.push(issue.detail, '', `**Fix:** ${issue.fix}`)
  if (issue.contrast) {
    const c = issue.contrast
    lines.push('', `| | Colours | Ratio |`, `| --- | --- | --- |`, `| Now | \`${c.fg}\` on \`${c.bg}\` | ${formatRatio(c.ratio)} (needs ${c.required}:1) |`)
    if (c.fix) {
      const [fg, bg] = c.fix.change === 'background' ? [c.fg, c.fix.color] : [c.fix.color, c.bg]
      lines.push(`| Suggested | \`${fg}\` on \`${bg}\` | ${formatRatio(c.fix.ratio)} |`)
    }
  }
  if (issue.code) lines.push('', '```', issue.code, '```')
  lines.push('', `Element: \`${issue.selector}\``)
  return lines.join('\n')
}

export function toMarkdown(result: AuditResult): string {
  const { counts } = result
  const head = [
    `# Focus Lens report: ${result.title || result.url}`,
    '',
    `${result.url}  `,
    `Checked ${new Date(result.at).toUTCString()}`,
    '',
    `**${result.stops.length} tab stops · ${result.issues.length} issue${result.issues.length === 1 ? '' : 's'}** (${counts.critical} critical, ${counts.serious} serious, ${counts.moderate} moderate)`,
    '',
  ]
  if (!result.issues.length) return [...head, 'No issues found by these checks. Still test with a real keyboard and screen reader.'].join('\n')
  const order = [
    '',
    '## Tab order',
    '',
    '| # | Role | Name | tabindex |',
    '| --- | --- | --- | --- |',
    ...result.stops.map((s) => `| ${s.n} | ${s.role} | ${s.name ? s.name.replace(/\|/g, '\\|') : '_(none)_'} | ${s.tabindex} |`),
  ]
  return [...head, '## Issues', '', result.issues.map((i) => issueBlock(i)).join('\n\n---\n\n'), ...order, ''].join('\n')
}

/** A ready-to-paste GitHub issue: one issue, or a checklist of all of them. */
export function toGitHubIssue(result: AuditResult, issue?: Issue): { title: string; body: string } {
  if (issue) {
    return {
      title: `a11y: ${issue.title}`,
      body: `${issueBlock(issue, '##')}\n\nPage: ${result.url}\n\n_Found with Focus Lens._`,
    }
  }
  const list = result.issues.map((i) => `- [ ] **${SEV_LABEL[i.severity]}**: ${i.title} (WCAG ${i.wcag.map((w) => w.split(' ')[0]).join(', ')})`)
  return {
    title: `a11y: ${result.issues.length} keyboard and contrast issues on ${hostOf(result.url)}`,
    body: [`Focus Lens found these on ${result.url}:`, '', ...list, '', 'Details for each are in the attached report.', '', '_Found with Focus Lens._'].join(
      '\n',
    ),
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host || url
  } catch {
    return url
  }
}

export function fileName(result: AuditResult, ext: 'json' | 'md'): string {
  const host = hostOf(result.url).replace(/[^a-z0-9.-]+/gi, '-') || 'page'
  return `focus-lens-${host}-${result.at.slice(0, 10)}.${ext}`
}
