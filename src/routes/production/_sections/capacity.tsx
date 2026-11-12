import { createFileRoute } from '@tanstack/react-router'
import { CapacityPage } from '@/features/production/CapacityPage'

export const Route = createFileRoute('/production/_sections/capacity')({ component: CapacityPage })
