import { useNavigate } from '@tanstack/react-router'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, DateRangePicker, FilterSelect, FilterSheet, ListToolbar, MultiSelectList, StatusPill, useFilterSheet, type CriteriaChip, type DataTableColumn } from '@/components/ui'
import { useListCriteria } from '@/hooks/useListCriteria'
import { countBy, dateRangeText, inDateRange, matchesText, sumCounts } from '@/lib/criteria'
import { customerById, useSalesStore } from './store'
import type { Invoice, InvoiceSource, InvoiceStatus } from './types'
import { formatBaht, formatDate, invoiceStatusLabel, invoiceStatusTone, invoiceTotal } from './utils'

const statusOrder: InvoiceStatus[] = ['issued', 'paid']
const sourceLabel: Record<InvoiceSource, string> = { customer_order: 'คำสั่งซื้อ', sales_report: 'รายงานยอดขายของร้าน' }

interface Criteria {
  query: string
  status: InvoiceStatus | 'all'
  customerIds: string[]
  sources: string[]
  issuedFrom: string
  issuedTo: string
  dueFrom: string
  dueTo: string
}

const emptyCriteria: Criteria = { query: '', status: 'all', customerIds: [], sources: [], issuedFrom: '', issuedTo: '', dueFrom: '', dueTo: '' }

