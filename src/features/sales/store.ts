import { create } from 'zustand'
import { useProductionStore } from '@/features/production/store'
import { initialConsignmentWeeks, initialCustomerOrders, initialCustomers, initialImports, initialInvoices, initialSalesReports, initialShopStock, initialVisits, productPrices } from './mockData'
import type {
  ConsignmentVisit,
  ConsignmentWeek,
  Customer,
  CustomerOrder,
  CustomerOrderLine,
  DeliveredLine,
  EmailImport,
  ImportFormatProfile,
  Invoice,
  InvoiceLine,
  InvoiceSource,
  OrderChannel,
  SalesReport,
  SalesReportLine,
  ShopStock,
  ShopStockLine,
} from './types'
import { orderLineProgress } from './utils'

export type ScanMode = 'counted' | 'spoiled' | 'delivered'
type Result = { ok: true; message: string } | { ok: false; message: string }

export interface CreateOrderInput {
  customerId: string
  channel: Exclude<OrderChannel, 'email'>
  platformName: string
  platformOrderRef: string
  /** ISO date-time */
  requestedDeliveryDate: string
  lines: { finishedGoodId: string; quantity: number }[]
}

interface SalesState {
  customers: Customer[]
  imports: EmailImport[]
  orders: CustomerOrder[]
  shopStock: ShopStock[]
  visits: ConsignmentVisit[]
  reports: SalesReport[]
  invoices: Invoice[]
  /** Seeded weekly consignment history (read-only); live visits and reports are added on top in the performance report */
  consignmentWeeks: ConsignmentWeek[]
  /** Allowed gap (%) between expected and reported sales before a report is flagged. Provisional — business rule not agreed yet. */
  tolerancePct: number

  // Scenario 1 — email orders
  /** Simulates the 06:00 cron job: reads the inbox and parses attachments with each customer's format. */
  runEmailImport: () => EmailImport
  createOrderFromImport: (importId: string, customerId: string) => string | null
  updateOrderLine: (orderId: string, lineId: string, patch: Partial<CustomerOrderLine>) => void
  addOrderLine: (orderId: string) => void
  removeOrderLine: (orderId: string, lineId: string) => void
  confirmOrder: (orderId: string) => Result
  cancelOrder: (orderId: string) => void
  linkOrdersToPlan: (orderIds: string[], planId: string) => void
  deliverOrder: (orderId: string) => Result
  issueOrderInvoice: (orderId: string) => string | null
  saveImportProfile: (customerId: string, profile: ImportFormatProfile) => void
  /** Phone / platform / hand-keyed order: staff already know what it says, so it is created confirmed. */
  createOrder: (input: CreateOrderInput) => { ok: true; id: string } | { ok: false; message: string }
  /** Marks (or clears) the open delivery sheet carrying these orders */
  setOrdersSheet: (orderIds: string[], sheetId: string | null) => void

  // Scenario 2 — consignment
  createVisit: (input: { customerId: string; visitDate: string; driverName: string; deliverySheetId?: string }) => { ok: true; id: string } | { ok: false; message: string }
  scanVisit: (visitId: string, mode: ScanMode, code: string, quantity: number) => Result
  cancelVisit: (visitId: string) => void
  setVisitLineQty: (visitId: string, mode: ScanMode, batchNumber: string, quantity: number) => void
  signVisit: (visitId: string, signedBy: string) => Result
  addSalesReport: (input: { customerId: string; periodFrom: string; periodTo: string; lines: SalesReportLine[] }) => string
  setConfirmedQty: (reportId: string, finishedGoodId: string, quantity: number) => void
  setReportNote: (reportId: string, note: string) => void
  confirmReport: (reportId: string) => void
  issueReportInvoice: (reportId: string) => string | null
  setTolerancePct: (pct: number) => void

  markInvoicePaid: (invoiceId: string) => void
}

const year = () => new Date().getFullYear()
const seq = (prefix: string, n: number) => `${prefix}-${year()}-${String(n).padStart(4, '0')}`
const matches = (code: string) => (l: { barcode: string; batchNumber: string }) => l.barcode === code || l.batchNumber === code

