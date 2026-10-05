import { createFileRoute } from '@tanstack/react-router'
import { RunSheetDetailPage } from '@/features/logistics/RunSheetDetailPage'

export const Route = createFileRoute('/logistics/_sections/run-sheets/$runSheetId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { runSheetId } = Route.useParams()
  return <RunSheetDetailPage runSheetId={runSheetId} />
}
