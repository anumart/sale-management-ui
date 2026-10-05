import { createFileRoute } from '@tanstack/react-router'
import { PlansListPage } from '@/features/procurement/PlansListPage'

export const Route = createFileRoute('/procurement/_sections/plans/')({ component: PlansListPage })
