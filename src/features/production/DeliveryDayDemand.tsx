import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconFactory } from '@/components/icons'
import { Alert, Button, Card, CardHeader, DataTable, DatePicker, StatusPill, type DataTableColumn } from '@/components/ui'
import { dayLabel } from '@/features/logistics/types'
import { finishedGoodById, rawMaterialById } from '@/features/procurement/mockData'
import { useConsignmentStore } from '@/features/sales/consignmentStore'
import { dayOfWeekOf, estimateTotals, toYmd, ymdFromToday } from '@/features/sales/estimates'
import { customerById, useSalesStore } from '@/features/sales/store'
import { channelLabel, channelTone, formatDate } from '@/features/sales/utils'
import { toast } from '@/stores/toastStore'
import { useProductionStore } from './store'
import { defaultLineFor, rmRequirementFor, rmShortages } from './utils'

interface Row {
  key: string
  estimateId: string
  routeId: string
  routeCode: string
  routeName: string
  finishedGoodId: string
  estimated: number
  planned: number
}

const shiftDay = (ymd: string, days: number) => toYmd(new Date(new Date(`${ymd}T12:00`).getTime() + days * 86_400_000))

/**
 * Everything that has to be ready for one delivery date: the confirmed estimate of every consignment route running
 * that day (one production order per route × product) and the customer orders due that day (made order by order below).
 * Production can be ordered at any time — the afternoon before is just the usual moment.
 */
