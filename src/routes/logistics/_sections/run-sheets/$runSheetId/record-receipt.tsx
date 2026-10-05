import { createFileRoute } from '@tanstack/react-router'
import { RecordReceiptPage } from '@/features/logistics/RecordReceiptPage'

export const Route = createFileRoute('/logistics/_sections/run-sheets/$runSheetId/record-receipt')({
  component: RouteComponent,
})

function RouteComponent() {
  const { runSheetId } = Route.useParams()
  return <RecordReceiptPage runSheetId={runSheetId} />
}
