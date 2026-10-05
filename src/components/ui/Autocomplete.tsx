import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { IconSearch } from '@/components/icons'
import { useClickOutside } from '@/hooks/useClickOutside'
import { cn } from '@/lib/cn'
import { controlClass, FormField } from './FormField'
import { Spinner } from './Spinner'

export interface AutocompleteProps<T> {
  label?: ReactNode
  placeholder?: string
  required?: boolean
  error?: string
  hint?: ReactNode
  /** Text in the input (controlled) */
  inputValue: string
  onInputChange: (value: string) => void
  /** Suggestions for the current input — usually from a React Query hook */
  options: T[]
  getOptionLabel: (option: T) => string
  getOptionKey?: (option: T) => string | number
  onSelect: (option: T) => void
  loading?: boolean
  emptyText?: string
  renderOption?: (option: T, active: boolean) => ReactNode
  className?: string
}

/**
 * Text input with a suggestion list (ARIA combobox).
 * Keyboard: ↑/↓ move, Enter selects, Esc closes.
 * Data fetching stays outside: pass `options`/`loading` from a query hook fed with a debounced `inputValue`.
 */
export function Autocomplete<T>({
  label,
  placeholder,
  required,
  error,
  hint,
  inputValue,
  onInputChange,
  options,
  getOptionLabel,
  getOptionKey = getOptionLabel,
  onSelect,
  loading,
  emptyText = 'ไม่พบผลลัพธ์',
  renderOption,
  className,
}: AutocompleteProps<T>) {
  const id = useId()
  const listId = `${id}-list`
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  useClickOutside(rootRef, () => setOpen(false), open)

  const choose = (option: T) => {
    onSelect(option)
    onInputChange(getOptionLabel(option))
    setOpen(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && open && options[active]) {
      e.preventDefault()
      choose(options[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <FormField label={label} htmlFor={id} required={required} error={error} hint={hint} className={className}>
      <div ref={rootRef} className="relative">
        <IconSearch className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${id}-opt-${active}` : undefined}
          aria-invalid={!!error || undefined}
          autoComplete="off"
          required={required}
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => {
            onInputChange(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(controlClass(!!error), 'pr-10 pl-11')}
        />
        {loading && <Spinner className="absolute top-1/2 right-4 -translate-y-1/2 text-muted" />}

        {open && (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-64 animate-pop-in overflow-y-auto rounded-2xl glass-blur p-1.5 shadow-pop"
          >
            {options.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-muted">{loading ? 'Searching…' : emptyText}</li>
            ) : (
              options.map((option, i) => (
                <li
                  key={getOptionKey(option)}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()} // keep input focus
                  onClick={() => choose(option)}
                  className={cn(
                    'cursor-pointer rounded-xl px-3 py-2.5 text-control',
                    i === active ? 'bg-primary-soft text-primary-fg' : 'text-ink',
                  )}
                >
                  {renderOption ? renderOption(option, i === active) : getOptionLabel(option)}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </FormField>
  )
}
