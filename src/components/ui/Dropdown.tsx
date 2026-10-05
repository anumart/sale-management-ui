import { useRef, type ReactNode } from 'react'
import { useClickOutside } from '@/hooks/useClickOutside'
import { cn } from '@/lib/cn'
import { useUiStore, type MenuId } from '@/stores/uiStore'

export type DropdownPlacement = 'bottom-end' | 'right-end' | 'top-end'

const placements: Record<DropdownPlacement, string> = {
  'bottom-end': 'right-0 top-[calc(100%+12px)]',
  'right-end': 'left-[calc(100%+14px)] bottom-0',
  'top-end': 'right-0 bottom-[calc(100%+14px)]',
}

export interface DropdownProps {
  /** Menu id in the UI store — opening one dropdown closes the others */
  id: MenuId
  /** Render the trigger; spread `triggerProps` onto the button */
  trigger: (triggerProps: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': true }) => ReactNode
  children: ReactNode
  /** Where the panel opens below the xl breakpoint */
  placement?: DropdownPlacement
  /** Override from xl up: sidebar rail avatar menu opens beside the bottom of the rail */
  xlPlacement?: 'right-end'
  className?: string
}

/** Popover panel (profile menu, notifications). Closes on outside click / Esc. */
export function Dropdown({ id, trigger, children, placement = 'bottom-end', xlPlacement, className }: DropdownProps) {
  const ref = useRef<HTMLDivElement>(null)
  const open = useUiStore((s) => s.openMenu === id)
  const toggleMenu = useUiStore((s) => s.toggleMenu)
  const closeMenu = useUiStore((s) => s.closeMenu)
  useClickOutside(ref, () => closeMenu(id), open)

  return (
    <div ref={ref} className="relative">
      {trigger({ onClick: () => toggleMenu(id), 'aria-expanded': open, 'aria-haspopup': true })}
      {open && (
        <div
          className={cn(
            'absolute z-50 animate-pop-in overflow-hidden rounded-[1.25rem] glass-blur shadow-pop',
            placements[placement],
            xlPlacement === 'right-end' && 'xl:top-auto xl:right-auto xl:bottom-0 xl:left-[calc(100%+14px)]',
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

/** Row inside a dropdown menu. */
export function DropdownItem({
  icon,
  children,
  danger,
  onClick,
}: {
  icon?: ReactNode
  children: ReactNode
  danger?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-control transition-colors duration-200 ease-smooth [&>svg]:size-5 [&>svg]:transition-colors [&>svg]:duration-200 [&>svg]:ease-smooth',
        danger
          ? 'text-danger-fg hover:bg-danger-bg'
          : 'text-ink hover:bg-primary-soft hover:text-primary-fg [&>svg]:text-muted hover:[&>svg]:text-primary-fg',
      )}
    >
      {icon}
      {children}
    </button>
  )
}
