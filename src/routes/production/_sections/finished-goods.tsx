import { createFileRoute } from '@tanstack/react-router'
import { FinishedGoodsPage } from '@/features/production/FinishedGoodsPage'

export const Route = createFileRoute('/production/_sections/finished-goods')({ component: FinishedGoodsPage })
