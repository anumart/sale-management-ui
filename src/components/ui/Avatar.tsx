import { useState } from 'react'
import { cn } from '@/lib/cn'

export function Avatar({ src, alt = '', className }: { src: string; alt?: string; className?: string }) {
  return <img src={src} alt={alt} className={cn('size-10 shrink-0 rounded-full bg-fill object-cover', className)} />
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** Image avatar that falls back to gradient initials when `src` is missing or fails to load (shadcn Avatar). */
export function InitialsAvatar({ name, src, tint = 'grad-primary', className }: { name: string; src?: string; tint?: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (src && !failed)
    return <img src={src} alt={name} onError={() => setFailed(true)} className={cn('size-10 shrink-0 rounded-full bg-fill object-cover', className)} />
  return (
    <span role="img" aria-label={name} className={cn('grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white', tint, className)}>
      {initialsOf(name)}
    </span>
  )
}

const groupTints = ['grad-primary', 'grad-theme', 'grad-accent', 'grad-warning', 'grad-info']

/** Overlapping initials avatars with a "+N" counter. */
export function AvatarGroup({ names, max = 4, className }: { names: string[]; max?: number; className?: string }) {
  const shown = names.slice(0, max)
  const rest = names.length - shown.length
  return (
    <div className={cn('flex -space-x-2.5', className)}>
      {shown.map((n, i) => (
        <InitialsAvatar key={n} name={n} tint={groupTints[i % groupTints.length]} className="ring-2 ring-white" />
      ))}
      {rest > 0 && <span className="grid size-10 place-items-center rounded-full bg-fill-strong text-sm font-medium text-ink-2 ring-2 ring-white">+{rest}</span>}
    </div>
  )
}
