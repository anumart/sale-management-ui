import { useId, useState, type ReactNode } from 'react'
import { IconChevronDown } from '@/components/icons'
import { cn } from '@/lib/cn'

export interface AccordionItem {
  value: string
  title: ReactNode
  content: ReactNode
}

export interface AccordionProps {
  items: AccordionItem[]
  /** single – one panel open at a time; multiple – any number */
  type?: 'single' | 'multiple'
  defaultValue?: string[]
  className?: string
}

/** Stacked disclosure rows separated by hairlines (shadcn Accordion). */
export function Accordion({ items, type = 'single', defaultValue = [], className }: AccordionProps) {
  const baseId = useId()
  const [open, setOpen] = useState<string[]>(defaultValue)
  const toggle = (v: string) =>
    setOpen((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : type === 'single' ? [v] : [...cur, v]))

  return (
    <div className={cn('flex flex-col', className)}>
      {items.map((item, i) => {
        const isOpen = open.includes(item.value)
        const panelId = `${baseId}-${item.value}`
        return (
          <div key={item.value} className={cn(i > 0 && 'border-t border-line')}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(item.value)}
              className="flex w-full items-center justify-between gap-4 py-4 text-left font-medium text-ink transition-colors hover:text-primary-fg"
            >
              {item.title}
              <IconChevronDown className={cn('size-4 shrink-0 text-muted transition-transform duration-300 ease-smooth', isOpen && 'rotate-180')} />
            </button>
            {/* grid-rows trick animates height without measuring */}
            <div
              id={panelId}
              role="region"
              className={cn('grid transition-[grid-template-rows] duration-300 ease-smooth', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
            >
              <div className="overflow-hidden">
                <div className="pb-4 text-body text-muted">{item.content}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
