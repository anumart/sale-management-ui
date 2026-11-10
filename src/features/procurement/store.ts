import { create } from 'zustand'
import type { CustomerOrder } from '@/features/sales/types'
import { initialPlans, initialPurchaseOrders, initialSupplierRoutes, initialSuppliers } from './mockData'
import type { PlanOrderLine, PlanSource, PoStatus, PurchaseOrder, PurchaseOrderLine, PurchasePlan, Supplier, SupplierRoute } from './types'
import { canTransitionPo, isPoEditable } from './utils'

interface ProcurementState {
  plans: PurchasePlan[]
  purchaseOrders: PurchaseOrder[]
  suppliers: Supplier[]
  supplierRoutes: SupplierRoute[]
  addPlan: (plan: PurchasePlan) => void
  /** Replaces every saved order line of one supplier in a draft plan (rows left at 0 are simply absent). */
  saveSupplierOrder: (planId: string, supplierId: string, lines: PlanOrderLine[]) => void
  createPurchaseOrders: (planId: string, orders: PurchaseOrder[]) => void
  /** Adds a PO raised by hand, not tied to any plan */
  addPurchaseOrder: (order: PurchaseOrder) => void
  /** Applies a PO status transition if allowed by `poTransitions`. Returns whether it happened. */
  updatePurchaseOrderStatus: (poId: string, status: PoStatus) => boolean
  /** Replaces the pickup date and lines of a PO that is still `ordered` (also after its run sheet is printed). */
  updatePurchaseOrder: (poId: string, patch: Pick<PurchaseOrder, 'expectedDeliveryDate' | 'lines'>) => boolean
  /** Links the lines of each PO that are collected at the given pickup point (and not on a run sheet yet) to the run sheet */
  assignLinesToRunSheet: (items: { poId: string; supplierRouteId: string }[], runSheetId: string) => void
  /**
   * Writes receipt results onto PO lines. `markReceived: false` just saves the entries; `true` also sets the PO `received`
   * once every one of its lines has been received (a PO spanning several pickup points waits for the last run sheet).
   * Only `ordered` POs are touched.
   */
  applyReceipt: (receipts: { poId: string; lines: PurchaseOrderLine[] }[], markReceived: boolean) => void
  addSupplier: (supplier: Supplier) => void
  toggleSupplierStatus: (supplierId: string) => void
  addSupplierRoute: (route: SupplierRoute) => void
  toggleSupplierRouteStatus: (routeId: string) => void
}

/** In-memory mock "backend" for the procurement demo — no API calls, session-only state. */
export const useProcurementStore = create<ProcurementState>((set, get) => ({
  plans: initialPlans,
  purchaseOrders: initialPurchaseOrders,
  suppliers: initialSuppliers,
  supplierRoutes: initialSupplierRoutes,

  addPlan: (plan) => set({ plans: [plan, ...get().plans] }),

  saveSupplierOrder: (planId, supplierId, lines) =>
    set({
      plans: get().plans.map((plan) =>
        plan.id === planId && plan.status === 'draft' ? { ...plan, orderLines: [...plan.orderLines.filter((l) => l.supplierId !== supplierId), ...lines] } : plan,
      ),
    }),

  createPurchaseOrders: (planId, orders) =>
    set({
      purchaseOrders: [...orders, ...get().purchaseOrders],
      plans: get().plans.map((plan) => (plan.id === planId ? { ...plan, status: 'ordered' } : plan)),
    }),

  addPurchaseOrder: (order) => set({ purchaseOrders: [order, ...get().purchaseOrders] }),

  updatePurchaseOrderStatus: (poId, status) => {
    const po = get().purchaseOrders.find((p) => p.id === poId)
    if (!po || !canTransitionPo(po.status, status)) return false
    set({ purchaseOrders: get().purchaseOrders.map((p) => (p.id === poId ? { ...p, status } : p)) })
    return true
  },

  updatePurchaseOrder: (poId, patch) => {
    const po = get().purchaseOrders.find((p) => p.id === poId)
    if (!po || !isPoEditable(po)) return false
    const totalAmount = patch.lines.reduce((sum, l) => sum + l.total, 0)
    // A line at a pickup point that is already on a run sheet stays on that sheet
    const sheetByRoute = new Map(po.lines.filter((l) => l.runSheetId).map((l) => [l.supplierRouteId, l.runSheetId]))
    const lines = patch.lines.map((l) => ({ ...l, runSheetId: l.runSheetId ?? sheetByRoute.get(l.supplierRouteId) }))
    set({ purchaseOrders: get().purchaseOrders.map((p) => (p.id === poId ? { ...p, ...patch, lines, totalAmount } : p)) })
    return true
  },

  assignLinesToRunSheet: (items, runSheetId) =>
    set({
      purchaseOrders: get().purchaseOrders.map((p) => {
        const routes = items.filter((i) => i.poId === p.id).map((i) => i.supplierRouteId)
        if (routes.length === 0) return p
        return { ...p, lines: p.lines.map((l) => (routes.includes(l.supplierRouteId) && !l.runSheetId ? { ...l, runSheetId } : l)) }
      }),
    }),

  applyReceipt: (receipts, markReceived) => {
    const now = new Date().toISOString()
    set({
      purchaseOrders: get().purchaseOrders.map((p) => {
        const receipt = receipts.find((r) => r.poId === p.id)
        if (!receipt || p.status !== 'ordered') return p
        if (!markReceived) return { ...p, lines: receipt.lines }
        const allReceived = receipt.lines.every((l) => l.receivedAt)
        return allReceived ? { ...p, lines: receipt.lines, status: 'received', receivedAt: now } : { ...p, lines: receipt.lines }
      }),
    })
  },

  addSupplier: (supplier) => set({ suppliers: [supplier, ...get().suppliers] }),

  toggleSupplierStatus: (supplierId) =>
    set({
      suppliers: get().suppliers.map((s) => (s.id === supplierId ? { ...s, isActive: !s.isActive } : s)),
    }),

  addSupplierRoute: (route) => set({ supplierRoutes: [...get().supplierRoutes, route] }),

  toggleSupplierRouteStatus: (routeId) =>
    set({
      supplierRoutes: get().supplierRoutes.map((r) => (r.id === routeId ? { ...r, isActive: !r.isActive } : r)),
    }),
}))

