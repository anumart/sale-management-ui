import { createFileRoute } from '@tanstack/react-router'
import { VisitsPage } from '@/features/sales/VisitsPage'

export const Route = createFileRoute('/sales/_sections/visits/')({ component: VisitsPage })
