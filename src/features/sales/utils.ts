import type { PillTone } from '@/components/ui'
import type { FinishedGoodsBatch, ProductionOrder } from '@/features/production/types'
import type {
  ConsignmentVisit,
  CustomerOrder,
  CustomerOrderStage,
  CustomerType,
  EmailImportStatus,
  Invoice,
  InvoiceStatus,
  OrderChannel,
  SalesReport,
  SalesReportStatus,
  ShopStockLine,
  VisitStatus,
} from './types'

const baht = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 })
export const formatBaht = (value: number) => baht.format(value)

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })

/** yyyy-mm-dd for <input type="date"> */
export const toDateInput = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** <input type="date"> value at a local time of day (a bare yyyy-mm-dd would parse as UTC midnight) */
export const fromDateInput = (value: string, time = '00:00') => new Date(`${value}T${time}`)

export const customerTypeLabel: Record<CustomerType, string> = { direct: 'ขายขาด', consignment: 'ฝากขาย' }
export const customerTypeTone: Record<CustomerType, PillTone> = { direct: 'primary', consignment: 'accent' }

export const channelLabel: Record<OrderChannel, string> = { email: 'อีเมล', phone: 'โทรศัพท์', platform: 'Platform', manual: 'คีย์เอง' }
export const channelTone: Record<OrderChannel, PillTone> = { email: 'info', phone: 'accent', platform: 'primary', manual: 'neutral' }

/** Export goods are handed over at the airport, not at the buyer's address. */
export const EXPORT_DROP_POINT = 'สนามบินสุวรรณภูมิ — อาคารคลังสินค้า (ส่งออก)'
export const isExportCustomer = (customer: { country?: string | null } | undefined) => !!customer?.country

export const importStatusLabel: Record<EmailImportStatus, string> = { parsed: 'อ่านสำเร็จ', needs_review: 'รอตรวจสอบ', failed: 'อ่านไม่สำเร็จ' }
export const importStatusTone: Record<EmailImportStatus, PillTone> = { parsed: 'success', needs_review: 'warning', failed: 'danger' }

export const orderStageLabel: Record<CustomerOrderStage, string> = {
  needs_review: 'รอตรวจสอบ',
  to_confirm: 'รอยืนยัน',
  awaiting_production: 'รอผลิต',
  in_production: 'กำลังผลิต',
  ready: 'พร้อมส่ง',
  delivered: 'ส่งแล้ว',
  cancelled: 'ยกเลิก',
}
export const orderStageTone: Record<CustomerOrderStage, PillTone> = {
  needs_review: 'danger',
  to_confirm: 'warning',
  awaiting_production: 'neutral',
  in_production: 'info',
  ready: 'accent',
  delivered: 'success',
  cancelled: 'neutral',
}

export const visitStatusLabel: Record<VisitStatus, string> = { draft: 'ร่าง', signed: 'ร้านลงชื่อแล้ว', cancelled: 'ยกเลิก' }
export const visitStatusTone: Record<VisitStatus, PillTone> = { draft: 'gray', signed: 'success', cancelled: 'neutral' }

export const reportStatusLabel: Record<SalesReportStatus, string> = { pending: 'รอตรวจ', confirmed: 'ยืนยันแล้ว', invoiced: 'ออกใบแจ้งหนี้แล้ว' }
export const reportStatusTone: Record<SalesReportStatus, PillTone> = { pending: 'warning', confirmed: 'info', invoiced: 'success' }

export const invoiceStatusLabel: Record<InvoiceStatus, string> = { issued: 'รอชำระ', paid: 'ชำระแล้ว' }
export const invoiceStatusTone: Record<InvoiceStatus, PillTone> = { issued: 'warning', paid: 'success' }

export const invoiceTotal = (invoice: Pick<Invoice, 'lines'>) => invoice.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)

const sumBy = <T,>(rows: T[], pick: (row: T) => number) => rows.reduce((sum, r) => sum + pick(r), 0)

/** Where one order line stands on the floor: production orders created for it, and goods reserved for it. */
export function orderLineProgress(order: CustomerOrder, finishedGoodId: string | null, productionOrders: ProductionOrder[], batches: FinishedGoodsBatch[]) {
  const linked = productionOrders.filter((p) => p.customerOrderId === order.id && p.finishedGoodId === finishedGoodId)
  const lots = batches.filter((b) => b.reservedForOrderId === order.id && b.finishedGoodId === finishedGoodId)
  return {
    productionOrders: linked,
    planned: sumBy(linked, (p) => p.plannedQuantity),
    produced: sumBy(lots, (b) => b.quantity),
    /** Still in the warehouse, waiting to go out */
    onHand: sumBy(lots, (b) => b.remainingQuantity),
    lots,
    done: linked.length > 0 && linked.every((p) => p.status === 'completed'),
  }
}

