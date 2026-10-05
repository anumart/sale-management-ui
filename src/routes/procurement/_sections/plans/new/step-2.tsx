import { createFileRoute } from '@tanstack/react-router'
import { NewPlanStep2Page } from '@/features/procurement/NewPlanStep2Page'

export const Route = createFileRoute('/procurement/_sections/plans/new/step-2')({ component: NewPlanStep2Page })
