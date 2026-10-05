import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useClickOutside } from '@/hooks/useClickOutside'
import { cn } from '@/lib/cn'

const aligns = { start: 'left-0', center: 'left-1/2 -translate-x-1/2', end: 'right-0' }

export interface PopoverProps {
  /** Render the trigger; spread `triggerProps` onto the button */
  trigger: (triggerProps: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'dialog' }) => ReactNode
  /** Panel content; call `close` from inside to dismiss */
  children: (close: () => void) => ReactNode
  align?: keyof typeof aligns
  className?: string
}

/** Self-contained floating panel (shadcn Popover). Use `Dropdown` for menus tied to the UI store. */
export function Popover({ trigger, children, align = 'start', className }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close, open)

  return (
    <div ref={ref} className="relative inline-block">
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'dialog' })}
      {open && (
        <div
          role="dialog"
          className={cn('absolute top-[calc(100%+8px)] z-50 w-72 animate-pop-in rounded-[1.25rem] glass-blur p-4 shadow-pop', aligns[align], className)}
        >
          {children(close)}
        </div>
      )}
    </div>
  )
}
