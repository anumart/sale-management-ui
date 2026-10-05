import { create } from 'zustand'
import { initialBatches, initialOrders, initialRmStock, productionLines } from './mockData'
import type { CreateProductionOrderInput, FinishedGoodsBatch, ProductionLine, ProductionOrder, ProductionOrderStatus, QcStatus, RawMaterialStock, RmAllocation, RmShortage } from './types'
import { gradeForYield, rmRequirementFor, rmShortages, roundQty } from './utils'

type CreateResult = { ok: true; order: ProductionOrder } | { ok: false; shortages: RmShortage[]; error: string }

interface ProductionState {
  lines: ProductionLine[]
  rmStock: Record<string, RawMaterialStock>
  orders: ProductionOrder[]
  batches: FinishedGoodsBatch[]

  toggleLineStatus: (lineId: string) => void
  /**
   * FLOW 5: commit one production order and reserve its raw materials. Used for both scenarios — an order line from a
   * customer's email (source = customer_order) or a product staff picked from sales history (source = manual).
   */
  createProductionOrder: (input: CreateProductionOrderInput) => CreateResult
  /** FLOW 6 step 1: issue the allocated RM to the floor and start the clock. */
  startProduction: (orderId: string, operatorName: string) => void
  /** FLOW 6 step 2: record QC/defect progress without closing the order. */
  updateMonitoring: (orderId: string, patch: { qcStatus?: QcStatus; defectsFound?: number }) => void
  /** FLOW 6 step 3 + FLOW 7: reconcile actual RM usage, compute yield, and register the finished-goods LOT. */
  completeProduction: (orderId: string, payload: { actualQuantity: number; defectsFound: number; actualRmUsed: RmAllocation[] }) => void
  /** FLOW 8: take finished goods out of a LOT (delivered to a customer, or scanned into a consignment shop). */
  issueFromBatch: (batchId: string, quantity: number) => boolean
}

