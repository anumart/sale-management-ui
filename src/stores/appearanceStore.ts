import { create } from 'zustand'

/** Page background photos painted by AppBackground; each has a matching `html[data-bg='…']` block in index.css (colors are the thumbnail's fallback gradient). */
export const backgrounds = [
  { id: 'floral', label: 'Floral', colors: ['#8fbcf5', '#f7c6d9', '#fbd9b8'], image: '/images/flower-meadow-background.webp' },
  { id: 'highland', label: 'Highland', colors: ['#8a8fe0', '#e9a0c8', '#4f8f4a'], image: '/images/highland-dusk-background.webp' },
  { id: 'bloom', label: 'Bloom', colors: ['#3fa4f5', '#fbd6dc', '#f0508a'], image: '/images/bloom-meadow-background.webp' },
] as const

/** Glass surface styles; each has a matching `html[data-glass='…']` block in index.css. */
export const glassStyles = [
  { id: 'frosted', label: 'Frosted', hint: 'สมดุล' },
  { id: 'opaque', label: 'Opaque', hint: 'ขุ่นกว่า Milky' },
  { id: 'milky', label: 'Milky', hint: 'อ่านง่ายสุด' },
  { id: 'smoke', label: 'Smoke', hint: 'โทนเข้ม' },
] as const

/** Theme colors (nav highlight, main buttons, stat chips); each has a matching `html[data-theme='…']` block in index.css (rose = default). */
export const themeColors = [
  { id: 'rose', label: 'Rose', colors: ['#ff8aa8', '#e8457a', '#b8329a'] },
  { id: 'violet', label: 'Violet', colors: ['#a48cff', '#7c5cf0', '#5b3fd6'] },
  { id: 'magenta', label: 'Magenta', colors: ['#f0538f', '#c81e6b', '#8e1456'] },
  { id: 'teal', label: 'Teal', colors: ['#2dd4bf', '#0f9b8e', '#0b6f6a'] },
  { id: 'plum', label: 'Plum', colors: ['#5a3a6b', '#3a1f3a', '#2a0a24'] },
] as const

export type BackgroundId = (typeof backgrounds)[number]['id']
export type GlassId = (typeof glassStyles)[number]['id']
export type ThemeId = (typeof themeColors)[number]['id']

const STORAGE_KEY = 'appearance'
const defaults = { background: 'floral' as BackgroundId, glass: 'frosted' as GlassId, theme: 'rose' as ThemeId }

function load(): typeof defaults {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return {
      background: backgrounds.some((b) => b.id === saved.background) ? saved.background : defaults.background,
      glass: glassStyles.some((g) => g.id === saved.glass) ? saved.glass : defaults.glass,
      theme: themeColors.some((t) => t.id === saved.theme) ? saved.theme : defaults.theme,
    }
  } catch {
    return defaults
  }
}

function apply({ background, glass, theme }: typeof defaults) {
  document.documentElement.dataset.bg = background
  document.documentElement.dataset.glass = glass
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ background, glass, theme }))
  } catch {
    // storage unavailable (private mode): the choice just lasts for this session
  }
}

interface AppearanceState {
  background: BackgroundId
  glass: GlassId
  theme: ThemeId
  setBackground: (id: BackgroundId) => void
  setGlass: (id: GlassId) => void
  setTheme: (id: ThemeId) => void
}

const initial = load()
apply(initial)

/** User-selected page background and glass style, persisted in localStorage and applied as data attributes on <html>. */
export const useAppearanceStore = create<AppearanceState>((set, get) => ({
  ...initial,
  setBackground: (background) => {
    set({ background })
    apply({ ...get(), background })
  },
  setGlass: (glass) => {
    set({ glass })
    apply({ ...get(), glass })
  },
  setTheme: (theme) => {
    set({ theme })
    apply({ ...get(), theme })
  },
}))
