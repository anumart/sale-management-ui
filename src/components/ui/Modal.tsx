import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '@/components/icons'
import { cn } from '@/lib/cn'

export type ModalTone = 'primary' | 'danger' | 'success' | 'warning' | 'info' | 'accent'

const toneClass: Record<ModalTone, string> = {
  primary: 'bg-primary-soft text-primary-fg',
  danger: 'bg-danger-bg text-danger-fg',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  info: 'bg-info-bg text-info-fg',
  accent: 'bg-accent-soft text-accent-dark',
}

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  /** Icon shown in a tinted tile above the title */
  icon?: ReactNode
  tone?: ModalTone
  /** Center icon, text and footer — use for confirmations and results */
  centered?: boolean
  footer?: ReactNode
  children?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Disable closing via backdrop / Esc (e.g. while saving) */
  dismissible?: boolean
}

const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }

/** Accessible dialog rendered in a portal (DESIGN.md §6.11). */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  tone = 'primary',
  centered,
  footer,
  children,
  size = 'md',
  dismissible = true,
}: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  // Keep the latest onClose without re-running the mount effect (which would steal focus)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  // Latest open, read from the Esc handler so it isn't stuck on the value from when the effect first ran
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  })

  // Stay mounted through the closing animation instead of vanishing the instant `open` flips false
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  useEffect(() => {
    if (open) {
      setClosing(false)
      setMounted(true)
      return
    }
    setClosing(true)
    const timer = setTimeout(() => setMounted(false), centered ? 660 : 620)
    return () => clearTimeout(timer)
  }, [open, centered])

  // Esc to close, lock page scroll, move focus in and restore it on close — held for the whole mounted lifetime
  // (including the closing animation), not just while `open` is true.
  useEffect(() => {
    if (!mounted) return
    const previous = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible && openRef.current) onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const focusTarget =
      panelRef.current?.querySelector<HTMLElement>('input, select, textarea, [data-autofocus]') ??
      panelRef.current?.querySelector<HTMLElement>('[data-modal-footer] button:last-child')
    focusTarget?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [mounted, dismissible])

  if (!mounted) return null

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-100 grid place-items-center bg-black/20 p-6 backdrop-blur-md',
        closing ? 'animate-fade-out' : 'animate-fade-in',
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative w-full rounded-card border border-line bg-surface p-8 shadow-modal',
          centered ? (closing ? 'animate-confirm-out' : 'animate-confirm-in') : closing ? 'animate-modal-out' : 'animate-modal-in',
          sizes[size],
          centered && 'text-center',
        )}
      >
        {dismissible && (
          <button
            type="button"
            aria-label="ปิด"
            onClick={onClose}
            className="group absolute top-5 right-5 grid size-10 place-items-center rounded-full bg-fill text-ink-2 transition-colors duration-200 ease-smooth hover:bg-fill-strong"
          >
            <IconClose className="size-5 transition-transform duration-200 ease-smooth group-hover:rotate-90" />
          </button>
        )}
        {icon && (
          <div
            className={cn(
              'mb-5 grid size-16 place-items-center rounded-[1.25rem] [&>svg]:size-8',
              toneClass[tone],
              centered && 'mx-auto',
            )}
          >
            {icon}
          </div>
        )}
        <h3 id={titleId} className="pr-10 text-display font-semibold tracking-tight">
          {title}
        </h3>
        {description && <p className="mt-2.5 text-base leading-relaxed text-muted">{description}</p>}
        {children && <div className="mt-6">{children}</div>}
        {footer && (
          <div data-modal-footer className={cn('mt-8 flex gap-3', centered ? 'justify-center' : 'justify-end')}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
