import type { ComponentType, ReactNode } from 'react'
import type { IconProps } from '@/components/icons'
import { cn } from '@/lib/cn'

export interface StageTrackerStage {
  label: string
  icon: ComponentType<IconProps>
  /** Small line under the label (e.g. a timestamp) */
  caption?: ReactNode
}

export interface StageTrackerProps {
  stages: StageTrackerStage[]
  /** 0-based index of the stage the document is at */
  current: number
  className?: string
}

/**
 * Document status as one continuous rail: nodes carry the stage's own icon, the rail is filled with the primary
 * gradient up to the current stage, and the current node pulses. Use `Timeline` for numbered items inside a page.
 */
export function StageTracker({ stages, current, className }: StageTrackerProps) {
  const last = stages.length - 1
  const inset = `${100 / (stages.length * 2)}%`
  return (
    <ol className={cn('relative grid', className)} style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
      <li aria-hidden="true" className="absolute top-[1.0625rem] h-1 rounded-full bg-line" style={{ left: inset, right: inset }}>
        <span className="block h-full rounded-full grad-primary transition-[width] duration-500" style={{ width: `${last > 0 ? (Math.max(current, 0) / last) * 100 : 0}%` }} />
      </li>
      {stages.map((stage, i) => {
        const Icon = stage.icon
        const done = i < current
        const active = i === current
        return (
          <li key={stage.label} aria-current={active ? 'step' : undefined} className="relative flex flex-col items-center gap-2 text-center">
            <span
              className={cn(
                'relative z-10 grid size-[2.375rem] place-items-center rounded-full border-2 [&>svg]:size-[1.05rem]',
                done && 'border-transparent grad-primary text-on-primary',
                active && 'animate-pulse-ring border-primary bg-surface text-primary-fg',
                !done && !active && 'border-line bg-surface text-muted',
              )}
            >
              <Icon />
            </span>
            <span className={cn('px-1 text-sm font-medium', done || active ? 'text-ink' : 'text-muted')}>{stage.label}</span>
            {stage.caption !== undefined && <span className="px-1 text-xs text-muted max-sm:hidden">{stage.caption}</span>}
          </li>
        )
      })}
    </ol>
  )
}
