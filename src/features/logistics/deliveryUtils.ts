import type { PillTone } from '@/components/ui'
import type { ConsignmentVisit, CustomerOrder } from '@/features/sales/types'
import type { DeliverySheet, DeliverySheetStatus, DeliverySheetType, DeliveryStop, DeliveryStopStatus } from './types'

export const sheetTypeLabel: Record<DeliverySheetType, string> = { consignment_route: 'สายฝากขาย', direct: 'ส่งตรง' }
export const sheetTypeTone: Record<DeliverySheetType, PillTone> = { consignment_route: 'accent', direct: 'primary' }

export const sheetStatusLabel: Record<DeliverySheetStatus, string> = { draft: 'ร่าง', printed: 'พิมพ์แล้ว', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก' }
export const sheetStatusTone: Record<DeliverySheetStatus, PillTone> = { draft: 'gray', printed: 'info', completed: 'success', cancelled: 'neutral' }

export const stopStatusLabel: Record<DeliveryStopStatus, string> = { pending: 'รอส่ง', done: 'ส่งแล้ว', failed: 'ส่งไม่ได้' }
export const stopStatusTone: Record<DeliveryStopStatus, PillTone> = { pending: 'warning', done: 'success', failed: 'danger' }

/** A stop is done once its order is delivered or its visit is signed — nothing is stored twice. */
export function stopStatus(stop: DeliveryStop, orders: CustomerOrder[], visits: ConsignmentVisit[]): DeliveryStopStatus {
  if (stop.failReason !== null) return 'failed'
  if (stop.customerOrderId) return orders.find((o) => o.id === stop.customerOrderId)?.status === 'delivered' ? 'done' : 'pending'
  return visits.find((v) => v.id === stop.visitId)?.status === 'signed' ? 'done' : 'pending'
}

/** Completed is automatic: every stop done or failed (and, on a route sheet, the leftovers recorded). */
export function sheetStatus(sheet: DeliverySheet, orders: CustomerOrder[], visits: ConsignmentVisit[]): DeliverySheetStatus {
  if (sheet.status !== 'printed') return sheet.status
  const resolved = sheet.stops.every((s) => stopStatus(s, orders, visits) !== 'pending')
  const returned = sheet.sheetType === 'direct' || sheet.returnRecordedAt !== null
  return resolved && returned ? 'completed' : 'printed'
}

/** Units of one product left at the shops of a route sheet, from the LOTs scanned in on its visits. */
export function deliveredAtShops(sheet: DeliverySheet, visits: ConsignmentVisit[], finishedGoodId: string) {
  return sheet.stops
    .map((s) => visits.find((v) => v.id === s.visitId))
    .filter((v): v is ConsignmentVisit => !!v && v.status !== 'cancelled')
    .reduce((sum, v) => sum + v.delivered.filter((l) => l.finishedGoodId === finishedGoodId).reduce((s2, l) => s2 + l.quantity, 0), 0)
}

/** Loaded − left at shops − returned; anything but 0 is worth a look (a warning, never a block). */
export const loadVariance = (sheet: DeliverySheet, visits: ConsignmentVisit[], line: DeliverySheet['loadLines'][number]) =>
  line.loadedQuantity - deliveredAtShops(sheet, visits, line.finishedGoodId) - (line.returnedQuantity ?? 0)
