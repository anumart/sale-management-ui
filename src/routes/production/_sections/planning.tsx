import { createFileRoute } from '@tanstack/react-router'
import { PlanningPage } from '@/features/production/PlanningPage'

export const Route = createFileRoute('/production/_sections/planning')({ component: PlanningPage })
