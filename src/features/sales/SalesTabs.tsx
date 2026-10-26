import { IconCalendar, IconChart, IconInbox, IconTrendUp, IconMapPin, IconReceipt, IconTruck, IconUsers } from '@/components/icons'
import type { Section } from '@/components/layout/SectionLayout'

export type SalesTab = 'orders' | 'routes' | 'estimates' | 'customers' | 'visits' | 'reports' | 'invoices' | 'performance'

/** Top-bar sub menu of the sales & distribution screens (rendered by the `/sales/_sections` layout route). */
export const salesSections: Section<SalesTab>[] = [
  { value: 'orders', label: 'คำสั่งซื้อ', icon: <IconInbox />, path: '/sales/orders' },
  { value: 'routes', label: 'สายฝากขาย', icon: <IconTruck />, path: '/sales/consignment-routes' },
  { value: 'estimates', label: 'ยอดประเมินลงร้าน', icon: <IconCalendar />, path: '/sales/estimates' },
  { value: 'visits', label: 'เข้าร้าน', icon: <IconMapPin />, path: '/sales/visits' },
  { value: 'reports', label: 'ยอดขายจากร้าน', icon: <IconChart />, path: '/sales/reports' },
  { value: 'invoices', label: 'ใบแจ้งหนี้', icon: <IconReceipt />, path: '/sales/invoices' },
  { value: 'performance', label: 'สรุปผลฝากขาย', icon: <IconTrendUp />, path: '/sales/performance' },
  { value: 'customers', label: 'ลูกค้า', icon: <IconUsers />, path: '/sales/customers' },
]
