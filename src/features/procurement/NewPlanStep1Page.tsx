import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { Button, Card, CardHeader, Checkbox, DataTable, DeltaBadge, SegmentedControl, StepProgress, TextField, Timeline, TimelineStep, type DataTableColumn } from '@/components/ui'
import { customerById, useSalesStore } from '@/features/sales/store'
import { formatDate } from '@/features/sales/utils'
import { DateRangeField } from './DateRangeField'
import { baseDemand, productsOf, usePlannableOrders, useWizardPlanLines } from './demand'
import { computeRequiredQuantities, finishedGoods, rawMaterialById, salesHistory } from './mockData'
import { useWizardStore, wizardSteps } from './store'
import type { FinishedGood, PlanSource } from './types'
import { roundQty } from './utils'

function OrderPicker() {
  const { orderIds, setOrders } = useWizardStore()
  const orders = useSalesStore((s) => s.orders)
  const plannable = usePlannableOrders()
  // An order opened via "Plan Purchase" stays listed even if it no longer qualifies
  const rows = [...plannable, ...orders.filter((o) => orderIds.includes(o.id) && !plannable.includes(o))]

  const toggle = (id: string) => {
    const next = orderIds.includes(id) ? orderIds.filter((x) => x !== id) : [...orderIds, id]
    setOrders(next, productsOf(orders.filter((o) => next.includes(o.id))))
  }

  return rows.length === 0 ? (
    <p className="py-4 text-muted">ไม่มีคำสั่งซื้อที่ยืนยันแล้วรอวางแผนจัดซื้อ</p>
  ) : (
    <ul className="space-y-2">
      {rows.map((o) => (
        <li key={o.id}>
          <label
            className={`flex cursor-pointer flex-wrap items-center gap-4 rounded-[0.875rem] border border-line px-3.5 py-3 ${orderIds.includes(o.id) ? 'bg-primary-soft' : 'hover:bg-hover'}`}
          >
            <Checkbox aria-label={`เลือก ${o.orderNumber}`} checked={orderIds.includes(o.id)} onChange={() => toggle(o.id)} />
            <span className="w-36 font-medium">{o.orderNumber}</span>
            <span className="min-w-40 flex-1">{customerById(o.customerId)?.name}</span>
            <span className="text-sm text-muted">ส่งภายใน {formatDate(o.requestedDeliveryDate)}</span>
            <span className="w-full text-sm text-ink-2 sm:w-auto">
              {o.lines.map((l) => `${finishedGoods.find((fg) => fg.id === l.finishedGoodId)?.name} × ${l.quantity}`).join(', ')}
            </span>
          </label>
        </li>
      ))}
    </ul>
  )
}

