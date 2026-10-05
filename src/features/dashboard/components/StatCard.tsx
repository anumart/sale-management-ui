import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type StatCardVariant = 'theme' | 'accent' | 'primary' | 'warning' | 'plain'

/** Solid variants get a decorative graphic; text follows each token's `on-*` color (white on dark fills, ink on light ones). */
const variantClass: Record<StatCardVariant, string> = {
  theme: 'grad-theme text-white stat-deco stat-deco-rings',
  accent: 'grad-accent text-white stat-deco stat-deco-waves',
  primary: 'grad-primary text-white stat-deco stat-deco-dots',
  warning: 'grad-warning text-white stat-deco stat-deco-rings',
  plain: 'glass text-ink',
}

export interface StatCardProps {
  label: string
  value: ReactNode
  /** Small line under the value */
  hint?: ReactNode
  icon: ReactNode
  /** Page the card opens; omit for a static card */
  to?: string
  variant?: StatCardVariant
}

export function StatCard({ label, value, hint, icon, to, variant = 'plain' }: StatCardProps) {
  const solid = variant !== 'plain'
  const className = cn('block min-w-0 rounded-card p-6 shadow-card xl:p-7', to && 'transition-transform duration-200 hover:-translate-y-0.5', variantClass[variant])
  const body = (
    <>
      <div className="flex items-center gap-3.5">
        <span className={cn('grid size-12 shrink-0 place-items-center rounded-full [&>svg]:size-6', solid ? 'bg-white/25 text-current' : 'bg-theme-soft text-theme')}>
          {icon}
        </span>
        <h3 className="min-w-0 flex-1 truncate text-base font-semibold">{label}</h3>
      </div>
      <p className="mt-5 truncate text-stat font-medium tracking-tight">{value}</p>
      {hint && <p className={cn('mt-1 text-sm', solid ? 'opacity-90' : 'text-muted')}>{hint}</p>}
    </>
  )
  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}
