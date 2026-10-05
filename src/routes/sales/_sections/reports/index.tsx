import { createFileRoute } from '@tanstack/react-router'
import { SalesReportsPage } from '@/features/sales/SalesReportsPage'

export const Route = createFileRoute('/sales/_sections/reports/')({ component: SalesReportsPage })
