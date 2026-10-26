import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye, IconPlus } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, DateRangePicker, FilterSelect, FilterSheet, ListToolbar, MultiSelectList, StatusPill, TextField, useFilterSheet, type CriteriaChip, type DataTableColumn } from '@/components/ui'
import { useListCriteria } from '@/hooks/useListCriteria'
import { countBy, dateRangeText, inDateRange, matchesText, sumCounts } from '@/lib/criteria'
import { NewSalesReportModal } from './NewSalesReportModal'
import { customerById, useSalesStore } from './store'
import type { SalesReport, SalesReportStatus } from './types'
import { formatDateTime } from '@/lib/format'
import { formatDate, reconcileReport, reportStatusLabel, reportStatusTone } from './utils'

const statusOrder: SalesReportStatus[] = ['pending', 'confirmed', 'invoiced']
const checkLabel: Record<string, string> = { ok: 'ตรงกัน', flagged: 'ไม่ตรง' }

interface Criteria {
  query: string
  status: SalesReportStatus | 'all'
  customerIds: string[]
  checks: string[]
  receivedFrom: string
  receivedTo: string
}

const emptyCriteria: Criteria = { query: '', status: 'all', customerIds: [], checks: [], receivedFrom: '', receivedTo: '' }

export function SalesReportsPage() {
  const navigate = useNavigate()
  const reports = useSalesStore((s) => s.reports)
  const visits = useSalesStore((s) => s.visits)
  const tolerancePct = useSalesStore((s) => s.tolerancePct)
  const setTolerancePct = useSalesStore((s) => s.setTolerancePct)
  const [open, setOpen] = useState(false)
  const { criteria, update, clear, page, setPage } = useListCriteria(emptyCriteria)
  const sheet = useFilterSheet()

  const flagged = (r: SalesReport) => reconcileReport(r, visits, tolerancePct).filter((row) => !row.withinTolerance).length

  const needle = criteria.query.trim().toLowerCase()
  /** `skip` leaves one criterion out so the filter UI can show how many results each of its values would give. */
  const matches = (r: SalesReport, skip?: 'status' | 'customer' | 'check') => {
    if (skip !== 'status' && criteria.status !== 'all' && r.status !== criteria.status) return false
    if (skip !== 'customer' && criteria.customerIds.length && !criteria.customerIds.includes(r.customerId)) return false
    if (skip !== 'check' && criteria.checks.length && !criteria.checks.includes(flagged(r) ? 'flagged' : 'ok')) return false
    if (!inDateRange(r.receivedAt, criteria.receivedFrom, criteria.receivedTo)) return false
    return matchesText(needle, r.reportNumber, customerById(r.customerId)?.name, r.note)
  }
  const rows = reports.filter((r) => matches(r))

  const statusCounts = countBy(reports.filter((r) => matches(r, 'status')), (r) => r.status)
  const customerCounts = countBy(reports.filter((r) => matches(r, 'customer')), (r) => r.customerId)
  const checkCounts = countBy(reports.filter((r) => matches(r, 'check')), (r) => (flagged(r) ? 'flagged' : 'ok'))
  const customerIds = [...new Set(reports.map((r) => r.customerId))]
  const statusOptions = [
    { value: 'all' as const, label: 'ทั้งหมด', count: sumCounts(statusCounts) },
    ...statusOrder.map((st) => ({ value: st, label: reportStatusLabel[st], tone: reportStatusTone[st], count: statusCounts.get(st) ?? 0 })),
  ]

  const chips: CriteriaChip[] = [
    ...criteria.customerIds.map((id) => ({
      key: `c-${id}`,
      label: 'ร้าน',
      value: customerById(id)?.name ?? id,
      onRemove: () => update({ customerIds: criteria.customerIds.filter((x) => x !== id) }),
    })),
    ...criteria.checks.map((v) => ({ key: `k-${v}`, label: 'ผลตรวจ', value: checkLabel[v], onRemove: () => update({ checks: criteria.checks.filter((x) => x !== v) }) })),
    ...(criteria.receivedFrom || criteria.receivedTo
      ? [{ key: 'received', label: 'รับเมื่อ', value: dateRangeText(criteria.receivedFrom, criteria.receivedTo), onRemove: () => update({ receivedFrom: '', receivedTo: '' }) }]
      : []),
  ]
  const hasAnyCriteria = chips.length > 0 || !!criteria.query || criteria.status !== 'all'

  const columns: DataTableColumn<SalesReport>[] = [
    { key: 'number', label: 'เลขที่', sortValue: (r) => r.reportNumber, render: (r) => <span className="font-medium">{r.reportNumber}</span> },
    { key: 'shop', label: 'ร้าน', sortValue: (r) => customerById(r.customerId)?.name ?? '', render: (r) => customerById(r.customerId)?.name },
    { key: 'period', label: 'ช่วงเวลา', sortValue: (r) => r.periodFrom, render: (r) => `${formatDate(r.periodFrom)} – ${formatDate(r.periodTo)}` },
    { key: 'received', label: 'รับเมื่อ', sortValue: (r) => r.receivedAt, render: (r) => formatDateTime(r.receivedAt) },
    {
      key: 'check',
      label: 'ผลตรวจ',
      sortValue: (r) => flagged(r),
      render: (r) => (flagged(r) ? <StatusPill tone="danger">ไม่ตรง {flagged(r)} รายการ</StatusPill> : <StatusPill tone="success">ตรงกัน</StatusPill>),
    },
    { key: 'status', label: 'สถานะ', sortValue: (r) => r.status, render: (r) => <StatusPill tone={reportStatusTone[r.status]}>{reportStatusLabel[r.status]}</StatusPill> },
  ]

  return (
    <>
      <PageHeading section="ขาย" title="ยอดขายจากร้าน" subtitle="ยอดที่ร้านฝากขายแจ้งว่าขายได้ ตรวจเทียบกับการเข้าร้านก่อนคิดเงิน" />
      <Card>
        <CardHeader
          title="รายงานทั้งหมด"
          subtitle="ยอดที่ควรขายได้ = จำนวนที่หายไปจากชั้นระหว่างการเข้าร้านที่ลงชื่อแล้วในช่วงของรายงาน"
          action={
            <div className="flex flex-wrap items-end gap-3">
              <TextField
                label="เกณฑ์ส่วนต่าง %"
                type="number"
                min={0}
                value={tolerancePct}
                onChange={(e) => setTolerancePct(Number(e.target.value) || 0)}
                hint="ค่าชั่วคราว"
                containerClassName="mb-0 w-28"
              />
              <Button onClick={() => setOpen(true)}>
                <IconPlus />
                บันทึกรายงาน
              </Button>
            </div>
          }
        />

        <ListToolbar
          searchLabel="ค้นหารายงาน"
          searchPlaceholder="ค้นหาเลขที่รายงาน, ร้าน, หมายเหตุ"
          query={criteria.query}
          onQueryChange={(query) => update({ query })}
          filters={
            <FilterSelect label="สถานะ" value={criteria.status} options={statusOptions} neutralValue="all" onChange={(status) => update({ status })} className="w-full sm:w-64" />
          }
          sheetCount={criteria.customerIds.length + criteria.checks.length + (criteria.receivedFrom || criteria.receivedTo ? 1 : 0)}
          onOpenSheet={sheet.openSheet}
          chips={chips}
          resultText={`พบ ${rows.length} จาก ${reports.length} รายงาน`}
          hasCriteria={hasAnyCriteria}
          onClear={clear}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          defaultSort={{ key: 'received', dir: 'desc' }}
          pageSize={10}
          page={page}
          onPageChange={setPage}
          paginationVariant="jump"
          emptyTitle="ไม่พบรายงาน"
          emptyDescription={hasAnyCriteria ? 'ลองลดเงื่อนไขหรือกด "ล้างเงื่อนไข"' : undefined}
          renderActions={(r) => (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="เปิด" tooltip="เปิด" onClick={() => navigate({ to: '/sales/reports/$reportId', params: { reportId: r.id } })}>
              <IconEye />
            </Button>
          )}
        />
      </Card>

      <FilterSheet
        open={sheet.open}
        onClose={sheet.closeSheet}
        title="ตัวกรองรายงานยอดขาย"
        resultCount={rows.length}
        onClear={() => update({ customerIds: [], checks: [], receivedFrom: '', receivedTo: '' })}
      >
        <MultiSelectList
          label="ร้าน"
          options={customerIds.map((id) => ({ value: id, label: customerById(id)?.name ?? id, count: customerCounts.get(id) ?? 0 }))}
          value={criteria.customerIds}
          onChange={(ids) => update({ customerIds: ids })}
        />
        <MultiSelectList
          label="ผลตรวจเทียบการเข้าร้าน"
          options={Object.keys(checkLabel).map((v) => ({ value: v, label: checkLabel[v], count: checkCounts.get(v) ?? 0 }))}
          value={criteria.checks}
          onChange={(checks) => update({ checks })}
        />
        <DateRangePicker label="รับเมื่อ" from={criteria.receivedFrom} to={criteria.receivedTo} onChange={(receivedFrom, receivedTo) => update({ receivedFrom, receivedTo })} />
      </FilterSheet>
      <NewSalesReportModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
