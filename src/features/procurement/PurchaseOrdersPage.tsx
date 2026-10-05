import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconArrowUpRight, IconCheck, IconClose, IconEye } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, SegmentedControl, StatusPill, type DataTableColumn } from '@/components/ui'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { planById, supplierById, useProcurementStore } from './store'
import type { PoStatus, PurchaseOrder } from './types'
import { poStatusLabel, poStatusTone } from './utils'

export function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const purchaseOrders = useProcurementStore((s) => s.purchaseOrders)
  const updatePurchaseOrderStatus = useProcurementStore((s) => s.updatePurchaseOrderStatus)
  const [status, setStatus] = useState<PoStatus | 'all'>('all')

  const handleSend = (po: PurchaseOrder, supplierName: string) => {
    if (updatePurchaseOrderStatus(po.id, 'sent')) toast.success(`ส่ง ${po.poNumber} ให้ ${supplierName} แล้ว`)
  }

  const handleConfirmBySupplier = (po: PurchaseOrder, supplierName: string) => {
    if (updatePurchaseOrderStatus(po.id, 'confirmed')) toast.success(`${supplierName} ยืนยัน ${po.poNumber} แล้ว`)
  }

  const handleCancel = async (po: PurchaseOrder, supplierName: string) => {
    const ok = await confirm({
      title: 'ยกเลิกใบสั่งซื้อ?',
      message: `${po.poNumber} ของ ${supplierName} (${formatCurrency(po.totalAmount)}) จะถูกยกเลิก ไม่สามารถย้อนกลับได้`,
      confirmLabel: 'ยกเลิกใบสั่งซื้อ',
      tone: 'danger',
    })
    if (!ok) return
    if (updatePurchaseOrderStatus(po.id, 'cancelled')) toast.success(`ยกเลิก ${po.poNumber} แล้ว`)
  }

  const rows = purchaseOrders.filter((po) => status === 'all' || po.status === status)

  const columns: DataTableColumn<PurchaseOrder>[] = [
    { key: 'poNumber', label: 'เลขที่ใบสั่งซื้อ', sortValue: (po) => po.poNumber, render: (po) => <span className="font-medium">{po.poNumber}</span> },
    { key: 'plan', label: 'แผน', sortValue: (po) => (planById(po.planId)?.name ?? '').toLowerCase(), render: (po) => planById(po.planId)?.name ?? '—' },
    {
      key: 'supplier',
      label: 'ซัพพลายเออร์',
      sortValue: (po) => (supplierById(po.supplierId)?.name ?? '').toLowerCase(),
      render: (po) => supplierById(po.supplierId)?.name ?? '—',
    },
    { key: 'amount', label: 'จำนวนเงิน', sortValue: (po) => po.totalAmount, render: (po) => <span className="tabular-nums">{formatCurrency(po.totalAmount)}</span> },
    {
      key: 'status',
      label: 'สถานะ',
      sortValue: (po) => po.status,
      render: (po) => <StatusPill tone={poStatusTone[po.status]}>{poStatusLabel[po.status]}</StatusPill>,
    },
    {
      key: 'delivery',
      label: 'กำหนดส่ง',
      sortValue: (po) => po.expectedDeliveryDate,
      render: (po) => <span className="whitespace-nowrap">{formatDateTime(po.expectedDeliveryDate)}</span>,
    },
  ]

  return (
    <>
      <PageHeading section="จัดซื้อ" title="ใบสั่งซื้อ" />
      <Card>
        <CardHeader
          title="ใบสั่งซื้อทั้งหมด"
          subtitle="การเปลี่ยนสถานะเก็บไว้เฉพาะรอบการใช้งานนี้ ไม่มีการส่งจริงถึงซัพพลายเออร์"
          action={
            <SegmentedControl
              variant="mask"
              aria-label="กรองตามสถานะ"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'ทั้งหมด' },
                { value: 'draft', label: 'ร่าง' },
                { value: 'sent', label: 'ส่งแล้ว' },
                { value: 'confirmed', label: 'ยืนยันแล้ว' },
                { value: 'received', label: 'รับของแล้ว' },
                { value: 'cancelled', label: 'ยกเลิก' },
              ]}
            />
          }
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(po) => po.id}
          emptyTitle="ไม่พบใบสั่งซื้อ"
          emptyDescription="ใบสั่งซื้อที่สร้างจากแผนจัดซื้อจะแสดงที่นี่"
          renderActions={(po) => {
            const supplier = supplierById(po.supplierId)
            return (
              <>
                <Button
                  size="sm"
                  variant="soft"
                  iconOnly
                  outlined
                  aria-label="ดู"
                  tooltip="ดู"
                  onClick={() => navigate({ to: '/procurement/purchase-orders/$poId', params: { poId: po.id } })}
                >
                  <IconEye />
                </Button>
                <Button
                  size="sm"
                  variant="accent"
                  iconOnly
                  outlined
                  aria-label="ส่งให้ซัพพลายเออร์"
                  tooltip="ส่งให้ซัพพลายเออร์"
                  disabled={po.status !== 'draft'}
                  onClick={() => handleSend(po, supplier?.name ?? 'ซัพพลายเออร์')}
                >
                  <IconArrowUpRight />
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  iconOnly
                  outlined
                  aria-label="ซัพพลายเออร์ยืนยันแล้ว"
                  tooltip="ซัพพลายเออร์ยืนยันแล้ว"
                  disabled={po.status !== 'sent'}
                  onClick={() => handleConfirmBySupplier(po, supplier?.name ?? 'ซัพพลายเออร์')}
                >
                  <IconCheck />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  iconOnly
                  outlined
                  aria-label="ยกเลิกใบสั่งซื้อ"
                  tooltip="ยกเลิกใบสั่งซื้อ"
                  disabled={!['draft', 'sent', 'confirmed'].includes(po.status)}
                  onClick={() => handleCancel(po, supplier?.name ?? 'ซัพพลายเออร์')}
                >
                  <IconClose />
                </Button>
              </>
            )
          }}
        />
      </Card>
    </>
  )
}
