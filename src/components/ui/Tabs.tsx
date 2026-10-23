import { useId, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem<V extends string> {
  value: V
  label: ReactNode
  content: ReactNode
}

export interface TabsProps<V extends string> {
  value: V
  onChange: (value: V) => void
  items: TabItem<V>[]
  /** pill – gray track with a white thumb; line – underline under the active tab */
  variant?: 'pill' | 'line'
  className?: string
}

/** Tab list + the active panel, arrow keys move between tabs (shadcn Tabs). */
export function Tabs<V extends string>({ value, onChange, items, variant = 'pill', className }: TabsProps<V>) {
  const baseId = useId()
  const active = items.find((i) => i.value === value)

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const idx = items.findIndex((i) => i.value === value)
    const next = items[(idx + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length]
    onChange(next.value)
    document.getElementById(`${baseId}-tab-${next.value}`)?.focus()
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        onKeyDown={onKeyDown}
        className={cn('inline-flex', variant === 'pill' ? 'gap-0.5 rounded-full border border-field-edge bg-field p-1' : 'w-full gap-6 border-b border-line')}
      >
        {items.map((item) => {
          const selected = item.value === value
          return (
            <button
              key={item.value}
              id={`${baseId}-tab-${item.value}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.value)}
              className={cn(
                'text-control whitespace-nowrap transition-[background-color,color,box-shadow,border-color] duration-200 ease-smooth',
                variant === 'pill'
                  ? cn(
                      'h-9 rounded-full px-4',
                      selected ? 'bg-seg-on font-semibold text-seg-on-ink shadow-seg' : 'text-muted hover:text-ink',
                    )
                  : cn('-mb-px border-b-2 pb-3', selected ? 'border-primary font-medium text-primary-fg' : 'border-transparent text-muted hover:text-ink'),
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      <div key={value} id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${value}`} className="mt-4 animate-fade-in">
        {active?.content}
      </div>
    </div>
  )
}
