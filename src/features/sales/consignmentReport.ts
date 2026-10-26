import { productPrices, weekStartOf } from './mockData'
import type { ConsignmentVisit, ConsignmentWeek, Customer, SalesReport } from './types'

/**
 * Consignment performance math. One definition for the whole report (the customer's sample mixed two):
 * sell-through = sold ÷ delivered, waste rate = spoiled ÷ delivered.
 */

const cellKey = (weekStart: string, customerId: string, finishedGoodId: string) => `${weekStart}|${customerId}|${finishedGoodId}`

/**
 * Seeded history plus live data: signed visits add delivered/spoiled to their week, and confirmed sales reports add
 * sold to the week their period ends in. A cell keeps `sold: null` until some report covers it.
 */
export function buildWeekCells(history: ConsignmentWeek[], visits: ConsignmentVisit[], reports: SalesReport[]): ConsignmentWeek[] {
  const cells = new Map(history.map((h) => [cellKey(h.weekStart, h.customerId, h.finishedGoodId), { ...h }]))
  const cell = (weekStart: string, customerId: string, finishedGoodId: string) => {
    const key = cellKey(weekStart, customerId, finishedGoodId)
    if (!cells.has(key)) cells.set(key, { weekStart, customerId, finishedGoodId, delivered: 0, spoiled: 0, sold: null })
    return cells.get(key)!
  }
  for (const v of visits) {
    if (v.status !== 'signed') continue
    const week = weekStartOf(v.visitDate)
    v.delivered.forEach((l) => (cell(week, v.customerId, l.finishedGoodId).delivered += l.quantity))
    v.spoiled.forEach((l) => (cell(week, v.customerId, l.finishedGoodId).spoiled += l.quantity))
  }
  for (const r of reports) {
    if (r.status === 'pending') continue
    const week = weekStartOf(r.periodTo)
    r.lines.forEach((l) => {
      const c = cell(week, r.customerId, l.finishedGoodId)
      c.sold = (c.sold ?? 0) + (l.confirmedQuantity ?? l.reportedQuantity)
    })
  }
  return [...cells.values()]
}

export interface Totals {
  delivered: number
  spoiled: number
  sold: number
  /** Delivered units in the cells that have a sales figure — the sell-through denominator */
  deliveredReported: number
  /** Shelf value of what sold */
  gross: number
  /** What we bill: shelf value minus the shop's GP */
  net: number
}

export function totalsOf(cells: ConsignmentWeek[], customers: Map<string, Customer>): Totals {
  const t: Totals = { delivered: 0, spoiled: 0, sold: 0, deliveredReported: 0, gross: 0, net: 0 }
  for (const c of cells) {
    t.delivered += c.delivered
    t.spoiled += c.spoiled
    if (c.sold === null) continue
    const value = c.sold * (productPrices[c.finishedGoodId] ?? 0)
    t.sold += c.sold
    t.deliveredReported += c.delivered
    t.gross += value
    t.net += value * (1 - (customers.get(c.customerId)?.gpPercent ?? 0) / 100)
  }
  return t
}

export const sellThrough = (t: Totals) => (t.deliveredReported ? (t.sold / t.deliveredReported) * 100 : null)
export const wasteRate = (t: Totals) => (t.delivered ? (t.spoiled / t.delivered) * 100 : null)

export function groupBy<T>(rows: T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>()
  rows.forEach((r) => groups.set(key(r), [...(groups.get(key(r)) ?? []), r]))
  return groups
}

/** Shop-weeks where goods went in but no sales figure came back — those weeks would otherwise look like a sales drop. */
export function missingReports(cells: ConsignmentWeek[]) {
  return [...groupBy(cells, (c) => `${c.weekStart}|${c.customerId}`).values()]
    .filter((rows) => rows.some((r) => r.delivered > 0) && rows.every((r) => r.sold === null))
    .map((rows) => ({ weekStart: rows[0].weekStart, customerId: rows[0].customerId }))
}

/** ISO-8601 week number of a yyyy-mm-dd date */
export function isoWeek(date: string) {
  const d = new Date(`${date}T00:00`)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const firstThursday = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7)
}

export const formatPct = (value: number | null) => (value === null ? '-' : `${value.toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`)
