import { createFileRoute } from '@tanstack/react-router'
import { FinishedGoodsCatalogPage } from '@/features/catalog/FinishedGoodsCatalogPage'

export const Route = createFileRoute('/catalog/_sections/finished-goods/')({ component: FinishedGoodsCatalogPage })
