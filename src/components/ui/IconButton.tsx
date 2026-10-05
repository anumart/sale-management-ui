import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { CountBadge } from './Badge'

export interface IconButtonProps extends ComponentProps<'button'> {
  /** Required: icon-only buttons need an accessible name */
  'aria-label': string
  icon: ReactNode
  /** Shows a count badge on the top-right edge; hidden when 0 */
  count?: number
}

/** Frosted-glass circular icon button used in the top bar (DESIGN.md §6.2). */
export function IconButton({ icon, count, className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'relative grid size-14 place-items-center rounded-full glass-blur text-ink shadow-card transition-[box-shadow,transform] duration-300 ease-smooth',
        'hover:shadow-[0_0_0_4px_var(--color-primary-soft)] active:scale-95 active:duration-100 [&>svg]:size-6',
        className,
      )}
      {...props}
    >
      {icon}
      {!!count && <CountBadge count={count} className="absolute -top-1 -right-1" />}
    </button>
  )
}
