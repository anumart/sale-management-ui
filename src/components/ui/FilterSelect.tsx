import { useId, useRef, useState } from 'react'
import { IconCheck, IconChevronDown } from '@/components/icons'
import { useClickOutside } from '@/hooks/useClickOutside'
import { cn } from '@/lib/cn'
import type { PillTone } from './Badge'

export interface FilterSelectOption<V extends string = string> {
  value: V
  label: string
  /** Colours the dot in front of the label, matching StatusPill. */
  tone?: PillTone
  /** Results this value would give; shown on the right. */
  count?: number
}

export interface FilterSelectProps<V extends string = string> {
  /** Small caption before the value, e.g. "สถานะ". */
  label: string
  value: V
  options: FilterSelectOption<V>[]
  onChange: (value: V) => void
  /** The value that means "no filter" — the trigger stays neutral while it is selected. */
  neutralValue?: V
  className?: string
}

const dot: Record<PillTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  danger: 'bg-danger',
  accent: 'bg-accent',
  neutral: 'bg-muted',
  gray: 'bg-muted',
}

/** Glass pill dropdown for a single filter value (status, type…). Closes on outside click / Esc. */
export function FilterSelect<V extends string = string>({ label, value, options, onChange, neutralValue, className }: FilterSelectProps<V>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listId = useId()
  useClickOutside(ref, () => setOpen(false), open)

  const current = options.find((o) => o.value === value)
  const active = neutralValue !== undefined && value !== neutralValue

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-12 w-full items-center gap-2.5 rounded-control border bg-field px-4 text-left text-base outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-smooth',
          'focus-visible:shadow-[0_0_0_4px_var(--color-primary-soft)] hover:bg-hover',
          active || open ? 'border-primary bg-primary-soft text-primary-fg' : 'border-field-edge text-ink',
        )}
      >
        <span className="text-control text-muted">{label}</span>
        {current?.tone && <span className={cn('size-2 shrink-0 rounded-full', dot[current.tone])} />}
        <span className="min-w-0 flex-1 truncate font-medium">{current?.label}</span>
        <IconChevronDown className={cn('size-5 shrink-0 text-muted transition-transform duration-200 ease-smooth', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute top-[calc(100%+8px)] left-0 z-50 w-full min-w-56 animate-pop-in rounded-[1.25rem] p-1.5 glass-blur shadow-pop"
        >
          {options.map((o) => {
            const selected = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-control transition-colors duration-200 ease-smooth',
                  selected ? 'bg-primary-soft font-medium text-primary-fg' : 'text-ink hover:bg-hover',
                )}
              >
                <span className={cn('size-2 shrink-0 rounded-full', o.tone ? dot[o.tone] : 'bg-transparent')} />
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.count !== undefined && <span className="text-sm text-muted tabular-nums">{o.count}</span>}
                <IconCheck className={cn('size-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
