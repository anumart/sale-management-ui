import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye, IconPlus } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, DateRangePicker, FilterSelect, FilterSheet, ListToolbar, MultiSelectList, StatusPill, useFilterSheet, type CriteriaChip, type DataTableColumn } from '@/components/ui'
import { useListCriteria } from '@/hooks/useListCriteria'
import { countBy, dateRangeText, inDateRange, matchesText, sumCounts } from '@/lib/criteria'
import { NewVisitModal } from './NewVisitModal'
import { customerById, useSalesStore } from './store'
import type { ConsignmentVisit, VisitStatus } from './types'
import { formatDate, visitSoldByProduct, visitStatusLabel, visitStatusTone } from './utils'

const statusOrder: VisitStatus[] = ['draft', 'signed', 'cancelled']

interface Criteria {
  query: string
  status: VisitStatus | 'all'
  customerIds: string[]
  drivers: string[]
  dateFrom: string
  dateTo: string
}

const emptyCriteria: Criteria = { query: '', status: 'all', customerIds: [], drivers: [], dateFrom: '', dateTo: '' }

const units = (lines: { quantity: number }[]) => lines.reduce((sum, l) => sum + l.quantity, 0)

export function VisitsPage() {
  const navigate = useNavigate()
  const visits = useSalesStore((s) => s.visits)
  const [open, setOpen] = useState(false)
  const { criteria, update, clear, page, setPage } = useListCriteria(emptyCriteria)
  const sheet = useFilterSheet()

  const needle = criteria.query.trim().toLowerCase()
  /** `skip` leaves one criterion out so the filter UI can show how many results each of its values would give. */
  const matches = (v: ConsignmentVisit, skip?: 'status' | 'customer' | 'driver') => {
    if (skip !== 'status' && criteria.status !== 'all' && v.status !== criteria.status) return false
    if (skip !== 'customer' && criteria.customerIds.length && !criteria.customerIds.includes(v.customerId)) return false
    if (skip !== 'driver' && criteria.drivers.length && !criteria.drivers.includes(v.driverName)) return false
    if (!inDateRange(v.visitDate, criteria.dateFrom, criteria.dateTo)) return false
    return matchesText(needle, v.visitNumber, customerById(v.customerId)?.name, v.driverName)
  }
  const rows = visits.filter((v) => matches(v))

  const statusCounts = countBy(visits.filter((v) => matches(v, 'status')), (v) => v.status)
  const customerCounts = countBy(visits.filter((v) => matches(v, 'customer')), (v) => v.customerId)
  const driverCounts = countBy(visits.filter((v) => matches(v, 'driver')), (v) => v.driverName)
  const customerIds = [...new Set(visits.map((v) => v.customerId))]
  const driverNames = [...new Set(visits.map((v) => v.driverName))]
  const statusOptions = [
    { value: 'all' as const, label: 'ทั้งหมด', count: sumCounts(statusCounts) },
    ...statusOrder.map((st) => ({ value: st, label: visitStatusLabel[st], tone: visitStatusTone[st], count: statusCounts.get(st) ?? 0 })),
  ]

  const chips: CriteriaChip[] = [
    ...criteria.customerIds.map((id) => ({
      key: `c-${id}`,
      label: 'ร้าน',
      value: customerById(id)?.name ?? id,
      onRemove: () => update({ customerIds: criteria.customerIds.filter((x) => x !== id) }),
    })),
    ...criteria.drivers.map((name) => ({ key: `d-${name}`, label: 'คนขับ', value: name, onRemove: () => update({ drivers: criteria.drivers.filter((x) => x !== name) }) })),
    ...(criteria.dateFrom || criteria.dateTo
      ? [{ key: 'date', label: 'วันที่', value: dateRangeText(criteria.dateFrom, criteria.dateTo), onRemove: () => update({ dateFrom: '', dateTo: '' }) }]
      : []),
  ]
  const hasAnyCriteria = chips.length > 0 || !!criteria.query || criteria.status !== 'all'
  const drafts = visits.filter((v) => v.status === 'draft').length

  const columns: DataTableColumn<ConsignmentVisit>[] = [
    { key: 'number', label: 'เลขที่', sortValue: (v) => v.visitNumber, render: (v) => <span className="font-medium">{v.visitNumber}</span> },
    { key: 'date', label: 'วันที่', sortValue: (v) => v.visitDate, render: (v) => formatDate(v.visitDate) },
    { key: 'shop', label: 'ร้าน', sortValue: (v) => customerById(v.customerId)?.name ?? '', render: (v) => customerById(v.customerId)?.name },
    { key: 'driver', label: 'คนขับ', sortValue: (v) => v.driverName, render: (v) => v.driverName },
    { key: 'sold', label: 'ขายได้', sortValue: (v) => units([...visitSoldByProduct(v).values()].map((q) => ({ quantity: q }))), render: (v) => <span className="tabular-nums">{v.status === 'signed' ? units([...visitSoldByProduct(v).values()].map((q) => ({ quantity: q }))) : '—'}</span> },
    { key: 'spoiled', label: 'ของเสีย', sortValue: (v) => units(v.spoiled), render: (v) => <span className="tabular-nums">{units(v.spoiled) || '—'}</span> },
    { key: 'delivered', label: 'ส่งเข้าใหม่', sortValue: (v) => units(v.delivered), render: (v) => <span className="tabular-nums">{units(v.delivered) || '—'}</span> },
    { key: 'status', label: 'สถานะ', sortValue: (v) => v.status, render: (v) => <StatusPill tone={visitStatusTone[v.status]}>{visitStatusLabel[v.status]}</StatusPill> },
  ]

  return (
    <>
      <PageHeading section="ขาย" title="เข้าร้าน" subtitle="โจทย์ 2 — คนขับตรวจของที่เหลือ เก็บของเสียกลับ และสแกน LOT ใหม่เข้าร้าน" />
      <Card>
        <CardHeader
          title="การเข้าร้านทั้งหมด"
          subtitle={drafts > 0 ? `มี ${drafts} ใบที่ร้านยังไม่ได้ลงชื่อ` : undefined}
          action={
            <Button onClick={() => setOpen(true)}>
              <IconPlus />
              เข้าร้านใหม่
            </Button>
          }
        />

        <ListToolbar
          searchLabel="ค้นหาการเข้าร้าน"
          searchPlaceholder="ค้นหาเลขที่, ร้าน, คนขับ"
          query={criteria.query}
          onQueryChange={(query) => update({ query })}
          filters={
            <FilterSelect label="สถานะ" value={criteria.status} options={statusOptions} neutralValue="all" onChange={(status) => update({ status })} className="w-full sm:w-64" />
          }
          sheetCount={criteria.customerIds.length + criteria.drivers.length + (criteria.dateFrom || criteria.dateTo ? 1 : 0)}
          onOpenSheet={sheet.openSheet}
          chips={chips}
          resultText={`พบ ${rows.length} จาก ${visits.length} ครั้ง`}
          hasCriteria={hasAnyCriteria}
          onClear={clear}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(v) => v.id}
          defaultSort={{ key: 'date', dir: 'desc' }}
          pageSize={10}
          page={page}
          onPageChange={setPage}
          paginationVariant="jump"
          emptyTitle="ไม่พบการเข้าร้าน"
          emptyDescription={hasAnyCriteria ? 'ลองลดเงื่อนไขหรือกด "ล้างเงื่อนไข"' : undefined}
          renderActions={(v) => (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="เปิด" tooltip="เปิด" onClick={() => navigate({ to: '/sales/visits/$visitId', params: { visitId: v.id } })}>
              <IconEye />
            </Button>
          )}
        />
      </Card>

      <FilterSheet
        open={sheet.open}
        onClose={sheet.closeSheet}
        title="ตัวกรองการเข้าร้าน"
        resultCount={rows.length}
        onClear={() => update({ customerIds: [], drivers: [], dateFrom: '', dateTo: '' })}
      >
        <MultiSelectList
          label="ร้าน"
          options={customerIds.map((id) => ({ value: id, label: customerById(id)?.name ?? id, count: customerCounts.get(id) ?? 0 }))}
          value={criteria.customerIds}
          onChange={(ids) => update({ customerIds: ids })}
        />
        <MultiSelectList
          label="คนขับ"
          options={driverNames.map((name) => ({ value: name, label: name, count: driverCounts.get(name) ?? 0 }))}
          value={criteria.drivers}
          onChange={(drivers) => update({ drivers })}
        />
        <DateRangePicker label="วันที่เข้าร้าน" from={criteria.dateFrom} to={criteria.dateTo} onChange={(dateFrom, dateTo) => update({ dateFrom, dateTo })} />
      </FilterSheet>
      <NewVisitModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
