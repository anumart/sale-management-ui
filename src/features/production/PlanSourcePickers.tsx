import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconPlus } from '@/components/icons'
import { Button, DataTable, DatePicker, DeltaBadge, Select, StatusPill, Tabs, TextField, type DataTableColumn } from '@/components/ui'
import { controlClass } from '@/components/ui/FormField'
import { cn } from '@/lib/cn'
import { getFinishedGoods } from '@/features/catalog/store'
import { dayLabel } from '@/features/logistics/types'
import { finishedGoodById, salesHistory } from '@/features/procurement/mockData'
import { useConsignmentStore } from '@/features/sales/consignmentStore'
import { dayOfWeekOf, estimateTotals, routeRunsOn, toYmd, ymdFromToday } from '@/features/sales/estimates'
import { customerById, useSalesStore } from '@/features/sales/store'
import type { CustomerOrder } from '@/features/sales/types'
import { channelLabel, channelTone, formatDate } from '@/features/sales/utils'
import { usePlanStore, type PlanLine } from './planStore'
import { useProductionStore } from './store'
import { fgPosition } from './utils'

const unitOf = (fgId: string) => finishedGoodById(fgId)?.unit ?? 'ชิ้น'
const shiftDay = (ymd: string, days: number) => toYmd(new Date(new Date(`${ymd}T12:00`).getTime() + days * 86_400_000))

function PickerFooter({ count, onAdd, hint }: { count: number; onAdd: () => void; hint?: string }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-sm text-muted">{count > 0 ? `เลือกไว้ ${count} รายการ` : (hint ?? 'ติ๊กเลือกรายการที่ต้องการ แล้วกดเพิ่มเข้ารายการ')}</p>
      <Button disabled={count === 0} onClick={onAdd}>
        <IconPlus />
        เพิ่มเข้ารายการ ({count})
      </Button>
    </div>
  )
}

/** Delivery date picker with previous / next / today / tomorrow shortcuts. */
function DateNav({ date, onChange, clearable }: { date: string; onChange: (d: string) => void; clearable?: boolean }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-2">
      <span className="mb-2 mr-1 text-sm font-medium">วันส่ง</span>
      <Button variant="outline" iconOnly aria-label="วันก่อนหน้า" tooltip="วันก่อนหน้า" disabled={!date} onClick={() => onChange(shiftDay(date || ymdFromToday(0), -1))}>
        <IconChevronLeft />
      </Button>
      <DatePicker aria-label="วันส่ง" value={date} onChange={onChange} clearable={clearable} placeholder="ทุกวัน" containerClassName="w-48" />
      <Button variant="outline" iconOnly aria-label="วันถัดไป" tooltip="วันถัดไป" disabled={!date} onClick={() => onChange(shiftDay(date || ymdFromToday(0), 1))}>
        <IconChevronRight />
      </Button>
      <Button size="sm" variant="soft" onClick={() => onChange(ymdFromToday(0))}>
        วันนี้
      </Button>
      <Button size="sm" variant="soft" onClick={() => onChange(ymdFromToday(1))}>
        พรุ่งนี้
      </Button>
      {date && <span className="mb-2 text-sm text-muted">วัน{dayLabel[dayOfWeekOf(date)]} {formatDate(date)}</span>}
    </div>
  )
}

