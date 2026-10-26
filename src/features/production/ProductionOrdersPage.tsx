import { useNavigate } from '@tanstack/react-router'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, DateRangePicker, FilterSelect, FilterSheet, ListToolbar, MultiSelectList, StatusPill, useFilterSheet, type CriteriaChip, type DataTableColumn } from '@/components/ui'
import { finishedGoodById } from '@/features/procurement/mockData'
import { useListCriteria } from '@/hooks/useListCriteria'
import { countBy, dateRangeText, inDateRange, matchesText, sumCounts } from '@/lib/criteria'
import { formatDateTime } from '@/lib/format'
import { useProductionStore } from './store'
import type { ProductionOrder, ProductionOrderStatus, ProductionSource, QcStatus } from './types'
import { routeById } from '@/features/sales/consignmentStore'
import { customerById, customerOrderById } from '@/features/sales/store'
import { formatDate } from '@/features/sales/utils'
import { orderStatusLabel, orderStatusTone, qcStatusLabel, qcStatusTone, sourceLabel } from './utils'

const statusOrder: ProductionOrderStatus[] = ['draft', 'confirmed', 'in_production', 'completed']
const qcOrder: QcStatus[] = ['pending', 'passed', 'failed']
const sourceOrder: ProductionSource[] = ['customer_order', 'consignment_route', 'manual']

interface Criteria {
  query: string
  status: ProductionOrderStatus | 'all'
  qc: string[]
  sources: string[]
  productIds: string[]
  startFrom: string
  startTo: string
}

const emptyCriteria: Criteria = { query: '', status: 'all', qc: [], sources: [], productIds: [], startFrom: '', startTo: '' }

