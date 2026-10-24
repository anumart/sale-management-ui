import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye, IconFactory } from '@/components/icons'
import { Alert, Button, Card, CardHeader, DataTable, DeltaBadge, Select, StatusPill, TextField, type DataTableColumn } from '@/components/ui'
import { getFinishedGoods } from '@/features/catalog/store'
import { finishedGoodById, rawMaterialById, salesHistory } from '@/features/procurement/mockData'
import { createProductionForOrder, describeFailures } from '@/features/sales/actions'
import { customerById, useSalesStore } from '@/features/sales/store'
import type { CustomerOrder } from '@/features/sales/types'
import { formatDate, orderStage } from '@/features/sales/utils'
import { toast } from '@/stores/toastStore'
import { useProductionStore } from './store'
import type { RawMaterialStock } from './types'
import { fgPosition, rmRequirementFor, rmShortages, roundQty } from './utils'

function StockTable() {
  const rmStock = useProductionStore((s) => s.rmStock)
  const rows = Object.values(rmStock)

  const columns: DataTableColumn<RawMaterialStock>[] = [
    { key: 'name', label: 'วัตถุดิบ', sortValue: (r) => (rawMaterialById(r.rawMaterialId)?.nameTh ?? '').toLowerCase(), render: (r) => <span className="font-medium">{rawMaterialById(r.rawMaterialId)?.nameTh}</span> },
    { key: 'onHand', label: 'คงคลัง', sortValue: (r) => r.onHand, render: (r) => <span className="tabular-nums">{roundQty(r.onHand)} {rawMaterialById(r.rawMaterialId)?.unit}</span> },
    { key: 'allocated', label: 'จองแล้ว', sortValue: (r) => r.allocated, render: (r) => <span className="tabular-nums">{roundQty(r.allocated)} {rawMaterialById(r.rawMaterialId)?.unit}</span> },
    {
      key: 'available',
      label: 'พร้อมใช้',
      sortValue: (r) => r.onHand - r.allocated,
      render: (r) => <span className="tabular-nums font-medium">{roundQty(r.onHand - r.allocated)} {rawMaterialById(r.rawMaterialId)?.unit}</span>,
    },
  ]

  return (
    <Card className="mb-6">
      <CardHeader title="สต็อกวัตถุดิบ" subtitle="รับเข้าจากใบวิ่งรถ ใบสั่งผลิตทุกใบด้านล่างจะตรวจกับยอดพร้อมใช้" />
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.rawMaterialId} emptyTitle="ยังไม่มีข้อมูลสต็อกวัตถุดิบ" />
    </Card>
  )
}

