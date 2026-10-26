import { createFileRoute } from '@tanstack/react-router'
import { EstimatesPage } from '@/features/sales/EstimatesPage'

export const Route = createFileRoute('/sales/_sections/estimates/')({ component: EstimatesPage })
