import type { DayOfWeek } from '@/features/logistics/types'

/** direct = buys outright and orders by email (scenario 1); consignment = shop we stock and bill after it sells (scenario 2) */
export type CustomerType = 'direct' | 'consignment'

/** How one direct customer's fixed attachment format maps onto our products — every customer has its own. */
export interface ImportFormatProfile {
  senderEmail: string
  fileType: 'xlsx' | 'csv' | 'pdf'
  /** 1-based row holding the column headers */
  headerRow: number
  productColumn: string
  quantityColumn: string
  /** Cell or column that carries the requested delivery date, e.g. "B2" */
  deliveryDateCell: string
  skuMap: { customerSku: string; finishedGoodId: string }[]
}

export interface Customer {
  id: string
  code: string
  name: string
  type: CustomerType
  contactPerson: string
  phone: string
  email: string
  address: string
  isActive: boolean
  /** Direct customers only */
  importProfile: ImportFormatProfile | null
  /** Consignment only: the retail chain this branch belongs to (Tops, Makro…), or "ร้านอิสระ" */
  chain: string | null
  /** Consignment only: share of the shelf price the shop keeps (GP %) — we bill the rest */
  gpPercent: number | null
  /** Overseas buyer (export): country, plus English name/address for export documents. Domestic customers leave these empty. */
  country?: string | null
  nameEn?: string | null
  addressEn?: string | null
}

export type EmailImportStatus = 'parsed' | 'needs_review' | 'failed'

/** One email attachment picked up by the morning cron job. */
export interface EmailImport {
  id: string
  receivedAt: string
  fromAddress: string
  subject: string
  attachmentName: string
  /** Matched by sender address; null when no customer profile matches */
  customerId: string | null
  status: EmailImportStatus
  orderId: string | null
  issues: string[]
}

/** How the order reached us: email/file import (draft until screened), a phone call, an export platform, or typed in by staff. */
export type OrderChannel = 'email' | 'phone' | 'platform' | 'manual'

export type CustomerOrderStatus = 'draft' | 'confirmed' | 'delivered' | 'cancelled'

export interface CustomerOrderLine {
  id: string
  /** Product code exactly as written in the customer's file */
  customerSku: string | null
  /** null until mapped — an unmapped line blocks confirmation */
  finishedGoodId: string | null
  quantity: number
}

export interface DeliveredLine {
  finishedGoodId: string
  quantity: number
  batchNumbers: string[]
}

/** Scenario 1: an order a direct customer sent by email. Production for it is derived from linked production orders. */
export interface CustomerOrder {
  id: string
  orderNumber: string
  customerId: string
  importId: string | null
  receivedAt: string
  requestedDeliveryDate: string
  channel: OrderChannel
  /** Marketplace the order came from (channel = platform) and its own order number — the pair is unique, so a re-keyed order is caught. */
  platformName: string | null
  platformOrderRef: string | null
  /** Open (draft/printed) delivery sheet carrying this order; cleared when the stop fails or the sheet is cancelled */
  deliverySheetId: string | null
  status: CustomerOrderStatus
  lines: CustomerOrderLine[]
  purchasePlanId: string | null
  confirmedAt: string | null
  deliveredAt: string | null
  deliveredLines: DeliveredLine[]
  invoiceId: string | null
}

/** What the order looks like from the floor: drafted → confirmed → in production → ready → delivered. */
export type CustomerOrderStage = 'needs_review' | 'to_confirm' | 'awaiting_production' | 'in_production' | 'ready' | 'delivered' | 'cancelled'

/** Goods of one product in one LOT sitting at a consignment shop. */
export interface ShopStockLine {
  finishedGoodId: string
  batchNumber: string
  barcode: string
  quantity: number
}

export type ShopStock = ShopStockLine & { customerId: string }

export type VisitStatus = 'draft' | 'signed' | 'cancelled'

