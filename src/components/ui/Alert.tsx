import type { ReactNode } from 'react'
import { IconCheck, IconInfo, IconWarning } from '@/components/icons'
import { cn } from '@/lib/cn'

export type AlertTone = 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'neutral'

const tones: Record<AlertTone, { box: string; icon: string }> = {
  primary: { box: 'bg-primary-soft border-primary/30', icon: 'text-primary-fg' },
  success: { box: 'bg-success-bg border-success/40', icon: 'text-success-fg' },
  warning: { box: 'bg-warning-bg border-warning/40', icon: 'text-warning-fg' },
  info: { box: 'bg-info-bg border-info/40', icon: 'text-info-fg' },
  danger: { box: 'bg-danger-bg border-danger/40', icon: 'text-danger-fg' },
  neutral: { box: 'bg-surface border-line-strong', icon: 'text-ink-2' },
}

const defaultIcons: Record<AlertTone, ReactNode> = {
  primary: <IconInfo />,
  success: <IconCheck />,
  warning: <IconWarning />,
  info: <IconInfo />,
  danger: <IconWarning />,
  neutral: <IconInfo />,
}

export interface AlertProps {
  tone?: AlertTone
  title: ReactNode
  children?: ReactNode
  icon?: ReactNode
  /** Right side: a link or small button */
  action?: ReactNode
  className?: string
}

/** Inline callout for a page or form section (shadcn Alert). */
export function Alert({ tone = 'neutral', title, children, icon, action, className }: AlertProps) {
  const t = tones[tone]
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-control border px-4 py-3.5', t.box, className)}>
      <span className={cn('mt-0.5 shrink-0 [&>svg]:size-5', t.icon)}>{icon ?? defaultIcons[tone]}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{title}</p>
        {children && <div className="mt-0.5 text-sm text-ink-2">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  )
}
