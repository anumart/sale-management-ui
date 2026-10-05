import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { SectionTabs, type SectionTabsVariant } from '@/components/ui'
import { cn } from '@/lib/cn'
import { Topbar } from './Topbar'

export interface Section<V extends string> {
  value: V
  label: string
  icon: ReactNode
  /** Landing path of the tab; also the prefix that marks it active (e.g. a run-sheet detail page under run sheets) */
  path: string
}

/** Longest section path that prefixes the URL wins; falls back to the first section. */
export function sectionFromPath<V extends string>(sections: Section<V>[], pathname: string): V {
  const hit = sections
    .filter((s) => pathname === s.path || pathname.startsWith(`${s.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]
  return (hit ?? sections[0]).value
}

/**
 * How long the tab indicator slides before the page swaps. Rendering the next page blocks the main thread, and a
 * CSS animation running during that block jumps to its end, so the swap waits until most of the slide has played.
 */
const SWITCH_DELAY_MS = 240

export interface SectionLayoutProps<V extends string> {
  sections: Section<V>[]
  'aria-label': string
  variant?: SectionTabsVariant
}

/**
 * Shell for a group of tabbed pages (Procurement, Logistics, Production), used as a pathless layout route.
 * The top bar lives here instead of in each page, so it stays mounted when the tab changes. A tab click moves the
 * indicator and fades the current page out right away, then navigates; the new page fades in.
 */
export function SectionLayout<V extends string>({ sections, variant = 'mask', ...aria }: SectionLayoutProps<V>) {
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  const active = sectionFromPath(sections, pathname)
  const [pending, setPending] = useState<V | null>(null)
  const timer = useRef<number>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const select = (value: V) => {
    window.clearTimeout(timer.current)
    const target = sections.find((s) => s.value === value)!
    if (pathname === target.path) {
      setPending(null)
      return
    }
    // Commit the indicator move by itself so it starts this frame
    flushSync(() => setPending(value))
    timer.current = window.setTimeout(
      () => {
        navigate({ to: target.path }).finally(() => setPending(null))
      },
      // Same tab (e.g. back to the list from a detail page): nothing slides, just fade and go
      value === active ? 120 : SWITCH_DELAY_MS,
    )
  }

  return (
    <>
      <Topbar
        tabs={
          <SectionTabs
            {...aria}
            variant={variant}
            value={pending ?? active}
            onChange={select}
            options={sections.map(({ value, label, icon }) => ({ value, label, icon }))}
          />
        }
      />
      {/* Only the page under the bar replays the entrance animation */}
      <div key={pathname} className={cn('animate-fade-in-up transition-opacity duration-200 ease-smooth', pending && 'opacity-0')}>
        <Outlet />
      </div>
    </>
  )
}
