import { create } from 'zustand'
import { initialPendingOrders, initialVehicleRoutes, initialVehicles } from './mockData'
import type { PendingOrderLine, ReceiptLineItem, RunSheet, Vehicle, VehicleRoute } from './types'

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString()

const seedRunSheets: RunSheet[] = [
  {
    id: 'rs-1',
    runSheetNumber: 'RS-2026-0925-VH001',
    vehicleId: 'v-1',
    vehicleRouteId: 'vr-1',
    runDate: day(-1),
    status: 'printed',
    createdAt: day(-1),
    printedAt: day(-1),
    returnedAt: null,
    completedAt: null,
    stops: [
      {
        id: 'rss-1',
        sequence: 1,
        pickupPointId: 'pp-1',
        receivedNotes: '',
        lineItems: [
          { id: 'rsl-1', poNumber: 'PO-2026-1041', rawMaterialName: 'กุหลาบแดง (ก้าน)', unit: 'ก้าน', orderedQuantity: 2000, pricePerUnit: 15, actualReceivedQuantity: null },
        ],
      },
      {
        id: 'rss-2',
        sequence: 2,
        pickupPointId: 'pp-2',
        receivedNotes: '',
        lineItems: [
          { id: 'rsl-2', poNumber: 'PO-2026-1042', rawMaterialName: 'ทิวลิป (ก้าน)', unit: 'ก้าน', orderedQuantity: 800, pricePerUnit: 14, actualReceivedQuantity: null },
          { id: 'rsl-3', poNumber: 'PO-2026-1043', rawMaterialName: 'ทานตะวัน (ก้าน)', unit: 'ก้าน', orderedQuantity: 400, pricePerUnit: 14, actualReceivedQuantity: null },
        ],
      },
      {
        id: 'rss-3',
        sequence: 3,
        pickupPointId: 'pp-3',
        receivedNotes: '',
        lineItems: [
          { id: 'rsl-4', poNumber: 'PO-2026-1044', rawMaterialName: 'กล้วยไม้ (ก้าน)', unit: 'ก้าน', orderedQuantity: 300, pricePerUnit: 45, actualReceivedQuantity: null },
        ],
      },
    ],
  },
  {
    id: 'rs-2',
    runSheetNumber: 'RS-2026-0918-VH002',
    vehicleId: 'v-2',
    vehicleRouteId: 'vr-2',
    runDate: day(-7),
    status: 'completed',
    createdAt: day(-7),
    printedAt: day(-7),
    returnedAt: day(-7),
    completedAt: day(-7),
    stops: [
      {
        id: 'rss-4',
        sequence: 1,
        pickupPointId: 'pp-4',
        receivedNotes: 'สวนมีของไม่พอ เหลือ Rose แค่ 850 ต้น',
        lineItems: [
          { id: 'rsl-5', poNumber: 'PO-2026-0995', rawMaterialName: 'กุหลาบแดง (ก้าน)', unit: 'ก้าน', orderedQuantity: 1000, pricePerUnit: 12.5, actualReceivedQuantity: 850 },
        ],
      },
    ],
  },
]

export interface RecordReceiptStopInput {
  stopId: string
  receivedNotes: string
  lineItems: { id: string; actualReceivedQuantity: number }[]
}

export interface SaveDraftStopInput {
  stopId: string
  receivedNotes: string
  lineItems: { id: string; actualReceivedQuantity: number | null }[]
}

/** Shared merge logic for recordReceipt/saveReceiptDraft — applies stop-level inputs onto a run sheet's stops. */
function applyStopInputs(stops: RunSheet['stops'], stopInputs: SaveDraftStopInput[]): RunSheet['stops'] {
  return stops.map((stop) => {
    const input = stopInputs.find((s) => s.stopId === stop.id)
    if (!input) return stop
    return {
      ...stop,
      receivedNotes: input.receivedNotes,
      lineItems: stop.lineItems.map((li) => {
        const match = input.lineItems.find((l) => l.id === li.id)
        return match ? { ...li, actualReceivedQuantity: match.actualReceivedQuantity } : li
      }),
    }
  })
}

interface LogisticsState {
  vehicles: Vehicle[]
  vehicleRoutes: VehicleRoute[]
  pendingOrders: PendingOrderLine[]
  runSheets: RunSheet[]

  addVehicle: (vehicle: Vehicle) => void
  toggleVehicleStatus: (vehicleId: string) => void

  addVehicleRoute: (route: VehicleRoute) => void
  addStopToRoute: (routeId: string, pickupPointId: string) => void
  removeStopFromRoute: (routeId: string, stopId: string) => void
  moveStop: (routeId: string, stopId: string, direction: 'up' | 'down') => void

  generateRunSheet: (vehicleId: string, runDate: string) => RunSheet | null
  printRunSheet: (runSheetId: string) => void
  /** Explicit "Driver Returned — Start Receipt" action: printed → in_progress. No-op unless currently printed. */
  startReceipt: (runSheetId: string) => void
  /** Persists partial receipt entries without closing the run sheet. No-op unless currently in_progress. */
  saveReceiptDraft: (runSheetId: string, stops: SaveDraftStopInput[]) => void
  recordReceipt: (runSheetId: string, stops: RecordReceiptStopInput[]) => void
}

