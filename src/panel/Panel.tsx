import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { AuditResult } from '../engine/types'
import { LAYERS, type Layer } from '../overlay/overlay'
import { fileName, toGitHubIssue, toJSON, toMarkdown } from '../report/export'
import { Icon, Logo } from './Icon'
import { IssueItem } from './IssueItem'
import type { AuditSource, FixSupport } from './source'
import './panel.css'

type Status = { kind: 'idle' } | { kind: 'running' } | { kind: 'done'; result: AuditResult } | { kind: 'error'; message: string }

interface Props {
  source: AuditSource
  host: string
  layers: Layer[]
  onLayers: (layers: Layer[]) => void
  /** Bump to run the audit again from outside (after the page changed). */
  runKey?: unknown
  autoRun?: boolean
  fixes?: FixSupport
  onClose?: () => void
  closeLabel?: string
  /** After "Show on page", so a host can get out of the way (the phone sheet collapses). */
  onShow?: () => void
  /** Called with each result so a host app can show a summary elsewhere. */
  onResult?: (result: AuditResult | null) => void
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function Panel({ source, host, layers, onLayers, runKey, autoRun = false, fixes, onClose, closeLabel = 'Close Focus Lens', onResult, onShow }: Props) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [open, setOpen] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [menu, setMenu] = useState(false)
  const menuId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const resultCb = useRef(onResult)
  useEffect(() => {
    resultCb.current = onResult
  })

