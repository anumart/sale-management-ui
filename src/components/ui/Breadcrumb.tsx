import { Fragment, type ReactNode } from 'react'
import { IconChevronRight } from '@/components/icons'

export interface BreadcrumbItem {
  label: ReactNode
  href?: string
}

/** Path trail; the last item is the current page (shadcn Breadcrumb). */
export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="เส้นทาง" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-control text-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <Fragment key={i}>
              <li>
                {last ? (
                  <span aria-current="page" className="font-medium text-ink">
                    {item.label}
                  </span>
                ) : (
                  <a href={item.href ?? '#'} className="transition-colors hover:text-primary-fg">
                    {item.label}
                  </a>
                )}
              </li>
              {!last && (
                <li aria-hidden="true" className="text-placeholder [&>svg]:size-3.5">
                  <IconChevronRight />
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
