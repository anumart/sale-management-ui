import { useEffect, useState, type ReactNode } from 'react'
import { IconMessage } from '@/components/icons'
import { IconButton } from '@/components/ui'
import { useMe } from '@/features/auth/api'
import { NotificationMenu } from '@/features/notifications/components/NotificationMenu'
import { cn } from '@/lib/cn'

export interface TopbarProps {
  /** Page title; defaults to a greeting for the signed-in user. Ignored when `tabs` is set. */
  title?: ReactNode
  subtitle?: ReactNode
  /** Section switcher next to the logo, in place of the title/subtitle row — (ProcurementTabs, LogisticsTabs, ProductionTabs). */
  tabs?: ReactNode
}

/**
 * Page header: brand logo (plus the section-tab switcher, if any) on the left, circle action buttons on the right
 * (DESIGN.md §6.2). The bar is sticky and turns frosted once the page scrolls; the page title/subtitle sits on its own
 * row below and scrolls with the content.
 */
export function Topbar({ title, subtitle = 'ภาพรวมข้อมูลและความเคลื่อนไหวของธุรกิจ', tabs }: TopbarProps) {
  const { data: me } = useMe()
  const scrolled = useScrolled()
  return (
    <>
      {/*
        Sticky full-bleed band: negative margins cancel AppLayout's padding (top, sides) and, on xl, the sidebar column
        (47mk left padding + rail 106mk + gap 58mk), and matching padding puts the content back where it was.
      */}
      <header
        className={cn(
          'sticky top-0 z-[45] mb-2 flex items-center justify-between gap-6 border-b border-transparent',
          '-mx-5 -mt-7 px-5 pt-7 pb-4 sm:-mx-8 sm:px-8',
          'xl:mt-[calc(var(--mk)*-36)] xl:mr-[calc(var(--mk)*-52)] xl:ml-[calc(var(--mk)*-211)] xl:pt-[calc(var(--mk)*20)] xl:pr-[calc(var(--mk)*52)] xl:pl-[calc(var(--mk)*47)]',
          'transition-[background-color,border-color,box-shadow] duration-300 ease-smooth',
          scrolled && 'border-line bg-white/85 shadow-[0_8px_24px_-16px_rgb(0_0_0/0.18)] backdrop-blur-xl backdrop-saturate-150',
        )}
      >
        <div className="-ml-5 flex min-w-0 items-center gap-6">
          {/* White halo lifts the logo off the pink-to-mint header tint (the bar turns white once scrolled). */}
          <img
            src="/logo-e33f4f-v2.png"
            alt="Bangkok Flower"
            className="h-16 w-auto shrink-0 object-contain [filter:drop-shadow(0_0_1px_#fff)_drop-shadow(0_0_1px_#fff)_drop-shadow(0_0_6px_rgb(255_255_255/0.95))]"
          />
          {tabs}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <IconButton icon={<IconMessage />} count={2} aria-label="ข้อความ ยังไม่อ่าน 2 รายการ" />
          <NotificationMenu />
        </div>
      </header>
      {!tabs && (
        <div className="mb-6 min-w-0">
          <h1 className="text-page font-medium tracking-tight">{title ?? `สวัสดี คุณ${me?.name.split(' ')[0] ?? ''}`}</h1>
          {subtitle && <p className="mt-1 text-control text-muted">{subtitle}</p>}
        </div>
      )}
    </>
  )
}

/** True once the window has scrolled past the top. */
function useScrolled() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return scrolled
}
