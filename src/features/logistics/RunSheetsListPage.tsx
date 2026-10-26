import { useNavigate } from '@tanstack/react-router'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye, IconPlus } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, DateRangePicker, FilterSelect, FilterSheet, ListToolbar, MultiSelectList, StatusPill, useFilterSheet, type CriteriaChip, type DataTableColumn } from '@/components/ui'
import { useListCriteria } from '@/hooks/useListCriteria'
import { countBy, dateRangeText, inDateRange, matchesText } from '@/lib/criteria'
import { formatDateTime } from '@/lib/format'
import { pickupPointById } from './mockData'
import { useLogisticsStore, vehicleById, vehicleRouteById } from './store'
import type { RunSheet, RunSheetStatus } from './types'
import { runSheetStatusLabel, runSheetStatusTone } from './utils'

const statusOrder: RunSheetStatus[] = ['draft', 'printed', 'in_progress', 'completed']

interface Criteria {
  query: string
  status: RunSheetStatus | 'all'
  vehicleIds: string[]
  routeIds: string[]
  runFrom: string
  runTo: string
}

const emptyCriteria: Criteria = { query: '', status: 'all', vehicleIds: [], routeIds: [], runFrom: '', runTo: '' }
const pageSize = 10

export function RunSheetsListPage() {
  const navigate = useNavigate()
  const runSheets = useLogisticsStore((s) => s.runSheets)
  const vehicles = useLogisticsStore((s) => s.vehicles)
  const vehicleRoutes = useLogisticsStore((s) => s.vehicleRoutes)
  const { criteria, update, clear, page, setPage } = useListCriteria(emptyCriteria)
  const sheet = useFilterSheet()

  const needle = criteria.query.trim().toLowerCase()
  /** `skip` leaves one criterion out so the filter UI can show how many results each of its values would give. */
  const matches = (rs: RunSheet, skip?: 'status' | 'vehicle' | 'route') => {
    if (skip !== 'status' && criteria.status !== 'all' && rs.status !== criteria.status) return false
    if (skip !== 'vehicle' && criteria.vehicleIds.length && !criteria.vehicleIds.includes(rs.vehicleId)) return false
    if (skip !== 'route' && criteria.routeIds.length && !criteria.routeIds.includes(rs.vehicleRouteId)) return false
    if (!inDateRange(rs.runDate, criteria.runFrom, criteria.runTo)) return false
    const vehicle = vehicleById(rs.vehicleId)
    return matchesText(
      needle,
      rs.runSheetNumber,
      vehicle?.code,
      vehicle?.licensePlate,
      vehicleRouteById(rs.vehicleRouteId)?.routeName,
      ...rs.stops.map((st) => pickupPointById(st.pickupPointId)?.location),
    )
  }
  const filtered = runSheets.filter((rs) => matches(rs))

  const countFor = (skip: 'status' | 'vehicle' | 'route', key: 'status' | 'vehicleId' | 'vehicleRouteId') =>
    countBy(runSheets.filter((rs) => matches(rs, skip)), (rs) => rs[key])
  const statusCounts = countFor('status', 'status')
  const vehicleCounts = countFor('vehicle', 'vehicleId')
  const routeCounts = countFor('route', 'vehicleRouteId')
  const statusOptions = [
    { value: 'all' as const, label: 'ทั้งหมด', count: [...statusCounts.values()].reduce((a, b) => a + b, 0) },
    ...statusOrder.map((st) => ({ value: st, label: runSheetStatusLabel[st], tone: runSheetStatusTone[st], count: statusCounts.get(st) ?? 0 })),
  ]

  const chips: CriteriaChip[] = [
    ...criteria.vehicleIds.map((id) => ({
      key: `v-${id}`,
      label: 'รถ',
      value: vehicleById(id)?.code ?? id,
      onRemove: () => update({ vehicleIds: criteria.vehicleIds.filter((x) => x !== id) }),
    })),
    ...criteria.routeIds.map((id) => ({
      key: `r-${id}`,
      label: 'เส้นทาง',
      value: vehicleRouteById(id)?.routeName ?? id,
      onRemove: () => update({ routeIds: criteria.routeIds.filter((x) => x !== id) }),
    })),
    ...(criteria.runFrom || criteria.runTo
      ? [{ key: 'run', label: 'วันที่วิ่ง', value: dateRangeText(criteria.runFrom, criteria.runTo), onRemove: () => update({ runFrom: '', runTo: '' }) }]
      : []),
  ]
  const hasAnyCriteria = chips.length > 0 || !!criteria.query || criteria.status !== 'all'

  const printedCount = runSheets.filter((rs) => rs.status === 'printed').length
  const inProgressCount = runSheets.filter((rs) => rs.status === 'in_progress').length

  const columns: DataTableColumn<RunSheet>[] = [
    { key: 'runSheetNumber', label: 'เลขที่ใบวิ่งรถ', sortValue: (rs) => rs.runSheetNumber, render: (rs) => <span className="font-medium">{rs.runSheetNumber}</span> },
    {
      key: 'vehicle',
      label: 'รถ',
      sortValue: (rs) => (vehicleById(rs.vehicleId)?.code ?? '').toLowerCase(),
      render: (rs) => <span className="whitespace-nowrap">{vehicleById(rs.vehicleId)?.code}</span>,
    },
    {
      key: 'route',
      label: 'เส้นทาง',
      sortValue: (rs) => (vehicleRouteById(rs.vehicleRouteId)?.routeName ?? '').toLowerCase(),
      render: (rs) => vehicleRouteById(rs.vehicleRouteId)?.routeName,
    },
    {
      key: 'runDate',
      label: 'วันที่วิ่ง',
      sortValue: (rs) => rs.runDate,
      render: (rs) => <span className="whitespace-nowrap">{formatDateTime(rs.runDate)}</span>,
    },
    {
      key: 'stops',
      label: 'จุดจอด',
      sortValue: (rs) => rs.stops.length,
      render: (rs) => (
        <>
          {rs.stops.length}
          <span className="text-muted"> ({rs.stops.map((s) => pickupPointById(s.pickupPointId)?.location).join(', ')})</span>
        </>
      ),
    },
    {
      key: 'status',
      label: 'สถานะ',
      sortValue: (rs) => rs.status,
      render: (rs) => <StatusPill tone={runSheetStatusTone[rs.status]}>{runSheetStatusLabel[rs.status]}</StatusPill>,
    },
  ]

  return (
    <>
      <PageHeading section="ขนส่ง" title="ใบวิ่งรถ" />
      <Card>
        <CardHeader
          title="ใบวิ่งรถทั้งหมด"
          subtitle="จับคู่ใบกระดาษที่คนขับนำกลับมาด้วยเลขที่ใบวิ่งรถ (พิมพ์อยู่ด้านบน) แล้วบันทึกจำนวนที่รับจริง"
          action={
            <Button onClick={() => navigate({ to: '/logistics/run-sheets/generate' })}>
              <IconPlus />
              สร้างใบวิ่งรถ
            </Button>
          }
        />

        <ListToolbar
          searchLabel="ค้นหาใบวิ่งรถ"
          searchPlaceholder="ค้นหาเลขที่ใบวิ่งรถ, รถ, เส้นทาง, จุดจอด"
          query={criteria.query}
          onQueryChange={(query) => update({ query })}
          filters={
            <FilterSelect label="สถานะ" value={criteria.status} options={statusOptions} neutralValue="all" onChange={(status) => update({ status })} className="w-full sm:w-64" />
          }
          sheetCount={criteria.vehicleIds.length + criteria.routeIds.length + (criteria.runFrom || criteria.runTo ? 1 : 0)}
          onOpenSheet={sheet.openSheet}
          chips={chips}
          resultText={`พบ ${filtered.length} จาก ${runSheets.length} ใบวิ่งรถ`}
          hasCriteria={hasAnyCriteria}
          onClear={clear}
        />

        {(printedCount || inProgressCount > 0) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {printedCount > 0 && (
              <button
                type="button"
                onClick={() => update({ status: 'printed' })}
                className="rounded-full"
              >
                <StatusPill tone="info">{printedCount} out for pickup — awaiting driver return</StatusPill>
              </button>
            )}
            {inProgressCount > 0 && (
              <button
                type="button"
                onClick={() => update({ status: 'in_progress' })}
                className="rounded-full"
              >
                <StatusPill tone="warning">{inProgressCount} receipt(s) in progress</StatusPill>
              </button>
            )}
          </div>
        )}

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(rs) => rs.id}
          defaultSort={{ key: 'runDate', dir: 'desc' }}
          pageSize={pageSize}
          page={page}
          onPageChange={setPage}
          paginationVariant="jump"
          emptyTitle="ไม่พบใบวิ่งรถ"
          emptyDescription={hasAnyCriteria ? 'ลองลดเงื่อนไขหรือกด "ล้างเงื่อนไข"' : 'สร้างใบวิ่งรถเพื่อรวมการรับของสำหรับรถแต่ละคัน'}
          renderActions={(rs) => (
            <Button
              size="sm"
              variant="soft"
              iconOnly
              outlined
              aria-label="ดู"
              tooltip="ดู"
              onClick={() => navigate({ to: '/logistics/run-sheets/$runSheetId', params: { runSheetId: rs.id } })}
            >
              <IconEye />
            </Button>
          )}
        />
      </Card>

      <FilterSheet
        open={sheet.open}
        onClose={sheet.closeSheet}
        title="ตัวกรองใบวิ่งรถ"
        resultCount={filtered.length}
        onClear={() => update({ vehicleIds: [], routeIds: [], runFrom: '', runTo: '' })}
      >
        <MultiSelectList
          label="รถ"
          options={vehicles.map((v) => ({ value: v.id, label: `${v.code} (${v.licensePlate})`, count: vehicleCounts.get(v.id) ?? 0 }))}
          value={criteria.vehicleIds}
          onChange={(vehicleIds) => update({ vehicleIds })}
        />
        <MultiSelectList
          label="เส้นทาง"
          options={vehicleRoutes.map((r) => ({ value: r.id, label: r.routeName, count: routeCounts.get(r.id) ?? 0 }))}
          value={criteria.routeIds}
          onChange={(routeIds) => update({ routeIds })}
        />
        <DateRangePicker label="วันที่วิ่ง" from={criteria.runFrom} to={criteria.runTo} onChange={(runFrom, runTo) => update({ runFrom, runTo })} />
      </FilterSheet>
    </>
  )
}
