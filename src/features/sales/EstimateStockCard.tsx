import { useMemo } from 'react'
import { Card, CardHeader, DataTable, StatusPill, type DataTableColumn } from '@/components/ui'
import { rawMaterialById } from '@/features/procurement/mockData'
import { useProductionStore } from '@/features/production/store'
import { rmRequirementFor, roundQty } from '@/features/production/utils'
import { toYmd } from './estimates'
import { useConsignmentStore } from './consignmentStore'
import { estimateTotals } from './estimates'
import { useSalesStore } from './store'
import { formatDate, orderLineProgress } from './utils'

interface Props {
  /** Delivery date being estimated, yyyy-mm-dd */
  date: string
  /** The estimate being viewed — left out of the deduction because the page is about producing it */
  excludeEstimateId?: string
  /** Limit to raw materials used by these products (the estimate's own); all raw materials in stock when omitted */
  finishedGoodIds?: string[]
  className?: string
}

/**
 * Raw material we can still spend on consignment production for `date`: on hand, less what is allocated to production
 * orders already, less what fixed (confirmed) customer orders due by that date still need and no production order covers yet.
 */
export function EstimateStockCard({ date, excludeEstimateId, finishedGoodIds, className }: Props) {
  const rmStock = useProductionStore((s) => s.rmStock)
  const batches = useProductionStore((s) => s.batches)
  const productionOrders = useProductionStore((s) => s.orders)
  const orders = useSalesStore((s) => s.orders)
  const estimates = useConsignmentStore((s) => s.estimates)

  const rows = useMemo(() => {
    const due = orders.filter((o) => o.status === 'confirmed' && toYmd(new Date(o.requestedDeliveryDate)) <= date)
    // Raw material the uncovered part of each fixed order will need
    const claim: Record<string, number> = {}
    for (const o of due) {
      for (const l of o.lines) {
        if (!l.finishedGoodId || l.quantity <= 0) continue
        const progress = orderLineProgress(o, l.finishedGoodId, productionOrders, batches)
        const uncovered = Math.max(0, l.quantity - Math.max(progress.planned, progress.produced))
        if (uncovered === 0) continue
        for (const r of rmRequirementFor(l.finishedGoodId, uncovered)) claim[r.rawMaterialId] = roundQty((claim[r.rawMaterialId] ?? 0) + r.quantity)
      }
    }
    // ...and what the other routes' estimates for the same day still need
    const fromEstimates: Record<string, number> = {}
    for (const e of estimates) {
      if (e.id === excludeEstimateId || e.deliveryDate !== date || e.status === 'cancelled') continue
      for (const [finishedGoodId, qty] of estimateTotals(e)) {
        const planned = productionOrders.filter((p) => p.consignmentEstimateId === e.id && p.finishedGoodId === finishedGoodId).reduce((sum, p) => sum + p.plannedQuantity, 0)
        const uncovered = Math.max(0, qty - planned)
        if (uncovered === 0) continue
        for (const r of rmRequirementFor(finishedGoodId, uncovered)) fromEstimates[r.rawMaterialId] = roundQty((fromEstimates[r.rawMaterialId] ?? 0) + r.quantity)
      }
    }
    const scope = finishedGoodIds ? new Set(finishedGoodIds.flatMap((id) => rmRequirementFor(id, 1).map((r) => r.rawMaterialId))) : null
    return Object.values(rmStock)
      .filter((s) => !scope || scope.has(s.rawMaterialId))
      .map((s) => {
        const free = roundQty(s.onHand - s.allocated)
        const fixed = claim[s.rawMaterialId] ?? 0
        const sameDay = fromEstimates[s.rawMaterialId] ?? 0
        return { rawMaterialId: s.rawMaterialId, name: rawMaterialById(s.rawMaterialId)?.nameTh ?? s.rawMaterialId, unit: rawMaterialById(s.rawMaterialId)?.unit ?? '', onHand: s.onHand, allocated: s.allocated, fixed, sameDay, net: roundQty(free - fixed - sameDay) }
      })
  }, [rmStock, batches, productionOrders, orders, estimates, date, excludeEstimateId, finishedGoodIds])

  const columns: DataTableColumn<(typeof rows)[number]>[] = [
    { key: 'name', label: 'วัตถุดิบ', sortValue: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'onHand', label: 'ในคลัง', sortValue: (r) => r.onHand, render: (r) => <span className="tabular-nums">{r.onHand}</span> },
    { key: 'allocated', label: 'หัก: จองให้ใบสั่งผลิตแล้ว', sortValue: (r) => r.allocated, render: (r) => <span className="tabular-nums">{r.allocated > 0 ? `− ${r.allocated}` : '0'}</span> },
    { key: 'fixed', label: 'หัก: คำสั่งซื้อประจำที่ยังไม่ได้สั่งผลิต', sortValue: (r) => r.fixed, render: (r) => <span className="tabular-nums">{r.fixed > 0 ? `− ${r.fixed}` : '0'}</span> },
    { key: 'sameDay', label: 'หัก: ใบประเมินวันเดียวกันที่ยังไม่ได้สั่งผลิต', sortValue: (r) => r.sameDay, render: (r) => <span className="tabular-nums">{r.sameDay > 0 ? `− ${r.sameDay}` : '0'}</span> },
    {
      key: 'net',
      label: 'วัตถุดิบที่ใช้ผลิตลงร้านฝากขายได้',
      sortValue: (r) => r.net,
      render: (r) => (
        <span className="inline-flex items-center gap-2 tabular-nums">
          <span className="font-semibold">
            {r.net} {r.unit}
          </span>
          {r.net < 0 && <StatusPill tone="danger">ขาด {-r.net}</StatusPill>}
        </span>
      ),
    },
  ]

  return (
    <Card className={className}>
      <CardHeader title="สต๊อกวัตถุดิบที่ใช้ได้" subtitle={`สำหรับผลิตส่งวันที่ ${formatDate(date)} · หักคำสั่งซื้อประจำ (fixed order) และใบประเมินวันเดียวกันแล้ว`} />
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.rawMaterialId} defaultSort={{ key: 'name', dir: 'asc' }} pageSize={10} paginationVariant="jump" emptyTitle="ยังไม่มีวัตถุดิบในคลัง" />
      <div className="mt-4 rounded-[0.875rem] bg-fill px-4 py-3 text-sm text-ink-2">
        <p className="font-medium text-ink">วิธีคิด</p>
        <p className="mt-1">
          วัตถุดิบที่ใช้ได้ = ของในคลัง − ที่จองให้ใบสั่งผลิตแล้ว − วัตถุดิบที่คำสั่งซื้อประจำ (สถานะยืนยันแล้ว กำหนดส่งภายในวันที่เลือกหรือก่อนหน้า) ยังต้องใช้ในส่วนที่ยังไม่ได้สั่งผลิต − วัตถุดิบที่ใบประเมินลงร้านของสายอื่นในวันส่งเดียวกัน (ร่างหรือยืนยันแล้ว ไม่นับที่ยกเลิก) ยังต้องใช้ในส่วนที่ยังไม่ได้สั่งผลิต โดยคำนวณจากสูตร (BOM) × จำนวนที่ยังไม่ได้สั่งผลิต
        </p>
        <p className="mt-1 text-muted">คำสั่งซื้อประจำมาก่อนเสมอ ในหน้ารายละเอียดจะไม่หักใบประเมินของใบที่กำลังดูอยู่ ตัวเลขติดลบ = วัตถุดิบไม่พอแม้ยังไม่ผลิตลงร้านฝากขาย ต้องจัดซื้อเพิ่มก่อน</p>
      </div>
    </Card>
  )
}