export function orderStage(order: CustomerOrder, productionOrders: ProductionOrder[]): CustomerOrderStage {
  if (order.status === 'cancelled') return 'cancelled'
  if (order.status === 'delivered') return 'delivered'
  if (order.status === 'draft') return order.lines.some((l) => !l.finishedGoodId || l.quantity <= 0) ? 'needs_review' : 'to_confirm'
  const linked = productionOrders.filter((p) => p.customerOrderId === order.id)
  if (linked.length === 0) return 'awaiting_production'
  const allLinesCovered = order.lines.every((l) => linked.some((p) => p.finishedGoodId === l.finishedGoodId))
  return allLinesCovered && linked.every((p) => p.status === 'completed') ? 'ready' : 'in_production'
}

const keyOf = (l: Pick<ShopStockLine, 'batchNumber'>) => l.batchNumber
const qtyIn = (lines: ShopStockLine[], batchNumber: string) => sumBy(lines.filter((l) => keyOf(l) === batchNumber), (l) => l.quantity)

/**
 * Units that left the shelf between the last visit and this one: last balance - still on the shelf - spoiled.
 * The shop doesn't tell us which LOT it sold, so the figure is rolled up per product.
 */
export function visitSoldByProduct(visit: ConsignmentVisit): Map<string, number> {
  const sold = new Map<string, number>()
  for (const line of visit.previousBalance) {
    const qty = line.quantity - qtyIn(visit.counted, line.batchNumber) - qtyIn(visit.spoiled, line.batchNumber)
    sold.set(line.finishedGoodId, (sold.get(line.finishedGoodId) ?? 0) + qty)
  }
  return sold
}

export interface ReconcileRow {
  finishedGoodId: string
  expected: number
  reported: number
  confirmed: number | null
  diff: number
  diffPct: number
  withinTolerance: boolean
}

/** Expected sales from the signed visits inside the report period, side by side with what the shop reported. */
export function reconcileReport(report: SalesReport, visits: ConsignmentVisit[], tolerancePct: number): ReconcileRow[] {
  const from = new Date(report.periodFrom).getTime()
  const to = new Date(report.periodTo).getTime()
  const expected = new Map<string, number>()
  for (const v of visits) {
    const t = new Date(v.visitDate).getTime()
    if (v.customerId !== report.customerId || v.status !== 'signed' || t <= from || t > to) continue
    for (const [fg, qty] of visitSoldByProduct(v)) expected.set(fg, (expected.get(fg) ?? 0) + qty)
  }
  const products = new Set([...expected.keys(), ...report.lines.map((l) => l.finishedGoodId)])
  return [...products].map((finishedGoodId) => {
    const line = report.lines.find((l) => l.finishedGoodId === finishedGoodId)
    const exp = expected.get(finishedGoodId) ?? 0
    const reported = line?.reportedQuantity ?? 0
    const diff = reported - exp
    const diffPct = exp > 0 ? (diff / exp) * 100 : reported > 0 ? 100 : 0
    return { finishedGoodId, expected: exp, reported, confirmed: line?.confirmedQuantity ?? null, diff, diffPct, withinTolerance: Math.abs(diffPct) <= tolerancePct }
  })
}

export interface ShopLedgerRow {
  finishedGoodId: string
  delivered: number
  spoiled: number
  balance: number
  /** delivered - spoiled - balance */
  expectedSold: number
  reported: number
}

/** Running consignment position of one shop, per product: expected sales = delivered to date - spoiled - current balance. */
export function shopLedger(customerId: string, visits: ConsignmentVisit[], stock: ShopStockLine[], reports: SalesReport[]): ShopLedgerRow[] {
  const signed = visits.filter((v) => v.customerId === customerId && v.status === 'signed')
  const rows = new Map<string, ShopLedgerRow>()
  const row = (fg: string) => {
    if (!rows.has(fg)) rows.set(fg, { finishedGoodId: fg, delivered: 0, spoiled: 0, balance: 0, expectedSold: 0, reported: 0 })
    return rows.get(fg)!
  }
  for (const v of signed) {
    v.delivered.forEach((l) => (row(l.finishedGoodId).delivered += l.quantity))
    v.spoiled.forEach((l) => (row(l.finishedGoodId).spoiled += l.quantity))
  }
  stock.forEach((l) => (row(l.finishedGoodId).balance += l.quantity))
  reports
    .filter((r) => r.customerId === customerId)
    .forEach((r) => r.lines.forEach((l) => (row(l.finishedGoodId).reported += l.confirmedQuantity ?? l.reportedQuantity)))
  return [...rows.values()].map((r) => ({ ...r, expectedSold: r.delivered - r.spoiled - r.balance }))
}
