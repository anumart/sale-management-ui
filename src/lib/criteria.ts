import { formatDate } from './format'

/** True when the date part of `iso` falls inside the from/to window (either end may be empty = open). */
export function inDateRange(iso: string | null | undefined, from: string, to: string) {
  if (!from && !to) return true
  if (!iso) return false
  const day = iso.slice(0, 10)
  if (from && day < from) return false
  if (to && day > to) return false
  return true
}

/** "5 ม.ค. 2569 – ล่าสุด" for a filter chip. */
export const dateRangeText = (from: string, to: string) =>
  `${from ? formatDate(from) : 'ก่อนหน้า'} – ${to ? formatDate(to) : 'ล่าสุด'}`

/** Case-insensitive "any field contains the search text"; an empty needle matches everything. */
export function matchesText(needle: string, ...fields: (string | number | null | undefined)[]) {
  if (!needle) return true
  return fields.some((f) => f != null && String(f).toLowerCase().includes(needle))
}

/** Tally items by key — used to show how many results each filter value would give. */
export function countBy<T>(items: T[], key: (item: T) => string | undefined) {
  const counts = new Map<string, number>()
  items.forEach((item) => {
    const k = key(item)
    if (k !== undefined) counts.set(k, (counts.get(k) ?? 0) + 1)
  })
  return counts
}

/** Sum of a countBy tally — the count shown beside the "all" option. */
export const sumCounts = (counts: Map<string, number>) => [...counts.values()].reduce((a, b) => a + b, 0)