/** One route's confirmed estimate: the products already ordered for it, with the quantity to produce adjustable before it joins the plan. */
function RouteEstimatePane({ date, routeId }: { date: string; routeId: string }) {
  const estimate = useConsignmentStore((s) => s.estimates.find((e) => e.consignmentRouteId === routeId && e.deliveryDate === date && e.status !== 'cancelled'))
  const route = useConsignmentStore((s) => s.routes.find((r) => r.id === routeId))
  const productionOrders = useProductionStore((s) => s.orders)
  const planLines = usePlanStore((s) => s.lines)
  const addLines = usePlanStore((s) => s.addLines)
  // Quantities typed here; untouched rows use "ordered - already in production"
  const [draft, setDraft] = useState<Record<string, number>>({})

  if (!route) return null
  if (!estimate || estimate.status !== 'confirmed') {
    return (
      <p className="rounded-[0.875rem] border border-dashed border-line px-4 py-4 text-sm text-muted">
        {estimate ? `ยอดประเมินสาย ${route.code} ยังเป็นร่าง` : `สาย ${route.code} ยังไม่มียอดประเมินของวันส่งนี้`} ต้องยืนยันยอดประเมินก่อนจึงเลือกมาสั่งผลิตได้ —{' '}
        <Link to="/sales/estimates" className="font-medium text-primary-fg hover:underline">
          ไปหน้ายอดประเมินลงร้าน
        </Link>
      </p>
    )
  }

  const label = `สาย ${route.code} ${route.name}`
  const plannedOf = (fgId: string) => productionOrders.filter((p) => p.consignmentEstimateId === estimate.id && p.finishedGoodId === fgId).reduce((sum, p) => sum + p.plannedQuantity, 0)
  const keyOf = (fgId: string) => `est:${estimate.id}:${fgId}`
  const rows = [...estimateTotals(estimate)].map(([fgId, ordered]) => ({ fgId, ordered, made: plannedOf(fgId), inPlan: planLines.some((l) => l.key === keyOf(fgId)) }))
  type Row = (typeof rows)[number]
  const qtyOf = (r: Row) => draft[r.fgId] ?? Math.max(0, r.ordered - r.made)

  const lineOf = (r: Row): PlanLine => ({
    key: keyOf(r.fgId),
    kind: 'estimate',
    finishedGoodId: r.fgId,
    quantity: qtyOf(r),
    label,
    deliveryDate: estimate.deliveryDate,
    source: 'consignment_route',
    customerOrderId: null,
    customerId: null,
    consignmentRouteId: route.id,
    consignmentEstimateId: estimate.id,
  })
  const addable = rows.filter((r) => !r.inPlan && qtyOf(r) > 0)

  const columns: DataTableColumn<Row>[] = [
    { key: 'name', label: 'สินค้า', sortable: false, render: (r) => <span className="font-medium">{finishedGoodById(r.fgId)?.name}</span> },
    { key: 'ordered', label: 'สั่งของแล้ว (ยอดประเมิน)', sortable: false, render: (r) => <span className="tabular-nums">{r.ordered} {unitOf(r.fgId)}</span> },
    { key: 'made', label: 'สั่งผลิตแล้ว', sortable: false, render: (r) => <span className="tabular-nums">{r.made}</span> },
    {
      key: 'qty',
      label: 'จำนวนที่จะผลิต',
      sortable: false,
      render: (r) =>
        r.inPlan ? (
          <StatusPill tone="info">อยู่ในรายการ</StatusPill>
        ) : (
          <input
            type="number"
            min={0}
            inputMode="numeric"
            aria-label={`จำนวนที่จะผลิต ${finishedGoodById(r.fgId)?.name}`}
            value={qtyOf(r)}
            onChange={(e) => setDraft((d) => ({ ...d, [r.fgId]: Math.max(0, Math.round(Number(e.target.value)) || 0) }))}
            className={cn(controlClass(), 'h-9 w-28 px-3 text-right tabular-nums')}
          />
        ),
    },
  ]

  return (
    <>
      <p className="mb-3 text-sm text-muted">
        {label} · {estimate.estimateNumber} · ปรับจำนวนที่จะผลิตได้ (เช่น หักของที่มีในสต็อก) ไม่กระทบยอดประเมิน
      </p>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.fgId}
        sortable={false}
        emptyTitle="ยอดประเมินนี้ไม่มีสินค้า"
        renderActions={(r) => (
          <Button size="sm" variant="soft" outlined disabled={r.inPlan || qtyOf(r) <= 0} onClick={() => addLines([lineOf(r)])}>
            <IconPlus />
            เพิ่มเข้ารายการ
          </Button>
        )}
      />
      <PickerFooter count={addable.length} onAdd={() => addLines(addable.map(lineOf))} hint="ทุกรายการอยู่ในรายการแล้วหรือสั่งผลิตครบแล้ว" />
    </>
  )
}

/** Source 1: pick a delivery date, then a route (tab) to see what was ordered for it and add it to the plan. */
export function EstimatePicker() {
  const [date, setDate] = useState(ymdFromToday(1))
  const [routeId, setRouteId] = useState('')
  const routes = useConsignmentStore((s) => s.routes)
  const running = routes.filter((r) => r.isActive && routeRunsOn(r, date))
  const active = running.find((r) => r.id === routeId)?.id ?? running[0]?.id

  return (
    <>
      <DateNav
        date={date}
        onChange={(d) => {
          if (!d) return
          setDate(d)
          setRouteId('')
        }}
      />
      {running.length === 0 || !active ? (
        <p className="rounded-[0.875rem] border border-dashed border-line px-4 py-4 text-sm text-muted">
          ไม่มีสายฝากขายที่วิ่งวัน{dayLabel[dayOfWeekOf(date)]} (ดูตารางวิ่งที่{' '}
          <Link to="/sales/consignment-routes" className="font-medium text-primary-fg hover:underline">
            สายฝากขาย
          </Link>
          )
        </p>
      ) : (
        <Tabs
          variant="line"
          value={active}
          onChange={setRouteId}
          items={running.map((r) => ({
            value: r.id,
            label: `${r.code} ${r.name}`,
            content: <div className="pt-4"><RouteEstimatePane key={`${date}-${r.id}`} date={date} routeId={r.id} /></div>,
          }))}
        />
      )}
    </>
  )
}