/** In-memory mock "backend" for production & finished goods — no API calls, session-only state. */
export const useProductionStore = create<ProductionState>((set, get) => ({
  lines: productionLines,
  rmStock: initialRmStock,
  orders: initialOrders,
  batches: initialBatches,

  toggleLineStatus: (lineId) =>
    set({
      lines: get().lines.map((l) => (l.id === lineId ? { ...l, status: l.status === 'maintenance' ? 'available' : 'maintenance' } : l)),
    }),

  createProductionOrder: (input) => {
    const { rmStock, lines, orders } = get()
    const line = lines.find((l) => l.id === input.productionLineId)
    if (!line || line.status !== 'available' || !line.compatibleFinishedGoodIds.includes(input.finishedGoodId)) {
      return { ok: false, shortages: [], error: 'ไลน์ผลิตที่เลือกใช้ผลิตสินค้านี้ไม่ได้' }
    }
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
      return { ok: false, shortages: [], error: 'จำนวนต้องมากกว่า 0' }
    }

    const rmAllocations = rmRequirementFor(input.finishedGoodId, input.quantity)
    const shortages = rmShortages(rmAllocations, rmStock)
    if (shortages.length > 0) return { ok: false, shortages, error: 'วัตถุดิบในสต็อกไม่พอ' }

    const year = new Date().getFullYear()
    const seq = 101 + orders.length
    const order: ProductionOrder = {
      id: `prod-${Date.now()}-${input.finishedGoodId}`,
      orderNumber: `PROD-${year}-${String(seq).padStart(4, '0')}`,
      source: input.source,
      customerOrderId: input.customerOrderId,
      customerId: input.customerId,
      finishedGoodId: input.finishedGoodId,
      plannedQuantity: input.quantity,
      actualQuantity: null,
      productionLineId: line.id,
      batchNumber: `BH-${year}-${String(seq).padStart(4, '0')}-A`,
      rmAllocations,
      actualRmUsed: null,
      status: 'confirmed',
      yieldRate: null,
      defectsFound: null,
      qcStatus: 'pending',
      operatorName: null,
      createdAt: new Date().toISOString(),
      startDate: null,
      endDate: null,
    }

    const nextStock = { ...rmStock }
    for (const alloc of rmAllocations) {
      const stock = nextStock[alloc.rawMaterialId]
      if (stock) nextStock[alloc.rawMaterialId] = { ...stock, allocated: roundQty(stock.allocated + alloc.quantity) }
    }

    set({ orders: [order, ...orders], rmStock: nextStock })
    return { ok: true, order }
  },

  startProduction: (orderId, operatorName) => {
    const order = get().orders.find((o) => o.id === orderId)
    if (!order || order.status !== 'confirmed') return

    const rmStock = { ...get().rmStock }
    for (const alloc of order.rmAllocations) {
      const stock = rmStock[alloc.rawMaterialId]
      if (stock) rmStock[alloc.rawMaterialId] = { ...stock, onHand: roundQty(stock.onHand - alloc.quantity), allocated: roundQty(stock.allocated - alloc.quantity) }
    }

    set({
      rmStock,
      orders: get().orders.map((o) =>
        o.id === orderId ? { ...o, status: 'in_production' as ProductionOrderStatus, startDate: new Date().toISOString(), operatorName } : o,
      ),
    })
  },

  updateMonitoring: (orderId, patch) =>
    set({
      orders: get().orders.map((o) => (o.id === orderId && o.status === 'in_production' ? { ...o, ...patch } : o)),
    }),

  completeProduction: (orderId, payload) => {
    const order = get().orders.find((o) => o.id === orderId)
    if (!order || order.status !== 'in_production') return

    const rmStock = { ...get().rmStock }
    for (const actual of payload.actualRmUsed) {
      const allocated = order.rmAllocations.find((a) => a.rawMaterialId === actual.rawMaterialId)?.quantity ?? 0
      const variance = actual.quantity - allocated
      const stock = rmStock[actual.rawMaterialId]
      if (stock && variance !== 0) rmStock[actual.rawMaterialId] = { ...stock, onHand: roundQty(stock.onHand - variance) }
    }

    const yieldRate = Math.round((payload.actualQuantity / order.plannedQuantity) * 100)
    const qcStatus: QcStatus = order.qcStatus === 'pending' ? (payload.defectsFound > 0 ? 'failed' : 'passed') : order.qcStatus
    const completedOrder: ProductionOrder = {
      ...order,
      actualQuantity: payload.actualQuantity,
      defectsFound: payload.defectsFound,
      actualRmUsed: payload.actualRmUsed,
      status: 'completed',
      yieldRate,
      qcStatus,
      endDate: new Date().toISOString(),
    }

    const grade = gradeForYield(yieldRate)
    const batch: FinishedGoodsBatch = {
      id: `batch-${Date.now()}`,
      batchNumber: order.batchNumber,
      finishedGoodId: order.finishedGoodId,
      productionOrderId: order.id,
      quantity: payload.actualQuantity,
      remainingQuantity: payload.actualQuantity,
      reservedForOrderId: order.customerOrderId,
      gradeLevel: grade,
      yieldRate,
      expirationDate: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      barcode: order.batchNumber.replace(/^BH-/, 'FG-').replace(/-[A-Z]$/, `-${grade}`),
      status: payload.actualQuantity === 0 ? 'depleted' : order.customerOrderId ? 'reserved' : 'available',
      createdAt: new Date().toISOString(),
    }

    set({
      rmStock,
      orders: get().orders.map((o) => (o.id === orderId ? completedOrder : o)),
      batches: [batch, ...get().batches],
    })
  },

  issueFromBatch: (batchId, quantity) => {
    const batch = get().batches.find((b) => b.id === batchId)
    if (!batch || quantity <= 0 || quantity > batch.remainingQuantity) return false
    const remainingQuantity = batch.remainingQuantity - quantity
    set({
      batches: get().batches.map((b) => (b.id === batchId ? { ...b, remainingQuantity, status: remainingQuantity === 0 ? 'depleted' : b.status } : b)),
    })
    return true
  },
}))

export function orderById(orderId: string) {
  return useProductionStore.getState().orders.find((o) => o.id === orderId)
}

export function lineById(lineId: string | null) {
  if (!lineId) return undefined
  return useProductionStore.getState().lines.find((l) => l.id === lineId)
}
