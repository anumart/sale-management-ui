import { createFileRoute } from '@tanstack/react-router'
import { FinishedGoodDetailPage } from '@/features/catalog/FinishedGoodDetailPage'

export const Route = createFileRoute('/catalog/_sections/finished-goods/$finishedGoodId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { finishedGoodId } = Route.useParams()
  return <FinishedGoodDetailPage finishedGoodId={finishedGoodId} />
}
