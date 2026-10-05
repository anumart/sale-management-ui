import { Link, useLocation } from '@tanstack/react-router'
import { type PointerEvent, type ReactNode, useRef } from 'react'
import { IconCart, IconDashboard, IconEdit, IconFactory, IconMoneyBag, IconTruck } from '@/components/icons'
import { ProfileMenu } from '@/features/auth/components/ProfileMenu'
import { cn } from '@/lib/cn'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  /** Path prefix that should light this item up; defaults to `to`. Use it to cover a whole route subtree (e.g. every /procurement/* page). */
  activeMatch?: string
}

const mainNav: NavItem[] = [
  { to: '/', label: 'แดชบอร์ด', icon: <IconDashboard /> },
  { to: '/procurement/plans', label: 'จัดซื้อ', icon: <IconCart />, activeMatch: '/procurement' },
  { to: '/logistics/run-sheets', label: 'ขนส่ง', icon: <IconTruck />, activeMatch: '/logistics' },
  { to: '/production/planning', label: 'ผลิต', icon: <IconFactory />, activeMatch: '/production' },
  { to: '/sales/orders', label: 'ขาย', icon: <IconMoneyBag />, activeMatch: '/sales' },
]

const secondaryNav: NavItem[] = [
  // Component showcase for developers — kept out of the production menu (the route still exists)
  ...(import.meta.env.DEV ? [{ to: '/ui-kit', label: 'UI Kit', icon: <IconEdit /> }] : []),
]

/** Peak magnification of the item under the cursor, and how far (in item sizes) the effect reaches. */
const DOCK_MAX_SCALE = 1.6
const DOCK_REACH = 2.5

/**
 * macOS Dock-style magnification: items near the pointer grow (cosine falloff) and the column spreads
 * around the pointer so the hovered item stays under it. Transforms only, no layout change.
 * Pointer position and item offsets are read from the untransformed layout so nothing feeds back.
 */
function useDockMagnify() {
  const navRef = useRef<HTMLElement>(null)
  const tipRef = useRef<HTMLSpanElement>(null)
  const frame = useRef(0)

  const update = (clientX: number, clientY: number) => {
    const nav = navRef.current
    const tip = tipRef.current
    if (!nav || !tip) return
    const items = Array.from(nav.querySelectorAll<HTMLElement>('[data-dock-item]'))
    const vertical = getComputedStyle(nav).flexDirection === 'column'
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const navRect = nav.getBoundingClientRect()
    const p = vertical ? clientY - navRect.top : clientX - navRect.left

    const base = items.map((el) =>
      vertical ? { start: el.offsetTop, size: el.offsetHeight } : { start: el.offsetLeft, size: el.offsetWidth },
    )
    const scales = base.map(({ start, size }) => {
      if (reduceMotion) return 1
      const t = Math.min(Math.abs(p - (start + size / 2)) / (size * DOCK_REACH), 1)
      return 1 + ((DOCK_MAX_SCALE - 1) * (1 + Math.cos(Math.PI * t))) / 2
    })
    const extra = base.map(({ size }, i) => (scales[i] - 1) * size)
    // How far the pointer's spot would drift if every item grew in place; subtract it to keep that spot fixed.
    const drift = base.reduce((sum, { start, size }, i) => {
      if (p >= start + size) return sum + extra[i]
      if (p > start) return sum + (extra[i] * (p - start)) / size
      return sum
    }, 0)

    let before = 0
    const moves = extra.map((e) => {
      const move = before + e / 2 - drift
      before += e
      return move
    })
    let peak = 0
    items.forEach((el, i) => {
      el.style.transform = `${vertical ? 'translateY' : 'translateX'}(${moves[i]}px) scale(${scales[i]})`
      if (scales[i] > scales[peak]) peak = i
    })

    // Label bubble next to the most magnified item: to the right on the rail, above on the bottom bar.
    const el = items[peak]
    const { start, size } = base[peak]
    const center = start + size / 2 + moves[peak]
    tip.textContent = el.getAttribute('aria-label')
    tip.style.opacity = '1'
    tip.style.transform = vertical
      ? `translate(${el.offsetLeft + el.offsetWidth * scales[peak] + 12}px, ${center}px) translateY(-50%)`
      : `translate(${center}px, ${el.offsetTop - el.offsetHeight * (scales[peak] - 1) - 12}px) translate(-50%, -100%)`
  }

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return
    const { clientX, clientY } = e
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => update(clientX, clientY))
  }

  const onPointerLeave = () => {
    cancelAnimationFrame(frame.current)
    navRef.current?.querySelectorAll<HTMLElement>('[data-dock-item]').forEach((el) => {
      el.style.transform = ''
    })
    if (tipRef.current) tipRef.current.style.opacity = '0'
  }

  return { navRef, tipRef, onPointerMove, onPointerLeave }
}

