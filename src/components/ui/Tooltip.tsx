import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const sides = {
  top: 'bottom-[calc(100%+8px)]',
  bottom: 'top-[calc(100%+8px)]',
  left: 'right-[calc(100%+8px)] top-1/2 -translate-y-1/2',
  right: 'left-[calc(100%+8px)] top-1/2 -translate-y-1/2',
}

/** Horizontal alignment for top/bottom tooltips */
const aligns = {
  center: 'left-1/2 -translate-x-1/2',
  start: 'left-0',
  end: 'right-0',
}

export interface TooltipProps {
  content: ReactNode
  side?: keyof typeof sides
  /**
   * Top/bottom only. `end` lines the label up with the child's right edge so it grows leftward — use it near the right
   * edge of a scroll container (e.g. a table's action column), where a centered label would add a horizontal scrollbar.
   */
  align?: keyof typeof aligns
  children: ReactNode
  className?: string
}

/** Small ink label shown on hover / keyboard focus of its child (shadcn Tooltip). CSS-only. */
export function Tooltip({ content, side = 'top', align = 'center', children, className }: TooltipProps) {
  return (
    <span className={cn('group/tip relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-pop',
          'opacity-0 transition-opacity duration-200 ease-smooth group-focus-within/tip:opacity-100 group-hover/tip:opacity-100',
          sides[side],
          (side === 'top' || side === 'bottom') && aligns[align],
        )}
      >
        {content}
      </span>
    </span>
  )
}
