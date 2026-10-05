import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { controlClass, FormField } from './FormField'

export interface TextAreaProps extends ComponentProps<'textarea'> {
  label?: ReactNode
  error?: string
  hint?: ReactNode
  containerClassName?: string
}

export function TextArea({ label, error, hint, required, id, className, containerClassName, ...props }: TextAreaProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FormField label={label} htmlFor={inputId} required={required} error={error} hint={hint} className={containerClassName}>
      <textarea
        id={inputId}
        required={required}
        aria-invalid={!!error || undefined}
        className={cn(controlClass(!!error), 'h-24 resize-y py-3', className)}
        {...props}
      />
    </FormField>
  )
}
