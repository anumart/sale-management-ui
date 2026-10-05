import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconCheck, IconPower } from '@/components/icons'
import { Alert, Button, Card, CardHeader, SegmentedControl, StatusPill, TextField } from '@/components/ui'
import { finishedGoodById, rawMaterialById } from '@/features/procurement/mockData'
import { useCustomer, useSalesStore } from '@/features/sales/store'
import { formatDateTime } from '@/lib/format'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { lineById, useProductionStore } from './store'
import type { QcStatus } from './types'
import { batchGradeTone, orderStatusLabel, orderStatusTone, qcStatusLabel, qcStatusTone, roundQty, sourceLabel } from './utils'

export interface ProductionOrderDetailPageProps {
  orderId: string
}

export function ProductionOrderDetailPage({ orderId }: ProductionOrderDetailPageProps) {
  const navigate = useNavigate()
  const order = useProductionStore((s) => s.orders.find((o) => o.id === orderId))
  const batch = useProductionStore((s) => s.batches.find((b) => b.productionOrderId === orderId))
  const startProduction = useProductionStore((s) => s.startProduction)
  const updateMonitoring = useProductionStore((s) => s.updateMonitoring)
  const completeProduction = useProductionStore((s) => s.completeProduction)
  const customerOrder = useSalesStore((s) => s.orders.find((o) => o.id === order?.customerOrderId))
  const customer = useCustomer(order?.customerId)

  const [operatorName, setOperatorName] = useState('')
  const [actualQuantity, setActualQuantity] = useState('')
  const [completionDefects, setCompletionDefects] = useState('0')
  const [actualRmUsed, setActualRmUsed] = useState<Record<string, string>>({})

  useEffect(() => {
    if (order?.status === 'in_production') {
      setActualQuantity(String(order.plannedQuantity))
      setCompletionDefects(String(order.defectsFound ?? 0))
      setActualRmUsed(Object.fromEntries(order.rmAllocations.map((a) => [a.rawMaterialId, String(a.quantity)])))
    }
  }, [order?.id, order?.status])

  if (!order) {
    return (
      <>
        <PageHeading section="ผลิต" parent={{ label: 'ใบสั่งผลิต', to: '/production/orders' }} title="ใบสั่งผลิต" />
        <Card>
          <p className="text-muted">ไม่พบใบสั่งผลิต</p>
        </Card>
      </>
    )
  }

  const fg = finishedGoodById(order.finishedGoodId)
  const line = lineById(order.productionLineId)
  const orderedQty = customerOrder?.lines.find((l) => l.finishedGoodId === order.finishedGoodId)?.quantity ?? null

  const handleStart = () => {
    if (!operatorName.trim()) {
      toast.error('กรอกชื่อผู้ปฏิบัติงานก่อนเริ่มผลิต')
      return
    }
    startProduction(order.id, operatorName.trim())
    toast.success(`เริ่มผลิต ${order.orderNumber} ที่ ${line?.name} แล้ว เบิกวัตถุดิบเข้าไลน์เรียบร้อย`)
  }

  const handleComplete = async () => {
    const qty = Number(actualQuantity)
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error('กรอกจำนวนที่ผลิตได้จริงให้ถูกต้อง')
      return
    }
    for (const alloc of order.rmAllocations) {
      const raw = actualRmUsed[alloc.rawMaterialId]
      if (raw === undefined || raw === '' || Number.isNaN(Number(raw)) || Number(raw) < 0) {
        toast.error('กรอกวัตถุดิบที่ใช้จริงให้ครบทุกรายการ')
        return
      }
    }

    const ok = await confirm({
      title: 'ปิดใบสั่งผลิต?',
      message: `ระบบจะบันทึกผลิตได้ ${qty} ${fg?.unit ?? 'หน่วย'} กระทบยอดวัตถุดิบที่ใช้ และลงทะเบียน LOT สินค้าสำเร็จรูป ${order.batchNumber} ไม่สามารถย้อนกลับได้`,
      confirmLabel: 'ปิดการผลิต',
      tone: 'primary',
    })
    if (!ok) return

    completeProduction(order.id, {
      actualQuantity: qty,
      defectsFound: Number(completionDefects) || 0,
      actualRmUsed: order.rmAllocations.map((a) => ({ rawMaterialId: a.rawMaterialId, quantity: Number(actualRmUsed[a.rawMaterialId]) })),
    })
    toast.success(`ผลิตเสร็จแล้ว yield ${Math.round((qty / order.plannedQuantity) * 100)}% ลงทะเบียน LOT ${order.batchNumber} แล้ว`)
  }

  return (
    <>
      <PageHeading section="ผลิต" parent={{ label: 'ใบสั่งผลิต', to: '/production/orders' }} title={order.orderNumber} subtitle={`${fg?.name} · ${line?.name} · LOT ${order.batchNumber}`} />

      <Card className="mb-6">
        <CardHeader title="รายละเอียดใบสั่งผลิต" action={<StatusPill tone={orderStatusTone[order.status]}>{orderStatusLabel[order.status]}</StatusPill>} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          <div>
            <p className="text-sm text-muted">ผลิตให้</p>
            {customerOrder ? (
              <Link to="/sales/orders/$orderId" params={{ orderId: customerOrder.id }} className="text-base font-medium text-primary-fg hover:underline">
                {customerOrder.orderNumber} · {customer?.name}
              </Link>
            ) : (
              <p className="text-base font-medium">{customer ? `${customer.name} (ฝากขาย)` : 'เข้าสต็อก'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted">ที่มา</p>
            <p className="text-base font-medium">{sourceLabel[order.source]}</p>
          </div>
          <div>
            <p className="text-sm text-muted">จำนวนที่วางแผน</p>
            <p className="text-base font-medium tabular-nums">{order.plannedQuantity} {fg?.unit}</p>
          </div>
          <div>
            <p className="text-sm text-muted">ไลน์ผลิต</p>
            <p className="text-base font-medium">{line?.code}</p>
          </div>
          <div>
            <p className="text-sm text-muted">ผู้ปฏิบัติงาน</p>
            <p className="text-base font-medium">{order.operatorName ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted">สถานะ QC</p>
            <StatusPill tone={qcStatusTone[order.qcStatus]}>{qcStatusLabel[order.qcStatus]}</StatusPill>
          </div>
          <div>
            <p className="text-sm text-muted">เริ่ม</p>
            <p className="text-base font-medium">{order.startDate ? formatDateTime(order.startDate) : '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted">สิ้นสุด</p>
            <p className="text-base font-medium">{order.endDate ? formatDateTime(order.endDate) : '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted">จำนวนผลิตจริง</p>
            <p className="text-base font-medium tabular-nums">{order.actualQuantity !== null ? `${order.actualQuantity} ${fg?.unit}` : '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted">Yield (%)</p>
            <p className="text-base font-medium tabular-nums">{order.yieldRate !== null ? `${order.yieldRate}%` : '—'}</p>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader title="วัตถุดิบที่จอง" subtitle={order.status === 'completed' ? 'ที่จองเทียบกับที่ใช้จริง (ส่วนต่างปรับเข้ายอดคงคลังแล้ว)' : 'จองไว้ให้ใบสั่งผลิตนี้ จะเบิกเข้าไลน์เมื่อเริ่มผลิต'} />
        <div className="overflow-x-auto">
          <table className="w-full border-separate text-base [border-spacing:0_0.5rem]">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-2 pr-3 pl-3.5 font-light">วัตถุดิบ</th>
                <th className="py-2 pr-3 font-light">จอง</th>
                {order.status === 'completed' && (
                  <>
                    <th className="py-2 pr-3 font-light">ใช้จริง</th>
                    <th className="py-2 pr-3.5 font-light">ส่วนต่าง</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {order.rmAllocations.map((a) => {
                const material = rawMaterialById(a.rawMaterialId)
                const actual = order.actualRmUsed?.find((u) => u.rawMaterialId === a.rawMaterialId)?.quantity ?? null
                const variance = actual !== null ? roundQty(actual - a.quantity) : null
                return (
                  <tr key={a.rawMaterialId}>
                    <td className="rounded-l-[0.875rem] border-y border-l border-line py-3 pr-3 pl-3.5 font-medium">{material?.name}</td>
                    <td className={order.status === 'completed' ? 'border-y border-line py-3 pr-3 tabular-nums' : 'rounded-r-[0.875rem] border-y border-r border-line py-3 pr-3.5 tabular-nums'}>
                      {roundQty(a.quantity)} {material?.unit}
                    </td>
                    {order.status === 'completed' && (
                      <>
                        <td className="border-y border-line py-3 pr-3 tabular-nums">{actual !== null ? `${roundQty(actual)} ${material?.unit}` : '—'}</td>
                        <td className="rounded-r-[0.875rem] border-y border-r border-line py-3 pr-3.5 tabular-nums">
                          {variance !== null ? `${variance > 0 ? '+' : ''}${variance} ${material?.unit}` : '—'}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {order.status === 'confirmed' && (
        <Card className="mb-6">
          <CardHeader title="เริ่มผลิต" subtitle="เบิกวัตถุดิบที่จองเข้าไลน์และเริ่มจับเวลา (FLOW 6)" />
          <div className="flex flex-wrap items-end gap-3">
            <TextField label="ชื่อผู้ปฏิบัติงาน" placeholder="เช่น สุนิสา ก." value={operatorName} onChange={(e) => setOperatorName(e.target.value)} containerClassName="mb-0 w-64" />
            <Button onClick={handleStart}>
              <IconPower />
              เริ่มผลิต
            </Button>
          </div>
        </Card>
      )}

      {order.status === 'in_production' && (
        <>
          <Card className="mb-6">
            <CardHeader title="ติดตามการผลิต" subtitle="บันทึกผลสุ่มตรวจ QC เป็นระยะระหว่างผลิต" />
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <p className="mb-1.5 text-control font-medium text-ink-2">สถานะ QC</p>
                <SegmentedControl
                  variant="mask"
                  aria-label="สถานะ QC"
                  value={order.qcStatus}
                  onChange={(v: QcStatus) => updateMonitoring(order.id, { qcStatus: v })}
                  options={[
                    { value: 'pending', label: 'รอตรวจ' },
                    { value: 'passed', label: 'ผ่าน' },
                    { value: 'failed', label: 'ไม่ผ่าน' },
                  ]}
                />
              </div>
              <TextField
                label="ของเสียที่พบ (ถึงตอนนี้)"
                type="number"
                min={0}
                value={order.defectsFound ?? 0}
                onChange={(e) => updateMonitoring(order.id, { defectsFound: Math.max(0, Number(e.target.value) || 0) })}
                containerClassName="mb-0 w-48"
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="ปิดการผลิต" subtitle="บันทึกยอดผลิตจริง กระทบยอดวัตถุดิบ และลงทะเบียน LOT สินค้าสำเร็จรูป (FLOW 6 ขั้นที่ 3 + FLOW 7)" />
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <TextField label="จำนวนที่ผลิตได้จริง" type="number" min={0} value={actualQuantity} onChange={(e) => setActualQuantity(e.target.value)} containerClassName="mb-0" />
              <TextField label="ของเสียที่พบ (สรุป)" type="number" min={0} value={completionDefects} onChange={(e) => setCompletionDefects(e.target.value)} containerClassName="mb-0" />
            </div>

            <p className="mb-2 text-control font-medium text-ink-2">วัตถุดิบที่ใช้จริง</p>
            <div className="mb-5 overflow-x-auto">
              <table className="w-full border-separate text-base [border-spacing:0_0.5rem]">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="py-2 pr-3 pl-3.5 font-light">วัตถุดิบ</th>
                    <th className="py-2 pr-3 font-light">จอง</th>
                    <th className="py-2 pr-3.5 font-light">ใช้จริง</th>
                  </tr>
                </thead>
                <tbody>
                  {order.rmAllocations.map((a) => {
                    const material = rawMaterialById(a.rawMaterialId)
                    return (
                      <tr key={a.rawMaterialId}>
                        <td className="rounded-l-[0.875rem] border-y border-l border-line py-3 pr-3 pl-3.5 font-medium">{material?.name}</td>
                        <td className="border-y border-line py-3 pr-3 tabular-nums">{roundQty(a.quantity)} {material?.unit}</td>
                        <td className="rounded-r-[0.875rem] border-y border-r border-line py-3 pr-3.5">
                          <TextField
                            type="number"
                            min={0}
                            aria-label={`${material?.name} ที่ใช้จริง`}
                            value={actualRmUsed[a.rawMaterialId] ?? ''}
                            onChange={(e) => setActualRmUsed((prev) => ({ ...prev, [a.rawMaterialId]: e.target.value }))}
                            containerClassName="mb-0 w-28"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleComplete}>
                <IconCheck />
                ปิดการผลิต
              </Button>
            </div>
          </Card>
        </>
      )}

      {order.status === 'completed' && orderedQty !== null && (order.actualQuantity ?? 0) < orderedQty && (
        <Alert tone="warning" title={`ผลิตได้น้อยกว่าคำสั่งซื้อ ${orderedQty - (order.actualQuantity ?? 0)} ${fg?.unit}`} className="mb-6">
          {customerOrder?.orderNumber} สั่ง {orderedQty} ยังไม่ได้ตกลงว่าจะจัดการส่วนที่ขาดอย่างไร (ส่งบางส่วน ยกไปรอบหน้า หรือยกเลิกส่วนที่เหลือ)
        </Alert>
      )}

      {order.status === 'completed' && batch && (
        <Card>
          <CardHeader
            title="LOT สินค้าสำเร็จรูป"
            subtitle={
              batch.reservedForOrderId
                ? `จองไว้ให้ ${customerOrder?.orderNumber ?? 'คำสั่งซื้อของลูกค้า'} ใช้ฝากขายไม่ได้`
                : 'สต็อกว่าง สแกนเข้าร้านฝากขายได้'
            }
            action={<StatusPill tone={batchGradeTone[batch.gradeLevel]}>เกรด {batch.gradeLevel}</StatusPill>}
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted">LOT</p>
              <p className="text-base font-medium">{batch.batchNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted">บาร์โค้ด</p>
              <p className="text-base font-medium">{batch.barcode}</p>
            </div>
            <div>
              <p className="text-sm text-muted">จำนวน</p>
              <p className="text-base font-medium tabular-nums">{batch.quantity} {fg?.unit}</p>
            </div>
            <div>
              <p className="text-sm text-muted">หมดอายุ</p>
              <p className="text-base font-medium">{formatDateTime(batch.expirationDate)}</p>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="outline" onClick={() => navigate({ to: '/production/finished-goods' })}>
              ดูสินค้าสำเร็จรูป
            </Button>
          </div>
        </Card>
      )}
    </>
  )
}
