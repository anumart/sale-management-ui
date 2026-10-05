import { IconNoData } from '@/components/icons'
import { cn } from '@/lib/cn'

export interface EmptyStateProps {
  title: string
  description?: string
  className?: string
}

/** Placeholder graphic for an empty table row (DESIGN.md §6.7). Same illustration everywhere — vary title/description instead. */
export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <IconNoData className="size-24 shrink-0" />
      <div>
        <p className="font-medium text-ink">{title}</p>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
    </div>
  )
}
