import { create } from 'zustand'
import { estimateTotals } from '@/features/sales/estimates'
import { useConsignmentStore } from '@/features/sales/consignmentStore'
import { useSalesStore } from '@/features/sales/store'
import { stopStatus } from './deliveryUtils'
import { useLogisticsStore } from './store'
import type { DeliveryLoadLine, DeliverySheet, DeliverySheetType, DeliveryStop } from './types'

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string }

export interface CreateSheetInput {
  sheetType: DeliverySheetType
  deliveryDate: string
  vehicleId: string
  driverName: string
  /** consignment_route */
  consignmentRouteId?: string
  /** direct */
  customerOrderIds?: string[]
}

interface DeliveryState {
  sheets: DeliverySheet[]

  createSheet: (input: CreateSheetInput) => Result<{ id: string }>
  /** Draft: change vehicle or driver · Printed: driver only */
  setVehicle: (sheetId: string, vehicleId: string) => void
  setDriver: (sheetId: string, driverName: string) => void
  /** Draft only. Direct sheets take an order, route sheets a consignment shop. */
  addStop: (sheetId: string, ref: { customerOrderId?: string; customerId?: string }) => Result
  removeStop: (sheetId: string, stopId: string) => void
  moveStop: (sheetId: string, stopId: string, direction: 'up' | 'down') => void
  /** Route sheets: what goes on the truck */
  setLoadQty: (sheetId: string, finishedGoodId: string, quantity: number) => void
  addLoadLine: (sheetId: string, finishedGoodId: string) => void
  printSheet: (sheetId: string) => Result
  failStop: (sheetId: string, stopId: string, reason: string) => Result
  /** Route sheets: leftovers coming back to stock */
  recordReturn: (sheetId: string, returned: Record<string, number>) => Result
  cancelSheet: (sheetId: string, reason: string) => Result
}

const renumber = (stops: DeliveryStop[]) => stops.map((s, i) => ({ ...s, sequence: i + 1 }))
const isOpen = (s: DeliverySheet) => s.status === 'draft' || s.status === 'printed'

