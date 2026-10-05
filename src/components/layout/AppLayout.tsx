import { Outlet, useMatches } from '@tanstack/react-router'
import { ConfirmHost, Toaster } from '@/components/ui'
import { RouteProgressBar } from './RouteProgressBar'
import { Sidebar } from './Sidebar'

/**
 * App shell: [sidebar | main]. Pages render their own <Topbar /> + content inside <Outlet />, except tabbed sections,
 * whose top bar is rendered once by `SectionLayout` (pathless `_sections` layout routes).
 * Global hosts (confirm box, toasts, nav loading bar) are mounted once here.
 */
export function AppLayout() {
  // Id of the route directly under the root: the page itself (params included), or a shared section layout such as
  // procurement's tabbed list pages, which then stays mounted while its child pages swap.
  const pageKey = useMatches({ select: (matches) => matches[1]?.id ?? '' })
  return (
    <div className="mx-auto grid max-w-[1920px] grid-cols-1 gap-x-10 px-5 pt-7 pb-36 sm:px-8 xl:grid-cols-[calc(var(--mk)*106)_minmax(0,1fr)] xl:gap-x-[calc(var(--mk)*58)] xl:pt-[calc(var(--mk)*36)] xl:pr-[calc(var(--mk)*52)] xl:pb-[calc(var(--mk)*28)] xl:pl-[calc(var(--mk)*47)]">
      <RouteProgressBar />
      <Sidebar />
      <main className="min-w-0">
        {/* Keying by page remounts on navigation, replaying the entrance animation per page. */}
        <div key={pageKey} className="animate-fade-in-up">
          <Outlet />
        </div>
      </main>
      <ConfirmHost />
      <Toaster />
    </div>
  )
}
