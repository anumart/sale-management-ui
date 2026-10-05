import { IconList, IconMapPin, IconTruck } from '@/components/icons'
import type { Section } from '@/components/layout/SectionLayout'

export type LogisticsTab = 'vehicles' | 'routes' | 'run-sheets'

/** Top-bar sub menu of the logistics screens (rendered by the `/logistics/_sections` layout route). */
export const logisticsSections: Section<LogisticsTab>[] = [
  { value: 'run-sheets', label: 'ใบวิ่งรถ', icon: <IconList />, path: '/logistics/run-sheets' },
  { value: 'vehicles', label: 'รถ', icon: <IconTruck />, path: '/logistics/vehicles' },
  { value: 'routes', label: 'เส้นทางรถ', icon: <IconMapPin />, path: '/logistics/routes' },
]
