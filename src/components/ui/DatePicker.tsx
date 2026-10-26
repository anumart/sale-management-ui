import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconCalendar, IconChevronLeft, IconChevronRight } from '@/components/icons'
import { useAnchoredPosition } from '@/hooks/useAnchoredPosition'
import { cn } from '@/lib/cn'
import { Button } from './Button'
import { controlClass, FormField } from './FormField'

/* Dates travel as local "yyyy-mm-dd" strings (what the forms already store); '' means no date. */

const PANEL_WIDTH = 336
const weekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

const pad = (n: number) => String(n).padStart(2, '0')
const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (s: string) => (s ? new Date(`${s}T00:00`) : null)
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const sameDay = (a: Date, b: Date) => toStr(a) === toStr(b)
const fmt = (s: string) => parse(s)!.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
const monthLabel = (year: number, month: number) => new Date(year, month, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })

/** Month grid shared by both pickers. */
function CalendarGrid({
  year,
  month,
  onNavigate,
  lo,
  hi,
  endpoints,
  isDisabled,
  onPick,
  onHover,
}: {
  year: number
  month: number
  onNavigate: (delta: number) => void
  /** Highlighted band (range mode) */
  lo?: Date | null
  hi?: Date | null
  /** Days drawn as filled circles */
  endpoints: (Date | null)[]
  isDisabled?: (day: Date) => boolean
  onPick: (day: Date) => void
  onHover?: (day: Date | null) => void
}) {
  const today = startOfDay(new Date())
  const firstWeekday = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: totalDays }, (_, i) => new Date(year, month, i + 1))]

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <Button variant="ghost" size="sm" iconOnly aria-label="เดือนก่อน" onClick={() => onNavigate(-1)}>
          <IconChevronLeft className="size-4" />
        </Button>
        <p className="text-control font-semibold">{monthLabel(year, month)}</p>
        <Button variant="ghost" size="sm" iconOnly aria-label="เดือนถัดไป" onClick={() => onNavigate(1)}>
          <IconChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-muted">
        {weekdays.map((w) => (
          <span key={w} className="py-1.5">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7" onMouseLeave={() => onHover?.(null)}>
        {cells.map((day, i) => {
          if (!day) return <span key={`blank-${i}`} />
          const isEndpoint = endpoints.some((e) => e && sameDay(e, day))
          const inRange = lo && hi ? day > lo && day < hi : false
          const isStart = !!lo && sameDay(day, lo)
          const isEnd = !!hi && sameDay(day, hi)
          const weekday = day.getDay()
          const banded = (inRange || isEndpoint) && !!lo && !!hi
          const disabled = isDisabled?.(day)
          return (
            <div
              key={toStr(day)}
              className={cn(
                'py-0.5',
                banded && 'bg-primary-soft',
                banded && (isStart || weekday === 0) && 'rounded-l-full',
                banded && (isEnd || weekday === 6) && 'rounded-r-full',
              )}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(day)}
                onMouseEnter={() => onHover?.(day)}
                className={cn(
                  'grid size-9 place-items-center rounded-full text-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-30',
                  isEndpoint ? 'grad-primary font-semibold text-on-primary' : 'text-ink enabled:hover:bg-fill',
                  sameDay(day, today) && !isEndpoint && 'font-semibold text-primary-fg ring-1 ring-inset ring-primary',
                )}
              >
                {day.getDate()}
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

/** Trigger button + glass calendar panel in a portal (never clipped by a modal or sheet). Closes on outside click / Esc. */
function PickerShell({
  label,
  required,
  error,
  hint,
  id,
  ariaLabel,
  containerClassName,
  open,
  onOpen,
  onClose,
  display,
  children,
}: {
  label?: ReactNode
  required?: boolean
  error?: string
  hint?: ReactNode
  id?: string
  ariaLabel?: string
  containerClassName?: string
  open: boolean
  onOpen: () => void
  onClose: () => void
  display: ReactNode
  children: ReactNode
}) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pos = useAnchoredPosition(open, triggerRef, { maxHeight: 460, minBelow: 440, panelWidth: PANEL_WIDTH })

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      onClose()
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <FormField label={label} htmlFor={fieldId} required={required} error={error} hint={hint} className={containerClassName}>
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        onClick={() => (open ? onClose() : onOpen())}
        className={cn(controlClass(!!error), 'flex items-center gap-2.5 text-left', open && !error && 'border-primary shadow-[0_0_0_4px_var(--color-primary-soft)]')}
      >
        <IconCalendar className="size-5 shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate">{display}</span>
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={ariaLabel ?? (typeof label === 'string' ? label : 'เลือกวันที่')}
            style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, width: PANEL_WIDTH, maxHeight: pos.maxHeight }}
            className="z-[300] max-w-[calc(100vw-16px)] animate-pop-in overflow-y-auto rounded-[1.25rem] glass-blur p-4 shadow-pop"
          >
            {children}
          </div>,
          document.body,
        )}
    </FormField>
  )
}

export interface DatePickerProps {
  label?: ReactNode
  /** "yyyy-mm-dd", or '' for no date */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Earliest / latest selectable day, "yyyy-mm-dd" */
  min?: string
  max?: string
  /** Show a "ล้าง" button so the date can be emptied */
  clearable?: boolean
  required?: boolean
  error?: string
  hint?: ReactNode
  id?: string
  'aria-label'?: string
  containerClassName?: string
}

