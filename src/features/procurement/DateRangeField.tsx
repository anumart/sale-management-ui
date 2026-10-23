import { useRef, useState } from 'react'
import { IconCalendar, IconChevronLeft, IconChevronRight } from '@/components/icons'
import { Button } from '@/components/ui'
import { useClickOutside } from '@/hooks/useClickOutside'
import { cn } from '@/lib/cn'

export interface DateRangeFieldProps {
  label: string
  startDate: Date
  endDate: Date
  onChange: (start: Date, end: Date) => void
  containerClassName?: string
}

const weekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const fmt = (d: Date) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
const monthLabel = (year: number, month: number) => new Date(year, month, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
const startOfMonth = (year: number, month: number) => new Date(year, month, 1)
const endOfMonth = (year: number, month: number) => new Date(year, month + 1, 0)
const addMonths = (year: number, month: number, delta: number) => {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

/** A single-month calendar for picking a start/end date range. */
export function DateRangeField({ label, startDate, endDate, onChange, containerClassName }: DateRangeFieldProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(startDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(startDate.getMonth())
  const [pendingStart, setPendingStart] = useState<Date>(startOfDay(startDate))
  const [pendingEnd, setPendingEnd] = useState<Date | null>(startOfDay(endDate))
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  useClickOutside(ref, () => setOpen(false), open)

  const openPicker = () => {
    setPendingStart(startOfDay(startDate))
    setPendingEnd(startOfDay(endDate))
    setViewYear(startDate.getFullYear())
    setViewMonth(startDate.getMonth())
    setOpen((v) => !v)
  }

  const navigate = (delta: number) => {
    const next = addMonths(viewYear, viewMonth, delta)
    setViewYear(next.year)
    setViewMonth(next.month)
  }

  const handleDayClick = (day: Date) => {
    if (pendingEnd || day < pendingStart) {
      setPendingStart(day)
      setPendingEnd(null)
      return
    }
    setPendingEnd(day)
  }

  const applyPreset = (start: Date, end: Date) => {
    onChange(start, end)
    setOpen(false)
  }

  const handleApply = () => {
    if (!pendingEnd) return
    onChange(pendingStart, pendingEnd)
    setOpen(false)
  }

  const previewEnd = pendingEnd ?? hoverDate
  const rangeLo = previewEnd && previewEnd < pendingStart ? previewEnd : pendingStart
  const rangeHi = previewEnd && previewEnd < pendingStart ? pendingStart : previewEnd

  const firstWeekday = startOfMonth(viewYear, viewMonth).getDay()
  const totalDays = endOfMonth(viewYear, viewMonth).getDate()
  const today = startOfDay(new Date())

  const cells: (Date | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: totalDays }, (_, i) => new Date(viewYear, viewMonth, i + 1))]

  return (
    <div className={cn('relative', containerClassName)} ref={ref}>
      {label && <p className="mb-1.5 text-control font-medium text-ink-2">{label}</p>}
      <button
        type="button"
        onClick={openPicker}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'flex h-12 w-full items-center gap-2.5 rounded-control border bg-field px-4 text-left text-base transition-colors duration-200 ease-smooth',
          open ? 'border-primary shadow-[0_0_0_4px_var(--color-primary-soft)]' : 'border-line-strong hover:border-primary',
        )}
      >
        <IconCalendar className="size-5 shrink-0 text-muted" />
        <span className="truncate">
          {fmt(startDate)} <span className="text-muted">→</span> {fmt(endDate)}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-[21rem] animate-pop-in overflow-hidden rounded-[1.25rem] glass-blur p-4 shadow-pop">
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full bg-fill px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-primary-soft hover:text-primary-fg"
              onClick={() => applyPreset(startOfMonth(today.getFullYear(), today.getMonth()), endOfMonth(today.getFullYear(), today.getMonth()))}
            >
              เดือนนี้
            </button>
            <button
              type="button"
              className="rounded-full bg-fill px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-primary-soft hover:text-primary-fg"
              onClick={() => {
                const { year, month } = addMonths(today.getFullYear(), today.getMonth(), -1)
                applyPreset(startOfMonth(year, month), endOfMonth(year, month))
              }}
            >
              เดือนที่แล้ว
            </button>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" size="sm" iconOnly aria-label="เดือนก่อน" onClick={() => navigate(-1)}>
              <IconChevronLeft className="size-4" />
            </Button>
            <p className="text-control font-semibold">{monthLabel(viewYear, viewMonth)}</p>
            <Button variant="ghost" size="sm" iconOnly aria-label="เดือนถัดไป" onClick={() => navigate(1)}>
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

          <div className="grid grid-cols-7" onMouseLeave={() => setHoverDate(null)}>
            {cells.map((day, i) => {
              if (!day) return <span key={`blank-${i}`} />

              const isStart = sameDay(day, pendingStart)
              const isEndExact = pendingEnd ? sameDay(day, pendingEnd) : false
              const inRange = rangeLo && rangeHi ? day > rangeLo && day < rangeHi : false
              const isEndpoint = isStart || isEndExact
              const isToday = sameDay(day, today)
              const weekday = day.getDay()

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'py-0.5',
                    (inRange || isEndpoint) && 'bg-primary-soft',
                    (isStart || weekday === 0) && (inRange || isEndpoint) && 'rounded-l-full',
                    (isEndExact || weekday === 6) && (inRange || isEndpoint) && 'rounded-r-full',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => setHoverDate(day)}
                    className={cn(
                      'grid size-9 place-items-center rounded-full text-sm transition-colors duration-150',
                      isEndpoint ? 'grad-primary font-semibold text-on-primary' : 'text-ink hover:bg-fill',
                      isToday && !isEndpoint && 'font-semibold text-primary-fg ring-1 ring-inset ring-primary',
                    )}
                  >
                    {day.getDate()}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <p className="text-sm text-muted">
              {fmt(pendingStart)} {pendingEnd ? <>→ {fmt(pendingEnd)}</> : <span className="text-muted italic">— เลือกวันสิ้นสุด</span>}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <Button size="sm" disabled={!pendingEnd} onClick={handleApply}>
                ตกลง
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