export function planById(planId?: string) {
  return planId ? useProcurementStore.getState().plans.find((p) => p.id === planId) : undefined
}

export function supplierById(supplierId: string) {
  return useProcurementStore.getState().suppliers.find((s) => s.id === supplierId)
}

export function poById(poId: string) {
  return useProcurementStore.getState().purchaseOrders.find((p) => p.id === poId)
}

export function supplierRouteById(routeId: string) {
  return useProcurementStore.getState().supplierRoutes.find((r) => r.id === routeId)
}

export function routesForSupplier(supplierId: string) {
  return useProcurementStore.getState().supplierRoutes.filter((r) => r.supplierId === supplierId)
}

/** One piece of demand a plan line was built from: an order, a sales-history range, or a hand pick. */
export interface WizardOrigin {
  /** Identifies the pick so adding it again replaces it instead of counting twice (order id, history range, `manual`) */
  key: string
  kind: PlanSource
  label: string
  quantity: number
}

export interface WizardLine {
  finishedGoodId: string
  /** What will be produced — starts as the sum of the origins and staff may edit it freely */
  quantity: number
  origins: WizardOrigin[]
}

export interface WizardDemand {
  finishedGoodId: string
  quantity: number
  origin: Omit<WizardOrigin, 'quantity'>
}

interface WizardState {
  /** Which source tab step 1 is showing */
  sourceTab: PlanSource
  lines: WizardLine[]
  planName: string
  setSourceTab: (source: PlanSource) => void
  /** Adds the picked demand to the plan lines; picking the same origin again replaces its earlier quantity. */
  addDemand: (items: WizardDemand[]) => void
  setQuantity: (finishedGoodId: string, quantity: number) => void
  removeLine: (finishedGoodId: string) => void
  setPlanName: (name: string) => void
  /** Opens the wizard pre-filled from customer orders (e.g. "Plan Purchase" on an order). */
  startFromOrders: (orders: CustomerOrder[]) => void
  reset: () => void
}

const defaultWizardState = {
  sourceTab: 'sales_history' as PlanSource,
  lines: [] as WizardLine[],
  planName: '',
}

const orderDemand = (orders: CustomerOrder[]): WizardDemand[] =>
  orders.flatMap((o) =>
    o.lines.flatMap((l) => (l.finishedGoodId ? [{ finishedGoodId: l.finishedGoodId, quantity: l.quantity, origin: { key: o.id, kind: 'customer_orders' as const, label: o.orderNumber } }] : [])),
  )

function mergeDemand(lines: WizardLine[], items: WizardDemand[]): WizardLine[] {
  return items.reduce((acc, item) => {
    const line = acc.find((l) => l.finishedGoodId === item.finishedGoodId)
    if (!line) return [...acc, { finishedGoodId: item.finishedGoodId, quantity: item.quantity, origins: [{ ...item.origin, quantity: item.quantity }] }]
    const earlier = line.origins.find((o) => o.key === item.origin.key)
    const origins = earlier ? line.origins.map((o) => (o === earlier ? { ...o, quantity: item.quantity } : o)) : [...line.origins, { ...item.origin, quantity: item.quantity }]
    const quantity = Math.max(0, line.quantity + item.quantity - (earlier?.quantity ?? 0))
    return acc.map((l) => (l === line ? { ...l, quantity, origins } : l))
  }, lines)
}

/** Holds the in-progress "New Purchase Plan" wizard draft across step-1 / step-2 routes. */
export const useWizardStore = create<WizardState>((set, get) => ({
  ...defaultWizardState,
  setSourceTab: (sourceTab) => set({ sourceTab }),
  addDemand: (items) => set({ lines: mergeDemand(get().lines, items) }),
  setQuantity: (finishedGoodId, quantity) => set({ lines: get().lines.map((l) => (l.finishedGoodId === finishedGoodId ? { ...l, quantity } : l)) }),
  removeLine: (finishedGoodId) => set({ lines: get().lines.filter((l) => l.finishedGoodId !== finishedGoodId) }),
  setPlanName: (planName) => set({ planName }),
  startFromOrders: (orders) => set({ ...defaultWizardState, sourceTab: 'customer_orders', lines: mergeDemand([], orderDemand(orders)) }),
  reset: () => set({ ...defaultWizardState, lines: [] }),
}))

/** The pages of the new-purchase-plan wizard, for its StepProgress bar. */
export const wizardSteps = [{ label: 'เลือกที่มาและวางแผน', to: '/procurement/plans/new/step-1' }, { label: 'ตรวจสอบและสร้างแผน' }]
