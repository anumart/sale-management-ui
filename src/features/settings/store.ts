import { create } from 'zustand'
import { defaultSettings, settingDefinitions, type SettingKey, type Settings } from './definitions'

/** One edited value. Kept for audit only — nothing is recalculated from history. */
export interface SettingChange {
  id: string
  key: SettingKey
  from: number
  to: number
  changedBy: string
  changedAt: string
}

const STORAGE_KEY = 'settings'
const HISTORY_LIMIT = 200

interface Saved {
  values: Settings
  history: SettingChange[]
}

function load(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    // Start from the defaults so a setting added later still gets a value
    const values = { ...defaultSettings }
    for (const d of settingDefinitions) if (typeof saved.values?.[d.key] === 'number') values[d.key] = saved.values[d.key]
    return { values, history: Array.isArray(saved.history) ? saved.history : [] }
  } catch {
    return { values: { ...defaultSettings }, history: [] }
  }
}

function persist(saved: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  } catch {
    // storage unavailable (private mode): the change just lasts for this session
  }
}

interface SettingsState extends Saved {
  /** Saves the values and logs one history entry per key that changed. Returns how many changed. */
  save: (next: Settings, changedBy: string) => number
}

/** System-wide business rules (definitions.ts), persisted in localStorage until there is a backend. */
export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...load(),
  save: (next, changedBy) => {
    const { values, history } = get()
    const changedAt = new Date().toISOString()
    const changes: SettingChange[] = settingDefinitions
      .filter((d) => next[d.key] !== values[d.key])
      .map((d, i) => ({ id: `${Date.now()}-${i}`, key: d.key, from: values[d.key], to: next[d.key], changedBy, changedAt }))
    if (!changes.length) return 0
    const saved = { values: { ...next }, history: [...changes, ...history].slice(0, HISTORY_LIMIT) }
    set(saved)
    persist(saved)
    return changes.length
  },
}))
