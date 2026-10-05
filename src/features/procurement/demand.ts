import { useProductionStore } from '@/features/production/store'
import { useSalesStore } from '@/features/sales/store'
import type { CustomerOrder } from '@/features/sales/types'
import { orderStage } from '@/features/sales/utils'
import { salesHistory } from './mockData'
import { useWizardStore } from './store'
import type { PlanLine, PlanSource } from './types'

/** Confirmed orders that nobody has bought raw material for yet and that haven't gone to production. */
export function usePlannableOrders(): CustomerOrder[] {
  const orders = useSalesStore((s) => s.orders)
  const productionOrders = useProductionStore((s) => s.orders)
  return orders.filter((o) => !o.purchasePlanId && orderStage(o, productionOrders) === 'awaiting_production')
}

export function productsOf(orders: CustomerOrder[]): string[] {
  return [...new Set(orders.flatMap((o) => o.lines.map((l) => l.finishedGoodId).filter((id): id is string => !!id)))]
}

export function baseDemand(source: PlanSource, selectedOrders: CustomerOrder[], finishedGoodId: string): number {
  if (source === 'sales_history') return salesHistory.find((s) => s.finishedGoodId === finishedGoodId)?.quantitySold ?? 0
  return selectedOrders.flatMap((o) => o.lines).filter((l) => l.finishedGoodId === finishedGoodId).reduce((sum, l) => sum + l.quantity, 0)
}

/** The wizard's lines with base demand and planned quantity worked out for its current source. */
export function useWizardPlanLines(): { planLines: PlanLine[]; selectedOrders: CustomerOrder[] } {
  const { source, orderIds, lines } = useWizardStore()
  const orders = useSalesStore((s) => s.orders)
  const selectedOrders = orders.filter((o) => orderIds.includes(o.id))
  const planLines = lines.map((l) => {
    const baseSalesQty = baseDemand(source, selectedOrders, l.finishedGoodId)
    return { finishedGoodId: l.finishedGoodId, baseSalesQty, adjustmentPct: l.adjustmentPct, plannedQuantity: Math.round(baseSalesQty * (1 + l.adjustmentPct / 100)) }
  })
  return { planLines, selectedOrders }
}
