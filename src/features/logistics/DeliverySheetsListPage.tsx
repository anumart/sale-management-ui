import { useNavigate } from '@tanstack/react-router'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye, IconPlus } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, FilterSelect, ListToolbar, StatusPill, type DataTableColumn } from '@/components/ui'
import { useListCriteria } from '@/hooks/useListCriteria'
import { countBy, matchesText, sumCounts } from '@/lib/criteria'
import { formatDateTime } from '@/lib/format'
import { useSalesStore } from '@/features/sales/store'
import { formatDate } from '@/features/sales/utils'
import { useDeliveryStore } from './deliveryStore'
import { sheetStatus, sheetStatusLabel, sheetStatusTone, sheetTypeLabel, sheetTypeTone } from './deliveryUtils'
import { vehicleById } from './store'
import type { DeliverySheet, DeliverySheetStatus, DeliverySheetType } from './types'

const statusOrder: DeliverySheetStatus[] = ['draft', 'printed', 'completed', 'cancelled']
const typeOrder: DeliverySheetType[] = ['consignment_route', 'direct']

interface Criteria {
  query: string
  status: DeliverySheetStatus | 'all'
  type: DeliverySheetType | 'all'
}

const emptyCriteria: Criteria = { query: '', status: 'all', type: 'all' }

export function DeliverySheetsListPage() {
  const navigate = useNavigate()
  const sheets = useDeliveryStore((s) => s.sheets)
  const orders = useSalesStore((s) => s.orders)
  const visits = useSalesStore((s) => s.visits)
  const { criteria, update, clear, page, setPage } = useListCriteria(emptyCriteria)

  const withStatus = sheets.map((sheet) => ({ sheet, status: sheetStatus(sheet, orders, visits) }))
  type Row = (typeof withStatus)[number]

  const needle = criteria.query.trim().toLowerCase()
  /** `skip` leaves one criterion out so the filter UI can show how many results each of its values would give. */
  const matches = (r: Row, skip?: 'status' | 'type') => {
    if (skip !== 'status' && criteria.status !== 'all' && r.status !== criteria.status) return false
    if (skip !== 'type' && criteria.type !== 'all' && r.sheet.sheetType !== criteria.type) return false
    return matchesText(needle, r.sheet.sheetNumber, r.sheet.driverName, vehicleById(r.sheet.vehicleId)?.code)
  }
  const rows = withStatus.filter((r) => matches(r))
  const statusCounts = countBy(withStatus.filter((r) => matches(r, 'status')), (r) => r.status)
  const typeCounts = countBy(withStatus.filter((r) => matches(r, 'type')), (r) => r.sheet.sheetType)
  const hasCriteria = !!criteria.query || criteria.status !== 'all' || criteria.type !== 'all'

  const columns: DataTableColumn<Row>[] = [
    { key: 'number', label: 'เลขที่', sortValue: (r) => r.sheet.sheetNumber, render: (r) => <span className="font-medium">{r.sheet.sheetNumber}</span> },
    { key: 'type', label: 'แบบ', sortValue: (r) => r.sheet.sheetType, render: (r) => <StatusPill tone={sheetTypeTone[r.sheet.sheetType]}>{sheetTypeLabel[r.sheet.sheetType]}</StatusPill> },
    { key: 'date', label: 'วันส่ง', sortValue: (r) => r.sheet.deliveryDate, render: (r) => formatDate(r.sheet.deliveryDate) },
    { key: 'vehicle', label: 'รถ / คนขับ', sortValue: (r) => vehicleById(r.sheet.vehicleId)?.code ?? '', render: (r) => (
      <div>
        <p className="font-medium">{vehicleById(r.sheet.vehicleId)?.code}</p>
        <p className="text-sm text-muted">{r.sheet.driverName}</p>
      </div>
    ) },
    { key: 'stops', label: 'จุดส่ง', sortValue: (r) => r.sheet.stops.length, render: (r) => <span className="tabular-nums">{r.sheet.stops.length}</span> },
    { key: 'printed', label: 'พิมพ์เมื่อ', sortValue: (r) => r.sheet.printedAt ?? '', render: (r) => (r.sheet.printedAt ? formatDateTime(r.sheet.printedAt) : '—') },
    { key: 'status', label: 'สถานะ', sortValue: (r) => r.status, render: (r) => <StatusPill tone={sheetStatusTone[r.status]}>{sheetStatusLabel[r.status]}</StatusPill> },
  ]

  return (
    <>
      <PageHeading section="ขนส่ง" title="ใบส่งของ" subtitle="เอกสารเที่ยวส่งของ (ขาส่ง) เลือกรถ คนขับ และจุดส่ง แยก 2 แบบ: สายฝากขาย กับส่งตรง" />
      <Card>
        <CardHeader
          title="ใบส่งของทั้งหมด"
          action={
            <Button onClick={() => navigate({ to: '/logistics/delivery-sheets/new' })}>
              <IconPlus />
              ออกใบส่งของ
            </Button>
          }
        />
        <ListToolbar
          searchLabel="ค้นหาใบส่งของ"
          searchPlaceholder="ค้นหาเลขที่, รถ, คนขับ"
          query={criteria.query}
          onQueryChange={(query) => update({ query })}
          filters={
            <>
              <FilterSelect
                label="แบบ"
                value={criteria.type}
                neutralValue="all"
                onChange={(type) => update({ type })}
                options={[
                  { value: 'all' as const, label: 'ทั้งหมด', count: sumCounts(typeCounts) },
                  ...typeOrder.map((t) => ({ value: t, label: sheetTypeLabel[t], tone: sheetTypeTone[t], count: typeCounts.get(t) ?? 0 })),
                ]}
                className="w-full sm:w-56"
              />
              <FilterSelect
                label="สถานะ"
                value={criteria.status}
                neutralValue="all"
                onChange={(status) => update({ status })}
                options={[
                  { value: 'all' as const, label: 'ทั้งหมด', count: sumCounts(statusCounts) },
                  ...statusOrder.map((st) => ({ value: st, label: sheetStatusLabel[st], tone: sheetStatusTone[st], count: statusCounts.get(st) ?? 0 })),
                ]}
                className="w-full sm:w-56"
              />
            </>
          }
          resultText={`พบ ${rows.length} จาก ${sheets.length} ใบ`}
          hasCriteria={hasCriteria}
          onClear={clear}
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.sheet.id}
          defaultSort={{ key: 'date', dir: 'desc' }}
          pageSize={10}
          page={page}
          onPageChange={setPage}
          paginationVariant="jump"
          emptyTitle="ยังไม่มีใบส่งของ"
          emptyDescription={hasCriteria ? 'ลองลดเงื่อนไขหรือกด "ล้างเงื่อนไข"' : 'กด "ออกใบส่งของ" เพื่อสร้างเที่ยวส่งของ'}
          renderActions={(r) => (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="ดู" tooltip="ดู" onClick={() => navigate({ to: '/logistics/delivery-sheets/$sheetId', params: { sheetId: r.sheet.id } })}>
              <IconEye />
            </Button>
          )}
        />
      </Card>
    </>
  )
}

export type { DeliverySheet }
