import type { PillTone } from '@/components/ui'
import type { RunSheetStatus } from './types'

export const runSheetStatusTone: Record<RunSheetStatus, PillTone> = {
  draft: 'gray',
  printed: 'info',
  in_progress: 'warning',
  completed: 'success',
}

export const runSheetStatusLabel: Record<RunSheetStatus, string> = {
  draft: 'ร่าง',
  printed: 'พิมพ์แล้ว',
  in_progress: 'กำลังดำเนินการ',
  completed: 'เสร็จแล้ว',
}

/** Tone for a received-vs-ordered comparison: full (green), partial (amber), none (red). */
export function varianceTone(orderedQuantity: number, actualReceivedQuantity: number | null): PillTone {
  if (actualReceivedQuantity === null) return 'neutral'
  if (actualReceivedQuantity <= 0) return 'danger'
  if (actualReceivedQuantity >= orderedQuantity) return 'success'
  const shortfallPct = ((orderedQuantity - actualReceivedQuantity) / orderedQuantity) * 100
  return shortfallPct > 20 ? 'danger' : 'warning'
}

export function varianceLabel(orderedQuantity: number, actualReceivedQuantity: number | null): string {
  if (actualReceivedQuantity === null) return 'รอบันทึก'
  const diff = actualReceivedQuantity - orderedQuantity
  if (diff === 0) return 'ครบ'
  const pct = Math.round((diff / orderedQuantity) * 100)
  return `${diff > 0 ? '+' : ''}${diff.toLocaleString()} (${pct > 0 ? '+' : ''}${pct}%)`
}
