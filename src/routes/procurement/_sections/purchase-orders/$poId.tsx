import { createFileRoute } from '@tanstack/react-router'
import { PurchaseOrderDetailPage } from '@/features/procurement/PurchaseOrderDetailPage'

export const Route = createFileRoute('/procurement/_sections/purchase-orders/$poId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { poId } = Route.useParams()
  return <PurchaseOrderDetailPage poId={poId} />
}
