import { create } from 'zustand'
import { useProcurementStore } from '@/features/procurement/store'
import type { PurchaseOrder, PurchaseOrderLine } from '@/features/procurement/types'
import { ymd } from '@/features/procurement/utils'
import { initialVehicleRoutes, initialVehicles } from './mockData'
import type { RunSheet, Vehicle, VehicleRoute } from './types'

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString()

// Seeded run sheets collect the seeded purchase orders of the procurement store (po-1..3 on rs-1, po-4 on rs-2)
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
      { id: 'rss-1', sequence: 1, pickupPointId: 'sr-1', purchaseOrderIds: ['po-1'], receivedNotes: '', checkedAt: null },
      { id: 'rss-2', sequence: 2, pickupPointId: 'sr-2', purchaseOrderIds: ['po-2'], receivedNotes: '', checkedAt: null },
      { id: 'rss-3', sequence: 3, pickupPointId: 'sr-3', purchaseOrderIds: ['po-3'], receivedNotes: '', checkedAt: null },
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
    stops: [{ id: 'rss-4', sequence: 1, pickupPointId: 'sr-4', purchaseOrderIds: ['po-4'], receivedNotes: 'สวนมีของไม่พอ เหลือกระดาษห่อแค่ 1 ม้วน', checkedAt: day(-7) }],
  },
]

/** What staff typed for one PO line while checking the goods. */
export interface ReceiptLineInput {
  poId: string
  /** Index of the ordered line in its PO; null for a line added at receipt */
  lineIndex: number | null
  /** Material actually received (differs from the ordered one for a substitute) */
  rawMaterialId: string
  /** null = not filled in yet (drafts only) */
  quantity: number | null
  pricePerUnit: number | null
}

export interface ReceiptStopInput {
  stopId: string
  receivedNotes: string
  lines: ReceiptLineInput[]
}

/**
 * Applies one stop's receipt inputs onto a PO's lines: ordered lines keep what was ordered, lines added at receipt at this pickup
 * point are replaced by the inputs. `receivedAt` is set only when the receipt is confirmed.
 */
function applyLineInputs(lines: PurchaseOrderLine[], inputs: ReceiptLineInput[], routeId: string, runSheetId: string, receivedAt?: string): PurchaseOrderLine[] {
  const ordered = lines
    .filter((l) => !l.addedAtReceipt)
    .map((line, index) => {
      const input = inputs.find((i) => i.lineIndex === index)
      if (!input) return line
      return {
        ...line,
        receivedAt,
        receivedRawMaterialId: input.rawMaterialId,
        receivedQuantity: input.quantity ?? undefined,
        receivedPricePerUnit: input.pricePerUnit ?? undefined,
      }
    })
  // Lines added at another stop of the same sheet stay as they are
  const keptAdded = lines.filter((l) => l.addedAtReceipt && l.supplierRouteId !== routeId)
  const added = inputs
    .filter((i) => i.lineIndex === null)
    .map(
      (i): PurchaseOrderLine => ({
        rawMaterialId: i.rawMaterialId,
        supplierRouteId: routeId,
        runSheetId,
        receivedAt,
        quantity: 0,
        pricePerUnit: i.pricePerUnit ?? 0,
        total: 0,
        receivedRawMaterialId: i.rawMaterialId,
        receivedQuantity: i.quantity ?? undefined,
        receivedPricePerUnit: i.pricePerUnit ?? undefined,
        addedAtReceipt: true,
      }),
    )
  return [...ordered, ...keptAdded, ...added]
}

/** Shared logic for recordReceipt/saveStopReceipt — writes the line inputs onto the POs and returns the stops with their notes. */
function applyReceiptInputs(runSheet: RunSheet, stopInputs: ReceiptStopInput[], markReceived: boolean, markChecked: boolean): RunSheet['stops'] {
  const procurement = useProcurementStore.getState()
  const receivedAt = markReceived ? new Date().toISOString() : undefined
  // A PO can appear at several stops of one sheet (several pickup points), so lines are accumulated per PO
  const linesByPo = new Map<string, PurchaseOrderLine[]>()
  for (const stop of runSheet.stops) {
    for (const poId of stop.purchaseOrderIds) {
      const po = procurement.purchaseOrders.find((p) => p.id === poId)
      if (!po || po.status !== 'ordered') continue
      const inputs = stopInputs.filter((s) => s.stopId === stop.id).flatMap((s) => s.lines.filter((l) => l.poId === poId))
      const current = linesByPo.get(poId) ?? po.lines
      linesByPo.set(poId, inputs.length > 0 ? applyLineInputs(current, inputs, stop.pickupPointId, runSheet.id, receivedAt) : current)
    }
  }
  procurement.applyReceipt(
    [...linesByPo].map(([poId, lines]) => ({ poId, lines })),
    markReceived,
  )
  return runSheet.stops.map((stop) => {
    const input = stopInputs.find((s) => s.stopId === stop.id)
    return input ? { ...stop, receivedNotes: input.receivedNotes, ...(markChecked ? { checkedAt: new Date().toISOString() } : {}) } : stop
  })
}

/** A line that still has to be put on a run sheet. */
const isPendingLine = (l: PurchaseOrderLine) => !l.runSheetId && !l.receivedAt

