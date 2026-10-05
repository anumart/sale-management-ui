import { createFileRoute } from '@tanstack/react-router'
import { InvoiceDetailPage } from '@/features/sales/InvoiceDetailPage'

export const Route = createFileRoute('/sales/_sections/invoices/$invoiceId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { invoiceId } = Route.useParams()
  return <InvoiceDetailPage invoiceId={invoiceId} />
}
