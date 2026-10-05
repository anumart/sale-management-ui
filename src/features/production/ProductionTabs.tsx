import { IconBox, IconCalendar, IconFactory, IconWrench } from '@/components/icons'
import type { Section } from '@/components/layout/SectionLayout'

export type ProductionTab = 'planning' | 'orders' | 'finished-goods' | 'lines'

/** Top-bar sub menu of the production screens (rendered by the `/production/_sections` layout route). */
export const productionSections: Section<ProductionTab>[] = [
  { value: 'planning', label: 'วางแผนผลิต', icon: <IconCalendar />, path: '/production/planning' },
  { value: 'orders', label: 'ใบสั่งผลิต', icon: <IconFactory />, path: '/production/orders' },
  { value: 'finished-goods', label: 'สินค้าสำเร็จรูป', icon: <IconBox />, path: '/production/finished-goods' },
  { value: 'lines', label: 'ไลน์ผลิต', icon: <IconWrench />, path: '/production/lines' },
]
