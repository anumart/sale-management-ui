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
   * aurora – glass track; the active item slides in wearing the spinning light ring of SectionTabs `aurora`
   */
  variant?: 'dark' | 'light' | 'mask' | 'aurora'
  size?: 'sm' | 'md'
  'aria-label'?: string
  className?: string
}

export function SegmentedControl<V extends string>({ variant = 'dark', ...props }: SegmentedControlProps<V>) {
  if (variant === 'mask') return <MaskSegmentedControl {...props} />
  if (variant === 'aurora') return <AuroraSegmentedControl {...props} />
  return <PlainSegmentedControl variant={variant} {...props} />
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
        variant === 'dark' ? 'rounded-full glass shadow-card' : 'rounded-full border border-field-edge bg-field',
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
                ? cn('rounded-full', active ? 'bg-seg-on font-semibold text-seg-on-ink shadow-seg' : 'text-ink-2 hover:text-ink')
                : cn('rounded-full', active ? 'bg-seg-on font-semibold text-seg-on-ink shadow-seg' : 'text-muted hover:text-ink'),
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

/** Same look as SectionTabs `aurora`: a ring-and-face indicator slides between the items. */
function AuroraSegmentedControl<V extends string>({ value, options, onChange, size = 'md', className, ...aria }: Omit<SegmentedControlProps<V>, 'variant'>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const { trackRef, itemRefs, rects, shown, ready } = useTabIndicator(index, options.length)
  const rect = rects?.[shown]

  return (
    <div ref={trackRef} role="radiogroup" {...aria} className={cn('relative inline-flex items-center gap-1 rounded-full glass p-1.5 shadow-card', className)}>
      {rect && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 motion-reduce:transition-none"
          style={{
            left: rect.left,
            right: rect.right,
            transition: ready ? `left 520ms ${spring}, right 520ms ${spring}` : 'none',
          }}
        >
          <span className="absolute -inset-1 rounded-full opacity-50 blur-md aurora-ring" />
          <span className="absolute inset-0 rounded-full p-[2px] aurora-ring">
            <span className="block size-full rounded-full bg-surface" />
          </span>
        </span>
      )}
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
          className={cn(
            'relative z-10 inline-flex items-center rounded-full px-4 whitespace-nowrap transition-colors duration-300 ease-smooth active:scale-95',
            size === 'sm' ? 'h-8 text-sm' : 'h-9 text-control',
            i === shown ? 'font-medium text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
