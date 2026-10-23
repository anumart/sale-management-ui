import type { PillTone } from '@/components/ui'
import { activeBomEntries } from '@/features/catalog/store'
import type { BatchGrade, BatchStatus, FinishedGoodsBatch, ProductionLine, ProductionLineStatus, ProductionOrderStatus, ProductionSource, QcStatus, RawMaterialStock, RmAllocation, RmShortage } from './types'

export const roundQty = (value: number) => Math.round(value * 100) / 100

export const lineStatusTone: Record<ProductionLineStatus, PillTone> = {
  available: 'success',
  in_use: 'info',
  maintenance: 'warning',
}
export const lineStatusLabel: Record<ProductionLineStatus, string> = {
  available: 'ว่าง',
  in_use: 'กำลังใช้งาน',
  maintenance: 'ซ่อมบำรุง',
}

export const orderStatusTone: Record<ProductionOrderStatus, PillTone> = {
  draft: 'gray',
  confirmed: 'info',
  in_production: 'warning',
  completed: 'success',
}
export const orderStatusLabel: Record<ProductionOrderStatus, string> = {
  draft: 'ร่าง',
  confirmed: 'ยืนยันแล้ว',
  in_production: 'กำลังผลิต',
  completed: 'เสร็จแล้ว',
}

export const sourceLabel: Record<ProductionSource, string> = {
  customer_order: 'คำสั่งซื้อลูกค้า',
  manual: 'พนักงานเลือกผลิต',
}

export const qcStatusTone: Record<QcStatus, PillTone> = {
  pending: 'neutral',
  passed: 'success',
  failed: 'danger',
}
export const qcStatusLabel: Record<QcStatus, string> = {
  pending: 'รอตรวจ',
  passed: 'ผ่าน',
  failed: 'ไม่ผ่าน',
}

export const batchGradeTone: Record<BatchGrade, PillTone> = { A: 'success', B: 'warning', C: 'danger' }

export const batchStatusTone: Record<BatchStatus, PillTone> = {
  available: 'success',
  reserved: 'info',
  depleted: 'neutral',
  expired: 'danger',
}
export const batchStatusLabel: Record<BatchStatus, string> = {
  available: 'พร้อมใช้',
  reserved: 'จองแล้ว',
  depleted: 'หมดแล้ว',
  expired: 'หมดอายุ',
}

/** Yield-based grade per FLOW 7: A 98-100%, B 95-97%, C below 95%. */
export function gradeForYield(yieldRate: number): BatchGrade {
  if (yieldRate >= 98) return 'A'
  if (yieldRate >= 95) return 'B'
  return 'C'
}

/** BOM x quantity for one finished good. */
export function rmRequirementFor(finishedGoodId: string, quantity: number): RmAllocation[] {
  return activeBomEntries().filter((b) => b.finishedGoodId === finishedGoodId).map((b) => ({ rawMaterialId: b.rawMaterialId, quantity: roundQty(b.quantityPerUnit * quantity) }))
}

/** Raw materials whose available stock (on hand - allocated) can't cover the requirement. */
export function rmShortages(requirement: RmAllocation[], rmStock: Record<string, RawMaterialStock>): RmShortage[] {
  return requirement
    .map((r) => {
      const stock = rmStock[r.rawMaterialId]
      return { rawMaterialId: r.rawMaterialId, required: r.quantity, available: stock ? roundQty(stock.onHand - stock.allocated) : 0 }
    })
    .filter((r) => r.required > r.available)
}

/** First available line that can run the product. */
export function defaultLineFor(finishedGoodId: string, lines: ProductionLine[]): ProductionLine | undefined {
  return lines.find((l) => l.status === 'available' && l.compatibleFinishedGoodIds.includes(finishedGoodId))
}

/** Stock position of one product across its LOTs in our warehouse. */
export function fgPosition(batches: FinishedGoodsBatch[], finishedGoodId: string) {
  const live = batches.filter((b) => b.finishedGoodId === finishedGoodId && b.remainingQuantity > 0 && b.status !== 'expired')
  const onHand = live.reduce((sum, b) => sum + b.remainingQuantity, 0)
  const reserved = live.filter((b) => b.reservedForOrderId).reduce((sum, b) => sum + b.remainingQuantity, 0)
  return { onHand, reserved, available: onHand - reserved, lots: live.length }
}