export interface DeliveredVisitLine extends ShopStockLine {
  /** Warehouse LOT the goods were taken from */
  batchId: string
}

/**
 * Scenario 2: one driver visit to a consignment shop. It's a check sheet, not an order — the driver scans what's left,
 * takes back spoiled goods, and scans in today's LOTs. The shop signs to acknowledge the new balance.
 */
export interface ConsignmentVisit {
  id: string
  visitNumber: string
  customerId: string
  visitDate: string
  driverName: string
  /** Delivery sheet (consignment route) that created this visit; null for a visit started by hand */
  deliverySheetId?: string | null
  status: VisitStatus
  /** Shop balance at the start of the visit (snapshot) */
  previousBalance: ShopStockLine[]
  /** Good goods counted on the shelf — they stay at the shop, no stock movement */
  counted: ShopStockLine[]
  /** Taken back and written off — the company absorbs the loss */
  spoiled: ShopStockLine[]
  /** New LOTs scanned in today */
  delivered: DeliveredVisitLine[]
  signedBy: string | null
  signedAt: string | null
}

export type SalesReportStatus = 'pending' | 'confirmed' | 'invoiced'

export interface SalesReportLine {
  finishedGoodId: string
  /** Units the shop says it sold — totals per product, no LOT */
  reportedQuantity: number
  /** Units we agree to bill; defaults to the reported figure */
  confirmedQuantity: number | null
}

/** Scenario 2: the sales figures a consignment shop sends in, on its own schedule. */
export interface SalesReport {
  id: string
  reportNumber: string
  customerId: string
  receivedAt: string
  periodFrom: string
  periodTo: string
  lines: SalesReportLine[]
  status: SalesReportStatus
  note: string
  invoiceId: string | null
}

/**
 * One week of one product at one consignment shop, rolled up from signed visits and confirmed sales reports.
 * Mock history is seeded in this shape; live visits/reports are folded into it by `buildWeekCells`.
 */
export interface ConsignmentWeek {
  /** Monday of the week, yyyy-mm-dd */
  weekStart: string
  customerId: string
  finishedGoodId: string
  delivered: number
  spoiled: number
  /** null = the shop hasn't sent (or we haven't confirmed) a sales report covering this week */
  sold: number | null
}

export type InvoiceStatus = 'issued' | 'paid'
export type InvoiceSource = 'customer_order' | 'sales_report'

export interface InvoiceLine {
  finishedGoodId: string
  quantity: number
  /** Price is per product — LOTs of the same product cost the same */
  unitPrice: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  customerId: string
  source: InvoiceSource
  sourceId: string
  issuedAt: string
  dueDate: string
  lines: InvoiceLine[]
  status: InvoiceStatus
  paidAt: string | null
}

/** One shop on a consignment sales route. A shop may sit on several routes. */
export interface ConsignmentRouteStop {
  id: string
  sequence: number
  customerId: string
}

/** A consignment sales route (สายฝากขาย): the ordered shops a truck visits on the days it runs. Separate from the pickup VehicleRoute. */
export interface ConsignmentRoute {
  id: string
  code: string
  name: string
  /** Required, at least one day (all seven = daily) */
  daysOfWeek: DayOfWeek[]
  isActive: boolean
  stops: ConsignmentRouteStop[]
}

export type EstimateStatus = 'draft' | 'confirmed' | 'cancelled'

export interface ConsignmentEstimateLine {
  customerId: string
  finishedGoodId: string
  /** What the system proposed from recent sales and what is left on the shelf */
  suggestedQuantity: number
  /** What staff settled on */
  estimatedQuantity: number
}

/** How much finished goods to make for each shop of a route on one delivery date. Planning only — not an order and not a sale. */
export interface ConsignmentEstimate {
  id: string
  estimateNumber: string
  /** yyyy-mm-dd */
  deliveryDate: string
  consignmentRouteId: string
  status: EstimateStatus
  confirmedAt: string | null
  lines: ConsignmentEstimateLine[]
}
