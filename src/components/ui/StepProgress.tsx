import { Link } from '@tanstack/react-router'
import type { CSSProperties, ReactNode } from 'react'
import { IconCheck } from '@/components/icons'
import { cn } from '@/lib/cn'

export interface StepProgressStep {
  label: string
  /** Where a finished step links back to; omit to make it plain text */
  to?: string
}

export interface StepProgressProps {
  steps: StepProgressStep[]
  /** 0-based index of the step the user is on */
  current: number
  className?: string
}

/** Arrow depth in px: each segment ends in a point and the next one starts with a matching notch. */
const TIP = 16

/** Chevron outline for a segment: the first has no notch, the last has no point. */
function chevron(first: boolean, last: boolean): CSSProperties {
  const right = last ? '100% 0, 100% 100%' : `calc(100% - ${TIP}px) 0, 100% 50%, calc(100% - ${TIP}px) 100%`
  const left = first ? '0 100%, 0 0' : `0 100%, ${TIP}px 50%, 0 0`
  return { clipPath: `polygon(${right}, ${left})` }
}

/**
 * Wizard progress as full-width arrow segments: finished steps are pale orchid with a tick and link back, the current
 * step is the orchid gradient, later steps are plain. For page-level wizards; use `Timeline` for numbered items inside a page.
 */
export function StepProgress({ steps, current, className }: StepProgressProps) {
  return (
    <nav aria-label="ขั้นตอน" className={cn('mb-6 overflow-x-auto', className)}>
      <ol className="flex min-w-max sm:min-w-0">
        {steps.map((step, i) => {
          const done = i < current
          const active = i === current
          const first = i === 0
          const last = i === steps.length - 1
          const body: ReactNode = (
            <>
              <span className="block text-xs font-medium">ขั้นตอนที่ {i + 1}</span>
              <span className={cn('flex items-center gap-1.5 truncate text-control [&>svg]:size-4 [&>svg]:shrink-0', active && 'font-semibold')}>
                {done && <IconCheck />}
                {step.label}
              </span>
            </>
          )
          const segClass = cn(
            'block h-full py-2.5',
            first ? 'rounded-l-[0.875rem] pl-5' : 'pl-8',
            last ? 'rounded-r-[0.875rem] pr-5' : 'pr-8',
            // Finished and pending segments are frosted like the cards, so the page background never shows through unreadably
            active
              ? 'grad-theme text-white'
              : cn('bg-glass-strong [backdrop-filter:var(--glass-filter)]', done ? 'bg-[linear-gradient(var(--color-theme-soft),var(--color-theme-soft))] text-ink [&_svg]:text-theme' : 'text-muted'),
          )
          return (
            <li key={step.label} aria-current={active ? 'step' : undefined} className={cn('min-w-0 flex-1', !first && '-ml-2.5')} style={chevron(first, last)}>
              {done && step.to ? (
                <Link to={step.to} className={cn(segClass, 'transition-opacity duration-200 hover:opacity-80')}>
                  {body}
                </Link>
              ) : (
                <span className={segClass}>{body}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
