import { useId, type ComponentProps, type ReactNode } from 'react'
import { IconChevronDown } from '@/components/icons'
import { cn } from '@/lib/cn'
import { controlClass, FormField } from './FormField'

export interface SelectOption<V extends string = string> {
  value: V
  label: ReactNode
}

export interface SelectProps<V extends string = string> extends Omit<ComponentProps<'select'>, 'children'> {
  label?: ReactNode
  error?: string
  hint?: ReactNode
  options: SelectOption<V>[]
  placeholder?: string
  containerClassName?: string
}

/** Native select styled like TextField (keeps keyboard/mobile behaviour for free). */
export function Select<V extends string = string>({
  label,
  error,
  hint,
  options,
  placeholder,
  required,
  id,
  className,
  containerClassName,
  ...props
}: SelectProps<V>) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <FormField label={label} htmlFor={selectId} required={required} error={error} hint={hint} className={containerClassName}>
      <div className="relative">
        <select
          id={selectId}
          required={required}
          aria-invalid={!!error || undefined}
          className={cn(controlClass(!!error), 'appearance-none pr-10', className)}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <IconChevronDown className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted" />
      </div>
    </FormField>
  )
}