function NavButton({ item }: { item: NavItem }) {
  const { pathname } = useLocation()
  const matchPath = item.activeMatch ?? item.to
  const active = matchPath === '/' ? pathname === '/' : pathname === matchPath || pathname.startsWith(`${matchPath}/`)

  return (
    <Link
      to={item.to}
      aria-label={item.label}
      data-dock-item
      aria-current={active ? 'page' : undefined}
      className={cn(
        'grid size-12 shrink-0 origin-bottom place-items-center rounded-full transition-[background-color,color,transform] duration-200 ease-out will-change-transform sm:size-14 xl:origin-left [&>svg]:size-6 xl:size-[calc(var(--mk)*84)] xl:[&>svg]:size-[calc(var(--mk)*36)]',
        active ? 'grad-theme text-white shadow-theme' : 'bg-fill text-ink hover:bg-theme-soft hover:text-theme',
      )}
    >
      {item.icon}
    </Link>
  )
}

/**
 * Desktop (xl+): sticky vertical rail on the left with avatar (the brand logo lives in the Topbar). The rail starts below the
 * header band (`--header-h`, index.css), level with the page title; the avatar is pinned to the bottom.
 * xl sizes are in mockup px (--mk), so the rail scales with the viewport exactly like index4.html.
 * Tablet (< xl): floating bottom bar, avatar at the end (DESIGN.md §5.5).
 */
export function Sidebar() {
  const dock = useDockMagnify()
  return (
    <aside
      className={
        'fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 ' +
        'xl:sticky xl:top-[calc(var(--mk)*36)] xl:bottom-auto xl:left-auto xl:h-[calc(100vh-var(--mk)*64)] xl:translate-x-0 xl:flex-col xl:gap-0 xl:self-start xl:pt-[var(--header-h)] xl:pb-[calc(var(--mk)*96)]'
      }
    >
      <nav
        ref={dock.navRef}
        aria-label="เมนูหลัก"
        onPointerMove={dock.onPointerMove}
        onPointerLeave={dock.onPointerLeave}
        className={
          'relative flex items-center gap-1.5 rounded-full glass-blur p-2 shadow-pop ' +
          'xl:min-h-0 xl:w-[calc(var(--mk)*106)] xl:flex-[0_1_calc(var(--mk)*770)] xl:flex-col xl:gap-[calc(var(--mk)*6)] xl:overflow-visible xl:px-0 xl:pt-[calc(var(--mk)*10)] xl:pb-[calc(var(--mk)*20)] xl:shadow-card'
        }
      >
        {mainNav.map((item) => (
          <NavButton key={item.to} item={item} />
        ))}
        {/* spacer on desktop, vertical divider on the bottom bar — only when there is a secondary group to set apart */}
        {secondaryNav.length > 0 && (
          <span aria-hidden="true" className="mx-1 h-8 w-0.5 shrink-0 bg-line xl:mx-0 xl:h-auto xl:w-auto xl:flex-1 xl:bg-transparent" />
        )}
        {secondaryNav.map((item) => (
          <NavButton key={item.to} item={item} />
        ))}
        <span
          ref={dock.tipRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-50 rounded-lg bg-ink/85 px-3 py-1.5 text-sm whitespace-nowrap text-white opacity-0 shadow-pop backdrop-blur-sm transition-opacity duration-150"
        />
      </nav>

      {/* desktop: pinned to the bottom, outside the flow so the rail stays centered on the screen */}
      <div className="shrink-0 xl:absolute xl:bottom-0 xl:left-1/2 xl:-translate-x-1/2">
        <ProfileMenu />
      </div>
    </aside>
  )
}
