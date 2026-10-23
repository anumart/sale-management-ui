import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type'> {
  label?: ReactNode
  /** Shows the "−" mixed state (e.g. some rows selected) */
  indeterminate?: boolean
}

/** Custom 20px checkbox: 6px radius, fills primary when checked (DESIGN.md §6.7). */
export function Checkbox({ label, indeterminate = false, className, ...props }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  const box = (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'relative size-5 shrink-0 cursor-pointer appearance-none rounded-md border-[1.5px] border-field-edge bg-field transition-colors duration-200 ease-smooth',
        'hover:border-primary checked:border-primary checked:grad-primary indeterminate:border-primary indeterminate:grad-primary',
        "checked:after:absolute checked:after:top-[2.5px] checked:after:left-[6px] checked:after:h-2.5 checked:after:w-[0.3125rem] checked:after:rotate-45 checked:after:border-r-2 checked:after:border-b-2 checked:after:border-white checked:after:content-['']",
        "indeterminate:after:absolute indeterminate:after:top-[0.4688rem] indeterminate:after:right-1 indeterminate:after:left-1 indeterminate:after:h-0.5 indeterminate:after:bg-white indeterminate:after:content-['']",
        className,
      )}
      {...props}
    />
  )
  if (!label) return box
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-control text-ink-2">
      {box}
      {label}
    </label>
  )
}
