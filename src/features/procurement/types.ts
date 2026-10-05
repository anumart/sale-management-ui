export type PlanStatus = 'draft' | 'ordered' | 'archived'
export type CallStatus = 'not_called' | 'called' | 'confirmed'
export type PoStatus = 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'
/** sales_history = staff pick from past sales (scenario 2); customer_orders = confirmed email orders (scenario 1) */
export type PlanSource = 'sales_history' | 'customer_orders'

export interface FinishedGood {
  id: string
  name: string
  unit: string
}

export interface BomEntry {
  finishedGoodId: string
  rawMaterialId: string
  /** Quantity of the raw material's base unit needed per 1 unit of finished good */
  quantityPerUnit: number
}

export interface RawMaterial {
  id: string
  name: string
  /** Base unit used throughout BOM / required / net-required calculations */
  unit: string
  /** Snapshot-friendly current stock on hand */
  onHandQuantity: number
}

export interface Supplier {
  id: string
  name: string
  phone: string
  email?: string
  contactPerson: string
  /** Registered/head-office address */
  address: string
  isActive: boolean
  createdAt: string
}

/** One raw material offered for pickup at a specific SupplierRoute (garden/warehouse). */
export interface SupplierRouteRawMaterial {
  rawMaterialName: string
  unit: string
  pricePerUnit: number
  availableStock: number
}

/** A physical pickup location (garden/warehouse) belonging to a Supplier. Referenced by Vehicle Routes as a stop. */
export interface SupplierRoute {
  id: string
  supplierId: string
  routeCode: string
  routeName: string
  province: string
  /** Full pickup address */
  address: string
  contactPerson: string
  phone: string
  operatingHours?: string
  isActive: boolean
  createdAt: string
  rawMaterials: SupplierRouteRawMaterial[]
}

/** A supplier's offer for one raw material — units can differ from the RM base unit. */
export interface SupplierRawMaterial {
  supplierId: string
  rawMaterialId: string
  /** Unit the supplier sells in, e.g. "sack", "roll" — may differ from RawMaterial.unit */
  supplierUnit: string
  /** How many RawMaterial base units are in 1 supplierUnit */
  unitsPerSupplierUnit: number
  /** Price per 1 supplierUnit */
  pricePerSupplierUnit: number
}

export interface SalesHistoryRow {
  finishedGoodId: string
  /** Units sold in the source month */
  quantitySold: number
  /** % change vs the prior month */
  trendPct: number
}

export interface PlanLine {
  finishedGoodId: string
  /** Demand before adjustment: units sold in the source period, or units ordered by the selected customer orders */
  baseSalesQty: number
  /** % adjustment applied on top of baseSalesQty */
  adjustmentPct: number
  /** Final planned production quantity: round(baseSalesQty * (1 + adjustmentPct/100)) */
  plannedQuantity: number
}

/** One supplier's order line against a raw material inside a plan. */
export interface PlanRawMaterialSupplier {
  supplierId: string
  callStatus: CallStatus
  /** Quantity (in supplierUnit) the supplier confirmed they can provide */
  confirmedQuantity: number | null
  /** Quantity (in supplierUnit) we decided to actually order */
  orderedQuantity: number | null
}

export interface PlanRawMaterial {
  rawMaterialId: string
  /** Total required, computed from BOM x planned quantities */
  requiredQuantity: number
  /** Stock on hand snapshot taken when the plan was created */
  onHandQuantitySnapshot: number
  /** requiredQuantity - onHandQuantitySnapshot, floored at 0 */
  netRequiredQuantity: number
  suppliers: PlanRawMaterialSupplier[]
}

export interface PurchasePlan {
  id: string
  name: string
  status: PlanStatus
  sourceMonth: number
  sourceYear: number
  createdByName: string
  createdAt: string
  /** Missing on plans created before demand sources existed — treat as sales_history */
  source?: PlanSource
  customerOrderIds?: string[]
  lines: PlanLine[]
  rawMaterials: PlanRawMaterial[]
}

export interface PurchaseOrderLine {
  rawMaterialId: string
  /** Quantity in the supplier's unit */
  quantity: number
  pricePerUnit: number
  total: number
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  planId: string
  supplierId: string
  status: PoStatus
  totalAmount: number
  expectedDeliveryDate: string
  createdAt: string
  lines: PurchaseOrderLine[]
}
