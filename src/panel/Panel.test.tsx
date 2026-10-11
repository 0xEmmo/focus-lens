import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import type { AuditResult } from '../engine/types'
import type { Layer } from '../overlay/overlay'
import { Panel } from './Panel'
import type { AuditSource } from './source'

const result: AuditResult = {
  url: 'https://embercinemas.ng/book',
  title: 'Book',
  at: '2026-10-11T15:00:00.000Z',
  ms: 9,
  counts: { critical: 1, serious: 0, moderate: 1 },
  stops: [{ n: 1, selector: 'a', role: 'link', name: 'Ember', tabindex: 0 }],
  issues: [
    {
      id: 'missing-name-1',
      rule: 'missing-name',
      severity: 'critical',
      title: '“✕” has no accessible name',
      wcag: ['4.1.2 Name, Role, Value'],
      selector: 'span',
      stops: [1],
      detail: 'Says nothing.',
      fix: 'Name it.',
    },
    {
      id: 'no-main-2',
      rule: 'no-main',
      severity: 'moderate',
      title: 'No main landmark',
      wcag: ['1.3.1 Info and Relationships'],
      selector: 'body',
      stops: [],
      detail: 'Nothing to jump to.',
      fix: 'Add main.',
    },
  ],
}

function fakeSource(run: () => Promise<AuditResult>): AuditSource & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    run: () => {
      calls.push('run')
      return run()
    },
    setLayers: (l) => calls.push(`layers:${l.join(',')}`),
    highlight: (id) => calls.push(`highlight:${id}`),
    clear: () => calls.push('clear'),
  }
}

function Harness({ source }: { source: AuditSource }) {
  const [layers, setLayers] = useState<Layer[]>(['order'])
  return <Panel source={source} host="embercinemas.ng" layers={layers} onLayers={setLayers} />
}

describe('Panel', () => {
  it('starts idle, runs on request and opens the worst issue', async () => {
    const source = fakeSource(async () => result)
    render(<Harness source={source} />)
    await userEvent.click(screen.getByRole('button', { name: 'Run audit' }))
    expect(await screen.findByText('tab stops')).toBeInTheDocument()
    const first = screen.getByRole('button', { name: /has no accessible name/ })
    expect(first).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Says nothing.')).toBeVisible()
    expect(screen.getByRole('list', { name: '2 issues' })).toBeInTheDocument()
  })

  it('toggles issues and highlights them on the page', async () => {
    const source = fakeSource(async () => result)
    render(<Harness source={source} />)
    await userEvent.click(screen.getByRole('button', { name: 'Run audit' }))
    await userEvent.click(await screen.findByRole('button', { name: /No main landmark/ }))
    expect(screen.getByRole('button', { name: /No main landmark/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /has no accessible name/ })).toHaveAttribute('aria-expanded', 'false')
    expect(source.calls).toContain('highlight:no-main-2')
    // A page-level issue has nothing to point at.
    expect(screen.queryAllByRole('button', { name: 'Show on page' })).toHaveLength(0)
  })

  it('toggles overlay layers as pressed buttons', async () => {
    const source = fakeSource(async () => result)
    render(<Harness source={source} />)
    const rings = screen.getByRole('button', { name: 'Focus rings' })
    expect(rings).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(rings)
    expect(rings).toHaveAttribute('aria-pressed', 'true')
    expect(source.calls).toContain('layers:order,rings')
  })

  it('shows a failure and lets you retry', async () => {
    let fail = true
    const source = fakeSource(async () => {
      if (fail) throw new Error('Chrome doesn’t let extensions read its own pages.')
      return result
    })
    render(<Harness source={source} />)
    await userEvent.click(screen.getByRole('button', { name: 'Run audit' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Chrome doesn’t let extensions read its own pages.')
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('issues total')).toBeInTheDocument()
  })

  it('celebrates a clean page, carefully', async () => {
    const source = fakeSource(async () => ({ ...result, issues: [], counts: { critical: 0, serious: 0, moderate: 0 } }))
    render(<Harness source={source} />)
    await userEvent.click(screen.getByRole('button', { name: 'Run audit' }))
    expect(await screen.findByText('No issues found')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Copy as GitHub issue/ })).toBeDisabled()
  })

  it('copies a GitHub issue, and says so when the clipboard is blocked', async () => {
    const user = userEvent.setup()
    const source = fakeSource(async () => result)
    render(<Harness source={source} />)
    await user.click(screen.getByRole('button', { name: 'Run audit' }))
    await user.click(await screen.findByRole('button', { name: /Copy as GitHub issue/ }))
    await waitFor(() => expect(screen.getByText(/Copied “a11y: 2 keyboard and contrast issues/)).toBeInTheDocument())
    expect(await navigator.clipboard.readText()).toContain('- [ ] **Critical**: “✕” has no accessible name')

    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true })
    await user.click(screen.getByRole('button', { name: /Copy as GitHub issue/ }))
    expect(await screen.findByText(/blocked the clipboard/)).toBeInTheDocument()
  })

  it('exports Markdown and JSON from the menu', async () => {
    const created: string[] = []
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      created.push(this.download)
    })
    const source = fakeSource(async () => result)
    render(<Harness source={source} />)
    await userEvent.click(screen.getByRole('button', { name: 'Run audit' }))
    const exp = await screen.findByRole('button', { name: /Export report/ })
    await userEvent.click(exp)
    expect(exp).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(screen.getByRole('button', { name: /Markdown/ }))
    await userEvent.click(exp)
    await userEvent.click(screen.getByRole('button', { name: /JSON/ }))
    expect(created).toEqual(['focus-lens-embercinemas.ng-2026-10-11.md', 'focus-lens-embercinemas.ng-2026-10-11.json'])
    click.mockRestore()
  })
})
