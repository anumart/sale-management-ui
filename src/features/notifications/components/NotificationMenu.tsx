import type { ReactNode } from 'react'
import { IconBell, IconCalendar, IconCheck, IconWallet, IconWarning, IconWrench } from '@/components/icons'
import { Dropdown, IconButton, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/format'
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../api'
import type { NotificationType } from '../types'

const typeStyle: Record<NotificationType, { icon: ReactNode; className: string }> = {
  payment: { icon: <IconWallet />, className: 'bg-success-bg text-success-fg' },
  maintenance: { icon: <IconWrench />, className: 'bg-accent-soft text-accent-dark' },
  booking: { icon: <IconCalendar />, className: 'bg-primary-soft text-primary-fg' },
  alert: { icon: <IconWarning />, className: 'bg-danger-bg text-danger-fg' },
}

/** Bell button with unread count + notifications panel (DESIGN.md §6.10). */
export function NotificationMenu() {
  const { data = [], isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const unread = data.filter((n) => !n.read).length

  return (
    <Dropdown
      id="notifications"
      className="w-[23.75rem] max-w-[calc(100vw-48px)]"
      trigger={(props) => (
        <IconButton
          icon={<IconBell />}
          count={unread}
          aria-label={unread ? `การแจ้งเตือน ยังไม่อ่าน ${unread} รายการ` : 'การแจ้งเตือน'}
          {...props}
        />
      )}
    >
      <div role="dialog" aria-label="การแจ้งเตือน">
        <div className="flex items-center justify-between border-b border-line px-5 pt-5 pb-3">
          <h4 className="text-title font-semibold">การแจ้งเตือน</h4>
          <button
            type="button"
            disabled={unread === 0}
            onClick={() => markAll.mutate()}
            className="inline-flex items-center gap-1 text-sm text-primary-fg hover:underline disabled:cursor-default disabled:text-muted disabled:no-underline [&>svg]:size-4"
          >
            <IconCheck />
            อ่านทั้งหมดแล้ว
          </button>
        </div>
        <ul className="max-h-[23.75rem] overflow-y-auto">
          {isLoading && (
            <li className="grid place-items-center py-10 text-muted">
              <Spinner />
            </li>
          )}
          {!isLoading && data.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted">ไม่มีการแจ้งเตือนใหม่ 🎉</li>
          )}
          {data.map((n) => (
            <li key={n.id} className="border-b border-line last:border-0">
              <button
                type="button"
                onClick={() => !n.read && markRead.mutate(n.id)}
                className={cn(
                  'relative flex w-full items-start gap-3 px-5 py-3.5 text-left hover:bg-hover',
                  !n.read && 'bg-primary-soft/50',
                )}
              >
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl [&>svg]:size-5', typeStyle[n.type].className)}>
                  {typeStyle[n.type].icon}
                </span>
                <span className="min-w-0 flex-1 pr-4">
                  <span className="block text-control font-semibold">{n.title}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-ink-2">{n.text}</span>
                  <time dateTime={n.createdAt} className="mt-1 block text-xs text-muted">
                    {formatRelative(n.createdAt)}
                  </time>
                </span>
                {!n.read && <span aria-label="ยังไม่อ่าน" className="absolute top-5 right-5 size-2 rounded-full grad-primary" />}
              </button>
            </li>
          ))}
        </ul>
        <a href="#" className="block border-t border-line py-3.5 text-center text-sm font-medium text-primary-fg hover:bg-hover">
          ดูการแจ้งเตือนทั้งหมด
        </a>
      </div>
    </Dropdown>
  )
}
