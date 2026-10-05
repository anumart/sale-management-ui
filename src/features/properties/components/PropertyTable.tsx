import { useState } from 'react'
import { IconCrown, IconPlus, IconSearch, IconTrash } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, SegmentedControl, StatusPill, type DataTableColumn, type PillTone } from '@/components/ui'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatCurrency } from '@/lib/format'
import { toApiError } from '@/lib/http'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import type { SortDir } from '@/types/api'
import { useDeleteProperties, useProperties } from '../api'
import type { Property, PropertySortKey, PropertyStatus } from '../types'
import { AddPropertyModal } from './AddPropertyModal'

const statusTone: Record<PropertyStatus, PillTone> = { available: 'success', pending: 'warning', sold: 'info' }
const statusLabel: Record<PropertyStatus, string> = { available: 'ว่าง', pending: 'รอดำเนินการ', sold: 'ขายแล้ว' }

export interface PropertyTableProps {
  title?: string
  subtitle?: string
  defaultPageSize?: number
}

/** Search · filter · sort · select · paginate · bulk delete (DESIGN.md §6.7). */
export function PropertyTable({
  title = 'รายการทั้งหมด',
  subtitle = 'ค้นหา กรอง เรียงลำดับ และเลือกรายการ',
  defaultPageSize = 6,
}: PropertyTableProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PropertyStatus | 'all'>('all')
  const [sort, setSort] = useState<{ key: PropertySortKey; dir: SortDir } | null>(null)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(defaultPageSize)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [adding, setAdding] = useState(false)

  const q = useDebouncedValue(search.trim(), 250)
  const { data, isFetching, isLoading } = useProperties({
    page,
    size,
    q: q || undefined,
    status: status === 'all' ? undefined : status,
    sortKey: sort?.key,
    sortDir: sort?.dir,
  })
  const del = useDeleteProperties()

  const rows = data?.items ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / size))
  const start = (page - 1) * size

  const deleteSelected = async () => {
    const ok = await confirm({
      title: `ลบ ${selected.size} รายการ?`,
      message: 'รายการที่เลือกจะถูกลบถาวร และไม่สามารถกู้คืนได้',
      confirmLabel: 'ลบ',
      tone: 'danger',
    })
    if (!ok) return
    del.mutate([...selected], {
      onSuccess: (r) => {
        toast.success(`ลบแล้ว ${r.deleted} รายการ`)
        setSelected(new Set())
      },
      onError: (err) => toast.error(toApiError(err).message),
    })
  }

  const columns: DataTableColumn<Property>[] = [
    { key: 'id', label: 'ลำดับ', render: (_r, i) => <span className="tabular-nums">{String(start + i + 1).padStart(2, '0')}</span> },
    { key: 'code', label: 'รหัส', headerClassName: 'hidden lg:table-cell', cellClassName: 'hidden lg:table-cell', render: (r) => r.code },
    {
      key: 'name',
      label: 'ชื่อ',
      render: (r) => (
        <div className="flex items-center gap-3 whitespace-nowrap">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-fg">{r.type[0]}</span>
          {r.name}
        </div>
      ),
    },
    { key: 'status', label: 'สถานะ', render: (r) => <StatusPill tone={statusTone[r.status]}>{statusLabel[r.status]}</StatusPill> },
    {
      key: 'type',
      label: 'ประเภท',
      render: (r) =>
        r.type === 'Villa' ? (
          <span className="inline-flex items-center gap-1.5 text-accent-dark">
            <IconCrown className="size-[1.125rem]" />
            Villa
          </span>
        ) : (
          r.type
        ),
    },
    { key: 'price', label: 'ราคา', cellClassName: 'whitespace-nowrap tabular-nums', render: (r) => formatCurrency(r.price) },
  ]

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex h-11 w-56 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-muted focus-within:border-primary">
              <IconSearch className="size-5 shrink-0" />
              <span className="sr-only">ค้นหา</span>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="ค้นหา..."
                className="min-w-0 flex-1 bg-transparent text-control text-ink outline-none"
              />
            </label>
            <SegmentedControl
              variant="mask"
              aria-label="กรองตามสถานะ"
              value={status}
              onChange={(v) => {
                setStatus(v)
                setPage(1)
              }}
              options={[
                { value: 'all', label: 'ทั้งหมด' },
                { value: 'available', label: 'ว่าง' },
                { value: 'pending', label: 'รอดำเนินการ' },
                { value: 'sold', label: 'ขายแล้ว' },
              ]}
            />
            <Button iconOnly round aria-label="เพิ่มรายการ" title="เพิ่มรายการ" onClick={() => setAdding(true)} className="size-11">
              <IconPlus />
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        rowSelectLabel={(r) => `เลือก ${r.name}`}
        loading={isLoading}
        fetching={isFetching}
        emptyTitle="ไม่พบรายการ"
        emptyDescription="ลองปรับคำค้นหาหรือตัวกรอง"
        sort={sort}
        onSortChange={(s) => setSort(s ? { key: s.key as PropertySortKey, dir: s.dir } : null)}
        pagination={{
          page,
          pageCount,
          onPageChange: setPage,
          total,
          start,
          end: Math.min(start + size, total),
          pageSizeOptions: [5, 6, 10, 20],
          pageSize: size,
          onPageSizeChange: (n) => {
            setSize(n)
            setPage(1)
          },
        }}
        selected={selected}
        onSelectedChange={setSelected}
        bulkActions={(_ids, clear) => (
          <>
            <Button size="sm" variant="ghost" onClick={clear}>
              ล้าง
            </Button>
            <Button size="sm" variant="danger" onClick={deleteSelected} loading={del.isPending}>
              {!del.isPending && <IconTrash />}
              ลบที่เลือก
            </Button>
          </>
        )}
      />

      <AddPropertyModal open={adding} onClose={() => setAdding(false)} />
    </Card>
  )
}
