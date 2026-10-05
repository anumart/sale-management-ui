import { createFileRoute } from '@tanstack/react-router'
import { VehicleRoutesPage } from '@/features/logistics/VehicleRoutesPage'

export const Route = createFileRoute('/logistics/_sections/routes/')({ component: VehicleRoutesPage })
