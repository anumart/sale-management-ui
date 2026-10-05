import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { controlClass, FormField } from './FormField'

export interface TextFieldProps extends Omit<ComponentProps<'input'>, 'prefix'> {
  label?: ReactNode
  error?: string
  hint?: ReactNode
  /** Adornment inside the input on the left, e.g. "$" or an icon */
  prefix?: ReactNode
  containerClassName?: string
}

/** Textbox with label, prefix, validation message (DESIGN.md §6.8). */
export function TextField({
  label,
  error,
  hint,
  prefix,
  required,
  id,
  className,
  containerClassName,
  ...props
}: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FormField label={label} htmlFor={inputId} required={required} error={error} hint={hint} className={containerClassName}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted [&>svg]:size-5">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(controlClass(!!error), prefix && 'pl-10', className)}
          {...props}
        />
      </div>
    </FormField>
  )
}
