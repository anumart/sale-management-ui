import { daysOfWeek, type DayOfWeek } from '@/features/logistics/types'
import type { ConsignmentEstimate, ConsignmentEstimateLine, ConsignmentRoute, ConsignmentWeek, ShopStock } from './types'

/** yyyy-mm-dd of a Date in local time */
export const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** yyyy-mm-dd `offset` days from today */
export const ymdFromToday = (offset: number) => toYmd(new Date(Date.now() + offset * 86_400_000))

/** Weekday of a yyyy-mm-dd date, in the Mon-first form routes use */
export const dayOfWeekOf = (ymd: string): DayOfWeek => daysOfWeek[(new Date(`${ymd}T12:00`).getDay() + 6) % 7]

export const routeRunsOn = (route: ConsignmentRoute, ymd: string) => route.daysOfWeek.includes(dayOfWeekOf(ymd))

/** How many weeks of sales history the suggestion averages */
const SUGGEST_WEEKS = 4

/**
 * Proposed quantity of one product for one shop on one run: the shop's recent weekly sales split over the days this
 * route runs, less whatever is still on its shelf. Shops with no sales history (independent shops) start at 0.
 */
export function suggestQuantity(input: { customerId: string; finishedGoodId: string; runsPerWeek: number; weeks: ConsignmentWeek[]; shopStock: ShopStock[] }) {
  const sold = input.weeks
    .filter((w) => w.customerId === input.customerId && w.finishedGoodId === input.finishedGoodId && w.sold !== null)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, SUGGEST_WEEKS)
  if (sold.length === 0) return 0
  const weeklyAverage = sold.reduce((sum, w) => sum + (w.sold ?? 0), 0) / sold.length
  const left = input.shopStock.filter((s) => s.customerId === input.customerId && s.finishedGoodId === input.finishedGoodId).reduce((sum, s) => sum + s.quantity, 0)
  return Math.max(0, Math.ceil(weeklyAverage / Math.max(1, input.runsPerWeek) - left))
}

/** One line per shop × product of a route, filled with the suggestion. */
export function buildEstimateLines(route: ConsignmentRoute, finishedGoodIds: string[], weeks: ConsignmentWeek[], shopStock: ShopStock[]): ConsignmentEstimateLine[] {
  return [...route.stops]
    .sort((a, b) => a.sequence - b.sequence)
    .flatMap((stop) =>
      finishedGoodIds.map((finishedGoodId) => {
        const suggestedQuantity = suggestQuantity({ customerId: stop.customerId, finishedGoodId, runsPerWeek: route.daysOfWeek.length, weeks, shopStock })
        return { customerId: stop.customerId, finishedGoodId, suggestedQuantity, estimatedQuantity: suggestedQuantity }
      }),
    )
}

/** Route total per product — what the production order for that route and product is sized from. */
export function estimateTotals(estimate: Pick<ConsignmentEstimate, 'lines'>) {
  const totals = new Map<string, number>()
  for (const l of estimate.lines) if (l.estimatedQuantity > 0) totals.set(l.finishedGoodId, (totals.get(l.finishedGoodId) ?? 0) + l.estimatedQuantity)
  return totals
}

export const estimateQuantity = (estimate: Pick<ConsignmentEstimate, 'lines'>) => estimate.lines.reduce((sum, l) => sum + l.estimatedQuantity, 0)
