import { useMemo } from 'react'
import { useLogisticsStore } from '@/features/logistics/store'
import { finishedGoods } from '@/features/procurement/mockData'
import { useProcurementStore } from '@/features/procurement/store'
import { useProductionStore } from '@/features/production/store'
import type { RmAllocation } from '@/features/production/types'
import { fgPosition, rmRequirementFor, rmShortages } from '@/features/production/utils'
import { useSalesStore } from '@/features/sales/store'
import { invoiceTotal, orderStage } from '@/features/sales/utils'

const DAY = 86_400_000
/** Received-vs-ordered gap that counts as a risk (spec Risk 1: variance can exceed 10%) */
export const VARIANCE_LIMIT = 10
/** LOTs expiring within this many days are flagged */
export const EXPIRY_DAYS = 7
/** Window for the sales stat card */
export const SALES_DAYS = 30

/**
 * Everything the dashboard shows, derived from the four in-memory stores. Selectors only pick store arrays as-is
 * (Zustand v5) — all counting happens in useMemo.
 */
export function useDashboard() {
  const plans = useProcurementStore((s) => s.plans)
  const purchaseOrders = useProcurementStore((s) => s.purchaseOrders)
  const runSheets = useLogisticsStore((s) => s.runSheets)
  const pendingPickups = useLogisticsStore((s) => s.pendingOrders)
  const lines = useProductionStore((s) => s.lines)
  const rmStock = useProductionStore((s) => s.rmStock)
  const productionOrders = useProductionStore((s) => s.orders)
  const batches = useProductionStore((s) => s.batches)
  const customerOrders = useSalesStore((s) => s.orders)
  const imports = useSalesStore((s) => s.imports)
  const visits = useSalesStore((s) => s.visits)
  const reports = useSalesStore((s) => s.reports)
  const invoices = useSalesStore((s) => s.invoices)

  return useMemo(() => {
    const now = Date.now()
    const lastDays = (iso: string, days: number) => now - new Date(iso).getTime() <= days * DAY

    // Purchasing
    const draftPlans = plans.filter((p) => p.status === 'draft')
    const draftPos = purchaseOrders.filter((p) => p.status === 'draft')
    const sentPos = purchaseOrders.filter((p) => p.status === 'sent')
    const openPos = purchaseOrders.filter((p) => p.status === 'sent' || p.status === 'confirmed')
    const latePos = openPos.filter((p) => new Date(p.expectedDeliveryDate).getTime() < now)

    // Pickup & receipt
    const openRunSheets = runSheets.filter((r) => r.status !== 'completed')
    const toPrint = runSheets.filter((r) => r.status === 'draft')
    const toReceive = runSheets.filter((r) => r.status === 'printed' || r.status === 'in_progress')
    const varianceLines = runSheets
      .filter((r) => r.status === 'completed')
      .flatMap((r) =>
        r.stops.flatMap((s) =>
          s.lineItems
            .filter((l) => l.actualReceivedQuantity !== null && l.orderedQuantity > 0)
            .map((l) => ({ runSheet: r, line: l, pct: ((l.actualReceivedQuantity! - l.orderedQuantity) / l.orderedQuantity) * 100 }))
            .filter((v) => Math.abs(v.pct) > VARIANCE_LIMIT),
        ),
      )

    // Customer orders by stage
    const staged = customerOrders.map((o) => ({ order: o, stage: orderStage(o, productionOrders) }))
    const byStage = (stage: string) => staged.filter((s) => s.stage === stage).map((s) => s.order)
    const toReview = staged.filter((s) => s.stage === 'needs_review' || s.stage === 'to_confirm').map((s) => s.order)
    const awaitingProduction = byStage('awaiting_production')
    const readyToShip = byStage('ready')
    const openCustomerOrders = staged.filter((s) => s.stage !== 'delivered' && s.stage !== 'cancelled')

    // Production
    const queued = productionOrders.filter((p) => p.status === 'confirmed' || p.status === 'draft')
    const inProduction = productionOrders.filter((p) => p.status === 'in_production')
    const lowYield = productionOrders.filter((p) => p.status === 'completed' && p.yieldRate !== null && p.yieldRate < 95)
    const lineDown = lines.filter((l) => l.status === 'maintenance')

    // Raw materials the orders waiting for production would need, against what's free in stock (spec Risk 2)
    const demand = new Map<string, number>()
    for (const o of awaitingProduction)
      for (const l of o.lines)
        if (l.finishedGoodId) for (const r of rmRequirementFor(l.finishedGoodId, l.quantity)) demand.set(r.rawMaterialId, (demand.get(r.rawMaterialId) ?? 0) + r.quantity)
    const requirement: RmAllocation[] = [...demand].map(([rawMaterialId, quantity]) => ({ rawMaterialId, quantity }))
    const shortages = rmShortages(requirement, rmStock)

    // Finished goods
    const stock = finishedGoods.map((fg) => ({ fg, ...fgPosition(batches, fg.id) }))
    const availableUnits = stock.reduce((sum, s) => sum + s.available, 0)
    const liveLots = batches.filter((b) => b.remainingQuantity > 0 && b.status !== 'expired' && b.status !== 'depleted')
    const expiring = liveLots.filter((b) => new Date(b.expirationDate).getTime() - now < EXPIRY_DAYS * DAY)

    // Sales
    const draftVisits = visits.filter((v) => v.status === 'draft')
    const pendingReports = reports.filter((r) => r.status === 'pending')
    const reviewImports = imports.filter((i) => i.status !== 'parsed' && !i.orderId)
    const unpaid = invoices.filter((i) => i.status === 'issued')
    const overdue = unpaid.filter((i) => new Date(i.dueDate).getTime() < now)
    const recentInvoices = invoices.filter((i) => lastDays(i.issuedAt, SALES_DAYS))
    const recentSales = recentInvoices.reduce((sum, i) => sum + invoiceTotal(i), 0)
    const recentPaid = recentInvoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + invoiceTotal(i), 0)

    return {
      draftPlans,
      draftPos,
      sentPos,
      openPos,
      openPoValue: openPos.reduce((sum, p) => sum + p.totalAmount, 0),
      latePos,
      pendingPickups,
      openRunSheets,
      toPrint,
      toReceive,
      varianceLines,
      toReview,
      awaitingProduction,
      readyToShip,
      openCustomerOrders,
      queued,
      inProduction,
      lowYield,
      lines,
      lineDown,
      shortages,
      stock,
      availableUnits,
      liveLots,
      expiring,
      draftVisits,
      pendingReports,
      reviewImports,
      unpaid,
      unpaidValue: unpaid.reduce((sum, i) => sum + invoiceTotal(i), 0),
      overdue,
      recentSales,
      recentPaid,
      runSheets,
      productionOrders,
    }
  }, [plans, purchaseOrders, runSheets, pendingPickups, lines, rmStock, productionOrders, batches, customerOrders, imports, visits, reports, invoices])
}

export type DashboardData = ReturnType<typeof useDashboard>
