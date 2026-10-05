import { createFileRoute } from '@tanstack/react-router'
import { PurchaseOrdersPage } from '@/features/procurement/PurchaseOrdersPage'

export const Route = createFileRoute('/procurement/_sections/purchase-orders/')({ component: PurchaseOrdersPage })
