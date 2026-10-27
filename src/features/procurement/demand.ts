import { useProductionStore } from '@/features/production/store'
import { useSalesStore } from '@/features/sales/store'
import type { CustomerOrder } from '@/features/sales/types'
import { orderStage } from '@/features/sales/utils'
import { salesHistory } from './mockData'
import { useWizardStore } from './store'
import type { PlanLine, PlanSource } from './types'

export const planSourceLabel: Record<PlanSource, string> = {
  sales_history: 'ประวัติการขาย',
  customer_orders: 'คำสั่งซื้อ',
  finished_goods: 'เลือกสินค้าเอง',
}

/** Confirmed orders that nobody has bought raw material for yet and that haven't gone to production. */
export function usePlannableOrders(): CustomerOrder[] {
  const orders = useSalesStore((s) => s.orders)
  const productionOrders = useProductionStore((s) => s.orders)
  return orders.filter((o) => !o.purchasePlanId && orderStage(o, productionOrders) === 'awaiting_production')
}

const DAY_MS = 86_400_000

export type SalesChannel = 'consignment' | 'direct' | 'export'
export const salesChannelLabel: Record<SalesChannel, string> = { consignment: 'ฝากขาย', direct: 'ส่งตรงในประเทศ', export: 'ส่งออก' }

/** Mock split of each product's sales across the three sales types (shares add up to 1). */
const channelShare: Record<string, Record<SalesChannel, number>> = {
  'fg-rose': { consignment: 0.5, direct: 0.3, export: 0.2 },
  'fg-tulip': { consignment: 0.4, direct: 0.4, export: 0.2 },
  'fg-mixed': { consignment: 0.6, direct: 0.4, export: 0 },
  'fg-orchid': { consignment: 0.3, direct: 0.3, export: 0.4 },
  'fg-sunflower': { consignment: 0.5, direct: 0.5, export: 0 },
}
const defaultShare: Record<SalesChannel, number> = { consignment: 0.5, direct: 0.35, export: 0.15 }

/** Units sold of one product in a date range, optionally for one sales type. The mock keeps one monthly figure per product, so it is scaled by the range length. */
export function soldInRange(finishedGoodId: string, start: Date, end: Date, channel: SalesChannel | 'all' = 'all'): number {
  const monthly = salesHistory.find((s) => s.finishedGoodId === finishedGoodId)?.quantitySold ?? 0
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1)
  const share = channel === 'all' ? 1 : (channelShare[finishedGoodId] ?? defaultShare)[channel]
  return Math.round((monthly * days * share) / 30)
}

/** The wizard's lines turned into plan lines: base = what the picks gave, planned = what staff settled on. */
export function useWizardPlanLines(): { planLines: PlanLine[]; sources: PlanSource[]; orderIds: string[] } {
  const lines = useWizardStore((s) => s.lines)
  const planLines = lines.map((l) => {
    const base = l.origins.reduce((sum, o) => sum + o.quantity, 0)
    return { finishedGoodId: l.finishedGoodId, baseSalesQty: base, adjustmentPct: base > 0 ? Math.round((l.quantity / base - 1) * 100) : 0, plannedQuantity: l.quantity }
  })
  const origins = lines.flatMap((l) => l.origins)
  return {
    planLines,
    sources: [...new Set(origins.map((o) => o.kind))],
    orderIds: [...new Set(origins.filter((o) => o.kind === 'customer_orders').map((o) => o.key))],
  }
}
