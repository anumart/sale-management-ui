import { IconChevronLeft, IconChevronRight } from '@/components/icons'
import { cn } from '@/lib/cn'

/** 1 … 4 5 6 … 12 */
function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

export interface PaginationProps {
  page: number
  pageCount: number
  onChange: (page: number) => void
  className?: string
}

const btn =
  'grid h-9 min-w-9 place-items-center rounded-xl border border-line bg-surface px-2 text-control transition-colors disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:size-4'

export function Pagination({ page, pageCount, onChange, className }: PaginationProps) {
  return (
    <nav aria-label="เลขหน้า" className={cn('flex items-center gap-1.5', className)}>
      <button type="button" className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="หน้าก่อนหน้า">
        <IconChevronLeft />
      </button>
      {pageList(page, pageCount).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-muted">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
            className={cn(btn, p === page ? 'border-primary bg-primary text-on-primary shadow-primary' : 'hover:border-primary hover:text-primary-fg')}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className={btn}
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        aria-label="หน้าถัดไป"
      >
        <IconChevronRight />
      </button>
    </nav>
  )
}
