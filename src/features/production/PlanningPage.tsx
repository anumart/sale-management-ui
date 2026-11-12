import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconFactory, IconTrash } from '@/components/icons'
import { Alert, Button, Card, CardHeader, DataTable, SegmentedControl, StatusPill, TextField, Timeline, TimelineStep, type DataTableColumn } from '@/components/ui'
import { finishedGoodById, rawMaterialById } from '@/features/procurement/mockData'
import { useSalesStore } from '@/features/sales/store'
import { formatDate, orderStage } from '@/features/sales/utils'
import { toast } from '@/stores/toastStore'
import { checkPlan } from './planAllocation'
import { EstimatePicker, ManualPicker, OrderPicker } from './PlanSourcePickers'
import { planSourceLabel, usePlanStore, type PlanLine, type PlanSourceTab } from './planStore'
import { useProductionStore } from './store'
import { defaultLineFor, roundQty } from './utils'

const sourceHint: Record<PlanSourceTab, string> = {
  estimate: 'เลือกวันส่ง ประเมินและยืนยันยอดลงร้านของแต่ละสาย แล้วเพิ่มยอดที่ยืนยันแล้วเข้ารายการ',
  orders: 'เลือกคำสั่งซื้อที่ยืนยันแล้วตามวันส่ง ระบบเพิ่มสินค้าและจำนวนของทุกรายการในใบให้',
  manual: 'เลือกสินค้าและจำนวนเอง เพื่อผลิตเข้าสต็อกหรือให้ร้านฝากขายโดยไม่มีคำสั่งซื้อ',
}

interface StockRow {
  rawMaterialId: string
  onHand: number
  allocated: number
  available: number
  /** Taken by the lines in the plan */
  used: number
  remaining: number
}

const kindTone = { estimate: 'info', orders: 'accent', manual: 'neutral' } as const

