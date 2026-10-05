import { create } from 'zustand'
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

export function planById(planId: string) {
  return useProcurementStore.getState().plans.find((p) => p.id === planId)
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

interface WizardLine {
  finishedGoodId: string
  selected: boolean
  adjustmentPct: number
}

interface WizardState {
  /** Where the demand comes from: past sales picked by staff (scenario 2) or confirmed email orders (scenario 1) */
  source: PlanSource
  /** Selected customer orders when source = customer_orders */
  orderIds: string[]
  sourceMonth: number
  sourceYear: number
  /** ISO date strings backing the Sales Source calendar range picker */
  sourceStartDate: string
  sourceEndDate: string
  lines: WizardLine[]
  planName: string
  /** Sets the sales-source date range; sourceMonth/sourceYear (used for plan naming) are derived from the start date. */
  setSourceRange: (start: Date, end: Date) => void
  toggleLine: (finishedGoodId: string) => void
  setAdjustment: (finishedGoodId: string, pct: number) => void
  setPlanName: (name: string) => void
  setSource: (source: PlanSource) => void
  /** Selects orders and keeps exactly their products in the line list (adjustments of kept products survive). */
  setOrders: (orderIds: string[], finishedGoodIds: string[]) => void
  /** Opens the wizard pre-filled from customer orders (e.g. "Plan Purchase" on an order). */
  startFromOrders: (orderIds: string[]) => void
  reset: () => void
}

const now = new Date()

const defaultSourceMonth = now.getMonth() === 0 ? 12 : now.getMonth()
const defaultSourceYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

const defaultWizardState = {
  source: 'sales_history' as PlanSource,
  orderIds: [] as string[],
  sourceMonth: defaultSourceMonth,
  sourceYear: defaultSourceYear,
  sourceStartDate: new Date(defaultSourceYear, defaultSourceMonth - 1, 1).toISOString(),
  sourceEndDate: new Date(defaultSourceYear, defaultSourceMonth, 0).toISOString(),
  lines: [],
  planName: '',
}

/** Holds the in-progress "New Purchase Plan" wizard draft across step-1 / step-2 routes. */
export const useWizardStore = create<WizardState>((set, get) => ({
  ...defaultWizardState,
  setSourceRange: (start, end) =>
    set({
      sourceStartDate: start.toISOString(),
      sourceEndDate: end.toISOString(),
      sourceMonth: start.getMonth() + 1,
      sourceYear: start.getFullYear(),
    }),
  toggleLine: (finishedGoodId) =>
    set({
      lines: get().lines.some((l) => l.finishedGoodId === finishedGoodId)
        ? get().lines.filter((l) => l.finishedGoodId !== finishedGoodId)
        : [...get().lines, { finishedGoodId, selected: true, adjustmentPct: 0 }],
    }),
  setAdjustment: (finishedGoodId, pct) =>
    set({
      lines: get().lines.map((l) => (l.finishedGoodId === finishedGoodId ? { ...l, adjustmentPct: pct } : l)),
    }),
  setPlanName: (planName) => set({ planName }),
  setSource: (source) => set({ source, orderIds: [], lines: [] }),
  setOrders: (orderIds, finishedGoodIds) =>
    set({
      orderIds,
      lines: finishedGoodIds.map((id) => get().lines.find((l) => l.finishedGoodId === id) ?? { finishedGoodId: id, selected: true, adjustmentPct: 0 }),
    }),
  // Lines are filled in by step 1 once it can read the orders
  startFromOrders: (orderIds) => set({ ...defaultWizardState, source: 'customer_orders', orderIds, lines: [] }),
  reset: () => set({ ...defaultWizardState, lines: [] }),
}))

/** The two pages of the new-purchase-plan wizard, for its StepProgress bar. */
export const wizardSteps = [{ label: 'เลือกที่มาและสินค้า', to: '/procurement/plans/new/step-1' }, { label: 'ตรวจสอบและสร้างแผน' }]
