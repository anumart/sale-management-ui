import { createFileRoute } from '@tanstack/react-router'
import { RawMaterialsPage } from '@/features/catalog/RawMaterialsPage'

export const Route = createFileRoute('/catalog/_sections/raw-materials')({ component: RawMaterialsPage })
