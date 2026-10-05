import { createFileRoute } from '@tanstack/react-router'
import { NewPlanStep1Page } from '@/features/procurement/NewPlanStep1Page'

export const Route = createFileRoute('/procurement/_sections/plans/new/step-1')({ component: NewPlanStep1Page })