/** In-memory mock "backend" for delivery sheets (ใบส่งของ) — no API calls, session-only state. */
export const useDeliveryStore = create<DeliveryState>((set, get) => {
  const patch = (sheetId: string, fn: (s: DeliverySheet) => DeliverySheet) => set({ sheets: get().sheets.map((s) => (s.id === sheetId ? fn(s) : s)) })
  const find = (sheetId: string) => get().sheets.find((s) => s.id === sheetId)
  const sales = () => useSalesStore.getState()

  /** Releases what the stop was holding: the order goes back to "waiting to ship", the unsigned visit is cancelled. */
  const release = (stop: DeliveryStop) => {
    if (stop.customerOrderId) sales().setOrdersSheet([stop.customerOrderId], null)
    if (stop.visitId) sales().cancelVisit(stop.visitId)
  }

  const newStopFor = (sheet: DeliverySheet, customerId: string, sequence: number): Result<{ stop: DeliveryStop }> => {
    const res = sales().createVisit({ customerId, visitDate: new Date(`${sheet.deliveryDate}T12:00`).toISOString(), driverName: sheet.driverName, deliverySheetId: sheet.id })
    if (!res.ok) return res
    return { ok: true, stop: { id: `${sheet.id}-st${sequence}-${Date.now()}`, sequence, customerId, customerOrderId: null, visitId: res.id, failReason: null } }
  }

  return {
    sheets: [],

    createSheet: (input) => {
      const vehicle = useLogisticsStore.getState().vehicles.find((v) => v.id === input.vehicleId)
      if (!vehicle || vehicle.status !== 'active') return { ok: false, message: 'กรุณาเลือกรถ' }
      if (!input.driverName.trim()) return { ok: false, message: 'กรุณาเลือกคนขับ' }

      const sameDay = get().sheets.filter((s) => s.deliveryDate === input.deliveryDate).length
      const id = `ds-${Date.now()}`
      const sheet: DeliverySheet = {
        id,
        sheetNumber: `DS-${input.deliveryDate.replaceAll('-', '')}-${String(sameDay + 1).padStart(3, '0')}`,
        sheetType: input.sheetType,
        deliveryDate: input.deliveryDate,
        vehicleId: input.vehicleId,
        driverName: input.driverName.trim(),
        consignmentRouteId: null,
        consignmentEstimateId: null,
        status: 'draft',
        createdAt: new Date().toISOString(),
        printedAt: null,
        cancelledAt: null,
        cancelReason: null,
        returnRecordedAt: null,
        loadLines: [],
        stops: [],
      }

      if (input.sheetType === 'direct') {
        const orderIds = input.customerOrderIds ?? []
        if (orderIds.length === 0) return { ok: false, message: 'กรุณาเพิ่มจุดส่งอย่างน้อย 1 จุด' }
        const orders = sales().orders
        for (const orderId of orderIds) {
          const order = orders.find((o) => o.id === orderId)
          if (!order || order.status !== 'confirmed') return { ok: false, message: 'คำสั่งซื้อที่เลือกส่งไม่ได้' }
          const other = order.deliverySheetId && get().sheets.find((s) => s.id === order.deliverySheetId)
          if (other && isOpen(other)) return { ok: false, message: `คำสั่งซื้อ ${order.orderNumber} อยู่ในใบส่งของ ${other.sheetNumber} แล้ว` }
        }
        sheet.stops = orderIds.map((orderId, i) => ({
          id: `${id}-st${i + 1}`,
          sequence: i + 1,
          customerId: orders.find((o) => o.id === orderId)!.customerId,
          customerOrderId: orderId,
          visitId: null,
          failReason: null,
        }))
        sales().setOrdersSheet(orderIds, id)
      } else {
        const route = useConsignmentStore.getState().routes.find((r) => r.id === input.consignmentRouteId)
        if (!route || !route.isActive) return { ok: false, message: 'กรุณาเลือกสาย' }
        const customers = sales().customers
        const shops = [...route.stops].sort((a, b) => a.sequence - b.sequence).filter((s) => customers.find((c) => c.id === s.customerId)?.isActive)
        if (shops.length === 0) return { ok: false, message: 'กรุณาเพิ่มจุดส่งอย่างน้อย 1 จุด' }
        sheet.consignmentRouteId = route.id
        const estimate = useConsignmentStore.getState().estimates.find((e) => e.consignmentRouteId === route.id && e.deliveryDate === input.deliveryDate && e.status !== 'cancelled')
        if (estimate) {
          sheet.consignmentEstimateId = estimate.id
          sheet.loadLines = [...estimateTotals(estimate)].map(([finishedGoodId, loadedQuantity]) => ({ finishedGoodId, loadedQuantity, returnedQuantity: null }))
        }
        for (const shop of shops) {
          const made = newStopFor(sheet, shop.customerId, sheet.stops.length + 1)
          if (!made.ok) {
            sheet.stops.forEach(release)
            return made
          }
          sheet.stops.push(made.stop)
        }
      }

      set({ sheets: [sheet, ...get().sheets] })
      return { ok: true, id }
    },

    setVehicle: (sheetId, vehicleId) => patch(sheetId, (s) => (s.status === 'draft' ? { ...s, vehicleId } : s)),

    setDriver: (sheetId, driverName) =>
      patch(sheetId, (s) => {
        if (!isOpen(s)) return s
        // The visits of a route sheet follow the sheet's driver
        s.stops.forEach((st) => st.visitId && useSalesStore.setState({ visits: sales().visits.map((v) => (v.id === st.visitId && v.status === 'draft' ? { ...v, driverName } : v)) }))
        return { ...s, driverName }
      }),

    addStop: (sheetId, ref) => {
      const sheet = find(sheetId)
      if (!sheet || sheet.status !== 'draft') return { ok: false, message: 'พิมพ์แล้วแก้จุดส่งไม่ได้ เปลี่ยนได้เฉพาะคนขับ' }
      if (sheet.sheetType === 'direct') {
        const order = sales().orders.find((o) => o.id === ref.customerOrderId)
        if (!order || order.status !== 'confirmed') return { ok: false, message: 'คำสั่งซื้อที่เลือกส่งไม่ได้' }
        if (order.deliverySheetId) return { ok: false, message: `คำสั่งซื้อ ${order.orderNumber} อยู่ในใบส่งของอื่นแล้ว` }
        sales().setOrdersSheet([order.id], sheetId)
        patch(sheetId, (s) => ({ ...s, stops: [...s.stops, { id: `${sheetId}-st${Date.now()}`, sequence: s.stops.length + 1, customerId: order.customerId, customerOrderId: order.id, visitId: null, failReason: null }] }))
        return { ok: true }
      }
      const customer = sales().customers.find((c) => c.id === ref.customerId)
      if (!customer || customer.type !== 'consignment' || !customer.isActive) return { ok: false, message: 'เลือกร้านฝากขาย' }
      if (sheet.stops.some((s) => s.customerId === customer.id)) return { ok: false, message: `ร้าน ${customer.name} อยู่ในใบนี้แล้ว` }
      const made = newStopFor(sheet, customer.id, sheet.stops.length + 1)
      if (!made.ok) return made
      patch(sheetId, (s) => ({ ...s, stops: [...s.stops, made.stop] }))
      return { ok: true }
    },

    removeStop: (sheetId, stopId) =>
      patch(sheetId, (s) => {
        const stop = s.stops.find((st) => st.id === stopId)
        if (s.status !== 'draft' || !stop) return s
        release(stop)
        return { ...s, stops: renumber(s.stops.filter((st) => st.id !== stopId)) }
      }),

    moveStop: (sheetId, stopId, direction) =>
      patch(sheetId, (s) => {
        if (s.status !== 'draft') return s
        const stops = [...s.stops].sort((a, b) => a.sequence - b.sequence)
        const i = stops.findIndex((st) => st.id === stopId)
        const j = direction === 'up' ? i - 1 : i + 1
        if (i < 0 || j < 0 || j >= stops.length) return s
        ;[stops[i], stops[j]] = [stops[j], stops[i]]
        return { ...s, stops: renumber(stops) }
      }),

    setLoadQty: (sheetId, finishedGoodId, quantity) =>
      patch(sheetId, (s) =>
        s.sheetType === 'consignment_route' && isOpen(s)
          ? { ...s, loadLines: s.loadLines.map((l) => (l.finishedGoodId === finishedGoodId ? { ...l, loadedQuantity: Math.max(0, Math.round(quantity) || 0) } : l)) }
          : s,
      ),

    addLoadLine: (sheetId, finishedGoodId) =>
      patch(sheetId, (s) =>
        s.sheetType === 'consignment_route' && isOpen(s) && !s.loadLines.some((l) => l.finishedGoodId === finishedGoodId)
          ? { ...s, loadLines: [...s.loadLines, { finishedGoodId, loadedQuantity: 0, returnedQuantity: null } as DeliveryLoadLine] }
          : s,
      ),

    printSheet: (sheetId) => {
      const sheet = find(sheetId)
      if (!sheet || sheet.status !== 'draft') return { ok: false, message: 'พิมพ์ได้เฉพาะใบที่เป็นร่าง' }
      if (sheet.stops.length === 0) return { ok: false, message: 'กรุณาเพิ่มจุดส่งอย่างน้อย 1 จุด' }
      patch(sheetId, (s) => ({ ...s, status: 'printed', printedAt: new Date().toISOString() }))
      return { ok: true }
    },

    failStop: (sheetId, stopId, reason) => {
      const sheet = find(sheetId)
      const stop = sheet?.stops.find((st) => st.id === stopId)
      if (!sheet || !stop || sheet.status !== 'printed') return { ok: false, message: 'บันทึกส่งไม่ได้ได้เฉพาะใบที่พิมพ์แล้ว' }
      if (!reason.trim()) return { ok: false, message: 'กรอกเหตุผลที่ส่งไม่ได้' }
      if (stopStatus(stop, sales().orders, sales().visits) !== 'pending') return { ok: false, message: 'จุดส่งนี้เสร็จสิ้นแล้ว' }
      release(stop)
      patch(sheetId, (s) => ({ ...s, stops: s.stops.map((st) => (st.id === stopId ? { ...st, failReason: reason.trim() } : st)) }))
      return { ok: true }
    },

    recordReturn: (sheetId, returned) => {
      const sheet = find(sheetId)
      if (!sheet || sheet.sheetType !== 'consignment_route' || sheet.status !== 'printed') return { ok: false, message: 'บันทึกของคืนได้เฉพาะใบสายฝากขายที่พิมพ์แล้ว' }
      patch(sheetId, (s) => ({
        ...s,
        returnRecordedAt: new Date().toISOString(),
        loadLines: s.loadLines.map((l) => ({ ...l, returnedQuantity: Math.max(0, Math.round(returned[l.finishedGoodId] ?? 0) || 0) })),
      }))
      return { ok: true }
    },

    cancelSheet: (sheetId, reason) => {
      const sheet = find(sheetId)
      if (!sheet || !isOpen(sheet)) return { ok: false, message: 'ใบนี้ยกเลิกไม่ได้' }
      const { orders, visits } = sales()
      if (sheet.stops.some((st) => stopStatus(st, orders, visits) === 'done')) return { ok: false, message: 'ยกเลิกไม่ได้ เพราะมีจุดที่ส่งสำเร็จแล้ว' }
      sheet.stops.filter((st) => st.failReason === null).forEach(release)
      patch(sheetId, (s) => ({ ...s, status: 'cancelled', cancelledAt: new Date().toISOString(), cancelReason: reason.trim() || null }))
      return { ok: true }
    },
  }
})

export const sheetById = (sheetId: string | null | undefined) => useDeliveryStore.getState().sheets.find((s) => s.id === sheetId)
