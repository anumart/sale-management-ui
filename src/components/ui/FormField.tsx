import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface FormFieldProps {
  label?: ReactNode
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: ReactNode
  className?: string
  children: ReactNode
}

/** Label + control + error/hint. Used by every form control (DESIGN.md §6.8). */
export function FormField({ label, htmlFor, required, error, hint, className, children }: FormFieldProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-control font-medium text-ink-2">
          {label}
          {required && <span className="ml-0.5 text-danger-fg">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-sm text-danger-fg">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted">{hint}</p>
      )}
    </div>
  )
}

/** Shared input look: 48px tall, 14px radius, primary focus ring, red when invalid. */
export const controlClass = (invalid?: boolean) =>
  cn(
    'h-12 w-full rounded-control border bg-surface px-4 text-base text-ink outline-none',
    'transition-[border-color,box-shadow] placeholder:text-placeholder',
    'disabled:cursor-not-allowed disabled:bg-fill',
    invalid
      ? 'border-danger shadow-[0_0_0_4px_var(--color-danger-bg)]'
      : 'border-line-strong focus:border-primary focus:shadow-[0_0_0_4px_var(--color-primary-soft)]',
  )
