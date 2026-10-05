import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye, IconPlus } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, SegmentedControl, StatusPill, TextField, type DataTableColumn } from '@/components/ui'
import { NewSalesReportModal } from './NewSalesReportModal'
import { customerById, useSalesStore } from './store'
import type { SalesReport, SalesReportStatus } from './types'
import { formatDateTime } from '@/lib/format'
import { formatDate, reconcileReport, reportStatusLabel, reportStatusTone } from './utils'

export function SalesReportsPage() {
  const navigate = useNavigate()
  const reports = useSalesStore((s) => s.reports)
  const visits = useSalesStore((s) => s.visits)
  const tolerancePct = useSalesStore((s) => s.tolerancePct)
  const setTolerancePct = useSalesStore((s) => s.setTolerancePct)
  const [status, setStatus] = useState<SalesReportStatus | 'all'>('all')
  const [open, setOpen] = useState(false)

  const rows = reports.filter((r) => status === 'all' || r.status === status)
  const flagged = (r: SalesReport) => reconcileReport(r, visits, tolerancePct).filter((row) => !row.withinTolerance).length

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
              <SegmentedControl
                variant="mask"
                aria-label="กรองตามสถานะ"
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'all', label: 'ทั้งหมด' },
                  { value: 'pending', label: 'รอตรวจ' },
                  { value: 'confirmed', label: 'ยืนยันแล้ว' },
                  { value: 'invoiced', label: 'ออกใบแจ้งหนี้แล้ว' },
                ]}
              />
              <Button onClick={() => setOpen(true)}>
                <IconPlus />
                บันทึกรายงาน
              </Button>
            </div>
          }
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          defaultSort={{ key: 'received', dir: 'desc' }}
          pageSize={10}
          emptyTitle="ไม่มีรายงานในมุมมองนี้"
          renderActions={(r) => (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="เปิด" tooltip="เปิด" onClick={() => navigate({ to: '/sales/reports/$reportId', params: { reportId: r.id } })}>
              <IconEye />
            </Button>
          )}
        />
      </Card>
      <NewSalesReportModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
