import { IconBuilding, IconList, IconReceipt } from '@/components/icons'
import type { Section } from '@/components/layout/SectionLayout'

export type ProcurementTab = 'plans' | 'purchase-orders' | 'suppliers'

/** Top-bar sub menu of the procurement screens (rendered by the `/procurement/_sections` layout route). */
export const procurementSections: Section<ProcurementTab>[] = [
  { value: 'plans', label: 'แผนจัดซื้อ', icon: <IconList />, path: '/procurement/plans' },
  { value: 'purchase-orders', label: 'ใบสั่งซื้อ', icon: <IconReceipt />, path: '/procurement/purchase-orders' },
  { value: 'suppliers', label: 'ซัพพลายเออร์', icon: <IconBuilding />, path: '/procurement/suppliers' },
]
