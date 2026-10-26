import { useEffect, useState } from 'react'
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
  /** `numbers` lists page numbers; `jump` is first / prev / "page N of M" input / next / last — better when there are many pages. */
  variant?: 'numbers' | 'jump'
  className?: string
}

const btn =
  'grid h-9 min-w-9 place-items-center rounded-xl border border-line bg-field px-2 text-control transition-colors disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:size-4'

function JumpPagination({ page, pageCount, onChange, className }: Omit<PaginationProps, 'variant'>) {
  const [draft, setDraft] = useState(String(page))
  useEffect(() => setDraft(String(page)), [page])

  const commit = () => {
    const n = parseInt(draft, 10)
    const next = Number.isNaN(n) ? page : Math.min(pageCount, Math.max(1, n))
    setDraft(String(next))
    if (next !== page) onChange(next)
  }

  return (
    <nav aria-label="เลขหน้า" className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <button type="button" className={btn} disabled={page <= 1} onClick={() => onChange(1)} aria-label="หน้าแรก">
        <span className="flex -space-x-2.5">
          <IconChevronLeft />
          <IconChevronLeft />
        </span>
      </button>
      <button type="button" className={cn(btn, 'gap-1 pr-3 [&>svg]:size-4')} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <span className="flex items-center gap-1">
          <IconChevronLeft />
          ก่อนหน้า
        </span>
      </button>
      <form
        className="flex h-9 items-center gap-2 rounded-xl border border-line bg-field px-3 text-control"
        onSubmit={(e) => {
          e.preventDefault()
          commit()
        }}
      >
        <label htmlFor="pagination-jump" className="text-muted">
          หน้า
        </label>
        <input
          id="pagination-jump"
          type="text"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
          onBlur={commit}
          aria-label="ไปที่หน้า"
          className="h-6 w-11 rounded-lg bg-fill text-center font-semibold tabular-nums text-ink"
        />
        <span className="whitespace-nowrap text-muted">จาก {pageCount}</span>
      </form>
      <button type="button" className={cn(btn, 'pl-3')} disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
        <span className="flex items-center gap-1">
          ถัดไป
          <IconChevronRight />
        </span>
      </button>
      <button type="button" className={btn} disabled={page >= pageCount} onClick={() => onChange(pageCount)} aria-label="หน้าสุดท้าย">
        <span className="flex -space-x-2.5">
          <IconChevronRight />
          <IconChevronRight />
        </span>
      </button>
    </nav>
  )
}

export function Pagination({ page, pageCount, onChange, variant = 'numbers', className }: PaginationProps) {
  if (variant === 'jump') return <JumpPagination page={page} pageCount={pageCount} onChange={onChange} className={className} />
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
