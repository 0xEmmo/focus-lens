import { useEffect, useMemo, useRef, useState } from 'react'
import type { AuditResult, Issue } from '../engine/types'
import type { Layer } from '../overlay/overlay'
import { Icon, Logo } from '../panel/Icon'
import { Panel } from '../panel/Panel'
import type { FixSupport } from '../panel/source'
import { ALL_FIXES, FIX_LABEL, fixFor, type FixKey } from '../sample/fixes'
import { Sample } from '../sample/Sample'
import { About, GetExtension } from './Info'
import { Dialog } from './Dialog'
import { useInstallPrompt, useIsPhone } from './hooks'
import { LocalSource, SAMPLE_URL } from './localSource'
import { load, save, type Saved } from './storage'
import { UpdatePrompt } from './UpdatePrompt'
import './demo.css'

const URL_PATH = SAMPLE_URL.replace('https://embercinemas.ng', '')

export function App() {
  const phone = useIsPhone()
  const install = useInstallPrompt()
  const [saved, setSaved] = useState<Saved>(load)
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null)
  const [summary, setSummary] = useState<AuditResult | null>(null)
  const [sheet, setSheet] = useState(false)
  const [dialog, setDialog] = useState<null | 'about' | 'extension'>(null)
  const [announce, setAnnounce] = useState('')
  const lastFix = useRef<FixKey | null>(null)

  useEffect(() => save(saved), [saved])

  const source = useMemo(() => (scroller ? new LocalSource(scroller, () => scroller.querySelector('.ember')) : null), [scroller])
  useEffect(() => () => source?.destroy(), [source])

  const fixed = useMemo(() => new Set(saved.fixed), [saved.fixed])
  const panelShown = phone || saved.panel

  useEffect(() => {
    if (!panelShown) source?.clear()
  }, [panelShown, source])

  const fixes: FixSupport | undefined = source
    ? {
        label: (issue: Issue) => {
          const k = fixFor(issue.rule, source.elementsFor(issue.id))
          return k && !fixed.has(k) ? FIX_LABEL[k] : null
        },
        apply: (issue: Issue) => {
          const k = fixFor(issue.rule, source.elementsFor(issue.id))
          if (!k) return
          lastFix.current = k
          setSaved((s) => ({ ...s, fixed: [...new Set([...s.fixed, k])] }))
        },
        reset: () => {
          lastFix.current = null
          setSaved((s) => ({ ...s, fixed: [] }))
          setAnnounce('All nine flaws are back.')
        },
        fixed: saved.fixed.length,
        total: ALL_FIXES.length,
      }
    : undefined

  const onResult = (r: AuditResult | null) => {
    setSummary(r)
    if (r && lastFix.current) {
      setAnnounce(
        `Fixed: ${FIX_LABEL[lastFix.current]}. ${r.issues.length ? `${r.issues.length} issue${r.issues.length > 1 ? 's' : ''} left.` : 'No issues left.'}`,
      )
      lastFix.current = null
    }
  }

  useEffect(() => {
    if (!announce) return
    const t = setTimeout(() => setAnnounce(''), 4000)
    return () => clearTimeout(t)
  }, [announce])

  const setLayers = (layers: Layer[]) => setSaved((s) => ({ ...s, layers }))

  const panel = source && (
    <Panel
      source={source}
      host="embercinemas.ng"
      layers={saved.layers}
      onLayers={setLayers}
      runKey={saved.fixed.join('|')}
      autoRun
      fixes={fixes}
      onResult={onResult}
      onClose={phone ? () => setSheet(false) : () => setSaved((s) => ({ ...s, panel: false }))}
      closeLabel={phone ? 'Collapse the report' : 'Close Focus Lens'}
    />
  )

  const actions = (
    <div className="bar-actions">
      <button type="button" className="btn" onClick={() => setDialog('extension')}>
        Get the extension
      </button>
      <button type="button" className="btn" onClick={() => setDialog('about')}>
        About
      </button>
      {install && (
        <button type="button" className="btn dark" onClick={() => void install()}>
          Install app
        </button>
      )}
    </div>
  )

  return (
    <div className={`demo${phone ? ' phone' : ''}`}>
      {phone ? (
        <header className="pbar">
          <Logo size={26} />
          <div className="pbar-t">
            <b>Focus Lens</b>
            <span className="mono">embercinemas.ng</span>
          </div>
          <button type="button" className="icon-btn" onClick={() => setDialog('extension')} aria-label="Get the extension">
            <Icon name="download" size={18} />
          </button>
          <button type="button" className="icon-btn info" onClick={() => setDialog('about')} aria-label="About Focus Lens">
            i
          </button>
        </header>
      ) : (
        <header className="chrome">
          <div className="tabs">
            <span className="dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="tab on">
              <span className="fav" aria-hidden="true" />
              Book: The Ferryman of Epe
            </span>
            {actions}
          </div>
          <div className="bar">
            <span className="url mono" aria-label={`Address: ${SAMPLE_URL}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.4" aria-hidden="true">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              embercinemas.ng<span>{URL_PATH}</span>
            </span>
            <button
              type="button"
              className="ext"
              aria-pressed={saved.panel}
              aria-label="Focus Lens"
              title="Focus Lens"
              onClick={() => setSaved((s) => ({ ...s, panel: !s.panel }))}
            >
              <Logo size={30} />
            </button>
          </div>
        </header>
      )}

      <div className={`body${panelShown && !phone ? ' with-panel' : ''}`}>
        <div className="page" ref={setScroller} role="region" aria-label="Sample page under audit: Ember Cinemas" tabIndex={-1}>
          <Sample fixed={fixed} />
        </div>

        {!phone && saved.panel && <aside className="side">{panel}</aside>}

        {phone && (
          <div className={`sheet${sheet ? ' open' : ''}`}>
            <button type="button" className="sheet-bar" aria-expanded={sheet} aria-controls="sheet-panel" onClick={() => setSheet((o) => !o)}>
              <span className="grab" aria-hidden="true" />
              <Logo size={24} />
              <span className="sheet-sum">
                {summary ? (
                  <>
                    <b>
                      {summary.issues.length} issue{summary.issues.length === 1 ? '' : 's'}
                    </b>
                    {summary.counts.critical > 0 && <span className="crit">{summary.counts.critical} critical</span>}
                    <span className="mono">{summary.stops.length} stops</span>
                  </>
                ) : (
                  <b>Focus Lens</b>
                )}
              </span>
              <span className="sheet-cta">{sheet ? 'Hide report' : 'Open report'}</span>
            </button>
            <div id="sheet-panel" className="sheet-panel" hidden={!sheet}>
              {panel}
            </div>
          </div>
        )}
      </div>

      <p className="announce" role="status" aria-live="polite">
        {announce}
      </p>

      <Dialog open={dialog === 'about'} title="About Focus Lens" onClose={() => setDialog(null)}>
        <About />
      </Dialog>
      <Dialog open={dialog === 'extension'} title="Use it on any site" onClose={() => setDialog(null)}>
        <GetExtension />
      </Dialog>
      {!phone && !saved.panel && (
        <button type="button" className="reopen btn dark" onClick={() => setSaved((s) => ({ ...s, panel: true }))}>
          <Logo size={18} /> Open Focus Lens
        </button>
      )}
      <UpdatePrompt />
    </div>
  )
}