export function DeliveryDayDemand() {
  const [date, setDate] = useState(ymdFromToday(1))
  const estimates = useConsignmentStore((s) => s.estimates)
  const routes = useConsignmentStore((s) => s.routes)
  const orders = useSalesStore((s) => s.orders)
  const productionOrders = useProductionStore((s) => s.orders)
  const rmStock = useProductionStore((s) => s.rmStock)
  const lines = useProductionStore((s) => s.lines)
  const createProductionOrder = useProductionStore((s) => s.createProductionOrder)

  const confirmed = estimates.filter((e) => e.deliveryDate === date && e.status === 'confirmed')
  const rows: Row[] = confirmed.flatMap((e) => {
    const route = routes.find((r) => r.id === e.consignmentRouteId)
    return [...estimateTotals(e)].map(([finishedGoodId, estimated]) => ({
      key: `${e.id}-${finishedGoodId}`,
      estimateId: e.id,
      routeId: e.consignmentRouteId,
      routeCode: route?.code ?? '',
      routeName: route?.name ?? '',
      finishedGoodId,
      estimated,
      planned: productionOrders.filter((p) => p.consignmentEstimateId === e.id && p.finishedGoodId === finishedGoodId).reduce((sum, p) => sum + p.plannedQuantity, 0),
    }))
  })
  const draftCount = estimates.filter((e) => e.deliveryDate === date && e.status === 'draft').length
  const dueOrders = orders.filter((o) => o.status === 'confirmed' && toYmd(new Date(o.requestedDeliveryDate)) === date)
  const orderLinesToMake = dueOrders.filter((o) => o.lines.some((l) => !productionOrders.some((p) => p.customerOrderId === o.id && p.finishedGoodId === l.finishedGoodId)))

  const shortfall = (r: Row) => Math.max(0, r.estimated - r.planned)
  const shortageFor = (r: Row) => rmShortages(rmRequirementFor(r.finishedGoodId, shortfall(r)), rmStock)

  const produce = (r: Row): boolean => {
    const line = defaultLineFor(r.finishedGoodId, lines)
    if (!line) {
      toast.error(`${finishedGoodById(r.finishedGoodId)?.name}: ไม่มีไลน์ผลิตที่ว่าง`)
      return false
    }
    const res = createProductionOrder({
      finishedGoodId: r.finishedGoodId,
      quantity: shortfall(r),
      productionLineId: line.id,
      source: 'consignment_route',
      customerOrderId: null,
      customerId: null,
      consignmentRouteId: r.routeId,
      consignmentEstimateId: r.estimateId,
      deliveryDate: date,
    })
    if (!res.ok) {
      toast.error(`${r.routeCode} ${finishedGoodById(r.finishedGoodId)?.name}: ${res.error}`)
      return false
    }
    toast.success(`สร้าง ${res.order.orderNumber} แล้ว (สาย ${r.routeCode})`)
    return true
  }

  const produceAll = () => rows.filter((r) => shortfall(r) > 0).forEach((r) => produce(r))
  const pending = rows.filter((r) => shortfall(r) > 0).length

  const columns: DataTableColumn<Row>[] = [
    {
      key: 'route',
      label: 'สาย',
      sortValue: (r) => r.routeCode,
      render: (r) => (
        <Link to="/sales/estimates/$estimateId" params={{ estimateId: r.estimateId }} className="font-medium text-primary-fg hover:underline">
          {r.routeCode} {r.routeName}
        </Link>
      ),
    },
    { key: 'fg', label: 'สินค้า', sortValue: (r) => finishedGoodById(r.finishedGoodId)?.name ?? '', render: (r) => finishedGoodById(r.finishedGoodId)?.name },
    { key: 'estimated', label: 'ประเมินรวมสาย', sortValue: (r) => r.estimated, render: (r) => <span className="tabular-nums">{r.estimated}</span> },
    { key: 'planned', label: 'สั่งผลิตแล้ว', sortValue: (r) => r.planned, render: (r) => <span className="tabular-nums">{r.planned}</span> },
    {
      key: 'rm',
      label: 'วัตถุดิบ',
      sortValue: (r) => shortageFor(r).length,
      render: (r) => {
        if (shortfall(r) === 0) return <StatusPill tone="success">สั่งครบแล้ว</StatusPill>
        const short = shortageFor(r)
        return short.length === 0 ? <StatusPill tone="success">มีพอ</StatusPill> : <StatusPill tone="danger">ไม่พอ: {short.map((s) => rawMaterialById(s.rawMaterialId)?.nameTh).join(', ')}</StatusPill>
      },
    },
  ]

  return (
    <Card className="mb-6">
      <CardHeader
        title="ความต้องการตามวันส่ง"
        subtitle={`${formatDate(date)} (วัน${dayLabel[dayOfWeekOf(date)]}) · ใบสั่งผลิตฝากขาย 1 ใบต่อสาย × สินค้า`}
        action={
          <div className="flex items-end gap-2">
            <Button variant="outline" iconOnly aria-label="วันก่อนหน้า" tooltip="วันก่อนหน้า" onClick={() => setDate(shiftDay(date, -1))}>
              <IconChevronLeft />
            </Button>
            <DatePicker aria-label="วันส่ง" value={date} onChange={(d) => d && setDate(d)} containerClassName="w-48" />
            <Button variant="outline" iconOnly aria-label="วันถัดไป" tooltip="วันถัดไป" onClick={() => setDate(shiftDay(date, 1))}>
              <IconChevronRight />
            </Button>
          </div>
        }
      />

      {draftCount > 0 && (
        <Alert tone="info" title={`มียอดประเมินที่ยังเป็นร่าง ${draftCount} สาย`} className="mb-5" action={<Link to="/sales/estimates" className="text-sm font-medium text-primary-fg hover:underline">ไปยืนยัน</Link>}>
          ยอดประเมินจะนับเข้าแผนผลิตเมื่อยืนยันแล้ว
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.key}
        defaultSort={{ key: 'route', dir: 'asc' }}
        emptyTitle="ยังไม่มียอดประเมินที่ยืนยันสำหรับวันนี้"
        emptyDescription="ทำยอดประเมินลงร้านของแต่ละสายที่ ขาย → ยอดประเมินลงร้าน"
        renderActions={(r) => (
          <Button size="sm" variant="primary" iconOnly outlined aria-label="สั่งผลิต" tooltip="สั่งผลิตส่วนที่ยังขาด" disabled={shortfall(r) === 0 || shortageFor(r).length > 0} onClick={() => produce(r)}>
            <IconFactory />
          </Button>
        )}
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <div className="text-sm">
          <p>
            <span className="text-muted">คำสั่งซื้อที่ต้องส่งวันนี้ </span>
            <span className="font-medium tabular-nums">{dueOrders.length}</span>
            <span className="text-muted"> ใบ · ยังไม่สั่งผลิต </span>
            <span className="font-medium tabular-nums">{orderLinesToMake.length}</span>
            <span className="text-muted"> ใบ (สั่งผลิตรายใบได้ในตารางด้านล่าง)</span>
          </p>
          {dueOrders.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-1.5">
              {dueOrders.map((o) => (
                <span key={o.id} className="inline-flex items-center gap-1.5">
                  <StatusPill tone={channelTone[o.channel]}>{channelLabel[o.channel]}</StatusPill>
                  <span className="text-muted">{o.orderNumber} {customerById(o.customerId)?.name}</span>
                </span>
              ))}
            </p>
          )}
        </div>
        <Button disabled={pending === 0} onClick={produceAll}>
          <IconFactory />
          สั่งผลิตสายฝากขายที่ยังขาด ({pending})
        </Button>
      </div>
    </Card>
  )
}