export function ProductionOrdersPage() {
  const navigate = useNavigate()
  const orders = useProductionStore((s) => s.orders)
  const { criteria, update, clear, page, setPage } = useListCriteria(emptyCriteria)
  const sheet = useFilterSheet()

  const needle = criteria.query.trim().toLowerCase()
  /** `skip` leaves one criterion out so the filter UI can show how many results each of its values would give. */
  const matches = (o: ProductionOrder, skip?: 'status' | 'qc' | 'source' | 'product') => {
    if (skip !== 'status' && criteria.status !== 'all' && o.status !== criteria.status) return false
    if (skip !== 'qc' && criteria.qc.length && !criteria.qc.includes(o.qcStatus)) return false
    if (skip !== 'source' && criteria.sources.length && !criteria.sources.includes(o.source)) return false
    if (skip !== 'product' && criteria.productIds.length && !criteria.productIds.includes(o.finishedGoodId)) return false
    if (!inDateRange(o.startDate, criteria.startFrom, criteria.startTo)) return false
    return matchesText(
      needle,
      o.orderNumber,
      o.batchNumber,
      finishedGoodById(o.finishedGoodId)?.name,
      customerById(o.customerId)?.name,
      o.customerOrderId ? customerOrderById(o.customerOrderId)?.orderNumber : undefined,
    )
  }
  const rows = orders.filter((o) => matches(o))

  const statusCounts = countBy(orders.filter((o) => matches(o, 'status')), (o) => o.status)
  const qcCounts = countBy(orders.filter((o) => matches(o, 'qc')), (o) => o.qcStatus)
  const sourceCounts = countBy(orders.filter((o) => matches(o, 'source')), (o) => o.source)
  const productCounts = countBy(orders.filter((o) => matches(o, 'product')), (o) => o.finishedGoodId)
  const productIds = [...new Set(orders.map((o) => o.finishedGoodId))]
  const statusOptions = [
    { value: 'all' as const, label: 'ทั้งหมด', count: sumCounts(statusCounts) },
    ...statusOrder.map((st) => ({ value: st, label: orderStatusLabel[st], tone: orderStatusTone[st], count: statusCounts.get(st) ?? 0 })),
  ]

  const chips: CriteriaChip[] = [
    ...criteria.qc.map((v) => ({ key: `qc-${v}`, label: 'QC', value: qcStatusLabel[v as QcStatus], onRemove: () => update({ qc: criteria.qc.filter((x) => x !== v) }) })),
    ...criteria.sources.map((v) => ({
      key: `src-${v}`,
      label: 'ผลิตให้',
      value: sourceLabel[v as ProductionSource],
      onRemove: () => update({ sources: criteria.sources.filter((x) => x !== v) }),
    })),
    ...criteria.productIds.map((id) => ({
      key: `p-${id}`,
      label: 'สินค้า',
      value: finishedGoodById(id)?.name ?? id,
      onRemove: () => update({ productIds: criteria.productIds.filter((x) => x !== id) }),
    })),
    ...(criteria.startFrom || criteria.startTo
      ? [{ key: 'start', label: 'เริ่มเมื่อ', value: dateRangeText(criteria.startFrom, criteria.startTo), onRemove: () => update({ startFrom: '', startTo: '' }) }]
      : []),
  ]
  const hasAnyCriteria = chips.length > 0 || !!criteria.query || criteria.status !== 'all'
  const inProductionCount = orders.filter((o) => o.status === 'in_production').length

  const columns: DataTableColumn<ProductionOrder>[] = [
    { key: 'orderNumber', label: 'เลขที่', sortValue: (o) => o.orderNumber, render: (o) => <span className="font-medium">{o.orderNumber}</span> },
    { key: 'fg', label: 'สินค้าสำเร็จรูป', sortValue: (o) => (finishedGoodById(o.finishedGoodId)?.name ?? '').toLowerCase(), render: (o) => finishedGoodById(o.finishedGoodId)?.name },
    {
      key: 'for',
      label: 'ผลิตให้',
      sortValue: (o) => o.source,
      render: (o) => (
        <div>
          <p>
            {o.customerOrderId
              ? customerOrderById(o.customerOrderId)?.orderNumber
              : o.consignmentRouteId
                ? `สาย ${routeById(o.consignmentRouteId)?.code ?? ''}`
                : (customerById(o.customerId)?.name ?? 'เข้าสต็อก')}
          </p>
          <p className="text-sm text-muted">
            {o.customerOrderId ? customerById(o.customerId)?.name : o.consignmentRouteId ? `ส่ง ${formatDate(o.deliveryDate ?? '')}` : sourceLabel[o.source]}
          </p>
        </div>
      ),
    },
    { key: 'qty', label: 'จำนวนที่วางแผน', sortValue: (o) => o.plannedQuantity, render: (o) => <span className="tabular-nums">{o.plannedQuantity} {finishedGoodById(o.finishedGoodId)?.unit}</span> },
    { key: 'status', label: 'สถานะ', sortValue: (o) => o.status, render: (o) => <StatusPill tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status]}</StatusPill> },
    { key: 'qc', label: 'QC', sortValue: (o) => o.qcStatus, render: (o) => <StatusPill tone={qcStatusTone[o.qcStatus]}>{qcStatusLabel[o.qcStatus]}</StatusPill> },
    { key: 'yield', label: 'Yield', sortValue: (o) => o.yieldRate ?? -1, render: (o) => (o.yieldRate !== null ? <span className="tabular-nums">{o.yieldRate}%</span> : '—') },
    { key: 'started', label: 'เริ่มเมื่อ', sortValue: (o) => o.startDate ?? '', render: (o) => (o.startDate ? formatDateTime(o.startDate) : '—') },
  ]

  return (
    <>
      <PageHeading section="ผลิต" title="ใบสั่งผลิต" />
      <Card>
        <CardHeader
          title="ใบสั่งผลิตทั้งหมด"
          subtitle="เปิดใบสั่งผลิตเพื่อเบิกวัตถุดิบ ติดตาม QC และปิดการผลิต"
        />

        <ListToolbar
          searchLabel="ค้นหาใบสั่งผลิต"
          searchPlaceholder="ค้นหาเลขที่, สินค้า, ลูกค้า, คำสั่งซื้อ, LOT"
          query={criteria.query}
          onQueryChange={(query) => update({ query })}
          filters={
            <FilterSelect label="สถานะ" value={criteria.status} options={statusOptions} neutralValue="all" onChange={(status) => update({ status })} className="w-full sm:w-64" />
          }
          sheetCount={criteria.qc.length + criteria.sources.length + criteria.productIds.length + (criteria.startFrom || criteria.startTo ? 1 : 0)}
          onOpenSheet={sheet.openSheet}
          chips={chips}
          resultText={`พบ ${rows.length} จาก ${orders.length} ใบสั่งผลิต`}
          hasCriteria={hasAnyCriteria}
          onClear={clear}
        />

        {inProductionCount > 0 && (
          <div className="mb-4">
            <StatusPill tone="warning">กำลังผลิตอยู่ {inProductionCount} ใบ</StatusPill>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(o) => o.id}
          defaultSort={{ key: 'orderNumber', dir: 'desc' }}
          pageSize={10}
          page={page}
          onPageChange={setPage}
          paginationVariant="jump"
          emptyTitle="ไม่พบใบสั่งผลิต"
          emptyDescription={hasAnyCriteria ? 'ลองลดเงื่อนไขหรือกด "ล้างเงื่อนไข"' : 'สร้างได้ที่หน้าวางแผนผลิต จากคำสั่งซื้อหรือเลือกสินค้าเอง'}
          renderActions={(o) => (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="ดู" tooltip="ดู" onClick={() => navigate({ to: '/production/orders/$orderId', params: { orderId: o.id } })}>
              <IconEye />
            </Button>
          )}
        />
      </Card>

      <FilterSheet
        open={sheet.open}
        onClose={sheet.closeSheet}
        title="ตัวกรองใบสั่งผลิต"
        resultCount={rows.length}
        onClear={() => update({ qc: [], sources: [], productIds: [], startFrom: '', startTo: '' })}
      >
        <MultiSelectList
          label="สินค้าสำเร็จรูป"
          options={productIds.map((id) => ({ value: id, label: finishedGoodById(id)?.name ?? id, count: productCounts.get(id) ?? 0 }))}
          value={criteria.productIds}
          onChange={(next) => update({ productIds: next })}
        />
        <MultiSelectList
          label="ผลการตรวจ QC"
          options={qcOrder.map((v) => ({ value: v, label: qcStatusLabel[v], count: qcCounts.get(v) ?? 0 }))}
          value={criteria.qc}
          onChange={(qc) => update({ qc })}
        />
        <MultiSelectList
          label="ผลิตให้"
          options={sourceOrder.map((v) => ({ value: v, label: sourceLabel[v], count: sourceCounts.get(v) ?? 0 }))}
          value={criteria.sources}
          onChange={(sources) => update({ sources })}
        />
        <DateRangePicker label="เริ่มผลิตเมื่อ" from={criteria.startFrom} to={criteria.startTo} onChange={(startFrom, startTo) => update({ startFrom, startTo })} />
      </FilterSheet>
    </>
  )
}
