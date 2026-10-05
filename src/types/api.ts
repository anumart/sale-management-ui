/** Paginated list response returned by list endpoints */
export interface Paged<T> {
  items: T[]
  total: number
}

export type SortDir = 'asc' | 'desc'
