import { DEFAULT_LAYERS, LAYERS, type Layer } from '../overlay/overlay'
import { ALL_FIXES, type FixKey } from '../sample/fixes'

export interface Saved {
  layers: Layer[]
  fixed: FixKey[]
  panel: boolean
}

const KEY = 'focus-lens:demo:v1'
export const DEFAULTS: Saved = { layers: [...DEFAULT_LAYERS], fixed: [], panel: true }

const layerIds = new Set<string>(LAYERS.map((l) => l.id))
const fixIds = new Set<string>(ALL_FIXES)

/** Reads saved settings, dropping anything unknown rather than trusting old or hand-edited data. */
export function load(store: Pick<Storage, 'getItem'> = localStorage): Saved {
  try {
    const raw = store.getItem(KEY)
    if (!raw) return DEFAULTS
    const v = JSON.parse(raw) as Partial<Record<keyof Saved, unknown>>
    return {
      layers: Array.isArray(v.layers) ? (v.layers.filter((l) => typeof l === 'string' && layerIds.has(l)) as Layer[]) : DEFAULTS.layers,
      fixed: Array.isArray(v.fixed) ? ([...new Set(v.fixed)].filter((f) => typeof f === 'string' && fixIds.has(f)) as FixKey[]) : [],
      panel: typeof v.panel === 'boolean' ? v.panel : true,
    }
  } catch {
    return DEFAULTS
  }
}

export function save(s: Saved, store: Pick<Storage, 'setItem'> = localStorage) {
  try {
    store.setItem(KEY, JSON.stringify(s))
  } catch {
    /* private mode or full: settings just won't stick */
  }
}
