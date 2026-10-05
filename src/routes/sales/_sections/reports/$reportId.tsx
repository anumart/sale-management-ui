import { createFileRoute } from '@tanstack/react-router'
import { SalesReportDetailPage } from '@/features/sales/SalesReportDetailPage'

export const Route = createFileRoute('/sales/_sections/reports/$reportId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { reportId } = Route.useParams()
  return <SalesReportDetailPage reportId={reportId} />
}
