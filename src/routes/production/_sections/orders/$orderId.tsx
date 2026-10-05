import { createFileRoute } from '@tanstack/react-router'
import { ProductionOrderDetailPage } from '@/features/production/ProductionOrderDetailPage'

export const Route = createFileRoute('/production/_sections/orders/$orderId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { orderId } = Route.useParams()
  return <ProductionOrderDetailPage orderId={orderId} />
}
