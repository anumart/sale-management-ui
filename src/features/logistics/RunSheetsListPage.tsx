import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye, IconPlus } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, SegmentedControl, StatusPill, type DataTableColumn } from '@/components/ui'
import { formatDateTime } from '@/lib/format'
import { pickupPointById } from './mockData'
import { useLogisticsStore, vehicleById, vehicleRouteById } from './store'
import type { RunSheet, RunSheetStatus } from './types'
import { runSheetStatusLabel, runSheetStatusTone } from './utils'

const pageSize = 5

export function RunSheetsListPage() {
  const navigate = useNavigate()
  const runSheets = useLogisticsStore((s) => s.runSheets)
  const [status, setStatus] = useState<RunSheetStatus | 'all'>('all')
  const [page, setPage] = useState(1)

  const filtered = runSheets.filter((rs) => status === 'all' || rs.status === status)

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
            <div className="flex flex-wrap items-center gap-2.5">
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
                  { value: 'draft', label: 'ร่าง' },
                  { value: 'printed', label: 'พิมพ์แล้ว' },
                  { value: 'in_progress', label: 'กำลังดำเนินการ' },
                  { value: 'completed', label: 'เสร็จแล้ว' },
                ]}
              />
              <Button onClick={() => navigate({ to: '/logistics/run-sheets/generate' })}>
                <IconPlus />
                สร้างใบวิ่งรถ
              </Button>
            </div>
          }
        />

        {(printedCount > 0 || inProgressCount > 0) && (
          <div className="mb-5 flex flex-wrap gap-2">
            {printedCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatus('printed')
                  setPage(1)
                }}
                className="rounded-full"
              >
                <StatusPill tone="info">{printedCount} out for pickup — awaiting driver return</StatusPill>
              </button>
            )}
            {inProgressCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatus('in_progress')
                  setPage(1)
                }}
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
          emptyTitle="ไม่พบใบวิ่งรถ"
          emptyDescription="สร้างใบวิ่งรถเพื่อรวมการรับของสำหรับรถแต่ละคัน"
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
    </>
  )
}