export function NewPlanStep1Page() {
  const navigate = useNavigate()
  const { source, orderIds, sourceStartDate, sourceEndDate, lines, setSource, setSourceRange, toggleLine, setAdjustment, setOrders } =
    useWizardStore()
  const orders = useSalesStore((s) => s.orders)
  const { planLines, selectedOrders } = useWizardPlanLines()

  // Opened from an order's "Plan Purchase": fill in its products once
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current) return
    prefilled.current = true
    if (source === 'customer_orders' && orderIds.length > 0 && lines.length === 0)
      setOrders(orderIds, productsOf(orders.filter((o) => orderIds.includes(o.id))))
  }, [source, orderIds, lines.length, orders, setOrders])

  const requiredByRm = computeRequiredQuantities(planLines)
  const fromOrders = source === 'customer_orders'
  const orderedProducts = productsOf(selectedOrders)
  const productRows = fromOrders ? finishedGoods.filter((fg) => orderedProducts.includes(fg.id)) : finishedGoods
  const selectedIds = new Set(lines.map((l) => l.finishedGoodId))
  const step1Done = !fromOrders || orderIds.length > 0
  const step2Done = lines.length > 0
  /** DataTable hands back the whole next selection; toggle whatever changed. */
  const selectProducts = (next: Set<string>) =>
    productRows.forEach((fg) => {
      if (next.has(fg.id) !== selectedIds.has(fg.id)) toggleLine(fg.id)
    })

  const productColumns: DataTableColumn<FinishedGood>[] = [
    {
      key: 'name',
      label: 'สินค้า',
      render: (fg) => <span className="font-medium">{fg.name}</span>,
    },
    {
      key: 'base',
      label: fromOrders ? 'สั่ง' : 'ยอดขายเดือนที่แล้ว',
      render: (fg) => (
        <span className="tabular-nums">
          {baseDemand(source, selectedOrders, fg.id)} {fg.unit}
        </span>
      ),
    },
    ...(fromOrders
      ? []
      : [
          {
            key: 'trend',
            label: 'แนวโน้ม',
            render: (fg: FinishedGood) => <DeltaBadge value={salesHistory.find((s) => s.finishedGoodId === fg.id)?.trendPct ?? 0} />,
          },
        ]),
    {
      key: 'adjust',
      label: 'ปรับเพิ่ม/ลด %',
      render: (fg) => {
        const line = lines.find((l) => l.finishedGoodId === fg.id)
        return (
          <TextField
            type="number"
            aria-label={`เปอร์เซ็นต์ปรับของ ${fg.name}`}
            disabled={!line}
            value={line?.adjustmentPct ?? 0}
            onChange={(e) => setAdjustment(fg.id, Number(e.target.value))}
            className="w-24"
            containerClassName="mb-0"
          />
        )
      },
    },
    {
      key: 'planned',
      label: 'จำนวนที่วางแผน',
      cellClassName: 'tabular-nums',
      render: (fg) => {
        const line = lines.find((l) => l.finishedGoodId === fg.id)
        return line ? `${Math.round(baseDemand(source, selectedOrders, fg.id) * (1 + line.adjustmentPct / 100))} ${fg.unit}` : '—'
      },
    },
  ]

  const rmRows = [...requiredByRm.entries()].map(([rawMaterialId, quantity]) => ({ rawMaterialId, quantity }))
  const rmColumns: DataTableColumn<(typeof rmRows)[number]>[] = [
    {
      key: 'name',
      label: 'วัตถุดิบ',
      render: (r) => rawMaterialById(r.rawMaterialId)?.name,
    },
    {
      key: 'qty',
      label: 'จำนวนที่ต้องใช้',
      cellClassName: 'tabular-nums',
      render: (r) => `${roundQty(r.quantity)} ${rawMaterialById(r.rawMaterialId)?.unit ?? ''}`,
    },
  ]

  return (
    <>
      <PageHeading
        section="จัดซื้อ"
        parent={{ label: 'แผนจัดซื้อ', to: '/procurement/plans' }}
        title="สร้างแผนจัดซื้อ"
        subtitle="เลือกที่มาของความต้องการและสินค้าที่จะผลิต"
      />

      <StepProgress steps={wizardSteps} current={0} />

      <Timeline className="mb-6">
        <TimelineStep number={1} done={step1Done} markerClassName="top-6 xl:top-7">
          <Card>
            <CardHeader
              title="ที่มาของความต้องการ"
              subtitle={
                fromOrders
                  ? 'ซื้อวัตถุดิบสำหรับคำสั่งซื้อที่ยืนยันแล้ว (โจทย์ 1)'
                  : 'พนักงานเลือกจากยอดขายที่ผ่านมา สำหรับสต็อกและร้านฝากขาย (โจทย์ 2)'
              }
              action={
                <SegmentedControl
                  variant="mask"
                  aria-label="ที่มาของความต้องการ"
                  value={source}
                  onChange={(v: PlanSource) => setSource(v)}
                  options={[
                    { value: 'customer_orders', label: 'คำสั่งซื้อลูกค้า' },
                    { value: 'sales_history', label: 'ประวัติการขาย' },
                  ]}
                />
              }
            />
            {fromOrders ? (
              <OrderPicker />
            ) : (
              <DateRangeField
                label="ช่วงวันที่"
                startDate={new Date(sourceStartDate)}
                endDate={new Date(sourceEndDate)}
                onChange={setSourceRange}
                containerClassName="max-w-xs"
              />
            )}
          </Card>
        </TimelineStep>

        <TimelineStep number={2} done={step2Done} markerClassName="top-6 xl:top-7">
          <Card>
            <CardHeader
              title={fromOrders ? 'สินค้าที่สั่ง' : 'สินค้าที่ขายได้'}
              subtitle={
                fromOrders
                  ? 'ยอดรวมจากคำสั่งซื้อที่เลือก เพิ่มเผื่อได้ถ้าคาดว่าจะมีของเสีย'
                  : 'เลือกสินค้าที่จะผลิตในรอบนี้ และปรับจำนวนได้ตามต้องการ'
              }
            />
            {productRows.length === 0 ? (
              <p className="py-4 text-muted">เลือกคำสั่งซื้ออย่างน้อย 1 รายการด้านบน</p>
            ) : (
              <DataTable
                columns={productColumns}
                rows={productRows}
                rowKey={(fg) => fg.id}
                sortable={false}
                selected={selectedIds}
                onSelectedChange={selectProducts}
                rowSelectLabel={(fg) => `เลือก ${fg.name}`}
                emptyTitle="ไม่มีสินค้า"
              />
            )}
          </Card>
        </TimelineStep>

        <TimelineStep number={3} markerClassName="top-6 xl:top-7">
          <Card>
            <CardHeader title="ประมาณการวัตถุดิบที่ต้องใช้" subtitle="คำนวณจากสูตรการผลิต (BOM) ของสินค้าที่เลือก" />
            {rmRows.length === 0 ? (
              <p className="py-4 text-muted">เลือกสินค้าอย่างน้อย 1 รายการด้านบนเพื่อดูวัตถุดิบที่ต้องใช้</p>
            ) : (
              <DataTable columns={rmColumns} rows={rmRows} rowKey={(r) => r.rawMaterialId} sortable={false} emptyTitle="ไม่มีวัตถุดิบ" />
            )}
          </Card>
        </TimelineStep>
      </Timeline>

      <div className="flex justify-end">
        <Button
          disabled={lines.length === 0 || (fromOrders && orderIds.length === 0)}
          onClick={() => navigate({ to: '/procurement/plans/new/step-2' })}
        >
          ถัดไป: ตรวจสอบและสร้าง
        </Button>
      </div>
    </>
  )
}
