import { activeBomEntries } from '@/features/catalog/store'
import type { RawMaterialStock } from './types'
import { roundQty } from './utils'

const EPS = 1e-9

/** Plan = how many of each finished good to make. */
export type Plan = Record<string, number>
/** Available raw material per id (on hand - allocated). */
export type Available = Record<string, number>

export function availableFromStock(rmStock: Record<string, RawMaterialStock>): Available {
  const out: Available = {}
  for (const s of Object.values(rmStock)) out[s.rawMaterialId] = Math.max(0, s.onHand - s.allocated)
  return out
}

/** Active recipe of every finished good: fgId -> [{rawMaterialId, quantityPerUnit}]. */
export function activeRecipes() {
  const map = new Map<string, { rawMaterialId: string; quantityPerUnit: number }[]>()
  for (const b of activeBomEntries()) {
    const list = map.get(b.finishedGoodId) ?? []
    list.push({ rawMaterialId: b.rawMaterialId, quantityPerUnit: b.quantityPerUnit })
    map.set(b.finishedGoodId, list)
  }
  return map
}

type Recipes = ReturnType<typeof activeRecipes>

/** Most units of one product that `available` covers, and the raw material that stops it. */
export function maxProducible(fgId: string, available: Available, recipes: Recipes = activeRecipes()) {
  const recipe = recipes.get(fgId)
  if (!recipe || recipe.length === 0) return { max: 0, limitingRawMaterialId: null as string | null }
  let max = Infinity
  let limiting: string | null = null
  for (const item of recipe) {
    if (item.quantityPerUnit <= 0) continue
    const can = Math.floor((available[item.rawMaterialId] ?? 0) / item.quantityPerUnit + EPS)
    if (can < max) {
      max = can
      limiting = item.rawMaterialId
    }
  }
  return { max: Number.isFinite(max) ? max : 0, limitingRawMaterialId: limiting }
}

/** Raw material left (or missing, when negative) after producing `plan`. */
export function leftoverAfter(plan: Plan, available: Available, recipes: Recipes = activeRecipes()): Available {
  const left: Available = { ...available }
  for (const [fgId, qty] of Object.entries(plan)) {
    if (!(qty > 0)) continue
    for (const item of recipes.get(fgId) ?? []) left[item.rawMaterialId] = roundQty((left[item.rawMaterialId] ?? 0) - item.quantityPerUnit * qty)
  }
  return left
}

export interface Combo {
  plan: Plan
  totalUnits: number
  totalValue: number
}

export interface ComboResult {
  /** Number of "maximal" ways: nothing more can be added to the plan. */
  count: number
  /** True when the search stopped at the node limit, so `count` is a lower bound. */
  truncated: boolean
  byUnits: Combo[]
  byValue: Combo[]
}

/**
 * Enumerates every production plan that fits the stock and cannot grow by one more unit of any product
 * (maximal plans). Depth-first over the products with pruning by the remaining stock.
 */
export function enumerateCombos(fgIds: string[], available: Available, priceOf: (fgId: string) => number, top = 8, nodeLimit = 400_000): ComboResult {
  const recipes = activeRecipes()
  const ids = fgIds.filter((id) => (recipes.get(id)?.length ?? 0) > 0)
  const fits = (id: string, rem: Available) => (recipes.get(id) ?? []).every((i) => (rem[i.rawMaterialId] ?? 0) + EPS >= i.quantityPerUnit)

  let count = 0
  let nodes = 0
  let truncated = false
  const byUnits: Combo[] = []
  const byValue: Combo[] = []
  const keep = (list: Combo[], combo: Combo, key: (c: Combo) => number) => {
    list.push(combo)
    list.sort((a, b) => key(b) - key(a))
    if (list.length > top) list.pop()
  }

  const walk = (index: number, rem: Available, plan: Plan, units: number, value: number) => {
    if (truncated) return
    if (++nodes > nodeLimit) {
      truncated = true
      return
    }
    if (index === ids.length) {
      // Maximal: not even one more unit of any product fits
      if (ids.some((id) => fits(id, rem))) return
      count++
      if (units === 0) return
      const combo: Combo = { plan: { ...plan }, totalUnits: units, totalValue: value }
      keep(byUnits, combo, (c) => c.totalUnits)
      keep(byValue, combo, (c) => c.totalValue)
      return
    }
    const id = ids[index]
    const recipe = recipes.get(id)!
    const max = maxProducible(id, rem, recipes).max
    for (let q = 0; q <= max; q++) {
      const next: Available = { ...rem }
      for (const item of recipe) next[item.rawMaterialId] = (next[item.rawMaterialId] ?? 0) - item.quantityPerUnit * q
      if (q > 0) plan[id] = q
      else delete plan[id]
      walk(index + 1, next, plan, units + q, value + q * priceOf(id))
    }
    delete plan[id]
  }

  walk(0, { ...available }, {}, 0, 0)
  return { count, truncated, byUnits, byValue }
}
