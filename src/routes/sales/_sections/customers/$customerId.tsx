import { createFileRoute } from '@tanstack/react-router'
import { CustomerDetailPage } from '@/features/sales/CustomerDetailPage'

export const Route = createFileRoute('/sales/_sections/customers/$customerId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { customerId } = Route.useParams()
  return <CustomerDetailPage customerId={customerId} />
}
