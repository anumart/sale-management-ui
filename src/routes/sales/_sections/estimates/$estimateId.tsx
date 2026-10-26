import { createFileRoute } from '@tanstack/react-router'
import { EstimateDetailPage } from '@/features/sales/EstimateDetailPage'

export const Route = createFileRoute('/sales/_sections/estimates/$estimateId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { estimateId } = Route.useParams()
  return <EstimateDetailPage estimateId={estimateId} />
}
