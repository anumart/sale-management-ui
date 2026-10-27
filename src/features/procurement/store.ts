import { create } from 'zustand'
import type { CustomerOrder } from '@/features/sales/types'
import { initialPlans, initialPurchaseOrders, initialSupplierRoutes, initialSuppliers } from './mockData'
import type { PlanRawMaterialSupplier, PlanSource, PoStatus, PurchaseOrder, PurchasePlan, Supplier, SupplierRoute } from './types'
import { canTransitionPo } from './utils'

interface ProcurementState {
  plans: PurchasePlan[]
  purchaseOrders: PurchaseOrder[]
  suppliers: Supplier[]
  supplierRoutes: SupplierRoute[]
  addPlan: (plan: PurchasePlan) => void
  updateSupplierLine: (
    planId: string,
    rawMaterialId: string,
    supplierId: string,
    patch: Partial<PlanRawMaterialSupplier>,
  ) => void
  createPurchaseOrders: (planId: string, orders: PurchaseOrder[]) => void
  /** Adds a PO raised by hand, not tied to any plan */
  addPurchaseOrder: (order: PurchaseOrder) => void
  /** Applies a PO status transition if allowed by `poTransitions`. Returns whether it happened. */
  updatePurchaseOrderStatus: (poId: string, status: PoStatus) => boolean
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

  updateSupplierLine: (planId, rawMaterialId, supplierId, patch) =>
    set({
      plans: get().plans.map((plan) => {
        if (plan.id !== planId) return plan
        return {
          ...plan,
          rawMaterials: plan.rawMaterials.map((rm) => {
            if (rm.rawMaterialId !== rawMaterialId) return rm
            return {
              ...rm,
              suppliers: rm.suppliers.map((s) => (s.supplierId === supplierId ? { ...s, ...patch } : s)),
            }
          }),
        }
      }),
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
