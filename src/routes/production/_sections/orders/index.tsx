import { createFileRoute } from '@tanstack/react-router'
import { ProductionOrdersPage } from '@/features/production/ProductionOrdersPage'

export const Route = createFileRoute('/production/_sections/orders/')({ component: ProductionOrdersPage })
