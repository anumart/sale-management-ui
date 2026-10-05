import { IconCheck, IconClose, IconInfo } from '@/components/icons'
import { cn } from '@/lib/cn'
import { useToastStore } from '@/stores/toastStore'

const icons = { success: IconCheck, error: IconClose, info: IconInfo }
const iconBg = { success: 'grad-success text-on-success', error: 'grad-danger text-on-danger', info: 'grad-info text-on-info' }

/** White toasts at the bottom-right (above the tablet bottom bar). Mount once in the layout. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-6 bottom-32 z-200 flex flex-col items-end gap-2 xl:bottom-8"
    >
      {toasts.map((t) => {
        const Icon = icons[t.tone]
        return (
          <div
            key={t.id}
            role="status"
            className="flex animate-toast-in items-center gap-3 rounded-[1.125rem] border border-line bg-surface px-5 py-3.5 text-control text-ink shadow-modal"
          >
            <span className={cn('grid size-6 place-items-center rounded-full', iconBg[t.tone])}>
              <Icon className="size-3.5" />
            </span>
            {t.message}
          </div>
        )
      })}
    </div>
  )
}
