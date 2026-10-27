import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconCart, IconCheck, IconClose, IconFactory, IconPlus, IconPrinter, IconReceipt, IconTrash, IconTruck } from '@/components/icons'
import { Alert, Button, Card, CardHeader, Select, StatusPill, TextField } from '@/components/ui'
import { getFinishedGoods } from '@/features/catalog/store'
import { finishedGoodById } from '@/features/procurement/mockData'
import { useProcurementStore, useWizardStore } from '@/features/procurement/store'
import { useProductionStore } from '@/features/production/store'
import { orderStatusLabel, orderStatusTone } from '@/features/production/utils'
import { formatDateTime } from '@/lib/format'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { createProductionForOrder, describeFailures } from './actions'
import { productPrices } from './mockData'
import { useDeliveryStore } from '@/features/logistics/deliveryStore'
import { useCustomer, useSalesStore } from './store'
import { channelLabel, channelTone, EXPORT_DROP_POINT, formatBaht, formatDate, isExportCustomer, orderLineProgress, orderStage, orderStageLabel, orderStageTone } from './utils'

const cellFirst = 'rounded-l-[0.875rem] border-y border-l border-line px-3.5 py-3'
const cell = 'border-y border-line px-3.5 py-3'
const cellLast = 'rounded-r-[0.875rem] border-y border-r border-line px-3.5 py-3'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <div className="text-base font-medium">{children}</div>
    </div>
  )
}