/** Source 2: confirmed customer orders, filtered by the delivery date. */
export function OrderPicker() {
  const [date, setDate] = useState(ymdFromToday(1))
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const orders = useSalesStore((s) => s.orders)
  const productionOrders = useProductionStore((s) => s.orders)
  const planLines = usePlanStore((s) => s.lines)
  const addLines = usePlanStore((s) => s.addLines)

  const linesOf = (o: CustomerOrder): PlanLine[] =>
    o.lines.flatMap((l) => {
      const fgId = l.finishedGoodId
      const key = `ord:${o.id}:${fgId}`
      if (!fgId || productionOrders.some((p) => p.customerOrderId === o.id && p.finishedGoodId === fgId) || planLines.some((x) => x.key === key)) return []
      return [
        {
          key,
          kind: 'orders' as const,
          finishedGoodId: fgId,
          quantity: l.quantity,
          label: `${o.orderNumber} ${customerById(o.customerId)?.name ?? ''}`.trim(),
          deliveryDate: toYmd(new Date(o.requestedDeliveryDate)),
          source: 'customer_order' as const,
          customerOrderId: o.id,
          customerId: o.customerId,
        },
      ]
    })

  const due = orders.filter((o) => o.status === 'confirmed' && (!date || toYmd(new Date(o.requestedDeliveryDate)) === date))
  const rows = due.filter((o) => linesOf(o).length > 0)

  const columns: DataTableColumn<CustomerOrder>[] = [
    { key: 'number', label: 'เลขที่', sortValue: (o) => o.orderNumber, render: (o) => <span className="font-medium">{o.orderNumber}</span> },
    { key: 'customer', label: 'ลูกค้า', sortValue: (o) => customerById(o.customerId)?.name ?? '', render: (o) => customerById(o.customerId)?.name },
    { key: 'channel', label: 'ช่องทาง', sortValue: (o) => o.channel, render: (o) => <StatusPill tone={channelTone[o.channel]}>{channelLabel[o.channel]}</StatusPill> },
    { key: 'due', label: 'ต้องส่ง', sortValue: (o) => o.requestedDeliveryDate, render: (o) => formatDate(o.requestedDeliveryDate) },
    { key: 'lines', label: 'ต้องสั่งผลิต', sortable: false, render: (o) => <span className="text-sm text-ink-2">{linesOf(o).map((l) => `${finishedGoodById(l.finishedGoodId)?.name} × ${l.quantity}`).join(', ')}</span> },
  ]

  const add = () => {
    addLines(rows.filter((o) => selected.has(o.id)).flatMap(linesOf))
    setSelected(new Set())
  }

  return (
    <>
      <DateNav date={date} onChange={setDate} clearable />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(o) => o.id}
        selected={selected}
        onSelectedChange={setSelected}
        rowSelectLabel={(o) => `เลือก ${o.orderNumber}`}
        defaultSort={{ key: 'due', dir: 'asc' }}
        emptyTitle={due.length > 0 ? 'เพิ่มเข้ารายการหรือสั่งผลิตครบแล้ว' : 'ไม่มีคำสั่งซื้อที่ยืนยันแล้วของวันส่งนี้'}
        emptyDescription={due.length > 0 ? 'ทุกใบอยู่ในรายการด้านล่างหรือมีใบสั่งผลิตแล้ว' : 'ยืนยันคำสั่งซื้อได้ที่ ขาย → คำสั่งซื้อ หรือกด "ล้าง" เพื่อดูทุกวัน'}
      />
      <PickerFooter count={selected.size} onAdd={add} />
    </>
  )
}

/** Source 3: staff pick a product, for stock or for one consignment shop, by sales history. */
export function ManualPicker() {
  const batches = useProductionStore((s) => s.batches)
  const customers = useSalesStore((s) => s.customers)
  const addLines = usePlanStore((s) => s.addLines)
  const [finishedGoodId, setFinishedGoodId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [customerId, setCustomerId] = useState('')

  const qty = Number(quantity)
  const sales = salesHistory.find((s) => s.finishedGoodId === finishedGoodId)
  const position = finishedGoodId ? fgPosition(batches, finishedGoodId) : null

  const add = () => {
    addLines([
      {
        key: `manual:${finishedGoodId}:${customerId || 'stock'}`,
        kind: 'manual',
        finishedGoodId,
        quantity: qty,
        label: customerId ? `เลือกเอง · ${customerById(customerId)?.name ?? ''}` : 'เลือกเอง · เข้าสต็อก',
        deliveryDate: null,
        source: 'manual',
        customerOrderId: null,
        customerId: customerId || null,
      },
    ])
    setFinishedGoodId('')
    setQuantity('')
    setCustomerId('')
  }

  return (
    <>
      <div className="grid gap-x-4 sm:grid-cols-3">
        <Select label="สินค้า" placeholder="เลือกสินค้า" value={finishedGoodId} onChange={setFinishedGoodId} options={getFinishedGoods(true).map((fg) => ({ value: fg.id, label: fg.name }))} />
        <TextField label={`จำนวน${finishedGoodId ? ` (${unitOf(finishedGoodId)})` : ''}`} type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <Select
          label="สำหรับร้าน (ไม่บังคับ)"
          placeholder="เข้าสต็อก ยังไม่ระบุร้าน"
          value={customerId}
          onChange={setCustomerId}
          options={customers.filter((c) => c.type === 'consignment').map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>
      {finishedGoodId && (
        <div className="mb-2 flex flex-wrap gap-x-8 gap-y-2 text-sm">
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
      <PickerFooter count={finishedGoodId && qty > 0 ? 1 : 0} onAdd={add} hint="เลือกสินค้าและใส่จำนวน แล้วกดเพิ่มเข้ารายการ" />
    </>
  )
}
