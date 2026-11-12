import { Link } from '@tanstack/react-router'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconCheck, IconClose } from '@/components/icons'
import { Alert, Button, Card, CardHeader, DataTable, EmptyState, Select, StatusPill, type DataTableColumn } from '@/components/ui'
import { controlClass } from '@/components/ui/FormField'
import { getFinishedGoods } from '@/features/catalog/store'
import { useDeliveryStore } from '@/features/logistics/deliveryStore'
import { dayLabel } from '@/features/logistics/types'
import { finishedGoodById } from '@/features/procurement/mockData'
import { CombosCard } from '@/features/production/CapacityPage'
import { useProductionStore } from '@/features/production/store'
import { cn } from '@/lib/cn'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { useConsignmentStore } from './consignmentStore'
import { EstimateStockCard } from './EstimateStockCard'
import { estimateStatusLabel, estimateStatusTone } from './EstimatesPage'
import { dayOfWeekOf, estimateQuantity, estimateTotals } from './estimates'
import { customerById } from './store'
import type { ConsignmentEstimateLine } from './types'
import { formatDate } from './utils'

export function EstimateDetailPage({ estimateId }: { estimateId: string }) {
  const estimate = useConsignmentStore((s) => s.estimates.find((e) => e.id === estimateId))
  const route = useConsignmentStore((s) => s.routes.find((r) => r.id === estimate?.consignmentRouteId))
  const allEstimates = useConsignmentStore((s) => s.estimates)
  const routes = useConsignmentStore((s) => s.routes)
  const setEstimateQty = useConsignmentStore((s) => s.setEstimateQty)
  const addEstimateLine = useConsignmentStore((s) => s.addEstimateLine)
  const removeEstimateLine = useConsignmentStore((s) => s.removeEstimateLine)
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

  // Shops follow the route, so a shop stays on screen even after all its products are removed
  const shopIds = [...route.stops].sort((a, b) => a.sequence - b.sequence).map((s) => s.customerId)
  const productIds = [...new Set(estimate.lines.map((l) => l.finishedGoodId))]
  const totals = estimateTotals(estimate)
  const activeProducts = getFinishedGoods(true)
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

  const columnsFor = (customerId: string): DataTableColumn<ConsignmentEstimateLine>[] => [
    { key: 'name', label: 'สินค้า', sortable: false, render: (l) => <span className="font-medium">{finishedGoodById(l.finishedGoodId)?.name}</span> },
    {
      key: 'suggested',
      label: 'แนะนำ',
      sortable: false,
      render: (l) => <span className={cn('tabular-nums', l.estimatedQuantity === l.suggestedQuantity ? 'text-muted' : 'text-warning-fg')}>{l.suggestedQuantity}</span>,
    },
    {
      key: 'qty',
      label: 'ประเมิน',
      sortable: false,
      render: (l) => (
        <input
          type="number"
          min={0}
          inputMode="numeric"
          aria-label={`${customerById(customerId)?.name} ${finishedGoodById(l.finishedGoodId)?.name}`}
          disabled={!editable}
          value={l.estimatedQuantity}
          onChange={(e) => setEstimateQty(estimate.id, customerId, l.finishedGoodId, Number(e.target.value))}
          className={cn(controlClass(), 'h-9 w-24 px-3 text-right tabular-nums')}
        />
      ),
    },
  ]

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

      <EstimateStockCard date={estimate.deliveryDate} excludeEstimateId={estimate.id} className="mb-6" />

      <CombosCard plansOpenInDrawer className="mb-6" />

      <Card className="mb-6">
        <CardHeader
          title="ประเมินรายร้านและสินค้า"
          subtitle="ตัวเลขเริ่มต้นมาจากยอดขายเฉลี่ยของร้านหักของที่ยังเหลือในร้าน แก้ได้ทุกช่อง เพิ่มหรือเอาสินค้าของแต่ละร้านออกได้"
          action={<StatusPill tone={estimateStatusTone[estimate.status]}>{estimateStatusLabel[estimate.status]}</StatusPill>}
        />

        <div className="grid gap-3 lg:grid-cols-2">
          {shopIds.map((customerId) => {
            const shop = customerById(customerId)
            const shopLines = estimate.lines.filter((l) => l.customerId === customerId)
            const shopTotal = shopLines.reduce((sum, l) => sum + l.estimatedQuantity, 0)
            const addable = activeProducts.filter((fg) => !shopLines.some((l) => l.finishedGoodId === fg.id))
            return (
              <section key={customerId} className="rounded-[0.875rem] border border-line p-4">
                <div className="min-w-0">
                  <h3 className="font-medium">{shop?.name}</h3>
                  <p className="text-sm text-muted">{shop?.chain}</p>
                </div>

                <div className="mt-3">
                  <DataTable
                    columns={columnsFor(customerId)}
                    rows={shopLines}
                    rowKey={(l) => l.finishedGoodId}
                    sortable={false}
                    emptyTitle="ยังไม่มีสินค้า"
                    emptyDescription={editable ? 'เลือก "+ เพิ่มสินค้า" ด้านล่างเพื่อเริ่มประเมิน' : undefined}
                    renderActions={
                      editable
                        ? (l) => (
                            <Button size="sm" variant="soft" iconOnly outlined aria-label={`เอา ${finishedGoodById(l.finishedGoodId)?.name} ออก`} tooltip="เอาสินค้าออก" onClick={() => removeEstimateLine(estimate.id, customerId, l.finishedGoodId)}>
                              <IconClose />
                            </Button>
                          )
                        : undefined
                    }
                  />
                  {shopLines.length > 0 && (
                    <p className="mt-2 flex justify-between px-3.5 text-sm font-semibold">
                      <span>รวมร้าน</span>
                      <span className="tabular-nums">{shopTotal}</span>
                    </p>
                  )}
                </div>

                {editable && addable.length > 0 && (
                  <Select
                    aria-label={`เพิ่มสินค้าให้ ${shop?.name}`}
                    placeholder="+ เพิ่มสินค้า"
                    value=""
                    onChange={(id) => id && addEstimateLine(estimate.id, customerId, id)}
                    options={addable.map((fg) => ({ value: fg.id, label: fg.name }))}
                    className="mt-3"
                  />
                )}
              </section>
            )
          })}
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-4 text-sm">
          <li className="font-semibold">รวมทั้งสาย {estimateQuantity(estimate)}</li>
          {productIds.map((id) => (
            <li key={id} className="tabular-nums">
              <span className="text-muted">{finishedGoodById(id)?.name} </span>
              {totals.get(id) ?? 0}
            </li>
          ))}
        </ul>

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
