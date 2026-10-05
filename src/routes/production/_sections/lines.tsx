import { createFileRoute } from '@tanstack/react-router'
import { LinesPage } from '@/features/production/LinesPage'

export const Route = createFileRoute('/production/_sections/lines')({ component: LinesPage })
