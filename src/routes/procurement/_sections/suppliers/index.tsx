import { createFileRoute } from '@tanstack/react-router'
import { SuppliersListPage } from '@/features/procurement/SuppliersListPage'

export const Route = createFileRoute('/procurement/_sections/suppliers/')({ component: SuppliersListPage })