export function CustomerOrderDetailPage({ orderId }: { orderId: string }) {
  const navigate = useNavigate()
  const order = useSalesStore((s) => s.orders.find((o) => o.id === orderId))
  const imports = useSalesStore((s) => s.imports)
  const customer = useCustomer(order?.customerId)
  const sheet = useDeliveryStore((s) => s.sheets.find((x) => x.id === order?.deliverySheetId))
  const productionOrders = useProductionStore((s) => s.orders)
  const batches = useProductionStore((s) => s.batches)
  const plans = useProcurementStore((s) => s.plans)
  const { updateOrderLine, addOrderLine, removeOrderLine, confirmOrder, cancelOrder, deliverOrder, issueOrderInvoice } = useSalesStore.getState()

  if (!order) {
    return (
      <>
        <PageHeading section="ขาย" parent={{ label: 'คำสั่งซื้อ', to: '/sales/orders' }} title="คำสั่งซื้อ" />
        <Card>
          <p className="text-muted">ไม่พบคำสั่งซื้อ</p>
        </Card>
      </>
    )
  }

  const stage = orderStage(order, productionOrders)
  const imp = imports.find((i) => i.id === order.importId)
  const plan = plans.find((p) => p.id === order.purchasePlanId)
  const editable = order.status === 'draft'
  const lines = order.lines.map((l) => ({ line: l, progress: orderLineProgress(order, l.finishedGoodId, productionOrders, batches) }))
  const linesWithoutProduction = lines.filter((l) => l.line.finishedGoodId && l.progress.productionOrders.length === 0)
  const shortfalls = stage === 'ready' ? lines.filter((l) => l.progress.onHand < l.line.quantity) : []
  const canDeliver = stage === 'ready'
  const canInvoice = !order.invoiceId && (stage === 'ready' || stage === 'delivered')
  const invoiceEstimate =
    order.status === 'delivered'
      ? order.deliveredLines.reduce((sum, d) => sum + d.quantity * (productPrices[d.finishedGoodId] ?? 0), 0)
      : lines.reduce((sum, { line, progress }) => sum + Math.min(line.quantity, progress.onHand) * (productPrices[line.finishedGoodId ?? ''] ?? 0), 0)

  const handleConfirm = () => {
    const res = confirmOrder(order.id)
    if (res.ok) toast.success(res.message)
    else toast.error(res.message)
  }

  const handleCancel = async () => {
    const ok = await confirm({ title: 'ยกเลิกคำสั่งซื้อนี้?', message: `${order.orderNumber} จะถูกปิด และจะไม่ถูกนำไปวางแผนหรือผลิต`, confirmLabel: 'ยกเลิกคำสั่งซื้อ', tone: 'danger' })
    if (!ok) return
    cancelOrder(order.id)
    toast.success(`ยกเลิก ${order.orderNumber} แล้ว`)
  }

  const handleProduce = () => {
    const res = createProductionForOrder(order)
    if (res.created.length) toast.success(`สร้าง ${res.created.join(', ')} แล้ว`)
    if (res.failed.length) toast.error(describeFailures(res.failed))
  }

  const handlePlanPurchase = () => {
    useWizardStore.getState().startFromOrders([order])
    navigate({ to: '/procurement/plans/new/step-1' })
  }

  const handleDeliver = async () => {
    const short = lines.filter((l) => l.progress.onHand < l.line.quantity)
    const ok = await confirm({
      title: 'ยืนยันว่าส่งของแล้ว?',
      message: short.length
        ? `สินค้ามีไม่ครบตามคำสั่งซื้อ (${short.map((l) => `${finishedGoodById(l.line.finishedGoodId!)?.name} ${l.progress.onHand}/${l.line.quantity}`).join(', ')}) ระบบจะส่งเท่าที่มี ส่วนที่ขาดจะไม่ถูกส่ง`
        : 'LOT ที่จองไว้จะถูกตัดออกจากคลัง และปิดคำสั่งซื้อ',
      confirmLabel: 'ส่งของแล้ว',
      tone: 'primary',
    })
    if (!ok) return
    const res = deliverOrder(order.id)
    if (res.ok) toast.success(res.message)
    else toast.error(res.message)
  }

  const handleInvoice = () => {
    const invoiceId = issueOrderInvoice(order.id)
    if (!invoiceId) {
      toast.error('ยังไม่มีรายการให้ออกใบแจ้งหนี้')
      return
    }
    toast.success('ออกใบแจ้งหนี้แล้ว')
    navigate({ to: '/sales/invoices/$invoiceId', params: { invoiceId } })
  }

  return (
    <>
      <PageHeading section="ขาย" parent={{ label: 'คำสั่งซื้อ', to: '/sales/orders' }} title={order.orderNumber} subtitle={customer?.name} />

      <Card className="mb-6">
        <CardHeader
          title="รายละเอียดคำสั่งซื้อ"
          action={
            <div className="flex items-center gap-2">
              <StatusPill tone={orderStageTone[stage]}>{orderStageLabel[stage]}</StatusPill>
              {(order.status === 'draft' || stage === 'awaiting_production') && (
                <Button size="sm" variant="danger" outlined onClick={handleCancel}>
                  <IconClose />
                  ยกเลิกคำสั่งซื้อ
                </Button>
              )}
            </div>
          }
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          <Field label="ลูกค้า">
            <Link to="/sales/customers/$customerId" params={{ customerId: order.customerId }} className="text-primary-fg hover:underline">
              {customer?.name}
            </Link>
          </Field>
          <Field label="รับเมื่อ">{formatDateTime(order.receivedAt)}</Field>
          <Field label="ส่งภายใน">{formatDate(order.requestedDeliveryDate)}</Field>
          <Field label="ช่องทาง">
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill tone={channelTone[order.channel]}>{channelLabel[order.channel]}</StatusPill>
              {imp && <span className="text-sm font-normal text-muted">{imp.attachmentName}</span>}
            </span>
          </Field>
          {order.channel === 'platform' && (
            <Field label="Platform">
              {order.platformName} · <span className="tabular-nums">{order.platformOrderRef}</span>
            </Field>
          )}
          {customer?.country && <Field label="ผู้ซื้อต่างประเทศ">{customer.nameEn} · {customer.country}</Field>}
          {sheet && (
            <Field label="ใบส่งของ (เที่ยวรถ)">
              <Link to="/logistics/delivery-sheets/$sheetId" params={{ sheetId: sheet.id }} className="text-primary-fg hover:underline">
                {sheet.sheetNumber}
              </Link>
            </Field>
          )}
          <Field label="ยืนยันเมื่อ">{order.confirmedAt ? formatDateTime(order.confirmedAt) : '—'}</Field>
          <Field label="แผนจัดซื้อ">
            {plan ? (
              <Link to="/procurement/plans/$planId" params={{ planId: plan.id }} className="text-primary-fg hover:underline">
                {plan.name}
              </Link>
            ) : (
              '—'
            )}
          </Field>
          <Field label="ส่งเมื่อ">{order.deliveredAt ? formatDateTime(order.deliveredAt) : '—'}</Field>
          <Field label="ใบแจ้งหนี้">
            {order.invoiceId ? (
              <Link to="/sales/invoices/$invoiceId" params={{ invoiceId: order.invoiceId }} className="text-primary-fg hover:underline">
                ดูใบแจ้งหนี้
              </Link>
            ) : (
              '—'
            )}
          </Field>
        </div>
      </Card>

      {editable ? (
        <Card className="mb-6">
          <CardHeader
            title="ตรวจคำสั่งซื้อ"
            subtitle="เทียบกับไฟล์แนบ แก้ส่วนที่ระบบอ่านผิด แล้วกดยืนยัน"
            action={
              <Button size="sm" variant="outline" onClick={() => addOrderLine(order.id)}>
                <IconPlus />
                เพิ่มรายการ
              </Button>
            }
          />
          {imp && imp.issues.length > 0 && (
            <Alert tone="warning" title="ระบบพบปัญหาในไฟล์นี้" className="mb-4">
              {imp.issues.join(' · ')}
            </Alert>
          )}
          <div className="overflow-x-auto">
            <table className="w-full border-separate text-base [border-spacing:0_0.5rem]">
              <thead>
                <tr className="text-left text-sm text-muted">
                  <th className="px-3.5 pb-2 font-semibold">รหัสของลูกค้า</th>
                  <th className="px-3.5 pb-2 font-semibold">สินค้าของเรา</th>
                  <th className="px-3.5 pb-2 font-semibold">จำนวน</th>
                  <th className="px-3.5 pb-2" />
                </tr>
              </thead>
              <tbody>
                {order.lines.map((l) => (
                  <tr key={l.id} className={!l.finishedGoodId ? 'bg-warning-bg' : undefined}>
                    <td className={cellFirst}>
                      <TextField
                        aria-label="รหัสสินค้าของลูกค้า"
                        value={l.customerSku ?? ''}
                        onChange={(e) => updateOrderLine(order.id, l.id, { customerSku: e.target.value || null })}
                        containerClassName="mb-0 w-44"
                      />
                    </td>
                    <td className={cell}>
                      <Select
                        aria-label="สินค้า"
                        placeholder="เลือกสินค้า"
                        value={l.finishedGoodId ?? ''}
                        onChange={(finishedGoodId) => updateOrderLine(order.id, l.id, { finishedGoodId: finishedGoodId || null })}
                        options={getFinishedGoods(true).map((fg) => ({ value: fg.id, label: fg.name }))}
                        containerClassName="mb-0 min-w-56"
                      />
                    </td>
                    <td className={cell}>
                      <TextField
                        type="number"
                        min={0}
                        aria-label="จำนวน"
                        value={l.quantity}
                        onChange={(e) => updateOrderLine(order.id, l.id, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                        containerClassName="mb-0 w-28"
                      />
                    </td>
                    <td className={cellLast}>
                      <div className="flex justify-end">
                        <Button size="sm" variant="danger" iconOnly outlined aria-label="ลบรายการ" tooltip="ลบรายการ" onClick={() => removeOrderLine(order.id, l.id)}>
                          <IconTrash />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleConfirm}>
              <IconCheck />
              ยืนยันคำสั่งซื้อ
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardHeader
            title="สินค้าและการผลิต"
            subtitle="แต่ละรายการมีใบสั่งผลิตของตัวเอง LOT ที่ผลิตเสร็จจะถูกจองไว้ให้ลูกค้ารายนี้"
            action={
              order.status === 'confirmed' && (
                <div className="flex flex-wrap gap-2">
                  {!order.purchasePlanId && stage === 'awaiting_production' && (
                    <Button size="sm" variant="outline" onClick={handlePlanPurchase}>
                      <IconCart />
                      วางแผนจัดซื้อ
                    </Button>
                  )}
                  {linesWithoutProduction.length > 0 && (
                    <Button size="sm" onClick={handleProduce}>
                      <IconFactory />
                      สร้างใบสั่งผลิต
                    </Button>
                  )}
                </div>
              )
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full border-separate text-base [border-spacing:0_0.5rem]">
              <thead>
                <tr className="text-left text-sm text-muted">
                  <th className="px-3.5 pb-2 font-semibold">สินค้า</th>
                  <th className="px-3.5 pb-2 font-semibold">สั่ง</th>
                  <th className="px-3.5 pb-2 font-semibold">ใบสั่งผลิต</th>
                  <th className="px-3.5 pb-2 font-semibold">ผลิตได้</th>
                  <th className="px-3.5 pb-2 font-semibold">ในคลัง</th>
                  <th className="px-3.5 pb-2 font-semibold">ส่งแล้ว</th>
                </tr>
              </thead>
              <tbody>
                {lines.map(({ line, progress }) => {
                  const fg = finishedGoodById(line.finishedGoodId ?? '')
                  const delivered = order.deliveredLines.find((d) => d.finishedGoodId === line.finishedGoodId)
                  return (
                    <tr key={line.id}>
                      <td className={cellFirst}>
                        <p className="font-medium">{fg?.name}</p>
                        {line.customerSku && <p className="text-sm text-muted">{line.customerSku}</p>}
                      </td>
                      <td className={`${cell} tabular-nums`}>
                        {line.quantity} {fg?.unit}
                      </td>
                      <td className={cell}>
                        {progress.productionOrders.length === 0
                          ? '—'
                          : progress.productionOrders.map((p) => (
                              <div key={p.id} className="flex items-center gap-2">
                                <Link to="/production/orders/$orderId" params={{ orderId: p.id }} className="text-primary-fg hover:underline">
                                  {p.orderNumber}
                                </Link>
                                <StatusPill tone={orderStatusTone[p.status]}>{orderStatusLabel[p.status]}</StatusPill>
                              </div>
                            ))}
                      </td>
                      <td className={`${cell} tabular-nums`}>{progress.produced || '—'}</td>
                      <td className={`${cell} tabular-nums`}>{progress.onHand || '—'}</td>
                      <td className={`${cellLast} tabular-nums`}>{delivered ? `${delivered.quantity} (${delivered.batchNumbers.join(', ')})` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {shortfalls.length > 0 && (
        <Alert tone="warning" title="ผลิตได้น้อยกว่าที่สั่ง" className="mb-6">
          {shortfalls.map((l) => `${finishedGoodById(l.line.finishedGoodId!)?.name}: ${l.progress.onHand} จาก ${l.line.quantity}`).join(' · ')} ยังไม่ได้ตกลงว่าจะจัดการส่วนที่ขาดอย่างไร (ส่งบางส่วน ยกไปรอบหน้า หรือยกเลิกส่วนที่เหลือ)
          ถ้ากดส่งตอนนี้ ระบบจะส่งเท่าที่มีในคลัง
        </Alert>
      )}

      {(canDeliver || order.status === 'delivered') && (
        <Card className="mb-6 print:shadow-none">
          <CardHeader
            title="ใบส่งของ"
            subtitle={order.status === 'delivered' ? `ส่งเมื่อ ${formatDateTime(order.deliveredAt!)}` : `ส่งที่ ${isExportCustomer(customer) ? EXPORT_DROP_POINT : customer?.address}`}
            action={
              <div className="flex gap-2 print:hidden">
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  <IconPrinter />
                  พิมพ์
                </Button>
                {order.status === 'confirmed' && (
                  <Button size="sm" onClick={handleDeliver}>
                    <IconTruck />
                    ส่งของแล้ว
                  </Button>
                )}
              </div>
            }
          />
          <ul className="divide-y divide-line">
            {(order.status === 'delivered'
              ? order.deliveredLines.map((d) => ({ fgId: d.finishedGoodId, qty: d.quantity, lots: d.batchNumbers }))
              : lines.map(({ line, progress }) => ({ fgId: line.finishedGoodId!, qty: Math.min(line.quantity, progress.onHand), lots: progress.lots.filter((b) => b.remainingQuantity > 0).map((b) => b.batchNumber) }))
            ).map((d) => (
              <li key={d.fgId} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium">{finishedGoodById(d.fgId)?.name}</p>
                  <p className="text-sm text-muted">LOT {d.lots.join(', ') || '—'}</p>
                </div>
                <span className="tabular-nums">
                  {d.qty} {finishedGoodById(d.fgId)?.unit}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {order.status !== 'draft' && order.status !== 'cancelled' && (
        <Card>
          <CardHeader
            title="ใบแจ้งหนี้"
            subtitle="คิดเงินตามราคาต่อสินค้า ยังไม่ได้ตกลงว่าจะออกใบแจ้งหนี้ก่อนหรือหลังส่งของ ตอนนี้ทำได้ทั้งสองแบบ"
            action={
              canInvoice && (
                <Button onClick={handleInvoice}>
                  <IconReceipt />
                  ออกใบแจ้งหนี้
                </Button>
              )
            }
          />
          {order.invoiceId ? (
            <Link to="/sales/invoices/$invoiceId" params={{ invoiceId: order.invoiceId }} className="text-primary-fg hover:underline">
              เปิดใบแจ้งหนี้
            </Link>
          ) : (
            <p className="text-sm text-muted">
              {canInvoice ? `ประมาณ ${formatBaht(invoiceEstimate)}` : 'ออกได้เมื่อผลิตสินค้าเสร็จ'}
            </p>
          )}
        </Card>
      )}
    </>
  )
}