/** Scenario 1: confirmed email orders that still have lines without a production order. */
function CustomerOrderQueue() {
  const navigate = useNavigate()
  const orders = useSalesStore((s) => s.orders)
  const productionOrders = useProductionStore((s) => s.orders)
  const rmStock = useProductionStore((s) => s.rmStock)

  const queue = orders.filter(
    (o) => o.status === 'confirmed' && o.lines.some((l) => !productionOrders.some((p) => p.customerOrderId === o.id && p.finishedGoodId === l.finishedGoodId)),
  )

  const missingLines = (o: CustomerOrder) => o.lines.filter((l) => l.finishedGoodId && !productionOrders.some((p) => p.customerOrderId === o.id && p.finishedGoodId === l.finishedGoodId))
  const shortages = (o: CustomerOrder) => {
    const need = new Map<string, number>()
    missingLines(o).forEach((l) => rmRequirementFor(l.finishedGoodId!, l.quantity).forEach((r) => need.set(r.rawMaterialId, (need.get(r.rawMaterialId) ?? 0) + r.quantity)))
    return rmShortages(
      [...need].map(([rawMaterialId, quantity]) => ({ rawMaterialId, quantity })),
      rmStock,
    )
  }

  const produce = (o: CustomerOrder) => {
    const res = createProductionForOrder(o)
    if (res.created.length) toast.success(`${o.orderNumber}: สร้าง ${res.created.join(', ')} แล้ว`)
    if (res.failed.length) toast.error(describeFailures(res.failed))
  }

  const columns: DataTableColumn<CustomerOrder>[] = [
    { key: 'number', label: 'เลขที่', sortValue: (o) => o.orderNumber, render: (o) => <span className="font-medium">{o.orderNumber}</span> },
    { key: 'customer', label: 'ลูกค้า', sortValue: (o) => customerById(o.customerId)?.name ?? '', render: (o) => customerById(o.customerId)?.name },
    { key: 'deliver', label: 'ส่งภายใน', sortValue: (o) => o.requestedDeliveryDate, render: (o) => formatDate(o.requestedDeliveryDate) },
    {
      key: 'products',
      label: 'ต้องผลิต',
      sortable: false,
      render: (o) => (
        <span className="text-sm">
          {missingLines(o)
            .map((l) => `${finishedGoodById(l.finishedGoodId!)?.name} × ${l.quantity}`)
            .join(', ')}
        </span>
      ),
    },
    {
      key: 'rm',
      label: 'วัตถุดิบ',
      sortValue: (o) => shortages(o).length,
      render: (o) => {
        const short = shortages(o)
        return short.length === 0 ? <StatusPill tone="success">มีพอ</StatusPill> : <StatusPill tone="danger">ไม่พอ: {short.map((s) => rawMaterialById(s.rawMaterialId)?.nameTh).join(', ')}</StatusPill>
      },
    },
  ]

  return (
    <Card className="mb-6">
      <CardHeader title="คำสั่งซื้อที่ต้องผลิต" subtitle="โจทย์ 1 — ผลิตให้ลูกค้ารายนั้น LOT ที่ผลิตเสร็จจะถูกจองไว้ให้คำสั่งซื้อ" />
      <DataTable
        columns={columns}
        rows={queue}
        rowKey={(o) => o.id}
        defaultSort={{ key: 'deliver', dir: 'asc' }}
        emptyTitle="ไม่มีคำสั่งซื้อที่ยืนยันแล้วรอผลิต"
        emptyDescription="ยืนยันคำสั่งซื้อที่นำเข้าวันนี้ได้ที่ ขาย → คำสั่งซื้อ"
        renderActions={(o) => (
          <>
            <Button size="sm" variant="soft" iconOnly outlined aria-label="ดูคำสั่งซื้อ" tooltip="ดูคำสั่งซื้อ" onClick={() => navigate({ to: '/sales/orders/$orderId', params: { orderId: o.id } })}>
              <IconEye />
            </Button>
            <Button size="sm" variant="primary" iconOnly outlined aria-label="สร้างใบสั่งผลิต" tooltip="สร้างใบสั่งผลิต" disabled={shortages(o).length > 0} onClick={() => produce(o)}>
              <IconFactory />
            </Button>
          </>
        )}
      />
    </Card>
  )
}

