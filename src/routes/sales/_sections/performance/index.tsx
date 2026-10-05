import { createFileRoute } from '@tanstack/react-router'
import { ConsignmentPerformancePage } from '@/features/sales/ConsignmentPerformancePage'

export const Route = createFileRoute('/sales/_sections/performance/')({ component: ConsignmentPerformancePage })
