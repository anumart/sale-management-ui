import { createFileRoute } from '@tanstack/react-router'
import { InvoicesPage } from '@/features/sales/InvoicesPage'

export const Route = createFileRoute('/sales/_sections/invoices/')({ component: InvoicesPage })
