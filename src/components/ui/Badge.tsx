import type { ReactNode } from 'react'
import { IconTrendDown, IconTrendUp } from '@/components/icons'
import { cn } from '@/lib/cn'

/** Red count bubble for top bar buttons (DESIGN.md §6.2). */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        'grid h-5 min-w-5 place-items-center rounded-full border-[1.5px] border-white grad-danger px-1.5',
        'text-[0.6875rem] leading-none font-semibold text-white shadow-badge',
        className,
      )}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

/** "+20%" / "-10%" change indicator with a trend arrow. */
export function DeltaBadge({ value, className }: { value: number; className?: string }) {
  const up = value >= 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-sm font-medium [&>svg]:size-3.5',
        up ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg',
        className,
      )}
    >
      {up ? <IconTrendUp /> : <IconTrendDown />}
      {Math.abs(value)}%
    </span>
  )
}

export type PillTone = 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'accent' | 'neutral' | 'gray'

/** Translucent tint of the intent color on glass, readable `-fg` text, no heavy border. */
const tones: Record<PillTone, string> = {
  primary: 'bg-primary/20 text-primary-fg',
  success: 'bg-success/25 text-success-fg',
  warning: 'bg-warning/25 text-warning-fg',
  info: 'bg-info/22 text-info-fg',
  danger: 'bg-danger/20 text-danger-fg',
  accent: 'bg-accent/25 text-accent-dark',
  neutral: 'bg-field border-field-edge text-ink-2',
  gray: 'bg-fill-strong text-ink-2',
}

/** Rectangular status label with a border (DESIGN.md §6.7). */
export function StatusPill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border border-transparent px-3 py-0.5 text-sm font-semibold', tones[tone])}>{children}</span>
  )
}
