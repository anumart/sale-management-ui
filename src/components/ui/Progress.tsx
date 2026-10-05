import { cn } from '@/lib/cn'

export type ProgressTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'theme'

const fills: Record<ProgressTone, string> = {
  primary: 'grad-primary',
  success: 'grad-success',
  warning: 'grad-warning',
  danger: 'grad-danger',
  info: 'grad-info',
  accent: 'grad-accent',
  theme: 'grad-theme',
}

export interface ProgressProps {
  /** 0–100 */
  value: number
  tone?: ProgressTone
  size?: 'sm' | 'md'
  'aria-label'?: string
  className?: string
}

/** Horizontal progress bar (shadcn Progress). */
export function Progress({ value, tone = 'primary', size = 'md', className, ...aria }: ProgressProps) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      {...aria}
      className={cn('w-full overflow-hidden rounded-full bg-fill-strong', size === 'sm' ? 'h-1.5' : 'h-2.5', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500 ease-smooth', fills[tone])} style={{ width: `${v}%` }} />
    </div>
  )
}
