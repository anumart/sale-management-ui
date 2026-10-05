import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface SwitchProps extends Omit<ComponentProps<'input'>, 'type'> {
  label?: ReactNode
}

/** On/off toggle; the track turns accent orange when on. */
export function Switch({ label, className, ...props }: SwitchProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-3 text-control text-ink-2', className)}>
      <input type="checkbox" role="switch" className="peer sr-only" {...props} />
      <span
        aria-hidden="true"
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full bg-fill-strong transition-colors duration-300 ease-smooth peer-checked:grad-accent',
          'peer-focus-visible:shadow-[0_0_0_4px_var(--color-accent-soft)]',
          'after:absolute after:top-[0.1875rem] after:left-[0.1875rem] after:size-[1.375rem] after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-300 after:ease-smooth',
          'peer-checked:after:translate-x-5',
        )}
      />
      {label}
    </label>
  )
}
