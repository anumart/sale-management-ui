import type { ReactNode } from 'react'
import { IconCheck } from '@/components/icons'
import { cn } from '@/lib/cn'

/** Numbered steps joined by a vertical line on the left (run-sheet stops, wizard steps). Children are `TimelineStep`s. */
export function Timeline({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative pl-10', className)}>
      <div aria-hidden="true" className="absolute top-4 bottom-8 left-4 w-0.5 bg-line" />
      <ol className="flex flex-col gap-4">{children}</ol>
    </div>
  )
}

export interface TimelineStepProps {
  /** Shown in the circle */
  number: ReactNode
  /** Filled circle with a tick */
  done?: boolean
  /** Offset of the circle from the top of the step, to sit level with its title (Tailwind `top-*` class). */
  markerClassName?: string
  children: ReactNode
}

export function TimelineStep({ number, done, markerClassName = 'top-4', children }: TimelineStepProps) {
  return (
    <li className="relative min-w-0">
      <span
        className={cn(
          'absolute -left-10 z-10 grid size-8 place-items-center rounded-full border-2 border-primary text-sm font-bold shadow-[0_0_0_4px_var(--color-bg)] [&>svg]:size-4',
          done ? 'grad-primary text-on-primary' : 'bg-surface text-primary-fg',
          markerClassName,
        )}
      >
        {done ? <IconCheck /> : number}
      </span>
      {children}
    </li>
  )
}
