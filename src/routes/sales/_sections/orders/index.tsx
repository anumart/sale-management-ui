import { createFileRoute } from '@tanstack/react-router'
import { CustomerOrdersPage } from '@/features/sales/CustomerOrdersPage'

export const Route = createFileRoute('/sales/_sections/orders/')({ component: CustomerOrdersPage })
