import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_LAYERS, LAYERS, type Layer } from '../../src/overlay/overlay'
import { Panel } from '../../src/panel/Panel'
import { hostOf } from '../../src/report/export'
import { TabSource } from './tabSource'

interface Target {
  id: number
  url: string | undefined
  /** Changes when the tab navigates, so the panel starts fresh. */
  version: number
}

const valid = new Set<string>(LAYERS.map((l) => l.id))

/** The panel in Chrome's side panel, following whichever tab is active. */
export function SidePanel() {
  const [target, setTarget] = useState<Target | null>(null)
  const [layers, setLayers] = useState<Layer[]>(DEFAULT_LAYERS)

  useEffect(() => {
    // A tab id in the URL pins the panel to that tab (used by the end-to-end tests).
    const pinned = Number(new URLSearchParams(location.search).get('tab')) || null
    const pick = async () => {
      const tab = pinned ? await chrome.tabs.get(pinned) : (await chrome.tabs.query({ active: true, currentWindow: true }))[0]
      if (tab?.id !== undefined) setTarget((t) => ({ id: tab.id!, url: tab.url ?? tab.pendingUrl, version: (t?.version ?? 0) + 1 }))
    }
    void pick()
    chrome.storage.local.get('layers').then(({ layers: saved }) => {
      if (Array.isArray(saved)) setLayers(saved.filter((l): l is Layer => valid.has(l)))
    })
    if (pinned) return
    const onActivated = () => void pick()
    const onUpdated = (_id: number, info: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => {
      if (tab.active && info.status === 'complete') void pick()
    }
    chrome.tabs.onActivated.addListener(onActivated)
    chrome.tabs.onUpdated.addListener(onUpdated)
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated)
      chrome.tabs.onUpdated.removeListener(onUpdated)
    }
  }, [])

  const source = useMemo(() => (target ? new TabSource(target.id, target.url) : null), [target])

  // Take the overlay down when the panel closes or moves to another tab.
  useEffect(() => {
    if (!source) return
    const off = () => source.clear()
    window.addEventListener('pagehide', off)
    return () => {
      window.removeEventListener('pagehide', off)
      off()
    }
  }, [source])

  const onLayers = (next: Layer[]) => {
    setLayers(next)
    void chrome.storage.local.set({ layers: next })
  }

  if (!source || !target) return null
  return <Panel key={`${target.id}:${target.version}`} source={source} host={target.url ? hostOf(target.url) : 'No page'} layers={layers} onLayers={onLayers} />
}