/** In-memory mock "backend" for the logistics demo — no API calls, session-only state. */
export const useLogisticsStore = create<LogisticsState>((set, get) => ({
  vehicles: initialVehicles,
  vehicleRoutes: initialVehicleRoutes,
  pendingOrders: initialPendingOrders,
  runSheets: seedRunSheets,

  addVehicle: (vehicle) => set({ vehicles: [vehicle, ...get().vehicles] }),

  toggleVehicleStatus: (vehicleId) =>
    set({
      vehicles: get().vehicles.map((v) => (v.id === vehicleId ? { ...v, status: v.status === 'active' ? 'inactive' : 'active' } : v)),
    }),

  addVehicleRoute: (route) => set({ vehicleRoutes: [...get().vehicleRoutes, route] }),

  addStopToRoute: (routeId, pickupPointId) =>
    set({
      vehicleRoutes: get().vehicleRoutes.map((r) => {
        if (r.id !== routeId) return r
        const sequence = r.stops.length + 1
        return { ...r, stops: [...r.stops, { id: `st-${Date.now()}`, sequence, pickupPointId }] }
      }),
    }),

  removeStopFromRoute: (routeId, stopId) =>
    set({
      vehicleRoutes: get().vehicleRoutes.map((r) => {
        if (r.id !== routeId) return r
        const stops = r.stops.filter((s) => s.id !== stopId).map((s, i) => ({ ...s, sequence: i + 1 }))
        return { ...r, stops }
      }),
    }),

  moveStop: (routeId, stopId, direction) =>
    set({
      vehicleRoutes: get().vehicleRoutes.map((r) => {
        if (r.id !== routeId) return r
        const stops = [...r.stops].sort((a, b) => a.sequence - b.sequence)
        const index = stops.findIndex((s) => s.id === stopId)
        const swapWith = direction === 'up' ? index - 1 : index + 1
        if (index < 0 || swapWith < 0 || swapWith >= stops.length) return r
        ;[stops[index], stops[swapWith]] = [stops[swapWith], stops[index]]
        return { ...r, stops: stops.map((s, i) => ({ ...s, sequence: i + 1 })) }
      }),
    }),

  generateRunSheet: (vehicleId, runDate) => {
    const route = get().vehicleRoutes.find((r) => r.vehicleId === vehicleId && r.isActive)
    if (!route) return null

    const matchedIds = new Set<string>()
    const stops = [...route.stops]
      .sort((a, b) => a.sequence - b.sequence)
      .map((stop) => {
        const matched = get().pendingOrders.filter((po) => po.pickupPointId === stop.pickupPointId)
        matched.forEach((po) => matchedIds.add(po.id))
        const lineItems: ReceiptLineItem[] = matched.map((po) => ({
          id: po.id,
          poNumber: po.poNumber,
          rawMaterialName: po.rawMaterialName,
          unit: po.unit,
          orderedQuantity: po.orderedQuantity,
          pricePerUnit: po.pricePerUnit,
          actualReceivedQuantity: null,
        }))
        return { id: `rss-${Date.now()}-${stop.sequence}`, sequence: stop.sequence, pickupPointId: stop.pickupPointId, receivedNotes: '', lineItems }
      })
      .filter((stop) => stop.lineItems.length > 0)

    if (stops.length === 0) return null

    const runSheet: RunSheet = {
      id: `rs-${Date.now()}`,
      runSheetNumber: `RS-${new Date(runDate).toISOString().slice(0, 10).replace(/-/g, '')}-${get().vehicles.find((v) => v.id === vehicleId)?.code ?? vehicleId}`,
      vehicleId,
      vehicleRouteId: route.id,
      runDate,
      status: 'draft',
      createdAt: new Date().toISOString(),
      printedAt: null,
      returnedAt: null,
      completedAt: null,
      stops,
    }

    set({
      runSheets: [runSheet, ...get().runSheets],
      pendingOrders: get().pendingOrders.filter((po) => !matchedIds.has(po.id)),
    })
    return runSheet
  },

  printRunSheet: (runSheetId) =>
    set({
      runSheets: get().runSheets.map((rs) =>
        rs.id === runSheetId && rs.status === 'draft' ? { ...rs, status: 'printed', printedAt: new Date().toISOString() } : rs,
      ),
    }),

  startReceipt: (runSheetId) =>
    set({
      runSheets: get().runSheets.map((rs) =>
        rs.id === runSheetId && rs.status === 'printed' ? { ...rs, status: 'in_progress', returnedAt: new Date().toISOString() } : rs,
      ),
    }),

  saveReceiptDraft: (runSheetId, stopInputs) =>
    set({
      runSheets: get().runSheets.map((rs) =>
        rs.id === runSheetId && rs.status === 'in_progress' ? { ...rs, stops: applyStopInputs(rs.stops, stopInputs) } : rs,
      ),
    }),

  recordReceipt: (runSheetId, stopInputs) =>
    set({
      runSheets: get().runSheets.map((rs) => {
        if (rs.id !== runSheetId || (rs.status !== 'printed' && rs.status !== 'in_progress')) return rs
        const completedAt = new Date().toISOString()
        return {
          ...rs,
          status: 'completed',
          returnedAt: rs.returnedAt ?? completedAt,
          completedAt,
          stops: applyStopInputs(rs.stops, stopInputs),
        }
      }),
    }),
}))

export function runSheetById(runSheetId: string) {
  return useLogisticsStore.getState().runSheets.find((rs) => rs.id === runSheetId)
}

export function vehicleById(vehicleId: string) {
  return useLogisticsStore.getState().vehicles.find((v) => v.id === vehicleId)
}

export function vehicleRouteById(routeId: string) {
  return useLogisticsStore.getState().vehicleRoutes.find((r) => r.id === routeId)
}