export function InvoicesPage() {
  const navigate = useNavigate()
  const invoices = useSalesStore((s) => s.invoices)
  const orders = useSalesStore((s) => s.orders)
  const reports = useSalesStore((s) => s.reports)
  const { criteria, update, clear, page, setPage } = useListCriteria(emptyCriteria)
  const sheet = useFilterSheet()

  const outstanding = invoices.filter((i) => i.status === 'issued').reduce((sum, i) => sum + invoiceTotal(i), 0)
  const sourceNumber = (i: Invoice) =>
    i.source === 'customer_order' ? orders.find((o) => o.id === i.sourceId)?.orderNumber : reports.find((r) => r.id === i.sourceId)?.reportNumber

  const needle = criteria.query.trim().toLowerCase()
  /** `skip` leaves one criterion out so the filter UI can show how many results each of its values would give. */
  const matches = (i: Invoice, skip?: 'status' | 'customer' | 'source') => {
    if (skip !== 'status' && criteria.status !== 'all' && i.status !== criteria.status) return false
    if (skip !== 'customer' && criteria.customerIds.length && !criteria.customerIds.includes(i.customerId)) return false
    if (skip !== 'source' && criteria.sources.length && !criteria.sources.includes(i.source)) return false
    if (!inDateRange(i.issuedAt, criteria.issuedFrom, criteria.issuedTo)) return false
    if (!inDateRange(i.dueDate, criteria.dueFrom, criteria.dueTo)) return false
    return matchesText(needle, i.invoiceNumber, customerById(i.customerId)?.name, sourceNumber(i))
  }
  const rows = invoices.filter((i) => matches(i))

  const statusCounts = countBy(invoices.filter((i) => matches(i, 'status')), (i) => i.status)
  const customerCounts = countBy(invoices.filter((i) => matches(i, 'customer')), (i) => i.customerId)
  const sourceCounts = countBy(invoices.filter((i) => matches(i, 'source')), (i) => i.source)
  const customerIds = [...new Set(invoices.map((i) => i.customerId))]
  const statusOptions = [
    { value: 'all' as const, label: 'ทั้งหมด', count: sumCounts(statusCounts) },
    ...statusOrder.map((st) => ({ value: st, label: invoiceStatusLabel[st], tone: invoiceStatusTone[st], count: statusCounts.get(st) ?? 0 })),
  ]

  const chips: CriteriaChip[] = [
    ...criteria.customerIds.map((id) => ({
      key: `c-${id}`,
      label: 'ลูกค้า',
      value: customerById(id)?.name ?? id,
      onRemove: () => update({ customerIds: criteria.customerIds.filter((x) => x !== id) }),
    })),
    ...criteria.sources.map((v) => ({
      key: `s-${v}`,
      label: 'อ้างอิง',
      value: sourceLabel[v as InvoiceSource],
      onRemove: () => update({ sources: criteria.sources.filter((x) => x !== v) }),
    })),
    ...(criteria.issuedFrom || criteria.issuedTo
      ? [{ key: 'issued', label: 'ออกเมื่อ', value: dateRangeText(criteria.issuedFrom, criteria.issuedTo), onRemove: () => update({ issuedFrom: '', issuedTo: '' }) }]
      : []),
    ...(criteria.dueFrom || criteria.dueTo
      ? [{ key: 'due', label: 'ครบกำหนด', value: dateRangeText(criteria.dueFrom, criteria.dueTo), onRemove: () => update({ dueFrom: '', dueTo: '' }) }]
      : []),
  ]
  const hasAnyCriteria = chips.length > 0 || !!criteria.query || criteria.status !== 'all'
  const sheetCount = criteria.customerIds.length + criteria.sources.length + (criteria.issuedFrom || criteria.issuedTo ? 1 : 0) + (criteria.dueFrom || criteria.dueTo ? 1 : 0)

  const columns: DataTableColumn<Invoice>[] = [
    { key: 'number', label: 'เลขที่', sortValue: (i) => i.invoiceNumber, render: (i) => <span className="font-medium">{i.invoiceNumber}</span> },
    { key: 'customer', label: 'ลูกค้า', sortValue: (i) => customerById(i.customerId)?.name ?? '', render: (i) => customerById(i.customerId)?.name },
    {
      key: 'source',
      label: 'อ้างอิง',
      sortValue: (i) => sourceNumber(i) ?? '',
      render: (i) => (
        <div>
          <p>{sourceNumber(i)}</p>
          <p className="text-sm text-muted">{sourceLabel[i.source]}</p>
        </div>
      ),
    },
    { key: 'issued', label: 'ออกเมื่อ', sortValue: (i) => i.issuedAt, render: (i) => formatDate(i.issuedAt) },
    { key: 'due', label: 'ครบกำหนด', sortValue: (i) => i.dueDate, render: (i) => formatDate(i.dueDate) },
    { key: 'total', label: 'ยอดรวม', sortValue: (i) => invoiceTotal(i), render: (i) => <span className="tabular-nums">{formatBaht(invoiceTotal(i))}</span> },
    { key: 'status', label: 'สถานะ', sortValue: (i) => i.status, render: (i) => <StatusPill tone={invoiceStatusTone[i.status]}>{invoiceStatusLabel[i.status]}</StatusPill> },
  ]

  return (
    <>
      <PageHeading section="ขาย" title="ใบแจ้งหนี้" subtitle="ขายขาดคิดเงินจากคำสั่งซื้อ ส่วนร้านฝากขายคิดเงินหลังยืนยันรายงานยอดขายแล้ว" />
      <Card>
        <CardHeader
          title="ใบแจ้งหนี้ทั้งหมด"
          subtitle={`ค้างชำระ ${formatBaht(outstanding)}`}
        />

        <ListToolbar
          searchLabel="ค้นหาใบแจ้งหนี้"
          searchPlaceholder="ค้นหาเลขที่ใบแจ้งหนี้, ลูกค้า, เลขที่อ้างอิง"
          query={criteria.query}
          onQueryChange={(query) => update({ query })}
          filters={
            <FilterSelect label="สถานะ" value={criteria.status} options={statusOptions} neutralValue="all" onChange={(status) => update({ status })} className="w-full sm:w-64" />
          }
          sheetCount={sheetCount}
          onOpenSheet={sheet.openSheet}
          chips={chips}
          resultText={`พบ ${rows.length} จาก ${invoices.length} ใบแจ้งหนี้`}
          hasCriteria={hasAnyCriteria}
          onClear={clear}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(i) => i.id}
          defaultSort={{ key: 'issued', dir: 'desc' }}
          pageSize={10}
          page={page}
          onPageChange={setPage}
          paginationVariant="jump"
          emptyTitle="ไม่พบใบแจ้งหนี้"
          emptyDescription={hasAnyCriteria ? 'ลองลดเงื่อนไขหรือกด "ล้างเงื่อนไข"' : undefined}
          renderActions={(i) => (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="ดู" tooltip="ดู" onClick={() => navigate({ to: '/sales/invoices/$invoiceId', params: { invoiceId: i.id } })}>
              <IconEye />
            </Button>
          )}
        />
      </Card>

      <FilterSheet
        open={sheet.open}
        onClose={sheet.closeSheet}
        title="ตัวกรองใบแจ้งหนี้"
        resultCount={rows.length}
        onClear={() => update({ customerIds: [], sources: [], issuedFrom: '', issuedTo: '', dueFrom: '', dueTo: '' })}
      >
        <MultiSelectList
          label="ลูกค้า"
          options={customerIds.map((id) => ({ value: id, label: customerById(id)?.name ?? id, count: customerCounts.get(id) ?? 0 }))}
          value={criteria.customerIds}
          onChange={(ids) => update({ customerIds: ids })}
        />
        <MultiSelectList
          label="อ้างอิงจาก"
          options={(Object.keys(sourceLabel) as InvoiceSource[]).map((v) => ({ value: v, label: sourceLabel[v], count: sourceCounts.get(v) ?? 0 }))}
          value={criteria.sources}
          onChange={(sources) => update({ sources })}
        />
        <DateRangePicker label="ออกเมื่อ" from={criteria.issuedFrom} to={criteria.issuedTo} onChange={(issuedFrom, issuedTo) => update({ issuedFrom, issuedTo })} />
        <DateRangePicker label="ครบกำหนด" from={criteria.dueFrom} to={criteria.dueTo} onChange={(dueFrom, dueTo) => update({ dueFrom, dueTo })} />
      </FilterSheet>
    </>
  )
}
