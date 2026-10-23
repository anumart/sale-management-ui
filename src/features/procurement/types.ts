export type PlanStatus = 'draft' | 'ordered' | 'archived'
export type CallStatus = 'not_called' | 'called' | 'confirmed'
export type PoStatus = 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'
/** sales_history = staff pick from past sales (scenario 2); customer_orders = confirmed email orders (scenario 1) */
export type PlanSource = 'sales_history' | 'customer_orders'

/** Shared category list for both raw materials and finished goods, told apart by `kind`. */
export type CategoryKind = 'raw_material' | 'finished_good'

export interface Category {
  id: string
  kind: CategoryKind
  name: string
  sortOrder: number
  /** Set on a child (e.g. a genus); top-level groups leave it empty. Max 2 levels, same `kind` as the parent. */
  parentCategoryId?: string
}

export interface FinishedGood {
  id: string
  /** Product code */
  sku: string
  name: string
  categoryId: string
  /** Selling unit, e.g. "ช่อ" */
  unit: string
  /** Standard list price per unit (฿). Customer/consignment prices live in the sales module. */
  standardPrice: number
  description?: string
  imageUrl?: string
  isActive: boolean
}

export type BomStatus = 'draft' | 'active' | 'archived'

export interface BomItem {
  rawMaterialId: string
  /** Quantity of the raw material's base unit needed per 1 unit of finished good */
  quantityPerUnit: number
}

/** One revision of a finished good's recipe. At most one version per finished good is `active`; production orders use it. */
export interface BomVersion {
  id: string
  finishedGoodId: string
  /** 1, 2, 3 … per finished good */
  version: number
  status: BomStatus
  /** Date the version became (or becomes) the active recipe */
  effectiveFrom: string
  note?: string
  createdAt: string
  items: BomItem[]
}

/** Flattened recipe line of the active BomVersion — what demand / allocation calculations consume. */
export interface BomEntry extends BomItem {
  finishedGoodId: string
}

/**
 * A purchasable material at SKU level — grade or size variants (e.g. long / short stem) are separate raw materials.
 * Units a supplier sells in are on SupplierRawMaterial; `unit` is the base unit used everywhere internally.
 */
/** A variety that groups SKU variants (sizes/grades). It has no stock or price of its own. */
export interface MaterialFamily {
  id: string
  /** Unique code, e.g. ANTH-CALISTO */
  code: string
  nameTh: string
  nameEn?: string
  categoryId: string
  color?: string
  isActive: boolean
}

export interface RawMaterial {
  id: string
  /** Material code */
  sku: string
  /** Optional: packaging and one-off items can stand alone */
  familyId?: string
  /** Thai name (primary display name) */
  nameTh: string
  /** English name */
  nameEn?: string
  /** The name customers call it by; searchable and shown on customer-facing documents */
  customerName?: string
  categoryId: string
  /** Base unit used throughout BOM / required / net-required calculations */
  unit: string
  /** Optional variant attributes shown next to the name */
  grade?: string
  size?: string
  color?: string
  description?: string
  barcode?: string
  /** Stock level (base unit) at which to reorder */
  reorderPoint?: number
  /** Reference cost per base unit; actual purchase prices live on SupplierRawMaterial */
  standardCost?: number
  /** Can be sold as-is (stock is deducted directly, no production order / BOM) */
  isSellable: boolean
  /** List price per base unit when sellable; customer/consignment prices belong to Sales */
  sellPrice?: number
  isActive: boolean
  /** Snapshot-friendly current stock on hand */
  onHandQuantity: number
}

/** individual = บุคคลธรรมดา (e.g. a farmer), company = นิติบุคคล */
export type SupplierType = 'individual' | 'company'

interface SupplierBase {
  id: string
  /** Display name, derived from the type-specific fields (see supplierDisplayName) */
  name: string
  phone: string
  email?: string
  /** The person themself (individual) or the company's contact person (company) */
  contactPerson: string
  /** Registered/head-office address */
  address: string
  /** National ID (individual) or corporate tax ID (company) — 13 digits */
  taxId?: string
  isActive: boolean
  createdAt: string
}

export interface IndividualSupplier extends SupplierBase {
  supplierType: 'individual'
  /** Honorific, e.g. "นาย", "นาง", "นางสาว" */
  title?: string
  firstName: string
  lastName: string
}

export interface CompanySupplier extends SupplierBase {
  supplierType: 'company'
  companyName: string
  /** 5-digit branch code, "00000" = head office */
  branchCode: string
}

export type Supplier = IndividualSupplier | CompanySupplier

/** A physical pickup location (garden/warehouse) belonging to a Supplier. Referenced by Vehicle Routes as a stop. Raw materials and prices belong to the Supplier (SupplierRawMaterial), not to the route. */
export interface SupplierRoute {
  id: string
  supplierId: string
  routeCode: string
  routeName: string
  /** Pickup address parts — `address` below is the full text composed from these (see formatRouteAddress) */
  addressLine: string
  subdistrict: string
  district: string
  province: string
  postalCode: string
  /** Full pickup address */
  address: string
  /** WGS84 coordinates for navigation — set together or not at all */
  latitude?: number
  longitude?: number
  /** Google Maps link; when empty, built from latitude/longitude (see routeMapUrl) */
  mapUrl?: string
  /** Landmarks / how to get into the garden */
  directions?: string
  contactPerson: string
  phone: string
  operatingHours?: string
  isActive: boolean
  createdAt: string
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
