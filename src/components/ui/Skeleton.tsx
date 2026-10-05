import { cn } from '@/lib/cn'

/** Gray pulsing placeholder while data loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-xl bg-fill', className)} />
}
