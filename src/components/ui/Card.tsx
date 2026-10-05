import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Glass content card: translucent white, light edge, soft layered shadow (DESIGN.md §6.3). */
export function Card({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn('min-w-0 rounded-card glass p-6 shadow-card xl:p-7', className)}
      {...props}
    />
  )
}

export interface CardHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Right side: a "See All" link, a toolbar, buttons… */
  action?: ReactNode
  className?: string
}

/** Card title row. Every card title uses the same size (DESIGN.md §3). */
export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
  return (
    <header className={cn('mb-5 flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="text-title font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-control text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

/** Primary text link used for "See All" / "See Detail". */
export function CardLink({ className, ...props }: ComponentProps<'a'>) {
  return <a className={cn('text-control font-medium text-primary-fg transition-colors hover:text-primary-fg-hover', className)} {...props} />
}
