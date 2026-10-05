import { cn } from '@/lib/cn'

/** Hairline divider (shadcn Separator). */
export function Separator({ orientation = 'horizontal', className }: { orientation?: 'horizontal' | 'vertical'; className?: string }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn('shrink-0 bg-line', orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch', className)}
    />
  )
}
