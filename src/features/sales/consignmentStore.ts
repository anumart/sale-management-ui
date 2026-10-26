import { create } from 'zustand'
import { getFinishedGoods } from '@/features/catalog/store'
import type { DayOfWeek } from '@/features/logistics/types'
import { initialEstimates, initialRoutes } from './consignmentMock'
import { buildEstimateLines, dayOfWeekOf, routeRunsOn } from './estimates'
import { useSalesStore } from './store'
import type { ConsignmentEstimate, ConsignmentRoute } from './types'

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string }

export interface RouteInput {
  code: string
  name: string
  daysOfWeek: DayOfWeek[]
}

interface ConsignmentState {
  routes: ConsignmentRoute[]
  estimates: ConsignmentEstimate[]

  addRoute: (input: RouteInput) => Result<{ id: string }>
  updateRoute: (routeId: string, input: RouteInput) => Result
  toggleRouteActive: (routeId: string) => void
  addRouteStop: (routeId: string, customerId: string) => Result
  removeRouteStop: (routeId: string, stopId: string) => void
  moveRouteStop: (routeId: string, stopId: string, direction: 'up' | 'down') => void

  createEstimate: (routeId: string, deliveryDate: string) => Result<{ id: string }>
  setEstimateQty: (estimateId: string, customerId: string, finishedGoodId: string, quantity: number) => void
  /** Puts every line back to the system's suggestion */
  resetEstimate: (estimateId: string) => void
  confirmEstimate: (estimateId: string) => Result
  cancelEstimate: (estimateId: string) => void
}

const dayNames: Record<DayOfWeek, string> = { Mon: 'จันทร์', Tue: 'อังคาร', Wed: 'พุธ', Thu: 'พฤหัสบดี', Fri: 'ศุกร์', Sat: 'เสาร์', Sun: 'อาทิตย์' }

const renumber = <T extends { sequence: number }>(stops: T[]) => stops.map((s, i) => ({ ...s, sequence: i + 1 }))

