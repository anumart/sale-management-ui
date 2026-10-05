import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye, IconPlus } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, SegmentedControl, StatusPill, type DataTableColumn } from '@/components/ui'
import { NewVisitModal } from './NewVisitModal'
import { customerById, useSalesStore } from './store'
import type { ConsignmentVisit, VisitStatus } from './types'
import { formatDate, visitSoldByProduct, visitStatusLabel, visitStatusTone } from './utils'

const units = (lines: { quantity: number }[]) => lines.reduce((sum, l) => sum + l.quantity, 0)

export function VisitsPage() {
  const navigate = useNavigate()
  const visits = useSalesStore((s) => s.visits)
  const [status, setStatus] = useState<VisitStatus | 'all'>('all')
  const [open, setOpen] = useState(false)

  const rows = visits.filter((v) => status === 'all' || v.status === status)
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
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl
                variant="mask"
                aria-label="กรองตามสถานะ"
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'all', label: 'ทั้งหมด' },
                  { value: 'draft', label: 'ร่าง' },
                  { value: 'signed', label: 'ลงชื่อแล้ว' },
                ]}
              />
              <Button onClick={() => setOpen(true)}>
                <IconPlus />
                เข้าร้านใหม่
              </Button>
            </div>
          }
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(v) => v.id}
          defaultSort={{ key: 'date', dir: 'desc' }}
          pageSize={10}
          emptyTitle="ไม่มีการเข้าร้านในมุมมองนี้"
          renderActions={(v) => (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="เปิด" tooltip="เปิด" onClick={() => navigate({ to: '/sales/visits/$visitId', params: { visitId: v.id } })}>
              <IconEye />
            </Button>
          )}
        />
      </Card>
      <NewVisitModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
