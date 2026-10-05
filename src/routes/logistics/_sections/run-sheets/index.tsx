import { createFileRoute } from '@tanstack/react-router'
import { RunSheetsListPage } from '@/features/logistics/RunSheetsListPage'

export const Route = createFileRoute('/logistics/_sections/run-sheets/')({ component: RunSheetsListPage })