/** Single-date picker with the system calendar (replaces <input type="date">). */
export function DatePicker({ label, value, onChange, placeholder = 'เลือกวันที่', min, max, clearable, required, error, hint, id, 'aria-label': ariaLabel, containerClassName }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const initial = parse(value) ?? new Date()
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() })

  const show = () => {
    const d = parse(value) ?? new Date()
    setView({ year: d.getFullYear(), month: d.getMonth() })
    setOpen(true)
  }
  const navigate = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }
  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
  }
  const today = toStr(new Date())

  return (
    <PickerShell
      label={label}
      required={required}
      error={error}
      hint={hint}
      id={id}
      ariaLabel={ariaLabel}
      containerClassName={containerClassName}
      open={open}
      onOpen={show}
      onClose={() => setOpen(false)}
      display={value ? fmt(value) : <span className="text-placeholder">{placeholder}</span>}
    >
      <CalendarGrid
        year={view.year}
        month={view.month}
        onNavigate={navigate}
        endpoints={[parse(value)]}
        isDisabled={(d) => (!!min && toStr(d) < min) || (!!max && toStr(d) > max)}
        onPick={(d) => pick(toStr(d))}
      />
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <Button variant="ghost" size="sm" disabled={(!!min && today < min) || (!!max && today > max)} onClick={() => pick(today)}>
          วันนี้
        </Button>
        {clearable && value && (
          <Button variant="ghost" size="sm" onClick={() => pick('')}>
            ล้าง
          </Button>
        )}
      </div>
    </PickerShell>
  )
}

export interface DateRangePickerProps {
  label?: ReactNode
  from: string
  to: string
  onChange: (from: string, to: string) => void
  /** Text shown while both ends are empty */
  placeholder?: string
  id?: string
  'aria-label'?: string
  containerClassName?: string
}

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** Date-range picker where an empty range is allowed (for filters). Pick two days; presets and "ล้าง" in the footer. */
export function DateRangePicker({ label, from, to, onChange, placeholder = 'ทุกช่วงเวลา', id, 'aria-label': ariaLabel, containerClassName }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() })
  const [pendingFrom, setPendingFrom] = useState<string>('')
  const [hover, setHover] = useState<Date | null>(null)

  const show = () => {
    const d = parse(from) ?? new Date()
    setView({ year: d.getFullYear(), month: d.getMonth() })
    setPendingFrom('')
    setHover(null)
    setOpen(true)
  }
  const navigate = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }
  const apply = (a: string, b: string) => {
    onChange(a, b)
    setOpen(false)
  }
  const pick = (day: Date) => {
    const s = toStr(day)
    if (!pendingFrom) {
      setPendingFrom(s)
      return
    }
    apply(...((s < pendingFrom ? [s, pendingFrom] : [pendingFrom, s]) as [string, string]))
  }

  // While choosing the second day the band follows the mouse; otherwise it shows the committed range.
  const anchor = pendingFrom ? parse(pendingFrom) : parse(from)
  const other = pendingFrom ? hover : parse(to)
  const lo = anchor && other && other < anchor ? other : anchor
  const hi = anchor && other && other < anchor ? anchor : other
  const today = startOfDay(new Date())
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const lastStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastEnd = new Date(today.getFullYear(), today.getMonth(), 0)
  const presets: { label: string; a: Date; b: Date }[] = [
    { label: 'วันนี้', a: today, b: today },
    { label: '7 วันข้างหน้า', a: today, b: addDays(today, 6) },
    { label: 'เดือนนี้', a: monthStart, b: monthEnd },
    { label: 'เดือนที่แล้ว', a: lastStart, b: lastEnd },
  ]

  const display = from || to ? (
    <>
      {from ? fmt(from) : 'ก่อนหน้า'} <span className="text-muted">→</span> {to ? fmt(to) : 'ล่าสุด'}
    </>
  ) : (
    <span className="text-placeholder">{placeholder}</span>
  )

  return (
    <PickerShell
      label={label}
      id={id}
      ariaLabel={ariaLabel}
      containerClassName={containerClassName}
      open={open}
      onOpen={show}
      onClose={() => setOpen(false)}
      display={display}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => apply(toStr(p.a), toStr(p.b))}
            className="rounded-full bg-fill px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-primary-soft hover:text-primary-fg"
          >
            {p.label}
          </button>
        ))}
      </div>
      <CalendarGrid
        year={view.year}
        month={view.month}
        onNavigate={navigate}
        lo={lo}
        hi={hi}
        endpoints={[lo, hi]}
        onPick={pick}
        onHover={setHover}
      />
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <p className="min-w-0 text-sm text-muted">{pendingFrom ? `${fmt(pendingFrom)} → เลือกวันสิ้นสุด` : 'เลือกวันเริ่มต้นและวันสิ้นสุด'}</p>
        {(from || to) && (
          <Button variant="ghost" size="sm" onClick={() => apply('', '')}>
            ล้าง
          </Button>
        )}
      </div>
    </PickerShell>
  )
}
