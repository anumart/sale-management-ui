import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface RadioGroupProps<V extends string> {
  value: V
  onChange: (value: V) => void
  options: { value: V; label: ReactNode; description?: ReactNode; disabled?: boolean }[]
  /** list – plain radios; card – each option is a bordered tile */
  variant?: 'list' | 'card'
  'aria-label'?: string
  className?: string
}

/** Single-choice radios with a primary dot (shadcn Radio Group). */
export function RadioGroup<V extends string>({ value, onChange, options, variant = 'list', className, ...aria }: RadioGroupProps<V>) {
  const name = useId()
  return (
    <div role="radiogroup" {...aria} className={cn('flex flex-col', variant === 'list' ? 'gap-3' : 'gap-2.5', className)}>
      {options.map((o) => {
        const checked = o.value === value
        return (
          <label
            key={o.value}
            className={cn(
              'flex cursor-pointer items-start gap-3 text-control text-ink-2',
              o.disabled && 'cursor-not-allowed opacity-45',
              variant === 'card' &&
                cn(
                  'rounded-control border p-4 transition-colors duration-200 ease-smooth',
                  checked ? 'border-primary bg-primary-soft' : 'border-field-edge bg-field hover:border-primary',
                ),
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={checked}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
              className={cn(
                'mt-px size-5 shrink-0 cursor-pointer appearance-none rounded-full border-[1.5px] border-field-edge bg-field transition-[border-color,box-shadow] duration-200 ease-smooth',
                'hover:border-primary checked:border-primary checked:shadow-[inset_0_0_0_3.5px_var(--color-surface),inset_0_0_0_10px_var(--color-primary)]',
              )}
            />
            <span>
              <span className={cn('block', variant === 'card' && 'font-medium text-ink')}>{o.label}</span>
              {o.description && <span className="mt-0.5 block text-sm text-muted">{o.description}</span>}
            </span>
          </label>
        )
      })}
    </div>
  )
}
