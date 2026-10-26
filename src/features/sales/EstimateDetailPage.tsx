import { Link } from '@tanstack/react-router'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconCheck } from '@/components/icons'
import { Alert, Button, Card, CardHeader, EmptyState, StatusPill } from '@/components/ui'
import { controlClass } from '@/components/ui/FormField'
import { useDeliveryStore } from '@/features/logistics/deliveryStore'
import { dayLabel } from '@/features/logistics/types'
import { finishedGoodById } from '@/features/procurement/mockData'
import { useProductionStore } from '@/features/production/store'
import { cn } from '@/lib/cn'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { useConsignmentStore } from './consignmentStore'
import { estimateStatusLabel, estimateStatusTone } from './EstimatesPage'
import { dayOfWeekOf, estimateQuantity, estimateTotals } from './estimates'
import { customerById } from './store'
import { formatDate } from './utils'

export function EstimateDetailPage({ estimateId }: { estimateId: string }) {
  const estimate = useConsignmentStore((s) => s.estimates.find((e) => e.id === estimateId))
  const route = useConsignmentStore((s) => s.routes.find((r) => r.id === estimate?.consignmentRouteId))
  const allEstimates = useConsignmentStore((s) => s.estimates)
  const routes = useConsignmentStore((s) => s.routes)
  const setEstimateQty = useConsignmentStore((s) => s.setEstimateQty)
  const resetEstimate = useConsignmentStore((s) => s.resetEstimate)
  const confirmEstimate = useConsignmentStore((s) => s.confirmEstimate)
  const cancelEstimate = useConsignmentStore((s) => s.cancelEstimate)
  const sheets = useDeliveryStore((s) => s.sheets)
  const productionOrders = useProductionStore((s) => s.orders)

  if (!estimate || !route) {
    return (
      <>
        <PageHeading section="ขาย" parent={{ label: 'ยอดประเมินลงร้าน', to: '/sales/estimates' }} title="ไม่พบยอดประเมิน" />
        <Card>
          <EmptyState title="ไม่พบยอดประเมินนี้" description="อาจถูกลบหรือยังไม่เคยสร้าง" />
        </Card>
      </>
    )
  }

  const shopIds = [...new Set(estimate.lines.map((l) => l.customerId))]
  const productIds = [...new Set(estimate.lines.map((l) => l.finishedGoodId))]
  const totals = estimateTotals(estimate)
  const cell = (customerId: string, finishedGoodId: string) => estimate.lines.find((l) => l.customerId === customerId && l.finishedGoodId === finishedGoodId)!
  const linked = productionOrders.filter((p) => p.consignmentEstimateId === estimate.id)
  const plannedFor = (finishedGoodId: string) => linked.filter((p) => p.finishedGoodId === finishedGoodId).reduce((sum, p) => sum + p.plannedQuantity, 0)

  // Locked once the route's delivery sheet for this date has been printed: the truck is already loaded
  const lockedBy = sheets.find((s) => s.consignmentRouteId === route.id && s.deliveryDate === estimate.deliveryDate && (s.status === 'printed'))
  const editable = estimate.status !== 'cancelled' && !lockedBy

  // Shops that also sit on another route's estimate the same day
  const duplicates = shopIds.flatMap((customerId) => {
    const mine = estimate.lines.filter((l) => l.customerId === customerId).reduce((sum, l) => sum + l.estimatedQuantity, 0)
    if (mine === 0) return []
    return allEstimates
      .filter((e) => e.id !== estimate.id && e.deliveryDate === estimate.deliveryDate && e.status !== 'cancelled')
      .filter((e) => e.lines.some((l) => l.customerId === customerId && l.estimatedQuantity > 0))
      .map((e) => ({ customerId, other: routes.find((r) => r.id === e.consignmentRouteId)?.code ?? '' }))
  })
  const changedAfterProduction = linked.length > 0 && [...totals].some(([id, qty]) => plannedFor(id) !== qty)

  const confirmIt = () => {
    const res = confirmEstimate(estimate.id)
    if (!res.ok) toast.error(res.message)
    else toast.success(`ยืนยัน ${estimate.estimateNumber} แล้ว ไปสั่งผลิตได้ที่หน้าวางแผนผลิต`)
  }

  const cancelIt = async () => {
    const ok = await confirm({ title: `ยกเลิก ${estimate.estimateNumber}?`, message: 'ยอดประเมินจะไม่นับเข้าแผนผลิต ใบสั่งผลิตที่สร้างไปแล้วไม่ถูกยกเลิกให้', confirmLabel: 'ยกเลิกยอดประเมิน', tone: 'danger' })
    if (ok) cancelEstimate(estimate.id)
  }

  return (
    <>
      <PageHeading
        section="ขาย"
        parent={{ label: 'ยอดประเมินลงร้าน', to: '/sales/estimates' }}
        title={estimate.estimateNumber}
        subtitle={`สาย ${route.code} ${route.name} · ส่ง ${formatDate(estimate.deliveryDate)} (วัน${dayLabel[dayOfWeekOf(estimate.deliveryDate)]})`}
      />

      {lockedBy && (
        <Alert tone="warning" title="แก้ไม่ได้ ใบส่งของของสายนี้พิมพ์แล้ว" className="mb-6" action={<Link to="/logistics/delivery-sheets/$sheetId" params={{ sheetId: lockedBy.id }} className="text-sm font-medium text-primary-fg hover:underline">เปิดใบส่งของ</Link>}>
          {lockedBy.sheetNumber} ขึ้นรถไปแล้ว
        </Alert>
      )}
      {duplicates.length > 0 && (
        <Alert tone="info" title="มีร้านที่ถูกประเมินในสายอื่นของวันเดียวกันด้วย" className="mb-6">
          {duplicates.map((d) => `${customerById(d.customerId)?.name} (สาย ${d.other})`).join(', ')}
        </Alert>
      )}
      {changedAfterProduction && (
        <Alert tone="warning" title="ยอดประเมินไม่ตรงกับใบสั่งผลิตที่สร้างไปแล้ว" className="mb-6">
          ระบบไม่แก้ใบสั่งผลิตให้ — ดูส่วนต่างในตารางสรุปด้านล่าง แล้วสั่งผลิตเพิ่มหรือปรับที่หน้าวางแผนผลิต
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader
          title="ประเมินรายร้านและสินค้า"
          subtitle="ตัวเลขเริ่มต้นมาจากยอดขายเฉลี่ยของร้านหักของที่ยังเหลือในร้าน แก้ได้ทุกช่อง · 0 = ไม่ลงสินค้านี้"
          action={<StatusPill tone={estimateStatusTone[estimate.status]}>{estimateStatusLabel[estimate.status]}</StatusPill>}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-separate text-sm [border-spacing:0_0.375rem]">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1.5 pr-3 pl-3.5 font-light">ร้าน</th>
                {productIds.map((id) => (
                  <th key={id} className="py-1.5 pr-3 font-light">
                    {finishedGoodById(id)?.name}
                  </th>
                ))}
                <th className="py-1.5 pr-3.5 text-right font-light">รวมร้าน</th>
              </tr>
            </thead>
            <tbody>
              {shopIds.map((customerId) => (
                <tr key={customerId}>
                  <td className="rounded-l-[0.875rem] border-y border-l border-line py-2 pr-3 pl-3.5">
                    <p className="font-medium">{customerById(customerId)?.name}</p>
                    <p className="text-muted">{customerById(customerId)?.chain}</p>
                  </td>
                  {productIds.map((id) => {
                    const line = cell(customerId, id)
                    return (
                      <td key={id} className="border-y border-line py-2 pr-3">
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          aria-label={`${customerById(customerId)?.name} ${finishedGoodById(id)?.name}`}
                          disabled={!editable}
                          value={line.estimatedQuantity}
                          onChange={(e) => setEstimateQty(estimate.id, customerId, id, Number(e.target.value))}
                          className={cn(controlClass(), 'h-10 w-24 px-3 text-right tabular-nums')}
                        />
                        <p className={cn('mt-0.5 text-right text-xs', line.estimatedQuantity === line.suggestedQuantity ? 'text-muted' : 'text-warning-fg')}>แนะนำ {line.suggestedQuantity}</p>
                      </td>
                    )
                  })}
                  <td className="rounded-r-[0.875rem] border-y border-r border-line py-2 pr-3.5 text-right font-medium tabular-nums">
                    {estimate.lines.filter((l) => l.customerId === customerId).reduce((sum, l) => sum + l.estimatedQuantity, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="py-2 pr-3 pl-3.5">รวมทั้งสาย</td>
                {productIds.map((id) => (
                  <td key={id} className="py-2 pr-3 tabular-nums">
                    {totals.get(id) ?? 0}
                  </td>
                ))}
                <td className="py-2 pr-3.5 text-right tabular-nums">{estimateQuantity(estimate)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {estimate.status !== 'cancelled' && (
          <footer className="mt-5 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
            <Button variant="outline" disabled={!editable} onClick={() => resetEstimate(estimate.id)}>
              คืนค่าที่ระบบแนะนำ
            </Button>
            <Button variant="outline" disabled={!!lockedBy} onClick={cancelIt}>
              ยกเลิกยอดประเมิน
            </Button>
            {estimate.status === 'draft' && (
              <Button onClick={confirmIt}>
                <IconCheck />
                ยืนยันยอดประเมิน
              </Button>
            )}
          </footer>
        )}
      </Card>

      {estimate.status === 'confirmed' && (
        <Card>
          <CardHeader
            title="การสั่งผลิต"
            subtitle="ใบสั่งผลิต 1 ใบต่อสินค้า ขนาดเท่ายอดรวมของสาย"
            action={
              <Link to="/production/planning" className="text-sm font-medium text-primary-fg hover:underline">
                ไปหน้าวางแผนผลิต
              </Link>
            }
          />
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {[...totals].map(([id, qty]) => {
              const made = plannedFor(id)
              return (
                <li key={id} className="flex items-center justify-between gap-3 rounded-[0.875rem] border border-line px-3.5 py-2.5">
                  <span className="font-medium">{finishedGoodById(id)?.name}</span>
                  <span className="text-sm tabular-nums">
                    ประเมิน {qty} · สั่งผลิต {made}{' '}
                    {made === 0 ? <StatusPill tone="warning">ยังไม่สั่ง</StatusPill> : made === qty ? <StatusPill tone="success">ครบ</StatusPill> : <StatusPill tone="danger">ต่าง {made - qty > 0 ? '+' : ''}{made - qty}</StatusPill>}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </>
  )
}
