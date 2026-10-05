import { createFileRoute } from '@tanstack/react-router'
import { SupplierDetailPage } from '@/features/procurement/SupplierDetailPage'

export const Route = createFileRoute('/procurement/_sections/suppliers/$supplierId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { supplierId } = Route.useParams()
  return <SupplierDetailPage supplierId={supplierId} />
}
