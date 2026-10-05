import { createRouter } from '@tanstack/react-router'
import { queryClient } from '@/lib/queryClient'
import { routeTree } from '@/routeTree.gen'

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
})

// Type-safe <Link to="..."> / navigate() across the app
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
