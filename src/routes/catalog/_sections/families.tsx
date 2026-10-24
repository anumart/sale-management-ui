import { createFileRoute } from '@tanstack/react-router'
import { FamiliesPage } from '@/features/catalog/FamiliesPage'

export const Route = createFileRoute('/catalog/_sections/families')({ component: FamiliesPage })
