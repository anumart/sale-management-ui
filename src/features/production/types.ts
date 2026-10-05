export type ProductionLineStatus = 'available' | 'in_use' | 'maintenance'
export type ProductionOrderStatus = 'draft' | 'confirmed' | 'in_production' | 'completed'
export type QcStatus = 'pending' | 'passed' | 'failed'
export type BatchGrade = 'A' | 'B' | 'C'
export type BatchStatus = 'available' | 'reserved' | 'depleted' | 'expired'
/** Why the order exists: a customer's emailed order (scenario 1) or a staff pick for stock / consignment (scenario 2). */
export type ProductionSource = 'customer_order' | 'manual'

/** A sail-through production line (FLOW 4-6 §17 ProductionLine) — capacity + which finished goods it can run. */
export interface ProductionLine {
  id: string
  code: string
  name: string
  capacityPerHour: number
  compatibleFinishedGoodIds: string[]
  status: ProductionLineStatus
}

/** Raw material reserved for (or issued to) one production order. */
export interface RmAllocation {
  rawMaterialId: string
  quantity: number
}

/** Current stock position for one raw material, tracked independently of the Procurement snapshot (§15 RawMaterialInventory). */
export interface RawMaterialStock {
  rawMaterialId: string
  /** Physical stock on hand */
  onHand: number
  /** Reserved for confirmed production orders that haven't started yet */
  allocated: number
}

/** A committed unit of work on the floor (FLOW 5-6, §18 ProductionOrder). */
export interface ProductionOrder {
  id: string
  orderNumber: string
  source: ProductionSource
  /** Set when source = customer_order; the finished goods are reserved for this order on completion. */
  customerOrderId: string | null
  /** Customer the goods are meant for — the order's customer, or the consignment shop staff picked (optional). */
  customerId: string | null
  finishedGoodId: string
  plannedQuantity: number
  actualQuantity: number | null
  productionLineId: string
  /** LOT number printed on the finished goods */
  batchNumber: string
  rmAllocations: RmAllocation[]
  /** Measured RM consumption, filled on completion — may differ from rmAllocations (waste/spillage). */
  actualRmUsed: RmAllocation[] | null
  status: ProductionOrderStatus
  yieldRate: number | null
  defectsFound: number | null
  qcStatus: QcStatus
  operatorName: string | null
  createdAt: string
  startDate: string | null
  endDate: string | null
}

/** Registered finished-goods LOT (FLOW 7, §19 FinishedGoodsBatch) — the traceable output of one ProductionOrder. */
export interface FinishedGoodsBatch {
  id: string
  /** LOT number */
  batchNumber: string
  finishedGoodId: string
  productionOrderId: string
  /** Produced quantity */
  quantity: number
  /** Still in our warehouse — drops when delivered to a customer or scanned into a consignment shop */
  remainingQuantity: number
  /** Customer order this LOT is held for (scenario 1); null = free stock */
  reservedForOrderId: string | null
  gradeLevel: BatchGrade
  yieldRate: number
  expirationDate: string
  barcode: string
  status: BatchStatus
  createdAt: string
}

export interface CreateProductionOrderInput {
  finishedGoodId: string
  quantity: number
  productionLineId: string
  source: ProductionSource
  customerOrderId: string | null
  customerId: string | null
}

/** One raw material that can't cover a requested production quantity. */
export interface RmShortage {
  rawMaterialId: string
  required: number
  available: number
}
