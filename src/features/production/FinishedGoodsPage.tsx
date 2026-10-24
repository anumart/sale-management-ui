import { useNavigate } from '@tanstack/react-router'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, StatusPill, type DataTableColumn } from '@/components/ui'
import { getFinishedGoods } from '@/features/catalog/store'
import { finishedGoodById } from '@/features/procurement/mockData'
import type { FinishedGood } from '@/features/procurement/types'
import { useSalesStore } from '@/features/sales/store'
import { formatDateTime } from '@/lib/format'
import { useProductionStore } from './store'
import type { FinishedGoodsBatch } from './types'
import { batchGradeTone, batchStatusLabel, batchStatusTone, fgPosition } from './utils'

function InventoryTable() {
  const batches = useProductionStore((s) => s.batches)
  const shopStock = useSalesStore((s) => s.shopStock)
  const atShops = (fgId: string) => shopStock.filter((s) => s.finishedGoodId === fgId).reduce((sum, s) => sum + s.quantity, 0)

  const columns: DataTableColumn<FinishedGood>[] = [
    { key: 'name', label: 'สินค้าสำเร็จรูป', sortValue: (fg) => fg.name.toLowerCase(), render: (fg) => <span className="font-medium">{fg.name}</span> },
    { key: 'onHand', label: 'ในคลัง', sortValue: (fg) => fgPosition(batches, fg.id).onHand, render: (fg) => <span className="tabular-nums">{fgPosition(batches, fg.id).onHand} {fg.unit}</span> },
    { key: 'reserved', label: 'จองให้คำสั่งซื้อ', sortValue: (fg) => fgPosition(batches, fg.id).reserved, render: (fg) => <span className="tabular-nums">{fgPosition(batches, fg.id).reserved}</span> },
    {
      key: 'available',
      label: 'พร้อมส่ง',
      sortValue: (fg) => fgPosition(batches, fg.id).available,
      render: (fg) => <span className="font-medium tabular-nums">{fgPosition(batches, fg.id).available}</span>,
    },
    { key: 'lots', label: 'จำนวน LOT', sortValue: (fg) => fgPosition(batches, fg.id).lots, render: (fg) => fgPosition(batches, fg.id).lots },
    { key: 'shops', label: 'อยู่ที่ร้านฝากขาย', sortValue: (fg) => atShops(fg.id), render: (fg) => <span className="tabular-nums">{atShops(fg.id)}</span> },
  ]

  return (
    <Card className="mb-6">
      <CardHeader title="สต็อกสินค้าสำเร็จรูป" subtitle="จองให้คำสั่งซื้อ = LOT ที่ผลิตให้คำสั่งซื้อของลูกค้า (โจทย์ 1) ส่วนสต็อกว่างส่งไปร้านฝากขายได้ (โจทย์ 2)" />
      <DataTable columns={columns} rows={getFinishedGoods()} rowKey={(fg) => fg.id} emptyTitle="ยังไม่มีสินค้าสำเร็จรูป" />
    </Card>
  )
}

export function FinishedGoodsPage() {
  const navigate = useNavigate()
  const batches = useProductionStore((s) => s.batches)
  const orders = useSalesStore((s) => s.orders)

  const columns: DataTableColumn<FinishedGoodsBatch>[] = [
    { key: 'batchNumber', label: 'LOT', sortValue: (b) => b.batchNumber, render: (b) => <span className="font-medium">{b.batchNumber}</span> },
    { key: 'fg', label: 'สินค้าสำเร็จรูป', sortValue: (b) => (finishedGoodById(b.finishedGoodId)?.name ?? '').toLowerCase(), render: (b) => finishedGoodById(b.finishedGoodId)?.name },
    {
      key: 'qty',
      label: 'คงเหลือ / ผลิตได้',
      sortValue: (b) => b.remainingQuantity,
      render: (b) => (
        <span className="tabular-nums">
          {b.remainingQuantity} / {b.quantity} {finishedGoodById(b.finishedGoodId)?.unit}
        </span>
      ),
    },
    { key: 'for', label: 'จองให้', sortValue: (b) => b.reservedForOrderId ?? '', render: (b) => (b.reservedForOrderId ? orders.find((o) => o.id === b.reservedForOrderId)?.orderNumber : '—') },
    { key: 'grade', label: 'เกรด', sortValue: (b) => b.gradeLevel, render: (b) => <StatusPill tone={batchGradeTone[b.gradeLevel]}>เกรด {b.gradeLevel}</StatusPill> },
    { key: 'barcode', label: 'บาร์โค้ด', sortValue: (b) => b.barcode, render: (b) => <span className="tabular-nums">{b.barcode}</span> },
    { key: 'expiration', label: 'หมดอายุ', sortValue: (b) => b.expirationDate, render: (b) => formatDateTime(b.expirationDate) },
    { key: 'status', label: 'สถานะ', sortValue: (b) => b.status, render: (b) => <StatusPill tone={batchStatusTone[b.status]}>{batchStatusLabel[b.status]}</StatusPill> },
  ]

  return (
    <>
      <PageHeading section="ผลิต" title="สินค้าสำเร็จรูป" />

      <InventoryTable />

      <Card>
        <CardHeader title="LOT สินค้าสำเร็จรูป" subtitle="ลงทะเบียนเมื่อปิดใบสั่งผลิต ราคาคิดต่อสินค้า LOT จึงใช้เพื่อการติดตามและ FIFO เท่านั้น" />
        <DataTable
          columns={columns}
          rows={batches}
          rowKey={(b) => b.id}
          defaultSort={{ key: 'expiration', dir: 'asc' }}
          emptyTitle="ยังไม่มี LOT"
          emptyDescription="ปิดใบสั่งผลิตเพื่อลงทะเบียน LOT แรก"
          renderActions={(b) => (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="ดูใบสั่งผลิต" tooltip="ดูใบสั่งผลิต" onClick={() => navigate({ to: '/production/orders/$orderId', params: { orderId: b.productionOrderId } })}>
              <IconEye />
            </Button>
          )}
        />
      </Card>
    </>
  )
}
