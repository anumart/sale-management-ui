import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const toggleClass = (pressed: boolean, outline?: boolean) =>
  cn(
    'inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-[0.625rem] px-2.5 text-control transition-colors duration-200 ease-smooth [&>svg]:size-[1.125rem]',
    'disabled:cursor-not-allowed disabled:opacity-45',
    outline && 'border border-field-edge bg-field',
    pressed ? 'bg-primary-soft text-primary-fg' : 'text-ink-2 hover:bg-fill hover:text-ink',
    pressed && outline && 'border-primary',
  )

export interface ToggleProps {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  children: ReactNode
  outline?: boolean
  disabled?: boolean
  'aria-label'?: string
  className?: string
}

/** Two-state button, e.g. Bold / Italic (shadcn Toggle). */
export function Toggle({ pressed, onPressedChange, children, outline, className, ...props }: ToggleProps) {
  return (
    <button type="button" aria-pressed={pressed} onClick={() => onPressedChange(!pressed)} className={cn(toggleClass(pressed, outline), className)} {...props}>
      {children}
    </button>
  )
}

export interface ToggleGroupProps<V extends string> {
  /** Pressed values */
  value: V[]
  onChange: (value: V[]) => void
  options: { value: V; label: ReactNode; 'aria-label'?: string }[]
  /** At most one pressed item (can still be cleared). For a required single choice use `SegmentedControl`. */
  single?: boolean
  outline?: boolean
  'aria-label'?: string
  className?: string
}

/** Row of toggles (shadcn Toggle Group). */
export function ToggleGroup<V extends string>({ value, onChange, options, single, outline, className, ...aria }: ToggleGroupProps<V>) {
  const flip = (v: V) => {
    const on = value.includes(v)
    if (single) onChange(on ? [] : [v])
    else onChange(on ? value.filter((x) => x !== v) : [...value, v])
  }
  return (
    <div role="group" {...aria} className={cn('inline-flex gap-1', className)}>
      {options.map((o) => (
        <Toggle key={o.value} pressed={value.includes(o.value)} onPressedChange={() => flip(o.value)} outline={outline} aria-label={o['aria-label']}>
          {o.label}
        </Toggle>
      ))}
    </div>
  )
}
