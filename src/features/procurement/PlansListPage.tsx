import { useNavigate } from '@tanstack/react-router'
import { IconEye, IconPlus } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, DateRangePicker, FilterSelect, FilterSheet, ListToolbar, MultiSelectList, StatusPill, useFilterSheet, type CriteriaChip, type DataTableColumn, type PillTone } from '@/components/ui'
import { PageHeading } from '@/components/layout/PageHeading'
import { useListCriteria } from '@/hooks/useListCriteria'
import { countBy, dateRangeText, inDateRange, matchesText } from '@/lib/criteria'
import { formatDateTime } from '@/lib/format'
import { useProcurementStore } from './store'
import type { PurchasePlan, PlanStatus } from './types'
import { monthName, thaiYear } from './utils'

const statusTone: Record<PlanStatus, PillTone> = { draft: 'gray', ordered: 'success', archived: 'neutral' }
const statusLabel: Record<PlanStatus, string> = { draft: 'ร่าง', ordered: 'สั่งซื้อแล้ว', archived: 'เก็บถาวร' }
const statusOrder: PlanStatus[] = ['draft', 'ordered', 'archived']

interface Criteria {
  query: string
  status: PlanStatus | 'all'
  creators: string[]
  createdFrom: string
  createdTo: string
}

const emptyCriteria: Criteria = { query: '', status: 'all', creators: [], createdFrom: '', createdTo: '' }
const pageSize = 10

export function PlansListPage() {
  const navigate = useNavigate()
  const plans = useProcurementStore((s) => s.plans)
  const { criteria, update, clear, page, setPage } = useListCriteria(emptyCriteria)
  const sheet = useFilterSheet()

  const needle = criteria.query.trim().toLowerCase()
  /** `skip` leaves one criterion out so the filter UI can show how many results each of its values would give. */
  const matches = (p: PurchasePlan, skip?: 'status' | 'creator') => {
    if (skip !== 'status' && criteria.status !== 'all' && p.status !== criteria.status) return false
    if (skip !== 'creator' && criteria.creators.length && !criteria.creators.includes(p.createdByName)) return false
    if (!inDateRange(p.createdAt, criteria.createdFrom, criteria.createdTo)) return false
    return matchesText(needle, p.name, p.createdByName, `${monthName(p.sourceMonth)} ${thaiYear(p.sourceYear)}`)
  }
  const rows = plans.filter((p) => matches(p))

  const statusCounts = countBy(plans.filter((p) => matches(p, 'status')), (p) => p.status)
  const creatorCounts = countBy(plans.filter((p) => matches(p, 'creator')), (p) => p.createdByName)
  const statusOptions = [
    { value: 'all' as const, label: 'ทั้งหมด', count: [...statusCounts.values()].reduce((a, b) => a + b, 0) },
    ...statusOrder.map((st) => ({ value: st, label: statusLabel[st], tone: statusTone[st], count: statusCounts.get(st) ?? 0 })),
  ]
  const creatorNames = [...new Set(plans.map((p) => p.createdByName))]

  const chips: CriteriaChip[] = [
    ...criteria.creators.map((name) => ({
      key: `c-${name}`,
      label: 'สร้างโดย',
      value: name,
      onRemove: () => update({ creators: criteria.creators.filter((x) => x !== name) }),
    })),
    ...(criteria.createdFrom || criteria.createdTo
      ? [{ key: 'created', label: 'สร้างเมื่อ', value: dateRangeText(criteria.createdFrom, criteria.createdTo), onRemove: () => update({ createdFrom: '', createdTo: '' }) }]
      : []),
  ]
  const hasAnyCriteria = chips.length > 0 || !!criteria.query || criteria.status !== 'all'

  const columns: DataTableColumn<PurchasePlan>[] = [
    { key: 'name', label: 'ชื่อแผน', sortValue: (p) => p.name.toLowerCase(), render: (p) => <span className="font-medium">{p.name}</span> },
    {
      key: 'source',
      label: 'เดือนอ้างอิง',
      sortValue: (p) => p.sourceYear * 12 + p.sourceMonth,
      render: (p) => (
        <span className="whitespace-nowrap">
          {monthName(p.sourceMonth)} {thaiYear(p.sourceYear)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'สถานะ',
      sortValue: (p) => p.status,
      render: (p) => <StatusPill tone={statusTone[p.status]}>{statusLabel[p.status]}</StatusPill>,
    },
    { key: 'createdBy', label: 'สร้างโดย', sortValue: (p) => p.createdByName.toLowerCase(), render: (p) => p.createdByName },
    {
      key: 'createdAt',
      label: 'สร้างเมื่อ',
      sortValue: (p) => p.createdAt,
      render: (p) => <span className="whitespace-nowrap">{formatDateTime(p.createdAt)}</span>,
    },
  ]

  return (
    <>
      <PageHeading section="จัดซื้อ" title="แผนจัดซื้อ" />
      <Card>
        <CardHeader
          title="แผนจัดซื้อ"
          subtitle="แต่ละแผนใช้ได้ครั้งเดียวต่อรอบการจัดซื้อ"
          action={
            <Button
              iconOnly
              round
              aria-label="สร้างแผนจัดซื้อ"
              title="สร้างแผนจัดซื้อ"
              onClick={() => navigate({ to: '/procurement/plans/new/step-1' })}
            >
              <IconPlus />
            </Button>
          }
        />

        <ListToolbar
          searchLabel="ค้นหาแผน"
          searchPlaceholder="ค้นหาชื่อแผน, ผู้สร้าง, เดือนอ้างอิง"
          query={criteria.query}
          onQueryChange={(query) => update({ query })}
          filters={
            <FilterSelect label="สถานะ" value={criteria.status} options={statusOptions} neutralValue="all" onChange={(status) => update({ status })} className="w-full sm:w-64" />
          }
          sheetCount={criteria.creators.length + (criteria.createdFrom || criteria.createdTo ? 1 : 0)}
          onOpenSheet={sheet.openSheet}
          chips={chips}
          resultText={`พบ ${rows.length} จาก ${plans.length} แผน`}
          hasCriteria={hasAnyCriteria}
          onClear={clear}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          pageSize={pageSize}
          page={page}
          onPageChange={setPage}
          emptyTitle="ไม่พบแผนจัดซื้อ"
          paginationVariant="jump"
          emptyDescription={hasAnyCriteria ? 'ลองลดเงื่อนไขหรือกด "ล้างเงื่อนไข"' : 'สร้างแผนใหม่เพื่อเริ่มต้น'}
          renderActions={(plan) => (
            <Button
              size="sm"
              variant="soft"
              iconOnly
              outlined
              aria-label="ดู"
              tooltip="ดู"
              onClick={() => navigate({ to: '/procurement/plans/$planId', params: { planId: plan.id } })}
            >
              <IconEye />
            </Button>
          )}
        />
      </Card>

      <FilterSheet
        open={sheet.open}
        onClose={sheet.closeSheet}
        title="ตัวกรองแผนจัดซื้อ"
        resultCount={rows.length}
        onClear={() => update({ creators: [], createdFrom: '', createdTo: '' })}
      >
        <MultiSelectList
          label="สร้างโดย"
          options={creatorNames.map((name) => ({ value: name, label: name, count: creatorCounts.get(name) ?? 0 }))}
          value={criteria.creators}
          onChange={(creators) => update({ creators })}
        />
        <DateRangePicker label="สร้างเมื่อ" from={criteria.createdFrom} to={criteria.createdTo} onChange={(createdFrom, createdTo) => update({ createdFrom, createdTo })} />
      </FilterSheet>
    </>
  )
}
