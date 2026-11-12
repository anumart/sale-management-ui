import type { PlanLine } from './planStore'
import type { ProductionLine, RawMaterialStock } from './types'
import { defaultLineFor, rmRequirementFor, roundQty } from './utils'

export interface LineCheck {
  /** Can be ordered now: a free line exists and the raw materials still cover it after the lines above */
  ok: boolean
  /** Raw materials this line is short of (after the lines above took theirs) */
  missing: string[]
  noLine: boolean
}

export interface RmTotal {
  rawMaterialId: string
  required: number
  available: number
  remaining: number
}

/**
 * Checks the whole plan against stock. Lines are served top to bottom, so when several lines share a raw material
 * (rose, foam, paper...) the lower one is the one that comes up short — and it is the one that fails when ordering.
 */
export function checkPlan(lines: PlanLine[], rmStock: Record<string, RawMaterialStock>, productionLines: ProductionLine[]) {
  const left: Record<string, number> = {}
  for (const s of Object.values(rmStock)) left[s.rawMaterialId] = roundQty(s.onHand - s.allocated)
  const available = { ...left }
  const required: Record<string, number> = {}
  const perLine: Record<string, LineCheck> = {}

  for (const line of lines) {
    const need = line.quantity > 0 ? rmRequirementFor(line.finishedGoodId, line.quantity) : []
    for (const r of need) required[r.rawMaterialId] = roundQty((required[r.rawMaterialId] ?? 0) + r.quantity)
    const missing = need.filter((r) => (left[r.rawMaterialId] ?? 0) < r.quantity).map((r) => r.rawMaterialId)
    const noLine = !defaultLineFor(line.finishedGoodId, productionLines)
    const ok = line.quantity > 0 && missing.length === 0 && !noLine
    if (ok) for (const r of need) left[r.rawMaterialId] = roundQty(left[r.rawMaterialId] - r.quantity)
    perLine[line.key] = { ok, missing, noLine }
  }

  const totals: RmTotal[] = Object.keys(required).map((rawMaterialId) => ({
    rawMaterialId,
    required: required[rawMaterialId],
    available: available[rawMaterialId] ?? 0,
    remaining: roundQty((available[rawMaterialId] ?? 0) - required[rawMaterialId]),
  }))
  return { perLine, totals }
}
