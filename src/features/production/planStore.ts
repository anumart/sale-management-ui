import { create } from 'zustand'
import type { ProductionSource } from './types'

export type PlanSourceTab = 'estimate' | 'orders' | 'manual'

export const planSourceLabel: Record<PlanSourceTab, string> = {
  estimate: 'ยอดประเมินสายฝากขาย',
  orders: 'คำสั่งซื้อตามวันส่ง',
  manual: 'พนักงานเลือกผลิตเอง',
}

/** One line of the plan = one production order that will be created. */
export interface PlanLine {
  /** Unique per source document x product, so the same thing can't be added twice */
  key: string
  kind: PlanSourceTab
  finishedGoodId: string
  quantity: number
  /** Where it came from, e.g. "สาย A01 กรุงเทพเหนือ" or "SO-2026-0012 ร้านดอกไม้" */
  label: string
  deliveryDate: string | null
  source: ProductionSource
  customerOrderId: string | null
  customerId: string | null
  consignmentRouteId?: string
  consignmentEstimateId?: string
}

interface PlanState {
  sourceTab: PlanSourceTab
  lines: PlanLine[]
  setSourceTab: (tab: PlanSourceTab) => void
  /** Adds lines whose key isn't in the plan yet */
  addLines: (lines: PlanLine[]) => void
  setQuantity: (key: string, quantity: number) => void
  removeLine: (key: string) => void
  removeLines: (keys: string[]) => void
  clear: () => void
}

/** The production plan being built on /production/planning (kept here so it survives switching tabs). */
export const usePlanStore = create<PlanState>((set) => ({
  sourceTab: 'estimate',
  lines: [],
  setSourceTab: (sourceTab) => set({ sourceTab }),
  addLines: (added) => set((s) => ({ lines: [...s.lines, ...added.filter((l) => !s.lines.some((x) => x.key === l.key))] })),
  setQuantity: (key, quantity) => set((s) => ({ lines: s.lines.map((l) => (l.key === key ? { ...l, quantity } : l)) })),
  removeLine: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
  removeLines: (keys) => set((s) => ({ lines: s.lines.filter((l) => !keys.includes(l.key)) })),
  clear: () => set({ lines: [] }),
}))
