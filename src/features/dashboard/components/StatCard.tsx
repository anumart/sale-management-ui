import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type StatCardVariant = 'theme' | 'accent' | 'primary' | 'warning' | 'plain'

/**
 * Colored variants are glass cards with the intent color fading across them (so they follow the chosen background and
 * glass style) and a solid intent icon chip; text uses ink so it adapts to every glass style.
 * Class names are written out in full so Tailwind can see them.
 */
const variantClass: Record<StatCardVariant, { card: string; chip: string }> = {
  theme: {
    card: 'glass text-ink stat-deco stat-deco-rings bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-theme)_34%,transparent),transparent_72%)]',
    chip: 'grad-theme text-white shadow-theme',
  },
  accent: {
    card: 'glass text-ink stat-deco stat-deco-waves bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-accent)_34%,transparent),transparent_72%)]',
    chip: 'grad-accent text-white',
  },
  primary: {
    card: 'glass text-ink stat-deco stat-deco-dots bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-primary)_34%,transparent),transparent_72%)]',
    chip: 'grad-primary text-white shadow-primary',
  },
  warning: {
    card: 'glass text-ink stat-deco stat-deco-rings bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-warning)_34%,transparent),transparent_72%)]',
    chip: 'grad-warning text-white',
  },
  plain: { card: 'glass text-ink', chip: 'bg-theme-soft text-theme' },
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
  const className = cn('block min-w-0 rounded-card p-6 shadow-card xl:p-7', to && 'transition-transform duration-200 hover:-translate-y-0.5', variantClass[variant].card)
  const body = (
    <>
      <div className="flex items-center gap-3.5">
        <span className={cn('grid size-12 shrink-0 place-items-center rounded-full [&>svg]:size-6', variantClass[variant].chip)}>
          {icon}
        </span>
        <h3 className="min-w-0 flex-1 truncate text-base font-semibold">{label}</h3>
      </div>
      <p className="mt-5 truncate text-stat font-medium tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
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