/** In-memory mock "backend" for consignment sales routes and the daily estimates made on them. */
export const useConsignmentStore = create<ConsignmentState>((set, get) => {
  const patchRoute = (routeId: string, fn: (r: ConsignmentRoute) => ConsignmentRoute) => set({ routes: get().routes.map((r) => (r.id === routeId ? fn(r) : r)) })
  const patchEstimate = (estimateId: string, fn: (e: ConsignmentEstimate) => ConsignmentEstimate) =>
    set({ estimates: get().estimates.map((e) => (e.id === estimateId && e.status !== 'cancelled' ? fn(e) : e)) })

  const validate = (input: RouteInput, selfId?: string): string | null => {
    if (!input.code.trim()) return 'กรอกรหัสสาย'
    if (!input.name.trim()) return 'กรอกชื่อสาย'
    if (input.daysOfWeek.length === 0) return 'กรุณาเลือกวันที่วิ่งอย่างน้อย 1 วัน'
    if (get().routes.some((r) => r.id !== selfId && r.code.toLowerCase() === input.code.trim().toLowerCase())) return `รหัสสาย ${input.code.trim()} มีอยู่แล้ว`
    return null
  }

  return {
    routes: initialRoutes,
    estimates: initialEstimates,

    addRoute: (input) => {
      const error = validate(input)
      if (error) return { ok: false, message: error }
      const route: ConsignmentRoute = { id: `cr-${Date.now()}`, code: input.code.trim().toUpperCase(), name: input.name.trim(), daysOfWeek: input.daysOfWeek, isActive: true, stops: [] }
      set({ routes: [...get().routes, route] })
      return { ok: true, id: route.id }
    },

    updateRoute: (routeId, input) => {
      const error = validate(input, routeId)
      if (error) return { ok: false, message: error }
      patchRoute(routeId, (r) => ({ ...r, code: input.code.trim().toUpperCase(), name: input.name.trim(), daysOfWeek: input.daysOfWeek }))
      return { ok: true }
    },

    toggleRouteActive: (routeId) => patchRoute(routeId, (r) => ({ ...r, isActive: !r.isActive })),

    addRouteStop: (routeId, customerId) => {
      const route = get().routes.find((r) => r.id === routeId)
      if (!route) return { ok: false, message: 'ไม่พบสาย' }
      if (route.stops.some((s) => s.customerId === customerId)) {
        const name = useSalesStore.getState().customers.find((c) => c.id === customerId)?.name ?? ''
        return { ok: false, message: `ร้าน ${name} อยู่ในสายนี้แล้ว` }
      }
      patchRoute(routeId, (r) => ({ ...r, stops: [...r.stops, { id: `${routeId}-s${Date.now()}`, sequence: r.stops.length + 1, customerId }] }))
      return { ok: true }
    },

    removeRouteStop: (routeId, stopId) => patchRoute(routeId, (r) => ({ ...r, stops: renumber(r.stops.filter((s) => s.id !== stopId)) })),

    moveRouteStop: (routeId, stopId, direction) =>
      patchRoute(routeId, (r) => {
        const sorted = [...r.stops].sort((a, b) => a.sequence - b.sequence)
        const i = sorted.findIndex((s) => s.id === stopId)
        const j = direction === 'up' ? i - 1 : i + 1
        if (i < 0 || j < 0 || j >= sorted.length) return r
        ;[sorted[i], sorted[j]] = [sorted[j], sorted[i]]
        return { ...r, stops: renumber(sorted) }
      }),

    createEstimate: (routeId, deliveryDate) => {
      const route = get().routes.find((r) => r.id === routeId)
      if (!route || !route.isActive) return { ok: false, message: 'สายนี้ปิดใช้งานอยู่' }
      if (route.stops.length === 0) return { ok: false, message: `สาย ${route.code} ยังไม่มีร้าน` }
      if (!routeRunsOn(route, deliveryDate)) return { ok: false, message: `สาย ${route.code} ไม่วิ่งวัน${dayNames[dayOfWeekOf(deliveryDate)]}` }
      const existing = get().estimates.find((e) => e.consignmentRouteId === routeId && e.deliveryDate === deliveryDate && e.status !== 'cancelled')
      if (existing) return { ok: false, message: `สาย ${route.code} มียอดประเมินวันที่นี้แล้ว (${existing.estimateNumber})` }
      const { consignmentWeeks, shopStock } = useSalesStore.getState()
      const sameDay = get().estimates.filter((e) => e.deliveryDate === deliveryDate).length
      const estimate: ConsignmentEstimate = {
        id: `ce-${Date.now()}`,
        estimateNumber: `CE-${deliveryDate.replaceAll('-', '')}-${String(sameDay + 1).padStart(3, '0')}`,
        deliveryDate,
        consignmentRouteId: routeId,
        status: 'draft',
        confirmedAt: null,
        lines: buildEstimateLines(
          route,
          getFinishedGoods(true).map((fg) => fg.id),
          consignmentWeeks,
          shopStock,
        ),
      }
      set({ estimates: [estimate, ...get().estimates] })
      return { ok: true, id: estimate.id }
    },

    setEstimateQty: (estimateId, customerId, finishedGoodId, quantity) =>
      patchEstimate(estimateId, (e) => ({
        ...e,
        lines: e.lines.map((l) => (l.customerId === customerId && l.finishedGoodId === finishedGoodId ? { ...l, estimatedQuantity: Math.max(0, Math.round(quantity) || 0) } : l)),
      })),

    resetEstimate: (estimateId) => patchEstimate(estimateId, (e) => ({ ...e, lines: e.lines.map((l) => ({ ...l, estimatedQuantity: l.suggestedQuantity })) })),

    confirmEstimate: (estimateId) => {
      const estimate = get().estimates.find((e) => e.id === estimateId)
      if (!estimate || estimate.status !== 'draft') return { ok: false, message: 'ยืนยันได้เฉพาะยอดประเมินที่เป็นร่าง' }
      if (!estimate.lines.some((l) => l.estimatedQuantity > 0)) return { ok: false, message: 'กรอกจำนวนอย่างน้อย 1 รายการ' }
      patchEstimate(estimateId, (e) => ({ ...e, status: 'confirmed', confirmedAt: new Date().toISOString() }))
      return { ok: true }
    },

    cancelEstimate: (estimateId) => patchEstimate(estimateId, (e) => ({ ...e, status: 'cancelled' })),
  }
})

export const routeById = (routeId: string | null | undefined) => useConsignmentStore.getState().routes.find((r) => r.id === routeId)
