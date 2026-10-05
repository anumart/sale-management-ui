import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '@/components/icons'
import { cn } from '@/lib/cn'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  side?: 'right' | 'left'
  footer?: ReactNode
  children?: ReactNode
  className?: string
}

/** Side panel that slides over the page; closes on backdrop click / Esc (shadcn Sheet). */
export function Sheet({ open, onClose, title, description, side = 'right', footer, children, className }: SheetProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 animate-fade-in bg-black/30" onClick={onClose} />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'absolute inset-y-0 flex w-full max-w-md flex-col border-line bg-surface shadow-modal outline-none',
          side === 'right' ? 'right-0 animate-sheet-in-right border-l' : 'left-0 animate-sheet-in-left border-r',
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line p-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-title font-semibold tracking-tight">
              {title}
            </h2>
            {description && <p className="mt-1 text-control text-muted">{description}</p>}
          </div>
          <button
            type="button"
            aria-label="ปิด"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-fill text-ink-2 transition-colors hover:bg-fill-strong [&>svg]:size-4"
          >
            <IconClose />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && <footer className="flex justify-end gap-3 border-t border-line p-6">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  )
}
