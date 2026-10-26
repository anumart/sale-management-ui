import { useState, type ReactNode } from 'react'
import { IconClose, IconFilter, IconSearch } from '@/components/icons'
import { Button } from './Button'
import { Sheet } from './Sheet'
import { TextField } from './TextField'

export interface CriteriaChip {
  key: string
  label: string
  value: string
  onRemove: () => void
}

export interface ListToolbarProps {
  searchLabel: string
  searchPlaceholder: string
  query: string
  onQueryChange: (query: string) => void
  /** Inline filters beside the search box (FilterSelect…). */
  filters?: ReactNode
  /** Number of active criteria inside the filter sheet; shown on the button. Omit `onOpenSheet` for pages with no sheet. */
  sheetCount?: number
  onOpenSheet?: () => void
  /** One removable chip per active criterion. */
  chips?: CriteriaChip[]
  /** "พบ 3 จาก 12 ใบสั่งซื้อ" */
  resultText: string
  /** Whether any search text / filter is active (shows "ล้างเงื่อนไข"). */
  hasCriteria: boolean
  onClear: () => void
}

/** Search box + inline filters + filter button, then active-criteria chips and the result count line. */
export function ListToolbar({
  searchLabel,
  searchPlaceholder,
  query,
  onQueryChange,
  filters,
  sheetCount = 0,
  onOpenSheet,
  chips = [],
  resultText,
  hasCriteria,
  onClear,
}: ListToolbarProps) {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <TextField
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          prefix={<IconSearch />}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          containerClassName="min-w-60 flex-1"
        />
        {filters}
        {onOpenSheet && (
          <Button variant="soft" outlined onClick={onOpenSheet} className="relative">
            <IconFilter />
            ตัวกรอง
            {sheetCount > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-xs font-semibold text-on-primary tabular-nums">
                {sheetCount}
              </span>
            )}
          </Button>
        )}
      </div>

      {chips.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <span key={c.key} className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full bg-primary-soft pr-1.5 pl-3 text-control text-primary-fg">
              <span className="min-w-0 truncate">
                <span className="text-muted">{c.label}:</span> {c.value}
              </span>
              <button
                type="button"
                aria-label={`ลบ ${c.value}`}
                onClick={c.onRemove}
                className="grid size-5 shrink-0 place-items-center rounded-full hover:bg-primary-soft-hover [&>svg]:size-3"
              >
                <IconClose />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mb-1 flex items-center justify-between gap-3 text-control text-muted" aria-live="polite">
        <span>{resultText}</span>
        {hasCriteria && (
          <Button size="sm" variant="soft" onClick={onClear}>
            ล้างเงื่อนไข
          </Button>
        )}
      </div>
    </>
  )
}

/** Open/close state for a page's filter sheet. */
export function useFilterSheet() {
  const [open, setOpen] = useState(false)
  return { open, openSheet: () => setOpen(true), closeSheet: () => setOpen(false) }
}

/** Side sheet for the less-used criteria, with the shared "ล้างตัวกรอง / ดู N รายการ" footer. */
export function FilterSheet({
  open,
  onClose,
  title,
  description = 'เลือกได้หลายค่า ตัวเลขข้างชื่อคือจำนวนรายการที่จะได้',
  resultCount,
  onClear,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  resultCount: number
  onClear: () => void
  children: ReactNode
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="soft" onClick={onClear}>
            ล้างตัวกรอง
          </Button>
          <Button onClick={onClose}>ดู {resultCount} รายการ</Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">{children}</div>
    </Sheet>
  )
}
