import { createFileRoute } from '@tanstack/react-router'
import { CustomersPage } from '@/features/sales/CustomersPage'

export const Route = createFileRoute('/sales/_sections/customers/')({ component: CustomersPage })
