import { createFileRoute } from '@tanstack/react-router'
import { VehiclesListPage } from '@/features/logistics/VehiclesListPage'

export const Route = createFileRoute('/logistics/_sections/vehicles/')({ component: VehiclesListPage })
