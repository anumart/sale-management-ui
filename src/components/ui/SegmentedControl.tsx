import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { spring, useTabIndicator } from './useTabIndicator'

export interface SegmentedControlProps<V extends string> {
  value: V
  options: { value: V; label: ReactNode }[]
  onChange: (value: V) => void
  /**
   * dark  – pill outline, active item black (notification tabs)
   * light – gray track, active item white (button group)
   * mask  – green pill slides to the active item; labels turn dark exactly at its edge (filters in cards)
   */
  variant?: 'dark' | 'light' | 'mask'
  size?: 'sm' | 'md'
  'aria-label'?: string
  className?: string
}

export function SegmentedControl<V extends string>({ variant = 'dark', ...props }: SegmentedControlProps<V>) {
  return variant === 'mask' ? <MaskSegmentedControl {...props} /> : <PlainSegmentedControl variant={variant} {...props} />
}

function PlainSegmentedControl<V extends string>({
  value,
  options,
  onChange,
  variant,
  size = 'md',
  className,
  ...aria
}: SegmentedControlProps<V> & { variant: 'dark' | 'light' }) {
  return (
    <div
      role="radiogroup"
      {...aria}
      className={cn(
        'inline-flex gap-0.5 p-1',
        variant === 'dark' ? 'rounded-full glass shadow-card' : 'rounded-control bg-fill',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'px-4 font-normal whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-200 ease-smooth active:scale-95',
              size === 'sm' ? 'h-8 text-sm' : 'h-9 text-control',
              variant === 'dark'
                ? cn('rounded-full', active ? 'grad-dark text-on-dark shadow-sm' : 'text-ink-2 hover:text-ink')
                : cn('rounded-[0.625rem]', active ? 'bg-surface text-ink shadow-[0_1px_3px_rgb(0_0_0/0.1),0_1px_1px_rgb(0_0_0/0.04)]' : 'text-muted hover:text-ink'),
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Same technique as SectionTabs `mask`: the row is drawn twice and the copy on the green gradient is clipped to the active item. */
function MaskSegmentedControl<V extends string>({ value, options, onChange, size = 'md', className, ...aria }: Omit<SegmentedControlProps<V>, 'variant'>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const { trackRef, itemRefs, rects, shown, ready } = useTabIndicator(index, options.length)
  const rect = rects?.[shown]
  const itemClass = cn('inline-flex items-center rounded-full px-4 font-normal whitespace-nowrap', size === 'sm' ? 'h-8 text-sm' : 'h-9 text-control')

  return (
    <div ref={trackRef} role="radiogroup" {...aria} className={cn('relative inline-flex gap-0.5 rounded-full glass p-1 shadow-card', className)}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            itemRefs.current[i] = el
          }}
          type="button"
          role="radio"
          aria-checked={i === index}
          onClick={() => onChange(o.value)}
          className={cn(itemClass, 'text-ink-2 transition-colors duration-200 hover:text-ink active:scale-95')}
        >
          {o.label}
        </button>
      ))}
      {rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex gap-0.5 rounded-full grad-success p-1 text-on-success motion-reduce:transition-none"
          style={{
            clipPath: `inset(4px ${rect.right}px 4px ${rect.left}px round 999px)`,
            transition: ready ? `clip-path 560ms ${spring}` : 'none',
          }}
        >
          {options.map((o) => (
            <span key={o.value} className={itemClass}>
              {o.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
