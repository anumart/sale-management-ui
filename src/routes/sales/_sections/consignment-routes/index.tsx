import { createFileRoute } from '@tanstack/react-router'
import { ConsignmentRoutesPage } from '@/features/sales/ConsignmentRoutesPage'

export const Route = createFileRoute('/sales/_sections/consignment-routes/')({ component: ConsignmentRoutesPage })
