import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { IconChevronRight } from '@/components/icons'

export interface PageHeadingProps {
  /** Ancestor section shown before the separator, e.g. "Procurement" */
  section: string
  /** Optional middle crumb linking back to a list page, e.g. { label: 'Run Sheets', to: '/logistics/run-sheets' } */
  parent?: { label: string; to: string }
  title: string
  subtitle?: ReactNode
}

/**
 * Breadcrumb + big page title. Used above the first Card on pages whose Topbar shows a
 * section-tab switcher (see Topbar's `tabs` prop) instead of a title.
 */
export function PageHeading({ section, parent, title, subtitle }: PageHeadingProps) {
  return (
    <div className="mb-6">
      <nav aria-label="เส้นทาง" className="mb-1.5 flex items-center gap-1.5 text-sm text-muted [&_svg]:size-3.5">
        <span>{section}</span>
        {parent && (
          <>
            <IconChevronRight />
            <Link to={parent.to} className="hover:text-ink hover:underline">
              {parent.label}
            </Link>
          </>
        )}
        <IconChevronRight />
        <span className="font-medium text-ink">{title}</span>
      </nav>
      <h1 className="text-page font-medium tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-control text-muted">{subtitle}</p>}
    </div>
  )
}
