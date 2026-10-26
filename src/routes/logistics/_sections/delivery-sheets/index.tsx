import { createFileRoute } from '@tanstack/react-router'
import { DeliverySheetsListPage } from '@/features/logistics/DeliverySheetsListPage'

export const Route = createFileRoute('/logistics/_sections/delivery-sheets/')({ component: DeliverySheetsListPage })