/**
 * Open POs for a route on a run date: ordered, due on or before that date, with at least one line that is not on a sheet yet
 * and whose pickup point is a stop of the route.
 */
export function pendingPurchaseOrders(purchaseOrders: PurchaseOrder[], route: VehicleRoute, runDate: string) {
  const pointIds = new Set(route.stops.map((s) => s.pickupPointId))
  return purchaseOrders.filter((po) => po.status === 'ordered' && ymd(po.expectedDeliveryDate) <= ymd(runDate) && po.lines.some((l) => isPendingLine(l) && pointIds.has(l.supplierRouteId)))
}

/** POs of a stop's pickup point that still have a pending line there. */
export const pendingAtPoint = (pending: PurchaseOrder[], pickupPointId: string) => pending.filter((po) => po.lines.some((l) => isPendingLine(l) && l.supplierRouteId === pickupPointId))

interface LogisticsState {
  vehicles: Vehicle[]
  vehicleRoutes: VehicleRoute[]
  runSheets: RunSheet[]

  addVehicle: (vehicle: Vehicle) => void
  toggleVehicleStatus: (vehicleId: string) => void

  addVehicleRoute: (route: VehicleRoute) => void
  addStopToRoute: (routeId: string, pickupPointId: string) => void
  removeStopFromRoute: (routeId: string, stopId: string) => void
  moveStop: (routeId: string, stopId: string, direction: 'up' | 'down') => void

  /** The vehicle is picked here (not stored on the route); `vehicleRouteId` is the route being run. Collects the matching open POs. */
  generateRunSheet: (vehicleId: string, vehicleRouteId: string, runDate: string) => RunSheet | null
  printRunSheet: (runSheetId: string) => void
  /** Explicit "Driver Returned — Start Receipt" action: printed → in_progress. No-op unless currently printed. */
  startReceipt: (runSheetId: string) => void
  /** Saves one stop's receipt onto its POs and marks the stop checked. No-op unless the sheet is in_progress. */
  saveStopReceipt: (runSheetId: string, stop: ReceiptStopInput) => void
  /** Confirms the receipt: every PO on the sheet becomes received and the sheet completed. */
  recordReceipt: (runSheetId: string, stops: ReceiptStopInput[]) => void
}

/** In-memory mock "backend" for the logistics demo — no API calls, session-only state. */
export const useLogisticsStore = create<LogisticsState>((set, get) => ({
  vehicles: initialVehicles,
  vehicleRoutes: initialVehicleRoutes,
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

  generateRunSheet: (vehicleId, vehicleRouteId, runDate) => {
    const route = get().vehicleRoutes.find((r) => r.id === vehicleRouteId && r.isActive)
    if (!route) return null

    const pending = pendingPurchaseOrders(useProcurementStore.getState().purchaseOrders, route, runDate)
    const stops = [...route.stops]
      .sort((a, b) => a.sequence - b.sequence)
      .map((stop) => ({
        id: `rss-${Date.now()}-${stop.sequence}`,
        sequence: stop.sequence,
        pickupPointId: stop.pickupPointId,
        purchaseOrderIds: pendingAtPoint(pending, stop.pickupPointId).map((po) => po.id),
        receivedNotes: '',
        checkedAt: null,
      }))
      .filter((stop) => stop.purchaseOrderIds.length > 0)

    if (stops.length === 0) return null

    // One vehicle can run several routes on the same day, so keep the number unique
    const numberBase = `RS-${new Date(runDate).toISOString().slice(0, 10).replace(/-/g, '')}-${get().vehicles.find((v) => v.id === vehicleId)?.code ?? vehicleId}`
    const sameDay = get().runSheets.filter((rs) => rs.runSheetNumber === numberBase || rs.runSheetNumber.startsWith(`${numberBase}-`)).length

    const runSheet: RunSheet = {
      id: `rs-${Date.now()}`,
      runSheetNumber: sameDay === 0 ? numberBase : `${numberBase}-${sameDay + 1}`,
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

    set({ runSheets: [runSheet, ...get().runSheets] })
    useProcurementStore.getState().assignLinesToRunSheet(
      stops.flatMap((s) => s.purchaseOrderIds.map((poId) => ({ poId, supplierRouteId: s.pickupPointId }))),
      runSheet.id,
    )
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

  saveStopReceipt: (runSheetId, stopInput) => {
    const runSheet = get().runSheets.find((rs) => rs.id === runSheetId)
    if (!runSheet || runSheet.status !== 'in_progress') return
    const stops = applyReceiptInputs(runSheet, [stopInput], false, true)
    set({ runSheets: get().runSheets.map((rs) => (rs.id === runSheetId ? { ...rs, stops } : rs)) })
  },

  recordReceipt: (runSheetId, stopInputs) => {
    const runSheet = get().runSheets.find((rs) => rs.id === runSheetId)
    if (!runSheet || runSheet.status !== 'in_progress') return
    const stops = applyReceiptInputs(runSheet, stopInputs, true, true)
    const completedAt = new Date().toISOString()
    set({
      runSheets: get().runSheets.map((rs) => (rs.id === runSheetId ? { ...rs, status: 'completed', returnedAt: rs.returnedAt ?? completedAt, completedAt, stops } : rs)),
    })
  },
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