/** Adds `quantity` to the LOT's line, creating it if needed; drops lines that reach 0. */
function bump<T extends ShopStockLine>(lines: T[], template: T, quantity: number): T[] {
  const existing = lines.find((l) => l.batchNumber === template.batchNumber)
  const next = existing ? lines.map((l) => (l === existing ? { ...l, quantity: l.quantity + quantity } : l)) : [...lines, { ...template, quantity }]
  return next.filter((l) => l.quantity > 0)
}

const demoPicks: { customerId: string; file: string; subject: string; lines: { sku: string; qty: number }[] }[] = [
  { customerId: 'cus-lotus', file: 'LRH_PO_order.xlsx', subject: 'สั่งดอกไม้สำหรับพรุ่งนี้', lines: [{ sku: 'LRH-RR12', qty: 10 }, { sku: 'LRH-OR6', qty: 3 }] },
  { customerId: 'cus-siamevent', file: 'siam_event_order.csv', subject: 'สั่งของ - งานอีเวนต์สุดสัปดาห์', lines: [{ sku: 'SE-ROSE', qty: 12 }, { sku: 'SE-SUN', qty: 15 }] },
  { customerId: 'cus-wedding', file: 'CPW_order_form.pdf', subject: 'ดอกไม้งานแต่ง', lines: [{ sku: 'CPW-ROSE', qty: 20 }, { sku: 'CPW-PEONY', qty: 6 }] },
]

