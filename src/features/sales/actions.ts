import { finishedGoodById, rawMaterialById } from '@/features/procurement/mockData'
import { useProductionStore } from '@/features/production/store'
import { defaultLineFor } from '@/features/production/utils'
import type { CustomerOrder } from './types'

export interface ProductionForOrderResult {
  created: string[]
  failed: { finishedGoodId: string; reason: string }[]
}

/**
 * Scenario 1: one production order per order line still without one, held for this customer order. Runs on the
 * first available compatible line; a line whose raw material isn't in stock yet is reported back, not created.
 */
export function createProductionForOrder(order: CustomerOrder): ProductionForOrderResult {
  const result: ProductionForOrderResult = { created: [], failed: [] }
  for (const line of order.lines) {
    if (!line.finishedGoodId) continue
    const production = useProductionStore.getState()
    if (production.orders.some((p) => p.customerOrderId === order.id && p.finishedGoodId === line.finishedGoodId)) continue
    const productionLine = defaultLineFor(line.finishedGoodId, production.lines)
    if (!productionLine) {
      result.failed.push({ finishedGoodId: line.finishedGoodId, reason: 'ไม่มีไลน์ผลิตที่ว่าง' })
      continue
    }
    const res = production.createProductionOrder({
      finishedGoodId: line.finishedGoodId,
      quantity: line.quantity,
      productionLineId: productionLine.id,
      source: 'customer_order',
      customerOrderId: order.id,
      customerId: order.customerId,
    })
    if (res.ok) result.created.push(res.order.orderNumber)
    else {
      const short = res.shortages.map((s) => rawMaterialById(s.rawMaterialId)?.name).filter(Boolean).join(', ')
      result.failed.push({ finishedGoodId: line.finishedGoodId, reason: short ? `วัตถุดิบไม่พอ: ${short}` : res.error })
    }
  }
  return result
}

export function describeFailures(failed: ProductionForOrderResult['failed']) {
  return failed.map((f) => `${finishedGoodById(f.finishedGoodId)?.name}: ${f.reason}`).join(' · ')
}
