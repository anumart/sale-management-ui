import type { PillTone } from '@/components/ui'
import type { PoStatus, SupplierRoute, SupplierType } from './types'

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

/** Allowed PO status transitions. `confirmed → received` is intentionally omitted — not reachable via UI until Run Sheets are linked to real POs. */
export const poTransitions: Record<PoStatus, PoStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
  received: [],
  cancelled: [],
}

export function canTransitionPo(from: PoStatus, to: PoStatus): boolean {
  return poTransitions[from].includes(to)
}

export const poStatusTone: Record<PoStatus, PillTone> = {
  draft: 'gray',
  sent: 'warning',
  confirmed: 'info',
  received: 'success',
  cancelled: 'danger',
}

export const poStatusLabel: Record<PoStatus, string> = {
  draft: 'ร่าง',
  sent: 'ส่งแล้ว',
  confirmed: 'ยืนยันแล้ว',
  received: 'รับของแล้ว',
  cancelled: 'ยกเลิก',
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
