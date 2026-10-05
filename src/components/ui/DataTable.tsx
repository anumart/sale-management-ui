import { useState, type ReactNode } from 'react'
import { IconSort } from '@/components/icons'
import { cn } from '@/lib/cn'
import { Checkbox } from './Checkbox'
import { EmptyState } from './EmptyState'
import { Pagination } from './Pagination'
import { Spinner } from './Spinner'

export interface DataTableColumn<T> {
  key: string
  label: string
  /** Defaults to true — set false only for a column that genuinely can't be sorted. Ignored when the table's `sortable` is false. */
  sortable?: boolean
  /** Required when sortable (the default). */
  sortValue?: (row: T) => string | number
  /** `index` is the row's position within the currently rendered page. */
  render: (row: T, index: number) => ReactNode
  headerClassName?: string
  cellClassName?: string
}

export interface DataTableSort {
  key: string
  dir: 'asc' | 'desc'
}

/** Server-driven pagination — pass already-sorted, already-sliced `rows` for the current page. */
export interface DataTableServerPagination {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  total: number
  start: number
  end: number
  pageSizeOptions?: number[]
  pageSize?: number
  onPageSizeChange?: (size: number) => void
}

export interface DataTableProps<T, K extends string | number = string | number> {
  columns: DataTableColumn<T>[]
  /** Full dataset in client (uncontrolled) mode, or just the current page's rows in server (controlled) mode. */
  rows: T[]
  rowKey: (row: T) => K
  rowClassName?: (row: T) => string | undefined

  emptyTitle: string
  emptyDescription?: string
  /** Show a full-table spinner instead of rows. */
  loading?: boolean
  /** Fade existing rows while a refetch is in flight. */
  fetching?: boolean

  /** Trailing per-row actions column (icon-only buttons, right-aligned). */
  renderActions?: (row: T) => ReactNode

  /** Set false for a table with no sorting at all: plain headers, rows stay in the given order. Defaults to true. */
  sortable?: boolean
  /** Omit both to let the table manage its own sort state (client mode). Pass both to control it (server mode). */
  sort?: DataTableSort | null
  onSortChange?: (sort: DataTableSort | null) => void
  defaultSort?: DataTableSort | null

  /** Client-side pagination: give the page size and the table slices `rows` itself. Omit (and omit `pagination`) for no pagination — every row shows and there is no footer. */
  pageSize?: number
  /** Optional in client mode — control the page number yourself (e.g. to reset to 1 when a filter changes). */
  page?: number
  onPageChange?: (page: number) => void
  /** Server-side pagination: takes over the footer entirely; `rows` must already be the current page. */
  pagination?: DataTableServerPagination

  /** Bulk-select (Data table variant). Provide both to turn on the checkbox column; the "N selected" bar shows only with `bulkActions`. */
  selected?: Set<K>
  onSelectedChange?: (next: Set<K>) => void
  bulkActions?: (selectedIds: K[], clear: () => void) => ReactNode
  /** aria-label for a row's checkbox; defaults to "Select row". */
  rowSelectLabel?: (row: T) => string
}

