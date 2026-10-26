import { createFileRoute } from '@tanstack/react-router'
import { DeliverySheetDetailPage } from '@/features/logistics/DeliverySheetDetailPage'

export const Route = createFileRoute('/logistics/_sections/delivery-sheets/$sheetId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { sheetId } = Route.useParams()
  return <DeliverySheetDetailPage sheetId={sheetId} />
}
