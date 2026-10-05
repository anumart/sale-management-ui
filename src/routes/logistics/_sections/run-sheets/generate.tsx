import { createFileRoute } from '@tanstack/react-router'
import { GenerateRunSheetPage } from '@/features/logistics/GenerateRunSheetPage'

export const Route = createFileRoute('/logistics/_sections/run-sheets/generate')({ component: GenerateRunSheetPage })
