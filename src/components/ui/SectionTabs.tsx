import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { spring, useTabIndicator } from './useTabIndicator'

export type SectionTabsVariant = 'mask' | 'hop' | 'aurora'

export interface SectionTabsOption<V extends string> {
  value: V
  label: string
  icon?: ReactNode
}

export interface SectionTabsProps<V extends string> {
  value: V
  options: SectionTabsOption<V>[]
  onChange: (value: V) => void
  /**
   * mask   – orchid pill seen through a moving window; labels turn white exactly at its edge, even mid-letter
   * hop    – a glowing dot jumps in an arc (with squash & stretch) to the active tab, whose label turns gradient
   * aurora – the active tab wears a slowly spinning theme → mint → indigo light ring
   */
  variant?: SectionTabsVariant
  /**
   * Remembers the active tab across remounts. Each section tab is its own route, so the bar remounts on every
   * switch; with a key the indicator starts at the previous tab and animates to the new one.
   */
  memoryKey?: string
  'aria-label'?: string
  className?: string
}

const labelClass = 'inline-flex h-10 items-center gap-2 rounded-full px-5 text-control font-medium whitespace-nowrap [&>svg]:size-[1.125rem]'

/** Section switcher for the top bar (procurement, logistics, production…). Three looks, all keyboard-accessible. */
export function SectionTabs<V extends string>({
  value,
  options,
  onChange,
  variant = 'mask',
  memoryKey,
  className,
  ...aria
}: SectionTabsProps<V>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const { trackRef, itemRefs, rects, shown, ready, moves } = useTabIndicator(index, options.length, memoryKey)
  const rect = rects?.[shown]

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = (index + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length
    itemRefs.current[next]?.focus()
    onChange(options[next].value)
  }

  const tabProps = (o: SectionTabsOption<V>, i: number) => ({
    ref: (el: HTMLButtonElement | null) => {
      itemRefs.current[i] = el
    },
    type: 'button' as const,
    role: 'tab',
    'aria-selected': i === index,
    tabIndex: i === index ? 0 : -1,
    onClick: () => onChange(o.value),
  })

  const trackProps = { ref: trackRef, role: 'tablist', onKeyDown, ...aria }

  if (variant === 'mask') {
    return (
      <div {...trackProps} className={cn('relative inline-flex items-center gap-1 rounded-full glass p-1.5 shadow-card', className)}>
        {options.map((o, i) => (
          <button
            key={o.value}
            {...tabProps(o, i)}
            className={cn(labelClass, 'text-ink-2 transition-colors duration-200 hover:text-ink active:scale-95')}
          >
            {o.icon}
            {o.label}
          </button>
        ))}
        {/*
          Same row again in white on the orchid gradient, clipped to the active tab. Moving the clip window
          slides the pill, and the labels flip color exactly at its edge.
        */}
        {rect && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center gap-1 rounded-full grad-theme p-1.5 text-white motion-reduce:transition-none"
            style={{
              clipPath: `inset(6px ${rect.right}px 6px ${rect.left}px round 999px)`,
              transition: ready ? `clip-path 560ms ${spring}` : 'none',
            }}
          >
            {options.map((o) => (
              <span key={o.value} className={labelClass}>
                {o.icon}
                {o.label}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (variant === 'hop') {
    return (
      <div {...trackProps} className={cn('relative inline-flex items-center gap-1 pt-3', className)}>
        {/* faint rail the dot travels along */}
        <span aria-hidden="true" className="absolute inset-x-5 top-[5px] h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
        {rect && (
          <span
            aria-hidden="true"
            className="absolute top-0.5 left-0 motion-reduce:transition-none"
            style={{
              transform: `translateX(${rect.left + rect.width / 2 - 4}px)`,
              transition: ready ? 'transform 620ms cubic-bezier(0.65, 0, 0.35, 1)' : 'none',
            }}
          >
            <span
              key={moves}
              className={cn(
                'block size-2 rounded-full grad-theme shadow-[0_0_10px_3px_rgb(232_69_122/0.5)]',
                moves > 0 && 'animate-tab-hop motion-reduce:animate-none',
              )}
            />
          </span>
        )}
        {options.map((o, i) => {
          const active = i === shown
          return (
            <button
              key={o.value}
              {...tabProps(o, i)}
              className={cn(
                labelClass,
                'transition-[color,opacity,transform] duration-300 ease-smooth active:scale-95',
                active ? 'font-semibold [&>svg]:text-theme' : 'text-muted hover:text-ink',
              )}
            >
              {o.icon}
              <span className={cn(active && 'text-grad-theme')}>{o.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  // aurora
  return (
    <div {...trackProps} className={cn('relative inline-flex items-center gap-1 rounded-full glass p-1.5 shadow-card', className)}>
      {rect && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 motion-reduce:transition-none"
          style={{
            left: rect.left,
            right: rect.right,
            transition: ready ? `left 520ms ${spring}, right 520ms ${spring}` : 'none',
          }}
        >
          {/* soft halo, then the crisp 2px ring, then the white face */}
          <span className="absolute -inset-1 rounded-full opacity-50 blur-md aurora-ring" />
          <span className="absolute inset-0 rounded-full p-[2px] aurora-ring">
            <span className="block size-full rounded-full bg-surface" />
          </span>
        </span>
      )}
      {options.map((o, i) => {
        const active = i === shown
        return (
          <button
            key={o.value}
            {...tabProps(o, i)}
            className={cn(
              labelClass,
              'relative z-10 transition-colors duration-300 ease-smooth active:scale-95',
              active ? 'text-ink [&>svg]:text-theme' : 'text-muted hover:text-ink',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