/** Scenario 2: staff pick what to make from sales history, for stock or for a consignment shop. */
function ManualProductionForm() {
  const navigate = useNavigate()
  const lines = useProductionStore((s) => s.lines)
  const rmStock = useProductionStore((s) => s.rmStock)
  const batches = useProductionStore((s) => s.batches)
  const createProductionOrder = useProductionStore((s) => s.createProductionOrder)
  const customers = useSalesStore((s) => s.customers)

  const [finishedGoodId, setFinishedGoodId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [customerId, setCustomerId] = useState('')

  const qty = Number(quantity)
  // One line in the factory: production orders always go on it
  const line = lines[0]
  const lineDown = !line || line.status !== 'available'
  const requirement = finishedGoodId && qty > 0 ? rmRequirementFor(finishedGoodId, qty) : []
  const short = rmShortages(requirement, rmStock)
  const sales = salesHistory.find((s) => s.finishedGoodId === finishedGoodId)
  const position = finishedGoodId ? fgPosition(batches, finishedGoodId) : null

  const submit = () => {
    const res = createProductionOrder({ finishedGoodId, quantity: qty, productionLineId: line?.id ?? '', source: 'manual', customerOrderId: null, customerId: customerId || null })
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(`สร้าง ${res.order.orderNumber} แล้ว จองวัตถุดิบเรียบร้อย`)
    navigate({ to: '/production/orders/$orderId', params: { orderId: res.order.id } })
  }

  return (
    <Card>
      <CardHeader title="พนักงานเลือกผลิตเอง" subtitle="โจทย์ 2 — เลือกจากประวัติการขาย ผลิตเข้าสต็อกหรือให้ร้านฝากขาย โดยไม่มีคำสั่งซื้อจากลูกค้า" />
      <div className="grid gap-x-4 sm:grid-cols-3">
        <Select label="สินค้า" placeholder="เลือกสินค้า" value={finishedGoodId} onChange={(e) => setFinishedGoodId(e.target.value)} options={getFinishedGoods(true).map((fg) => ({ value: fg.id, label: fg.name }))} />
        <TextField label="จำนวน" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <Select
          label="สำหรับร้าน (ไม่บังคับ)"
          placeholder="เข้าสต็อก ยังไม่ระบุร้าน"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          options={customers.filter((c) => c.type === 'consignment').map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>

      {finishedGoodId && (
        <div className="mb-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span>
            <span className="text-muted">ขายเดือนที่แล้ว </span>
            <span className="font-medium tabular-nums">{sales?.quantitySold ?? 0}</span> {sales && <DeltaBadge value={sales.trendPct} className="ml-1" />}
          </span>
          <span>
            <span className="text-muted">ในคลัง </span>
            <span className="font-medium tabular-nums">{position?.available ?? 0}</span>
            <span className="text-muted"> พร้อมส่ง · {position?.reserved ?? 0} จองให้คำสั่งซื้อ</span>
          </span>
        </div>
      )}

      {requirement.length > 0 && (
        <ul className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {requirement.map((r) => {
            const s = short.find((x) => x.rawMaterialId === r.rawMaterialId)
            const material = rawMaterialById(r.rawMaterialId)
            const available = roundQty((rmStock[r.rawMaterialId]?.onHand ?? 0) - (rmStock[r.rawMaterialId]?.allocated ?? 0))
            return (
              <li key={r.rawMaterialId} className="flex items-center justify-between gap-3 rounded-[0.875rem] border border-line px-3.5 py-2.5">
                <span className="font-medium">{material?.nameTh}</span>
                <span className="text-sm tabular-nums">
                  {r.quantity} / {available} {material?.unit} {s ? <StatusPill tone="danger">ไม่พอ</StatusPill> : <StatusPill tone="success">พอ</StatusPill>}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {lineDown && (
        <Alert tone="warning" title={`${line?.name ?? 'ไลน์ผลิต'} อยู่ระหว่างซ่อมบำรุง`} className="mb-5" action={<Link to="/production/lines" className="text-sm font-medium text-primary-fg hover:underline">ดูไลน์ผลิต</Link>}>
          สร้างใบสั่งผลิตใหม่ได้เมื่อไลน์กลับมาใช้งาน
        </Alert>
      )}

      {short.length > 0 && (
        <Alert tone="danger" title="วัตถุดิบไม่พอ" className="mb-5" action={<Link to="/procurement/plans/new/step-1" className="text-sm font-medium text-primary-fg hover:underline">วางแผนจัดซื้อ</Link>}>
          ลดจำนวนลง หรือจัดซื้อเพิ่มก่อน
        </Alert>
      )}

      <div className="flex justify-end">
        <Button disabled={!finishedGoodId || !(qty > 0) || lineDown || short.length > 0} onClick={submit}>
          <IconFactory />
          สร้างใบสั่งผลิต
        </Button>
      </div>
    </Card>
  )
}

export function PlanningPage() {
  const orders = useSalesStore((s) => s.orders)
  const productionOrders = useProductionStore((s) => s.orders)
  const toConfirm = orders.filter((o) => ['needs_review', 'to_confirm'].includes(orderStage(o, productionOrders))).length

  return (
    <>
      <PageHeading section="ผลิต" title="วางแผนผลิต" subtitle="สิ่งที่จะผลิตมาจากคำสั่งซื้อที่ยืนยันแล้ว หรือจากพนักงานเลือกตามประวัติการขาย" />

      {toConfirm > 0 && (
        <Alert
          tone="info"
          title={`มี ${toConfirm} คำสั่งซื้อที่นำเข้าแล้วแต่ยังไม่ยืนยัน`}
          className="mb-6"
          action={
            <Link to="/sales/orders" className="text-sm font-medium text-primary-fg hover:underline">
              ตรวจคำสั่งซื้อ
            </Link>
          }
        >
          จะแสดงที่นี่เมื่อพนักงานยืนยันแล้ว
        </Alert>
      )}

      <StockTable />
      <CustomerOrderQueue />
      <ManualProductionForm />
    </>
  )
}
