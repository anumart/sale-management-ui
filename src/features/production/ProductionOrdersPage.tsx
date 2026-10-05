import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, SegmentedControl, StatusPill, type DataTableColumn } from '@/components/ui'
import { finishedGoodById } from '@/features/procurement/mockData'
import { formatDateTime } from '@/lib/format'
import { useProductionStore } from './store'
import type { ProductionOrder, ProductionOrderStatus } from './types'
import { customerById, customerOrderById } from '@/features/sales/store'
import { orderStatusLabel, orderStatusTone, qcStatusLabel, qcStatusTone, sourceLabel } from './utils'

export function ProductionOrdersPage() {
  const navigate = useNavigate()
  const orders = useProductionStore((s) => s.orders)
  const [status, setStatus] = useState<ProductionOrderStatus | 'all'>('all')

  const rows = orders.filter((o) => status === 'all' || o.status === status)
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
          <p>{o.customerOrderId ? customerOrderById(o.customerOrderId)?.orderNumber : (customerById(o.customerId)?.name ?? 'เข้าสต็อก')}</p>
          <p className="text-sm text-muted">{o.customerOrderId ? customerById(o.customerId)?.name : sourceLabel[o.source]}</p>
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
          action={
            <SegmentedControl
              variant="mask"
              aria-label="กรองตามสถานะ"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'ทั้งหมด' },
                { value: 'confirmed', label: 'ยืนยันแล้ว' },
                { value: 'in_production', label: 'กำลังผลิต' },
                { value: 'completed', label: 'เสร็จแล้ว' },
              ]}
            />
          }
        />

        {inProductionCount > 0 && (
          <div className="mb-5">
            <StatusPill tone="warning">กำลังผลิตอยู่ {inProductionCount} ใบ</StatusPill>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(o) => o.id}
          defaultSort={{ key: 'orderNumber', dir: 'desc' }}
          emptyTitle="ไม่พบใบสั่งผลิต"
          emptyDescription="สร้างได้ที่หน้าวางแผนผลิต จากคำสั่งซื้อหรือเลือกสินค้าเอง"
          renderActions={(o) => (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="ดู" tooltip="ดู" onClick={() => navigate({ to: '/production/orders/$orderId', params: { orderId: o.id } })}>
              <IconEye />
            </Button>
          )}
        />
      </Card>
    </>
  )
}
