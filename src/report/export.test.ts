import type { AuditResult } from '../engine/types'
import { fileName, toGitHubIssue, toJSON, toMarkdown } from './export'

const result: AuditResult = {
  url: 'https://embercinemas.ng/lekki/book',
  title: 'Book: The Ferryman of Epe',
  at: '2026-10-11T15:00:00.000Z',
  ms: 12,
  counts: { critical: 1, serious: 1, moderate: 0 },
  stops: [
    { n: 1, selector: 'a', role: 'link', name: 'Ember', tabindex: 0 },
    { n: 2, selector: 'input', role: 'textbox', name: '', tabindex: 0 },
  ],
  issues: [
    {
      id: 'placeholder-label-1',
      rule: 'placeholder-label',
      severity: 'critical',
      title: 'Email field has no label',
      wcag: ['1.3.1 Info and Relationships', '4.1.2 Name, Role, Value'],
      selector: 'input',
      stops: [2],
      detail: 'Only placeholder text.',
      fix: 'Add a label.',
      code: '<label for="email">Email</label>',
    },
    {
      id: 'contrast-2',
      rule: 'contrast',
      severity: 'serious',
      title: '“Pay” text is 2.8:1, fails AA',
      wcag: ['1.4.3 Contrast (Minimum)'],
      selector: 'button',
      stops: [],
      detail: 'Needs 4.5:1.',
      fix: 'Darken it.',
      contrast: {
        fg: '#FFFFFF',
        bg: '#E37D33',
        ratio: 2.89,
        required: 4.5,
        large: false,
        sample: 'Pay',
        fix: { change: 'background', color: '#B9561C', ratio: 4.76 },
      },
    },
  ],
}

describe('exports', () => {
  it('writes JSON with the tool and version', () => {
    const parsed = JSON.parse(toJSON(result))
    expect(parsed.tool).toBe('Focus Lens')
    expect(parsed.issues).toHaveLength(2)
  })

  it('writes a Markdown report with a contrast table and the tab order', () => {
    const md = toMarkdown(result)
    expect(md).toContain('# Focus Lens report: Book: The Ferryman of Epe')
    expect(md).toContain('**2 tab stops · 2 issues** (1 critical, 1 serious, 0 moderate)')
    expect(md).toContain('| Now | `#FFFFFF` on `#E37D33` | 2.89:1 (needs 4.5:1) |')
    expect(md).toContain('| Suggested | `#FFFFFF` on `#B9561C` | 4.76:1 |')
    expect(md).toContain('| 2 | textbox | _(none)_ | 0 |')
  })

  it('says so when nothing was found', () => {
    expect(toMarkdown({ ...result, issues: [], counts: { critical: 0, serious: 0, moderate: 0 } })).toContain('No issues found')
  })

  it('makes GitHub issues for one problem or all of them', () => {
    const one = toGitHubIssue(result, result.issues[0])
    expect(one.title).toBe('a11y: Email field has no label')
    expect(one.body).toContain('## Email field has no label')
    const all = toGitHubIssue(result)
    expect(all.title).toBe('a11y: 2 keyboard and contrast issues on embercinemas.ng')
    expect(all.body).toContain('- [ ] **Critical**: Email field has no label (WCAG 1.3.1, 4.1.2)')
  })

  it('names files after the host and date', () => {
    expect(fileName(result, 'md')).toBe('focus-lens-embercinemas.ng-2026-10-11.md')
  })
})