/** In-memory mock "backend" for sales & distribution (FLOW 8) — no API calls, session-only state. */
export const useSalesStore = create<SalesState>((set, get) => {
  const patchOrder = (orderId: string, fn: (o: CustomerOrder) => CustomerOrder) => set({ orders: get().orders.map((o) => (o.id === orderId ? fn(o) : o)) })
  const patchVisit = (visitId: string, fn: (v: ConsignmentVisit) => ConsignmentVisit) => set({ visits: get().visits.map((v) => (v.id === visitId ? fn(v) : v)) })
  const patchReport = (reportId: string, fn: (r: SalesReport) => SalesReport) => set({ reports: get().reports.map((r) => (r.id === reportId ? fn(r) : r)) })

  const addInvoice = (customerId: string, source: InvoiceSource, sourceId: string, lines: InvoiceLine[]): Invoice => {
    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: seq('INV', 101 + get().invoices.length),
      customerId,
      source,
      sourceId,
      issuedAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      lines,
      status: 'issued',
      paidAt: null,
    }
    set({ invoices: [invoice, ...get().invoices] })
    return invoice
  }

  return {
    customers: initialCustomers,
    imports: initialImports,
    orders: initialCustomerOrders,
    shopStock: initialShopStock,
    visits: initialVisits,
    reports: initialSalesReports,
    invoices: initialInvoices,
    consignmentWeeks: initialConsignmentWeeks,
    tolerancePct: 5,

    runEmailImport: () => {
      const pick = demoPicks[get().imports.length % demoPicks.length]
      const customer = get().customers.find((c) => c.id === pick.customerId)!
      const profile = customer.importProfile!
      const lines: CustomerOrderLine[] = pick.lines.map((l, i) => ({
        id: `col-${Date.now()}-${i}`,
        customerSku: l.sku,
        finishedGoodId: profile.skuMap.find((m) => m.customerSku === l.sku)?.finishedGoodId ?? null,
        quantity: l.qty,
      }))
      const issues = lines.filter((l) => !l.finishedGoodId).map((l) => `รหัสสินค้า "${l.customerSku}" ไม่อยู่ใน format ของลูกค้ารายนี้`)
      const now = new Date().toISOString()
      const order: CustomerOrder = {
        id: `co-${Date.now()}`,
        orderNumber: seq('ORD', 100 + get().orders.length),
        customerId: customer.id,
        importId: null,
        receivedAt: now,
        requestedDeliveryDate: new Date(Date.now() + 2 * 86_400_000).toISOString(),
        channel: 'email',
        platformName: null,
        platformOrderRef: null,
        deliverySheetId: null,
        status: 'draft',
        lines,
        purchasePlanId: null,
        confirmedAt: null,
        deliveredAt: null,
        deliveredLines: [],
        invoiceId: null,
      }
      const imp: EmailImport = {
        id: `imp-${Date.now()}`,
        receivedAt: now,
        fromAddress: profile.senderEmail,
        subject: pick.subject,
        attachmentName: pick.file,
        customerId: customer.id,
        status: issues.length ? 'needs_review' : 'parsed',
        orderId: order.id,
        issues,
      }
      order.importId = imp.id
      set({ imports: [imp, ...get().imports], orders: [order, ...get().orders] })
      return imp
    },

    createOrderFromImport: (importId, customerId) => {
      const imp = get().imports.find((i) => i.id === importId)
      if (!imp || imp.orderId) return null
      const order: CustomerOrder = {
        id: `co-${Date.now()}`,
        orderNumber: seq('ORD', 100 + get().orders.length),
        customerId,
        importId,
        receivedAt: imp.receivedAt,
        requestedDeliveryDate: new Date(Date.now() + 2 * 86_400_000).toISOString(),
        channel: 'email',
        platformName: null,
        platformOrderRef: null,
        deliverySheetId: null,
        status: 'draft',
        lines: [{ id: `col-${Date.now()}`, customerSku: null, finishedGoodId: null, quantity: 0 }],
        purchasePlanId: null,
        confirmedAt: null,
        deliveredAt: null,
        deliveredLines: [],
        invoiceId: null,
      }
      set({
        orders: [order, ...get().orders],
        imports: get().imports.map((i) => (i.id === importId ? { ...i, customerId, orderId: order.id, status: 'needs_review' } : i)),
      })
      return order.id
    },

    updateOrderLine: (orderId, lineId, patch) =>
      patchOrder(orderId, (o) => (o.status === 'draft' ? { ...o, lines: o.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) } : o)),

    addOrderLine: (orderId) =>
      patchOrder(orderId, (o) => (o.status === 'draft' ? { ...o, lines: [...o.lines, { id: `col-${Date.now()}`, customerSku: null, finishedGoodId: null, quantity: 0 }] } : o)),

    removeOrderLine: (orderId, lineId) => patchOrder(orderId, (o) => (o.status === 'draft' ? { ...o, lines: o.lines.filter((l) => l.id !== lineId) } : o)),

    confirmOrder: (orderId) => {
      const order = get().orders.find((o) => o.id === orderId)
      if (!order || order.status !== 'draft') return { ok: false, message: 'ยืนยันได้เฉพาะคำสั่งซื้อที่เป็นร่าง' }
      if (order.lines.length === 0) return { ok: false, message: 'เพิ่มสินค้าอย่างน้อย 1 รายการ' }
      if (order.lines.some((l) => !l.finishedGoodId)) return { ok: false, message: 'จับคู่ทุกรายการกับสินค้าของเราก่อน' }
      if (order.lines.some((l) => !(l.quantity > 0))) return { ok: false, message: 'ทุกรายการต้องมีจำนวนมากกว่า 0' }
      const fgs = order.lines.map((l) => l.finishedGoodId)
      if (new Set(fgs).size !== fgs.length) return { ok: false, message: 'มีสินค้าซ้ำกัน กรุณารวมเป็นรายการเดียว' }
      patchOrder(orderId, (o) => ({ ...o, status: 'confirmed', confirmedAt: new Date().toISOString() }))
      set({ imports: get().imports.map((i) => (i.orderId === orderId && i.status === 'needs_review' ? { ...i, status: 'parsed', issues: [] } : i)) })
      return { ok: true, message: `ยืนยัน ${order.orderNumber} แล้ว` }
    },

    cancelOrder: (orderId) => patchOrder(orderId, (o) => ({ ...o, status: 'cancelled' })),

    linkOrdersToPlan: (orderIds, planId) => set({ orders: get().orders.map((o) => (orderIds.includes(o.id) ? { ...o, purchasePlanId: planId } : o)) }),

    deliverOrder: (orderId) => {
      const order = get().orders.find((o) => o.id === orderId)
      if (!order || order.status !== 'confirmed') return { ok: false, message: 'คำสั่งซื้อยังไม่พร้อมส่ง' }
      const production = useProductionStore.getState()
      const deliveredLines: DeliveredLine[] = []
      for (const line of order.lines) {
        const progress = orderLineProgress(order, line.finishedGoodId, production.orders, production.batches)
        let toShip = Math.min(line.quantity, progress.onHand)
        const batchNumbers: string[] = []
        let shipped = 0
        for (const lot of progress.lots) {
          if (toShip <= 0) break
          const take = Math.min(toShip, lot.remainingQuantity)
          if (take > 0 && production.issueFromBatch(lot.id, take)) {
            batchNumbers.push(lot.batchNumber)
            toShip -= take
            shipped += take
          }
        }
        if (shipped > 0) deliveredLines.push({ finishedGoodId: line.finishedGoodId!, quantity: shipped, batchNumbers })
      }
      if (deliveredLines.length === 0) return { ok: false, message: 'ยังไม่มีสินค้าที่ผลิตให้คำสั่งซื้อนี้' }
      patchOrder(orderId, (o) => ({ ...o, status: 'delivered', deliveredAt: new Date().toISOString(), deliveredLines }))
      return { ok: true, message: `ส่ง ${order.orderNumber} แล้ว` }
    },

    issueOrderInvoice: (orderId) => {
      const order = get().orders.find((o) => o.id === orderId)
      if (!order || order.invoiceId || (order.status !== 'confirmed' && order.status !== 'delivered')) return null
      const { orders: prodOrders, batches } = useProductionStore.getState()
      const lines: InvoiceLine[] =
        order.status === 'delivered'
          ? order.deliveredLines.map((l) => ({ finishedGoodId: l.finishedGoodId, quantity: l.quantity, unitPrice: productPrices[l.finishedGoodId] ?? 0 }))
          : order.lines
              .map((l) => ({
                finishedGoodId: l.finishedGoodId!,
                quantity: Math.min(l.quantity, orderLineProgress(order, l.finishedGoodId, prodOrders, batches).onHand),
                unitPrice: productPrices[l.finishedGoodId!] ?? 0,
              }))
              .filter((l) => l.quantity > 0)
      if (lines.length === 0) return null
      const invoice = addInvoice(order.customerId, 'customer_order', order.id, lines)
      patchOrder(orderId, (o) => ({ ...o, invoiceId: invoice.id }))
      return invoice.id
    },

    saveImportProfile: (customerId, profile) => set({ customers: get().customers.map((c) => (c.id === customerId ? { ...c, importProfile: profile } : c)) }),

    createOrder: (input) => {
      const customer = get().customers.find((c) => c.id === input.customerId)
      if (!customer) return { ok: false, message: 'เลือกลูกค้า' }
      const platformName = input.platformName.trim()
      const platformOrderRef = input.platformOrderRef.trim()
      if (input.channel === 'platform') {
        if (!platformName || !platformOrderRef) return { ok: false, message: 'กรอกชื่อ platform และเลขคำสั่งซื้อของ platform' }
        const dup = get().orders.find((o) => o.platformName?.toLowerCase() === platformName.toLowerCase() && o.platformOrderRef?.toLowerCase() === platformOrderRef.toLowerCase())
        if (dup) return { ok: false, message: `เลขคำสั่งซื้อ ${platformOrderRef} จาก ${platformName} มีในระบบแล้ว (${dup.orderNumber})` }
      }
      if (input.lines.length === 0) return { ok: false, message: 'เพิ่มสินค้าอย่างน้อย 1 รายการ' }
      if (input.lines.some((l) => !l.finishedGoodId || !(l.quantity > 0))) return { ok: false, message: 'ทุกรายการต้องเลือกสินค้าและจำนวนมากกว่า 0' }
      if (new Set(input.lines.map((l) => l.finishedGoodId)).size !== input.lines.length) return { ok: false, message: 'มีสินค้าซ้ำกัน กรุณารวมเป็นรายการเดียว' }
      const now = new Date().toISOString()
      const order: CustomerOrder = {
        id: `co-${Date.now()}`,
        orderNumber: seq('ORD', 100 + get().orders.length),
        customerId: customer.id,
        importId: null,
        receivedAt: now,
        requestedDeliveryDate: input.requestedDeliveryDate,
        channel: input.channel,
        platformName: input.channel === 'platform' ? platformName : null,
        platformOrderRef: input.channel === 'platform' ? platformOrderRef : null,
        deliverySheetId: null,
        status: 'confirmed',
        lines: input.lines.map((l, i) => ({ id: `col-${Date.now()}-${i}`, customerSku: null, finishedGoodId: l.finishedGoodId, quantity: l.quantity })),
        purchasePlanId: null,
        confirmedAt: now,
        deliveredAt: null,
        deliveredLines: [],
        invoiceId: null,
      }
      set({ orders: [order, ...get().orders] })
      return { ok: true, id: order.id }
    },

    setOrdersSheet: (orderIds, sheetId) => set({ orders: get().orders.map((o) => (orderIds.includes(o.id) ? { ...o, deliverySheetId: sheetId } : o)) }),

    createVisit: ({ customerId, visitDate, driverName, deliverySheetId }) => {
      // A route sheet makes its visits up front, so one shop may sit on two sheets the same day
      if (!deliverySheetId && get().visits.some((v) => v.customerId === customerId && v.status === 'draft')) {
        return { ok: false, message: 'ร้านนี้มีใบเข้าร้านที่ยังเป็นร่างอยู่ กรุณาทำให้เสร็จหรือให้ร้านลงชื่อก่อน' }
      }
      const previousBalance = get()
        .shopStock.filter((s) => s.customerId === customerId)
        .map(({ customerId: _, ...line }) => line)
      const visit: ConsignmentVisit = {
        id: `vis-${Date.now()}`,
        visitNumber: seq('VIS', get().visits.length + 1),
        customerId,
        visitDate,
        driverName,
        deliverySheetId: deliverySheetId ?? null,
        status: 'draft',
        previousBalance,
        counted: [],
        spoiled: [],
        delivered: [],
        signedBy: null,
        signedAt: null,
      }
      set({ visits: [visit, ...get().visits] })
      return { ok: true, id: visit.id }
    },

    cancelVisit: (visitId) => patchVisit(visitId, (v) => (v.status === 'draft' ? { ...v, status: 'cancelled' } : v)),

    scanVisit: (visitId, mode, rawCode, quantity) => {
      const visit = get().visits.find((v) => v.id === visitId)
      const code = rawCode.trim().toUpperCase()
      if (!visit || visit.status !== 'draft') return { ok: false, message: 'ใบเข้าร้านนี้ลงชื่อไปแล้ว' }
      if (!code) return { ok: false, message: 'สแกนหรือพิมพ์บาร์โค้ด' }
      if (!(quantity > 0)) return { ok: false, message: 'จำนวนต้องมากกว่า 0' }

      if (mode === 'delivered') {
        const batch = useProductionStore.getState().batches.find(matches(code))
        if (!batch) return { ok: false, message: `${code} ไม่ใช่ LOT สินค้าสำเร็จรูป` }
        if (batch.reservedForOrderId) return { ok: false, message: `${batch.batchNumber} ถูกจองไว้ให้คำสั่งซื้อของลูกค้า` }
        if (batch.status !== 'available') return { ok: false, message: `${batch.batchNumber} ไม่พร้อมใช้` }
        const already = visit.delivered.filter((l) => l.batchId === batch.id).reduce((s, l) => s + l.quantity, 0)
        if (already + quantity > batch.remainingQuantity) return { ok: false, message: `${batch.batchNumber} เหลือเพียง ${batch.remainingQuantity - already}` }
        const template = { batchId: batch.id, finishedGoodId: batch.finishedGoodId, batchNumber: batch.batchNumber, barcode: batch.barcode, quantity: 0 }
        patchVisit(visitId, (v) => ({ ...v, delivered: bump(v.delivered, template, quantity) }))
        return { ok: true, message: `ส่ง ${batch.batchNumber} +${quantity}` }
      }

      const prev = visit.previousBalance.find(matches(code))
      if (!prev) return { ok: false, message: `${code} ไม่อยู่ในยอดคงเหลือครั้งก่อนของร้านนี้` }
      const used = visit.counted.concat(visit.spoiled).filter((l) => l.batchNumber === prev.batchNumber).reduce((s, l) => s + l.quantity, 0)
      if (used + quantity > prev.quantity) return { ok: false, message: `${prev.batchNumber} เหลือที่ยังไม่ได้นับเพียง ${prev.quantity - used}` }
      patchVisit(visitId, (v) => ({ ...v, [mode]: bump(v[mode], { ...prev, quantity: 0 }, quantity) }))
      return { ok: true, message: `${prev.batchNumber} +${quantity} ${mode === 'counted' ? 'ตรวจแล้ว วางที่ร้านต่อ' : 'ของเสีย นำกลับ'}` }
    },

    setVisitLineQty: (visitId, mode, batchNumber, quantity) =>
      patchVisit(visitId, (v) => {
        if (v.status !== 'draft') return v
        const lines = v[mode] as ShopStockLine[]
        const next = lines.map((l) => (l.batchNumber === batchNumber ? { ...l, quantity: Math.max(0, quantity) } : l)).filter((l) => l.quantity > 0)
        return { ...v, [mode]: next }
      }),

    signVisit: (visitId, signedBy) => {
      const visit = get().visits.find((v) => v.id === visitId)
      if (!visit || visit.status !== 'draft') return { ok: false, message: 'ใบเข้าร้านนี้ลงชื่อไปแล้ว' }
      if (!signedBy.trim()) return { ok: false, message: 'กรอกชื่อพนักงานร้านที่ลงชื่อ' }

      const production = useProductionStore.getState()
      for (const line of visit.delivered) {
        const batch = production.batches.find((b) => b.id === line.batchId)
        if (!batch || batch.remainingQuantity < line.quantity) return { ok: false, message: `${line.batchNumber} มีสต็อกไม่ถึง ${line.quantity} แล้ว` }
      }
      visit.delivered.forEach((l) => production.issueFromBatch(l.batchId, l.quantity))

      let balance: ShopStockLine[] = []
      visit.counted.forEach((l) => (balance = bump(balance, l, l.quantity)))
      visit.delivered.forEach(({ batchId: _, ...l }) => (balance = bump(balance, l, l.quantity)))

      set({
        shopStock: [...get().shopStock.filter((s) => s.customerId !== visit.customerId), ...balance.map((l) => ({ ...l, customerId: visit.customerId }))],
      })
      patchVisit(visitId, (v) => ({ ...v, status: 'signed', signedBy: signedBy.trim(), signedAt: new Date().toISOString() }))
      return { ok: true, message: `${visit.visitNumber} ลงชื่อแล้ว ปรับยอดคงเหลือของร้านแล้ว` }
    },

    addSalesReport: ({ customerId, periodFrom, periodTo, lines }) => {
      const report: SalesReport = {
        id: `sr-${Date.now()}`,
        reportNumber: seq('SR', get().reports.length + 1),
        customerId,
        receivedAt: new Date().toISOString(),
        periodFrom,
        periodTo,
        lines,
        status: 'pending',
        note: '',
        invoiceId: null,
      }
      set({ reports: [report, ...get().reports] })
      return report.id
    },

    setConfirmedQty: (reportId, finishedGoodId, quantity) =>
      patchReport(reportId, (r) =>
        r.status === 'pending' ? { ...r, lines: r.lines.map((l) => (l.finishedGoodId === finishedGoodId ? { ...l, confirmedQuantity: Math.max(0, quantity) } : l)) } : r,
      ),

    setReportNote: (reportId, note) => patchReport(reportId, (r) => ({ ...r, note })),

    confirmReport: (reportId) =>
      patchReport(reportId, (r) =>
        r.status === 'pending' ? { ...r, status: 'confirmed', lines: r.lines.map((l) => ({ ...l, confirmedQuantity: l.confirmedQuantity ?? l.reportedQuantity })) } : r,
      ),

    issueReportInvoice: (reportId) => {
      const report = get().reports.find((r) => r.id === reportId)
      if (!report || report.status !== 'confirmed') return null
      const lines = report.lines
        .map((l) => ({ finishedGoodId: l.finishedGoodId, quantity: l.confirmedQuantity ?? l.reportedQuantity, unitPrice: productPrices[l.finishedGoodId] ?? 0 }))
        .filter((l) => l.quantity > 0)
      if (lines.length === 0) return null
      const invoice = addInvoice(report.customerId, 'sales_report', report.id, lines)
      patchReport(reportId, (r) => ({ ...r, status: 'invoiced', invoiceId: invoice.id }))
      return invoice.id
    },

    setTolerancePct: (tolerancePct) => set({ tolerancePct: Math.max(0, tolerancePct) }),

    markInvoicePaid: (invoiceId) =>
      set({ invoices: get().invoices.map((i) => (i.id === invoiceId && i.status === 'issued' ? { ...i, status: 'paid', paidAt: new Date().toISOString() } : i)) }),
  }
})

export function useCustomer(customerId: string | null | undefined) {
  return useSalesStore((s) => s.customers.find((c) => c.id === customerId))
}

export function customerById(customerId: string | null | undefined) {
  return useSalesStore.getState().customers.find((c) => c.id === customerId)
}

export function customerOrderById(orderId: string | null | undefined) {
  return useSalesStore.getState().orders.find((o) => o.id === orderId)
}
