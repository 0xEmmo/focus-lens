import { formatRatio } from '../engine/color'
import type { Issue } from '../engine/types'
import { Icon } from './Icon'

interface Props {
  issue: Issue
  index: number
  open: boolean
  onToggle: () => void
  onShow: () => void
  onCopy: () => void
  fixLabel: string | null
  onFix?: () => void
}

const SEV = { critical: 'Critical', serious: 'Serious', moderate: 'Moderate' } as const

export function IssueItem({ issue, index, open, onToggle, onShow, onCopy, fixLabel, onFix }: Props) {
  const bodyId = `${issue.id}-body`
  const c = issue.contrast
  return (
    <li className={`iss${open ? ' open' : ''} sev-${issue.severity}`}>
      <span className={`n${issue.severity === 'critical' ? '' : ' w'}`} aria-hidden="true">
        {issue.severity === 'critical' ? '!' : index}
      </span>
      <div className="iss-main">
        <h3>
          <button type="button" className="iss-toggle" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
            {issue.title}
            <span className={`sev ${issue.severity[0]}`}>{SEV[issue.severity]}</span>
          </button>
        </h3>
        <p className="w mono">
          WCAG {issue.wcag.map((w) => w.split(' ')[0]).join(', ')}
          {issue.wcag.length === 1 ? ` ${issue.wcag[0]!.split(' ').slice(1).join(' ')}` : ''}
          {issue.stops.length > 0 &&
            ` · stop${issue.stops.length > 1 ? 's' : ''} ${issue.stops.length > 2 ? `${issue.stops[0]} to ${issue.stops[issue.stops.length - 1]}` : issue.stops.join(', ')}`}
        </p>
        <div id={bodyId} className="iss-body" hidden={!open}>
          <p>{issue.detail}</p>
          <p className="fix">
            <b>Fix:</b> {issue.fix}
          </p>
          {c && (
            <div className="cmp">
              <div>
                <div className="sw" style={{ background: c.bg, color: c.fg }}>
                  {c.sample}
                </div>
                <span className="mono">
                  {c.fix?.change === 'background' ? c.bg : c.fg} · {formatRatio(c.ratio)}
                </span>
              </div>
              {c.fix && (
                <div>
                  <div
                    className="sw"
                    style={{ background: c.fix.change === 'background' ? c.fix.color : c.bg, color: c.fix.change === 'foreground' ? c.fix.color : c.fg }}
                  >
                    {c.sample}
                  </div>
                  <span className="mono">
                    {c.fix.color} · {formatRatio(c.fix.ratio)} passes
                  </span>
                </div>
              )}
            </div>
          )}
          {issue.code && <code className="code">{issue.code}</code>}
          <div className="iss-actions">
            {issue.selector !== 'body' && (
              <button type="button" className="act" onClick={onShow}>
                <Icon name="target" size={14} /> Show on page
              </button>
            )}
            <button type="button" className="act" onClick={onCopy}>
              <Icon name="copy" size={14} /> Copy as issue
            </button>
            {fixLabel && onFix && (
              <button type="button" className="act fix-it" onClick={onFix}>
                <Icon name="wrench" size={14} /> Fix it in the sample
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}
