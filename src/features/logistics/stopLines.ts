import { rawMaterialById, supplierRawMaterials } from '@/features/procurement/mockData'
import type { PurchaseOrder } from '@/features/procurement/types'
import type { RunSheetStop } from './types'

/** One PO line as it appears at a run-sheet stop: what was ordered next to what was received. */
export interface StopLine {
  /** `${poId}:${lineIndex}` — stable while the PO is not edited */
  key: string
  poId: string
  lineIndex: number
  poNumber: string
  supplierId: string
  /** Material that was ordered (empty on a line added at receipt) */
  orderedRawMaterialId: string
  /** Name to show for the line: the ordered material, or the received one when it was added at receipt */
  rawMaterialName: string
  unit: string
  orderedQuantity: number
  pricePerUnit: number
  /** Material actually received; defaults to the ordered one */
  receivedRawMaterialId: string
  receivedName: string
  receivedUnit: string
  /** null until a receipt is saved */
  actualReceivedQuantity: number | null
  receivedPricePerUnit: number | null
  substituted: boolean
  addedAtReceipt: boolean
}

/** The unit a supplier sells a material in; falls back to the material's base unit. */
export const supplierUnitFor = (supplierId: string, rawMaterialId: string) =>
  supplierRawMaterials.find((o) => o.supplierId === supplierId && o.rawMaterialId === rawMaterialId)?.supplierUnit ?? rawMaterialById(rawMaterialId)?.unit ?? ''

/** Lines of the (non-cancelled) POs that are collected at the stop's pickup point. */
export function stopLines(stop: RunSheetStop, purchaseOrders: PurchaseOrder[]): StopLine[] {
  return stop.purchaseOrderIds.flatMap((poId) => {
    const po = purchaseOrders.find((p) => p.id === poId)
    if (!po || po.status === 'cancelled') return []
    return po.lines.flatMap((line, lineIndex): StopLine[] => {
      if (line.supplierRouteId !== stop.pickupPointId) return []
      const receivedId = line.receivedRawMaterialId ?? line.rawMaterialId
      const orderedName = rawMaterialById(line.rawMaterialId)?.nameTh ?? line.rawMaterialId
      const receivedName = rawMaterialById(receivedId)?.nameTh ?? receivedId
      return [{
        key: `${poId}:${lineIndex}`,
        poId,
        lineIndex,
        poNumber: po.poNumber,
        supplierId: po.supplierId,
        orderedRawMaterialId: line.addedAtReceipt ? '' : line.rawMaterialId,
        rawMaterialName: line.addedAtReceipt ? receivedName : orderedName,
        unit: supplierUnitFor(po.supplierId, line.rawMaterialId),
        orderedQuantity: line.addedAtReceipt ? 0 : line.quantity,
        pricePerUnit: line.pricePerUnit,
        receivedRawMaterialId: receivedId,
        receivedName,
        receivedUnit: supplierUnitFor(po.supplierId, receivedId),
        actualReceivedQuantity: line.receivedQuantity ?? null,
        receivedPricePerUnit: line.receivedPricePerUnit ?? null,
        substituted: !line.addedAtReceipt && receivedId !== line.rawMaterialId,
        addedAtReceipt: !!line.addedAtReceipt,
      }]
    })
  })
}

/** Stops that still have at least one line (a stop whose POs were all cancelled drops out of the sheet). */
export const activeStops = (stops: RunSheetStop[], purchaseOrders: PurchaseOrder[]) =>
  [...stops].sort((a, b) => a.sequence - b.sequence).filter((stop) => stopLines(stop, purchaseOrders).length > 0)

/** Value of a line: what was ordered, or what was received once recorded (at the received price). */
export const orderedValue = (l: StopLine) => l.orderedQuantity * l.pricePerUnit
export const receivedValue = (l: StopLine) => (l.actualReceivedQuantity ?? 0) * (l.receivedPricePerUnit ?? l.pricePerUnit)
