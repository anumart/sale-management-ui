import { createFileRoute } from '@tanstack/react-router'
import { CustomerOrderDetailPage } from '@/features/sales/CustomerOrderDetailPage'

export const Route = createFileRoute('/sales/_sections/orders/$orderId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { orderId } = Route.useParams()
  return <CustomerOrderDetailPage orderId={orderId} />
}