export function PlanningPage() {
  const orders = useSalesStore((s) => s.orders)
  const productionOrders = useProductionStore((s) => s.orders)
  const rmStock = useProductionStore((s) => s.rmStock)
  const productionLines = useProductionStore((s) => s.lines)
  const { sourceTab, lines, setSourceTab, setQuantity, removeLine, removeLines } = usePlanStore()

  const toConfirm = orders.filter((o) => ['needs_review', 'to_confirm'].includes(orderStage(o, productionOrders))).length
  const { perLine, totals } = useMemo(() => checkPlan(lines, rmStock, productionLines), [lines, rmStock, productionLines])

  const readyLines = lines.filter((l) => perLine[l.key]?.ok)
  const blockedLines = lines.filter((l) => !perLine[l.key]?.ok)
  const shortTotals = totals.filter((t) => t.remaining < 0)
  const nameOf = (rmId: string) => rawMaterialById(rmId)?.nameTh ?? rmId

  const submit = (targets: PlanLine[]) => {
    const { createProductionOrder, lines: productionLinesNow } = useProductionStore.getState()
    const done: string[] = []
    const created: string[] = []
    for (const l of targets) {
      const line = defaultLineFor(l.finishedGoodId, productionLinesNow)
      const name = finishedGoodById(l.finishedGoodId)?.name
      if (!line) {
        toast.error(`${name}: ไม่มีไลน์ผลิตที่ว่าง`)
        continue
      }
      const res = createProductionOrder({
        finishedGoodId: l.finishedGoodId,
        quantity: l.quantity,
        productionLineId: line.id,
        source: l.source,
        customerOrderId: l.customerOrderId,
        customerId: l.customerId,
        consignmentRouteId: l.consignmentRouteId,
        consignmentEstimateId: l.consignmentEstimateId,
        deliveryDate: l.deliveryDate,
      })
      if (res.ok) {
        done.push(l.key)
        created.push(res.order.orderNumber)
      } else toast.error(`${l.label} ${name}: ${res.error}`)
    }
    removeLines(done)
    if (created.length) toast.success(`สร้างใบสั่งผลิต ${created.length} ใบแล้ว (${created.join(', ')})`)
  }

  const lineColumns: DataTableColumn<PlanLine>[] = [
    { key: 'name', label: 'สินค้า', render: (l) => <span className="font-medium">{finishedGoodById(l.finishedGoodId)?.name}</span> },
    {
      key: 'origin',
      label: 'ที่มา',
      render: (l) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone={kindTone[l.kind]}>{l.label}</StatusPill>
          {l.deliveryDate && <span className="text-sm text-muted">ส่ง {formatDate(l.deliveryDate)}</span>}
        </div>
      ),
    },
    {
      key: 'quantity',
      label: 'จำนวนที่สั่งผลิต',
      render: (l) => (
        <div className="flex items-center gap-2">
          <TextField
            type="number"
            min={0}
            aria-label={`จำนวนที่สั่งผลิตของ ${finishedGoodById(l.finishedGoodId)?.name}`}
            value={l.quantity}
            onChange={(e) => setQuantity(l.key, Math.max(0, Number(e.target.value)))}
            className="w-28"
            containerClassName="mb-0"
          />
          <span className="text-muted">{finishedGoodById(l.finishedGoodId)?.unit}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'วัตถุดิบ',
      render: (l) => {
        const c = perLine[l.key]
        if (!c) return null
        if (!(l.quantity > 0)) return <StatusPill tone="gray">ใส่จำนวน</StatusPill>
        if (c.noLine) return <StatusPill tone="danger">ไม่มีไลน์ว่าง</StatusPill>
        return c.ok ? <StatusPill tone="success">พอ</StatusPill> : <StatusPill tone="danger">ไม่พอ: {c.missing.map(nameOf).join(', ')}</StatusPill>
      },
    },
  ]

  /** Every raw material in stock, with what the plan below would take from it (updates as lines are added or edited). */
  const stockRows: StockRow[] = Object.values(rmStock).map((s) => {
    const used = totals.find((t) => t.rawMaterialId === s.rawMaterialId)?.required ?? 0
    const available = roundQty(s.onHand - s.allocated)
    return { rawMaterialId: s.rawMaterialId, onHand: s.onHand, allocated: s.allocated, available, used, remaining: roundQty(available - used) }
  })
  const unitOf = (rmId: string) => rawMaterialById(rmId)?.unit ?? ''
  const qtyText = (rmId: string, n: number) => `${roundQty(n)} ${unitOf(rmId)}`

  const stockColumns: DataTableColumn<StockRow>[] = [
    { key: 'name', label: 'วัตถุดิบ', sortValue: (r) => nameOf(r.rawMaterialId), render: (r) => <span className="font-medium">{nameOf(r.rawMaterialId)}</span> },
    { key: 'onHand', label: 'คงคลัง', sortValue: (r) => r.onHand, cellClassName: 'tabular-nums', render: (r) => qtyText(r.rawMaterialId, r.onHand) },
    { key: 'allocated', label: 'จองแล้ว', sortValue: (r) => r.allocated, cellClassName: 'tabular-nums', render: (r) => qtyText(r.rawMaterialId, r.allocated) },
    { key: 'available', label: 'พร้อมใช้', sortValue: (r) => r.available, cellClassName: 'tabular-nums font-medium', render: (r) => qtyText(r.rawMaterialId, r.available) },
    { key: 'used', label: 'ใช้ตามรายการด้านล่าง', sortValue: (r) => r.used, cellClassName: 'tabular-nums', render: (r) => (r.used > 0 ? qtyText(r.rawMaterialId, r.used) : <span className="text-muted">—</span>) },
    { key: 'remaining', label: 'เหลือหลังผลิต', sortValue: (r) => r.remaining, cellClassName: 'tabular-nums font-medium', render: (r) => qtyText(r.rawMaterialId, r.remaining) },
    {
      key: 'status',
      label: 'สถานะ',
      sortValue: (r) => r.remaining,
      render: (r) => (r.used === 0 ? <span className="text-muted">ยังไม่ได้ใช้</span> : r.remaining < 0 ? <StatusPill tone="danger">ขาด {-r.remaining}</StatusPill> : <StatusPill tone="success">พอ</StatusPill>),
    },
  ]

  return (
    <>
      <PageHeading section="ผลิต" title="วางแผนผลิต" subtitle="เลือกที่มาของสิ่งที่จะผลิต เพิ่มลงรายการ ตรวจวัตถุดิบ แล้วสั่งผลิตรวดเดียว" />

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
          จะเลือกได้ในแท็บ "คำสั่งซื้อตามวันส่ง" เมื่อพนักงานยืนยันแล้ว
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader
          title="สต็อกวัตถุดิบ"
          subtitle="คำนวณใหม่ทันทีเมื่อเพิ่มหรือแก้รายการที่จะสั่งผลิตด้านล่าง รายการบนได้วัตถุดิบก่อน"
          action={
            <Link to="/production/capacity" className="text-sm font-medium text-primary-fg hover:underline">
              ดูว่าผลิตอะไรได้จากวัตถุดิบที่มี
            </Link>
          }
        />
        {shortTotals.length > 0 && (
          <Alert tone="danger" title={`วัตถุดิบไม่พอ ${shortTotals.length} รายการ: ${shortTotals.map((t) => nameOf(t.rawMaterialId)).join(', ')}`} className="mb-4" action={<Link to="/procurement/plans/new/step-1" className="text-sm font-medium text-primary-fg hover:underline">วางแผนจัดซื้อ</Link>}>
            ลดจำนวนหรือลบรายการ หรือสั่งเฉพาะรายการที่พอก่อน แล้วจัดซื้อเพิ่ม
          </Alert>
        )}
        <DataTable columns={stockColumns} rows={stockRows} rowKey={(r) => r.rawMaterialId} emptyTitle="ยังไม่มีข้อมูลสต็อกวัตถุดิบ" rowClassName={(r) => (r.remaining < 0 ? 'bg-danger/5' : '')} />
      </Card>

      <Timeline className="mb-6">
        <TimelineStep number={1} done={lines.length > 0} markerClassName="top-6 xl:top-7">
          <Card>
            <CardHeader
              title="ที่มาของสิ่งที่จะผลิต"
              subtitle={sourceHint[sourceTab]}
              action={
                <SegmentedControl
                  variant="mask"
                  aria-label="ที่มา"
                  value={sourceTab}
                  onChange={setSourceTab}
                  options={(['estimate', 'orders', 'manual'] as const).map((s) => ({ value: s, label: planSourceLabel[s] }))}
                />
              }
            />
            {sourceTab === 'estimate' && <EstimatePicker />}
            {sourceTab === 'orders' && <OrderPicker />}
            {sourceTab === 'manual' && <ManualPicker />}
          </Card>
        </TimelineStep>

        <TimelineStep number={2} done={lines.length > 0 && blockedLines.length === 0} markerClassName="top-6 xl:top-7">
          <Card>
            <CardHeader title="รายการที่จะสั่งผลิต" subtitle="1 บรรทัดต่อ 1 ใบสั่งผลิต จำนวนตั้งต้นมาจากที่มาด้านบน แก้ได้ เช่น ลดลงเมื่อใช้สต็อกเดิม" />
            {lines.length === 0 ? (
              <p className="py-4 text-muted">ยังไม่มีรายการ เลือกจากที่มาด้านบนแล้วกด "เพิ่มเข้ารายการ"</p>
            ) : (
              <DataTable
                columns={lineColumns}
                rows={lines}
                rowKey={(l) => l.key}
                sortable={false}
                pageSize={10}
                paginationVariant="jump"
                emptyTitle="ไม่มีรายการ"
                renderActions={(l) => (
                  <Button size="sm" variant="danger" iconOnly outlined aria-label="ลบออกจากรายการ" tooltip="ลบออกจากรายการ" onClick={() => removeLine(l.key)}>
                    <IconTrash />
                  </Button>
                )}
              />
            )}
          </Card>
        </TimelineStep>

      </Timeline>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {lines.length > 0 && blockedLines.length > 0 && readyLines.length > 0 && (
          <Button variant="soft" onClick={() => submit(readyLines)}>
            <IconFactory />
            สั่งเฉพาะรายการที่พอ ({readyLines.length})
          </Button>
        )}
        <Button disabled={lines.length === 0 || blockedLines.length > 0} onClick={() => submit(lines)}>
          <IconFactory />
          สั่งผลิตทั้งหมด ({lines.length})
        </Button>
      </div>
    </>
  )
}
