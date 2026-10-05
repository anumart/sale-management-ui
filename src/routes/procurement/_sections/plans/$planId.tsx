import { createFileRoute } from '@tanstack/react-router'
import { PlanDetailPage } from '@/features/procurement/PlanDetailPage'

export const Route = createFileRoute('/procurement/_sections/plans/$planId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { planId } = Route.useParams()
  return <PlanDetailPage planId={planId} />
}
