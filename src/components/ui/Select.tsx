import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconCheck, IconChevronDown, IconSearch } from '@/components/icons'
import { useAnchoredPosition } from '@/hooks/useAnchoredPosition'
import { cn } from '@/lib/cn'
import { controlClass, FormField } from './FormField'

export interface SelectOption<V extends string = string> {
  value: V
  label: ReactNode
  /** Plain-text label used by the search box; falls back to `label` when that is a string. */
  searchText?: string
}

export interface SelectProps<V extends string = string> {
  label?: ReactNode
  error?: string
  hint?: ReactNode
  options: SelectOption<V>[]
  /** Adds an empty first row with this text; picking it gives `''`. */
  placeholder?: string
  value: string
  onChange: (value: V) => void
  id?: string
  required?: boolean
  disabled?: boolean
  'aria-label'?: string
  /** `sm` is the 36px toolbar size. */
  size?: 'md' | 'sm'
  /** Applied to the trigger button. */
  className?: string
  containerClassName?: string
}

/** Options above this count get a search box inside the panel. */
const SEARCH_THRESHOLD = 10

/**
 * Single-choice dropdown (the system never uses a native <select>). Glass panel rendered in a portal so it
 * is never clipped by a modal or scroll box; keyboard: ↑ ↓ Home End Enter Esc, searchable when the list is long.
 */
export function Select<V extends string = string>({
  label,
  error,
  hint,
  options,
  placeholder,
  value,
  onChange,
  id,
  required,
  disabled,
  'aria-label': ariaLabel,
  size = 'md',
  className,
  containerClassName,
}: SelectProps<V>) {
  const autoId = useId()
  const selectId = id ?? autoId
  const listId = `${selectId}-list`
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [active, setActive] = useState(0)
  const pos = useAnchoredPosition(open, triggerRef)

  const searchable = options.length > SEARCH_THRESHOLD
  const needle = term.trim().toLowerCase()
  const textOf = (o: SelectOption<V>) => (o.searchText ?? (typeof o.label === 'string' ? o.label : '')).toLowerCase()
  const rows: { value: string; label: ReactNode }[] = [
    ...(placeholder !== undefined && !needle ? [{ value: '', label: placeholder }] : []),
    ...options.filter((o) => !needle || textOf(o).includes(needle)),
  ]
  const current = options.find((o) => o.value === value)

  const close = (refocus = true) => {
    setOpen(false)
    setTerm('')
    if (refocus) triggerRef.current?.focus()
  }
  const openPanel = () => {
    if (disabled) return
    setActive(Math.max(0, rows.findIndex((r) => r.value === value)))
    setOpen(true)
  }
  const choose = (v: string) => {
    onChange(v as V)
    close()
  }

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) close(false)
    }
    document.addEventListener('pointerdown', onPointer)
    if (searchable) searchRef.current?.focus()
    return () => document.removeEventListener('pointerdown', onPointer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open) panelRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key) && e.target === triggerRef.current) {
        e.preventDefault()
        openPanel()
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(rows.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(rows.length - 1)
    } else if (e.key === 'Enter' || (e.key === ' ' && !searchable)) {
      e.preventDefault()
      if (rows[active]) choose(rows[active].value)
    } else if (e.key === 'Tab') {
      close(false)
    }
  }

  return (
    <FormField label={label} htmlFor={selectId} required={required} error={error} hint={hint} className={containerClassName}>
      <div onKeyDown={onKeyDown}>
        <button
          ref={triggerRef}
          id={selectId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={ariaLabel}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${selectId}-error` : undefined}
          disabled={disabled}
          onClick={() => (open ? close() : openPanel())}
          className={cn(
            controlClass(!!error),
            'flex items-center gap-2 text-left',
            size === 'sm' && 'h-9 rounded-lg px-3 text-control',
            open && !error && 'border-primary shadow-[0_0_0_4px_var(--color-primary-soft)]',
            className,
          )}
        >
          <span className={cn('min-w-0 flex-1 truncate', !current && 'text-placeholder')}>{current ? current.label : (placeholder ?? '')}</span>
          <IconChevronDown className={cn('size-5 shrink-0 text-muted transition-transform duration-200 ease-smooth', open && 'rotate-180')} />
        </button>

        {open &&
          pos &&
          createPortal(
            <div
              ref={panelRef}
              style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
              className="z-[300] flex min-w-48 animate-pop-in flex-col overflow-hidden rounded-[1.25rem] glass-blur shadow-pop"
            >
              {searchable && (
                <div className="relative shrink-0 p-1.5 pb-0">
                  <IconSearch className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-[40%] text-muted" />
                  <input
                    ref={searchRef}
                    type="search"
                    value={term}
                    onChange={(e) => {
                      setTerm(e.target.value)
                      setActive(0)
                    }}
                    placeholder={`ค้นหาจาก ${options.length} รายการ`}
                    aria-label="ค้นหาตัวเลือก"
                    className="h-9 w-full rounded-lg border border-field-edge bg-field pr-3 pl-9 text-control text-ink outline-none placeholder:text-placeholder focus:border-primary"
                  />
                </div>
              )}
              <div id={listId} role="listbox" aria-label={typeof label === 'string' ? label : ariaLabel} className="min-h-0 flex-1 overflow-y-auto p-1.5">
                {rows.length === 0 && <p className="px-3 py-4 text-center text-control text-muted">ไม่พบ “{term}”</p>}
                {rows.map((r, i) => {
                  const selected = r.value === value
                  return (
                    <button
                      key={r.value || '__placeholder'}
                      type="button"
                      role="option"
                      tabIndex={-1}
                      aria-selected={selected}
                      data-active={i === active}
                      onMouseMove={() => setActive(i)}
                      onClick={() => choose(r.value)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-control transition-colors duration-150',
                        i === active && 'bg-hover',
                        selected ? 'font-medium text-primary-fg' : r.value === '' ? 'text-muted' : 'text-ink',
                      )}
                    >
                      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{r.label}</span>
                      <IconCheck className={cn('size-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
                    </button>
                  )
                })}
              </div>
            </div>,
            document.body,
          )}
      </div>
    </FormField>
  )
}
