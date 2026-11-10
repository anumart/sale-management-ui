import type { PillTone } from '@/components/ui'
import type { PoStatus, PurchaseOrder, SupplierRoute, SupplierType } from './types'

const monthNames = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

export const monthName = (month: number) => monthNames[month - 1] ?? ''

/** Buddhist-era year, as Thai dates are shown (2026 -> 2569) */
export const thaiYear = (year: number) => year + 543

export const roundQty = (value: number) => Math.round(value * 100) / 100

/**
 * Allowed PO status transitions. `ordered → received` happens only when a run sheet's receipt is confirmed (logistics store),
 * and a PO can be edited or cancelled until then — even after its run sheet is printed.
 */
export const poTransitions: Record<PoStatus, PoStatus[]> = {
  ordered: ['received', 'cancelled'],
  received: [],
  cancelled: [],
}

export function canTransitionPo(from: PoStatus, to: PoStatus): boolean {
  return poTransitions[from].includes(to)
}

export const poStatusTone: Record<PoStatus, PillTone> = {
  ordered: 'warning',
  received: 'success',
  cancelled: 'danger',
}

export const poStatusLabel: Record<PoStatus, string> = {
  ordered: 'สั่งแล้ว รอรับ',
  received: 'รับของแล้ว',
  cancelled: 'ยกเลิก',
}

/** Local yyyy-mm-dd of an ISO timestamp, for comparing pickup dates without the time part. */
/** Run sheets a PO is collected on — one per pickup point group, so a PO spanning several pickup points can sit on more than one. */
export const poRunSheetIds = (po: PurchaseOrder) => [...new Set(po.lines.map((l) => l.runSheetId).filter((id): id is string => !!id))]

/** A PO can be edited or cancelled while it is ordered and no line has been received yet. */
export const isPoEditable = (po: PurchaseOrder) => po.status === 'ordered' && po.lines.every((l) => !l.receivedAt)

export const ymd = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const supplierTypeLabel: Record<SupplierType, string> = {
  individual: 'บุคคลธรรมดา',
  company: 'นิติบุคคล',
}

/** Display name for an individual: honorific + first + last name. */
export const individualDisplayName = (title: string | undefined, firstName: string, lastName: string) =>
  `${title ?? ''}${firstName} ${lastName}`.trim()

/** 13-digit national ID / corporate tax ID. */
export const isValidTaxId = (value: string) => /^\d{13}$/.test(value)

/** Latitude/longitude range check (coordinates arrive as form text). */
export const isValidLatitude = (value: number) => Number.isFinite(value) && value >= -90 && value <= 90
export const isValidLongitude = (value: number) => Number.isFinite(value) && value >= -180 && value <= 180

/** Full pickup address text composed from the split address fields. */
export function formatRouteAddress(parts: Pick<SupplierRoute, 'addressLine' | 'subdistrict' | 'district' | 'province' | 'postalCode'>) {
  const isBangkok = parts.province === 'กรุงเทพมหานคร'
  return [
    parts.addressLine,
    `${isBangkok ? 'แขวง' : 'ตำบล'}${parts.subdistrict}`,
    `${isBangkok ? 'เขต' : 'อำเภอ'}${parts.district}`,
    isBangkok ? parts.province : `จังหวัด${parts.province}`,
    parts.postalCode,
  ]
    .filter((part) => part.trim() && !/^(แขวง|ตำบล|เขต|อำเภอ)$/.test(part))
    .join(' ')
}

/** Google Maps link for a pickup route: the saved link, else built from coordinates, else undefined. */
export function routeMapUrl(route: Pick<SupplierRoute, 'mapUrl' | 'latitude' | 'longitude'>) {
  if (route.mapUrl) return route.mapUrl
  if (route.latitude == null || route.longitude == null) return undefined
  return `https://www.google.com/maps?q=${route.latitude},${route.longitude}`
}

/** Base units covered by an order: whole supplier units x base units per supplier unit (rounded to dodge float noise). */
export const toBaseQty = (supplierUnits: number, unitsPerSupplierUnit: number) => Math.round(supplierUnits * unitsPerSupplierUnit * 10_000) / 10_000

/** Whole supplier units needed to cover `netRequired` base units (95 needed, 10 per bundle → 10 bundles). */
export const suggestedSupplierQty = (netRequired: number, unitsPerSupplierUnit: number) =>
  netRequired > 0 && unitsPerSupplierUnit > 0 ? Math.ceil(Math.round((netRequired / unitsPerSupplierUnit) * 10_000) / 10_000) : 0
