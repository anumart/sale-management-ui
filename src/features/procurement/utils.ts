import type { PillTone } from '@/components/ui'
import type { PoStatus } from './types'

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
