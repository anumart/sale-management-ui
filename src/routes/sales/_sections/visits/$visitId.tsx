import { createFileRoute } from '@tanstack/react-router'
import { VisitDetailPage } from '@/features/sales/VisitDetailPage'

export const Route = createFileRoute('/sales/_sections/visits/$visitId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { visitId } = Route.useParams()
  return <VisitDetailPage visitId={visitId} />
}