/** Shared table shell — boxed rows, sortable headers, empty state, pagination (DESIGN.md §6.7). */
export function DataTable<T, K extends string | number = string | number>({
  columns,
  rows,
  rowKey,
  rowClassName,
  emptyTitle,
  emptyDescription,
  loading,
  fetching,
  renderActions,
  sortable: sortableTable = true,
  sort: sortProp,
  onSortChange,
  defaultSort = null,
  pageSize,
  page: pageProp,
  onPageChange,
  pagination,
  selected,
  onSelectedChange,
  bulkActions,
  rowSelectLabel,
}: DataTableProps<T, K>) {
  const [internalSort, setInternalSort] = useState<DataTableSort | null>(defaultSort)
  const sortControlled = sortProp !== undefined && onSortChange !== undefined
  const sort = sortControlled ? sortProp : internalSort
  const setSort = (next: DataTableSort | null) => {
    if (sortControlled) onSortChange(next)
    else setInternalSort(next)
  }
  const toggleSort = (key: string) =>
    setSort(sort?.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })

  const [internalPage, setInternalPage] = useState(1)
  const pageControlled = pageProp !== undefined && onPageChange !== undefined
  const currentPage = pageControlled ? pageProp : internalPage
  const setPage = pageControlled ? onPageChange : setInternalPage

  let pageRows = rows
  let footer: ReactNode = null

  if (pagination) {
    footer = (
      <footer className="mt-5 flex flex-wrap items-center justify-between gap-4 text-control text-muted">
        <div className="flex items-center gap-2.5">
          {pagination.pageSizeOptions && pagination.pageSize !== undefined && pagination.onPageSizeChange && (
            <>
              <label htmlFor="data-table-page-size">แถวต่อหน้า</label>
              <select
                id="data-table-page-size"
                value={pagination.pageSize}
                onChange={(e) => pagination.onPageSizeChange!(Number(e.target.value))}
                className="h-9 rounded-lg border border-line bg-surface px-2 text-ink"
              >
                {pagination.pageSizeOptions.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </>
          )}
          <span>{pagination.total ? `แสดง ${pagination.start + 1}–${pagination.end} จาก ${pagination.total}` : 'แสดง 0 จาก 0'}</span>
        </div>
        <Pagination page={pagination.page} pageCount={pagination.pageCount} onChange={pagination.onPageChange} />
      </footer>
    )
  } else {
    if (sortableTable && !sortControlled && sort) {
      const col = columns.find((c) => c.key === sort.key)
      if (col?.sortValue) {
        const sortValue = col.sortValue
        pageRows = [...rows].sort((a, b) => {
          const av = sortValue(a)
          const bv = sortValue(b)
          const cmp = av < bv ? -1 : av > bv ? 1 : 0
          return sort.dir === 'asc' ? cmp : -cmp
        })
      }
    }
    if (pageSize) {
      const pageCount = Math.max(1, Math.ceil(pageRows.length / pageSize))
      const page = Math.min(currentPage, pageCount)
      const start = (page - 1) * pageSize
      const total = pageRows.length
      const slice = pageRows.slice(start, start + pageSize)
      footer = (
        <footer className="mt-5 flex flex-wrap items-center justify-between gap-4 text-control text-muted">
          <span>{total ? `แสดง ${start + 1}–${Math.min(start + pageSize, total)} จาก ${total}` : 'แสดง 0 จาก 0'}</span>
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
        </footer>
      )
      pageRows = slice
    }
  }

  const selectable = selected !== undefined && onSelectedChange !== undefined
  const selectedOnPage = selectable ? pageRows.filter((r) => selected!.has(rowKey(r))).length : 0
  const togglePage = (checked: boolean) => {
    if (!selectable) return
    const next = new Set(selected)
    pageRows.forEach((r) => (checked ? next.add(rowKey(r)) : next.delete(rowKey(r))))
    onSelectedChange!(next)
  }
  const toggleRow = (id: K) => {
    if (!selectable) return
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectedChange!(next)
  }

  const colCount = (selectable ? 1 : 0) + columns.length + (renderActions ? 1 : 0)
  const isFirstDataCol = (i: number) => !selectable && i === 0
  const isLastDataCol = (i: number) => !renderActions && i === columns.length - 1

  return (
    <>
      {selectable && bulkActions && selected!.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-control bg-primary-soft px-4 py-2.5 text-control text-primary-fg">
          <span>เลือกแล้ว {selected!.size} รายการ</span>
          <div className="flex gap-2">{bulkActions([...selected!], () => onSelectedChange!(new Set()))}</div>
        </div>
      )}

      <div className="relative overflow-x-auto">
        <table className="w-full border-separate text-body [border-spacing:0_0.5rem]">
          <thead>
            <tr>
              {selectable && (
                <th className="w-11 pr-1.5 pb-4 pl-1 text-left">
                  <Checkbox
                    aria-label="เลือกทุกแถวในหน้านี้"
                    checked={pageRows.length > 0 && selectedOnPage === pageRows.length}
                    indeterminate={selectedOnPage > 0 && selectedOnPage < pageRows.length}
                    onChange={(e) => togglePage(e.target.checked)}
                  />
                </th>
              )}
              {columns.map((c) => {
                const sortable = sortableTable && c.sortable !== false
                const dir = sortable && sort?.key === c.key ? sort.dir : undefined
                return (
                  <th
                    key={c.key}
                    aria-sort={sortable ? (dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none') : undefined}
                    className={cn('px-3.5 pb-4 text-left text-sm font-semibold whitespace-nowrap text-muted', c.headerClassName)}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn(
                          'inline-flex items-center gap-1.5 text-sm font-semibold transition-colors duration-200 ease-smooth hover:text-ink',
                          dir ? 'text-ink' : 'text-muted',
                        )}
                      >
                        {c.label}
                        <IconSort dir={dir} className="size-4" />
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                )
              })}
              {renderActions && <th className="px-3.5 pb-4 font-light" />}
            </tr>
          </thead>
          <tbody className={cn('transition-opacity duration-300 ease-smooth', fetching && !loading && 'opacity-60')}>
            {loading && (
              <tr>
                <td colSpan={colCount} className="rounded-[0.875rem] border border-line py-16 text-center text-muted">
                  <Spinner />
                </td>
              </tr>
            )}
            {!loading && pageRows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="rounded-[0.875rem] border border-line py-8">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            )}
            {!loading &&
              pageRows.map((row, rowIndex) => {
                const id = rowKey(row)
                const isSelected = selectable && selected!.has(id)
                return (
                  <tr
                    key={id}
                    style={{ animationDelay: `${Math.min(rowIndex, 8) * 35}ms` }}
                    className={cn(
                      'animate-row-in transition-colors duration-300 ease-smooth',
                      rowClassName?.(row) ?? (isSelected ? 'bg-primary-soft' : 'hover:bg-hover'),
                    )}
                  >
                    {selectable && (
                      <td className="rounded-l-[0.875rem] border-y border-l border-line py-2.5 pr-1.5 pl-3.5">
                        <Checkbox aria-label={rowSelectLabel?.(row) ?? 'เลือกแถว'} checked={isSelected} onChange={() => toggleRow(id)} />
                      </td>
                    )}
                    {columns.map((c, i) => (
                      <td
                        key={c.key}
                        className={cn(
                          'border-y border-line px-3.5 py-2.5',
                          isFirstDataCol(i) && 'rounded-l-[0.875rem] border-l',
                          isLastDataCol(i) && 'rounded-r-[0.875rem] border-r',
                          c.cellClassName,
                        )}
                      >
                        {c.render(row, rowIndex)}
                      </td>
                    ))}
                    {renderActions && (
                      <td className="rounded-r-[0.875rem] border-y border-r border-line px-3.5 py-2.5">
                        <div className="flex justify-end gap-1.5">{renderActions(row)}</div>
                      </td>
                    )}
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {footer}
    </>
  )
}