  const run = useCallback(async () => {
    setStatus({ kind: 'running' })
    try {
      // One frame so "Checking…" paints before the synchronous audit.
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      const result = await source.run()
      setStatus({ kind: 'done', result })
      resultCb.current?.(result)
      setOpen((cur) => (cur && result.issues.some((i) => i.id === cur) ? cur : (result.issues[0]?.id ?? null)))
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : 'The audit failed.' })
      resultCb.current?.(null)
    }
  }, [source])

  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      if (!autoRun) return
    }
    const t = setTimeout(() => void run(), 0)
    return () => clearTimeout(t)
  }, [runKey, autoRun, run])

  useEffect(() => {
    source.setLayers(layers)
  }, [layers, source])

  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => setNote(''), 3200)
    return () => clearTimeout(t)
  }, [note])

  const toggleLayer = (l: Layer) => onLayers(layers.includes(l) ? layers.filter((x) => x !== l) : [...layers, l])

  const result = status.kind === 'done' ? status.result : null

  const copyIssue = async (id?: string) => {
    if (!result) return
    const issue = id ? result.issues.find((i) => i.id === id) : undefined
    const gh = toGitHubIssue(result, issue)
    const ok = await copy(`${gh.title}\n\n${gh.body}`)
    setNote(ok ? `Copied “${gh.title}” to the clipboard.` : 'Your browser blocked the clipboard. Export the report instead.')
  }

  const exportAs = (kind: 'md' | 'json') => {
    if (!result) return
    download(fileName(result, kind), kind === 'md' ? toMarkdown(result) : toJSON(result), kind === 'md' ? 'text/markdown' : 'application/json')
    setMenu(false)
    setNote(`Saved ${fileName(result, kind)}.`)
  }

  return (
    <section className="fl" aria-labelledby="fl-title" data-focus-lens="panel">
      <header className="sh">
        <Logo />
        <h2 id="fl-title">Focus Lens</h2>
        <span className="mono host" title={host}>
          {host}
        </span>
        {onClose && (
          <button type="button" className="x" onClick={onClose} aria-label={closeLabel}>
            <Icon name="close" />
          </button>
        )}
      </header>

      <div className="tg" role="group" aria-label="Show on the page">
        {LAYERS.map((l) => (
          <button key={l.id} type="button" className="chip" aria-pressed={layers.includes(l.id)} onClick={() => toggleLayer(l.id)}>
            {l.id === 'order' && <i className="dot" aria-hidden="true" />}
            {l.label}
          </button>
        ))}
      </div>

      {status.kind === 'idle' && (
        <div className="state">
          <p className="lead">See this page the way a keyboard does.</p>
          <p>
            Numbers every tab stop, then checks for keyboard traps, missing names, contrast failures, hidden focus rings, headings and landmarks. Nothing leaves
            your browser.
          </p>
          <button type="button" className="primary" onClick={() => void run()}>
            Run audit
          </button>
        </div>
      )}

      {status.kind === 'running' && (
        <div className="state" role="status">
          <span className="spinner" aria-hidden="true" /> Tabbing through the page…
        </div>
      )}

      {status.kind === 'error' && (
        <div className="state" role="alert">
          <p className="lead">Couldn’t audit this page</p>
          <p>{status.message}</p>
          <button type="button" className="primary" onClick={() => void run()}>
            Try again
          </button>
        </div>
      )}

      {result && (
        <>
          <div className="score">
            <div>
              <b className="mono">{result.stops.length}</b>
              <small>tab stops</small>
            </div>
            <div>
              <b className={`mono${result.counts.critical ? ' red' : ''}`}>{result.counts.critical}</b>
              <small>critical</small>
            </div>
            <div>
              <b className="mono">{result.issues.length}</b>
              <small>issues total</small>
            </div>
          </div>
          <div className="rerun">
            <span className="mono">
              Checked in {result.ms} ms{fixes && fixes.fixed > 0 ? ` · ${fixes.fixed}/${fixes.total} fixed` : ''}
            </span>
            <span className="rerun-actions">
              {fixes && fixes.fixed > 0 && (
                <button type="button" className="act" onClick={fixes.reset}>
                  <Icon name="undo" size={14} /> Undo fixes
                </button>
              )}
              <button type="button" className="act" onClick={() => void run()}>
                <Icon name="refresh" size={14} /> Re-run
              </button>
            </span>
          </div>

          {result.issues.length === 0 ? (
            <div className="state clean" role="status">
              <span className="clean-mark" aria-hidden="true">
                <Icon name="check" size={22} />
              </span>
              <p className="lead">No issues found</p>
              <p>These checks are clean. Now try it with a real keyboard and a screen reader: automated checks catch about a third of problems.</p>
            </div>
          ) : (
            <ul className="issues" ref={listRef} aria-label={`${result.issues.length} issues`}>
              {result.issues.map((issue, i) => (
                <IssueItem
                  key={issue.id}
                  issue={issue}
                  index={i + 1}
                  open={open === issue.id}
                  onToggle={() => {
                    const next = open === issue.id ? null : issue.id
                    setOpen(next)
                    source.highlight(next)
                  }}
                  onShow={() => {
                    source.highlight(issue.id)
                    onShow?.()
                  }}
                  onCopy={() => void copyIssue(issue.id)}
                  fixLabel={fixes?.label(issue) ?? null}
                  onFix={fixes ? () => fixes.apply(issue) : undefined}
                />
              ))}
            </ul>
          )}

          <footer className="foot2">
            <button type="button" className="primary" onClick={() => void copyIssue()} disabled={!result.issues.length}>
              <Icon name="copy" size={15} /> Copy as GitHub issue
            </button>
            <div className="menu-wrap">
              <button type="button" className="secondary" aria-expanded={menu} aria-controls={menuId} onClick={() => setMenu((m) => !m)}>
                <Icon name="download" size={15} /> Export report
              </button>
              {menu && (
                <div id={menuId} className="menu" onKeyDown={(e) => e.key === 'Escape' && setMenu(false)}>
                  <button type="button" onClick={() => exportAs('md')}>
                    Markdown <span className="mono">.md</span>
                  </button>
                  <button type="button" onClick={() => exportAs('json')}>
                    JSON <span className="mono">.json</span>
                  </button>
                </div>
              )}
            </div>
          </footer>
        </>
      )}

      <p className="note" role="status" aria-live="polite">
        {note}
      </p>
    </section>
  )
}
