import { createFileRoute } from '@tanstack/react-router'
import { NewDeliverySheetPage } from '@/features/logistics/NewDeliverySheetPage'

export const Route = createFileRoute('/logistics/_sections/delivery-sheets/new')({ component: NewDeliverySheetPage })
