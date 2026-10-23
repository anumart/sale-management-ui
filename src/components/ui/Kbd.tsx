import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Keyboard key hint, e.g. ⌘ K (shadcn Kbd). */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-field-edge bg-field px-1.5 font-sans text-xs font-medium text-ink-2 shadow-[0_1px_0_var(--color-line-strong)]',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
