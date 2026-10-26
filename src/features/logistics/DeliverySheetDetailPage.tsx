import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconArrowDown, IconArrowUp, IconPlus, IconPrinter, IconTrash } from '@/components/icons'
import { Alert, Button, Card, CardHeader, EmptyState, Modal, Select, StatusPill, TextField } from '@/components/ui'
import { controlClass } from '@/components/ui/FormField'
import { getFinishedGoods } from '@/features/catalog/store'
import { finishedGoodById } from '@/features/procurement/mockData'
import { useConsignmentStore } from '@/features/sales/consignmentStore'
import { customerById, useSalesStore } from '@/features/sales/store'
import { channelLabel, channelTone, EXPORT_DROP_POINT, formatDate, isExportCustomer } from '@/features/sales/utils'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { useDeliveryStore } from './deliveryStore'
import { deliveredAtShops, loadVariance, sheetStatus, sheetStatusLabel, sheetStatusTone, sheetTypeLabel, sheetTypeTone, stopStatus, stopStatusLabel, stopStatusTone } from './deliveryUtils'
import { useLogisticsStore, vehicleById } from './store'
import type { DeliverySheet, DeliveryStop } from './types'

const parent = { label: 'ใบส่งของ', to: '/logistics/delivery-sheets' }

function FailStopModal({ stop, onClose, onSubmit }: { stop: DeliveryStop | null; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <Modal
      open={!!stop}
      onClose={onClose}
      title={`บันทึกส่งไม่ได้: ${customerById(stop?.customerId)?.name ?? ''}`}
      description="คำสั่งซื้อจะกลับไปรอส่ง ส่วนใบเข้าร้านที่ยังไม่เซ็นจะถูกยกเลิก"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button variant="danger" disabled={!reason.trim()} onClick={() => { onSubmit(reason); setReason('') }}>
            บันทึกส่งไม่ได้
          </Button>
        </>
      }
    >
      <TextField label="เหตุผล" required placeholder="เช่น ร้านปิด ไม่มีผู้รับของ" value={reason} onChange={(e) => setReason(e.target.value)} />
    </Modal>
  )
}

function LoadCard({ sheet }: { sheet: DeliverySheet }) {
  const visits = useSalesStore((s) => s.visits)
  const setLoadQty = useDeliveryStore((s) => s.setLoadQty)
  const addLoadLine = useDeliveryStore((s) => s.addLoadLine)
  const recordReturn = useDeliveryStore((s) => s.recordReturn)
  const [addId, setAddId] = useState('')
  const [returns, setReturns] = useState<Record<string, string>>({})

  const open = sheet.status === 'draft' || sheet.status === 'printed'
  const canReturn = sheet.status === 'printed' && sheet.returnRecordedAt === null
  const rest = getFinishedGoods(true).filter((fg) => !sheet.loadLines.some((l) => l.finishedGoodId === fg.id))

  const saveReturn = () => {
    const res = recordReturn(sheet.id, Object.fromEntries(sheet.loadLines.map((l) => [l.finishedGoodId, Number(returns[l.finishedGoodId] ?? 0)])))
    if (!res.ok) toast.error(res.message)
    else toast.success('บันทึกของคืนแล้ว ของที่เหลือกลับเข้าสต็อก')
  }

  return (
    <Card className="mb-6">
      <CardHeader title="ของขึ้นรถและของคืน" subtitle="คนขับลงของแต่ละร้านตามหน้างานได้ ไม่ต้องตรงยอดประเมิน · ของที่ไม่ได้ลงกลับมาเข้าสต็อก" />
      {sheet.loadLines.length === 0 && <p className="mb-3 text-muted">ยังไม่มีสินค้าขึ้นรถ เพิ่มได้ด้านล่าง</p>}
      {sheet.loadLines.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-separate text-sm [border-spacing:0_0.375rem]">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1.5 pr-3 pl-3.5 font-light">สินค้า</th>
                <th className="py-1.5 pr-3 font-light">ขึ้นรถ</th>
                <th className="py-1.5 pr-3 font-light">ลงร้านแล้ว</th>
                <th className="py-1.5 pr-3 font-light">คืน</th>
                <th className="py-1.5 pr-3.5 font-light">ส่วนต่าง</th>
              </tr>
            </thead>
            <tbody>
              {sheet.loadLines.map((l) => {
                const variance = loadVariance(sheet, visits, l)
                return (
                  <tr key={l.finishedGoodId}>
                    <td className="rounded-l-[0.875rem] border-y border-l border-line py-2 pr-3 pl-3.5 font-medium">{finishedGoodById(l.finishedGoodId)?.name}</td>
                    <td className="border-y border-line py-2 pr-3">
                      <input
                        type="number"
                        min={0}
                        aria-label={`ขึ้นรถ ${finishedGoodById(l.finishedGoodId)?.name}`}
                        disabled={!open}
                        value={l.loadedQuantity}
                        onChange={(e) => setLoadQty(sheet.id, l.finishedGoodId, Number(e.target.value))}
                        className={cn(controlClass(), 'h-10 w-24 px-3 text-right tabular-nums')}
                      />
                    </td>
                    <td className="border-y border-line py-2 pr-3 tabular-nums">{deliveredAtShops(sheet, visits, l.finishedGoodId)}</td>
                    <td className="border-y border-line py-2 pr-3">
                      {canReturn ? (
                        <input
                          type="number"
                          min={0}
                          aria-label={`คืน ${finishedGoodById(l.finishedGoodId)?.name}`}
                          value={returns[l.finishedGoodId] ?? ''}
                          placeholder="0"
                          onChange={(e) => setReturns((r) => ({ ...r, [l.finishedGoodId]: e.target.value }))}
                          className={cn(controlClass(), 'h-10 w-24 px-3 text-right tabular-nums')}
                        />
                      ) : (
                        <span className="tabular-nums">{l.returnedQuantity ?? '—'}</span>
                      )}
                    </td>
                    <td className="rounded-r-[0.875rem] border-y border-r border-line py-2 pr-3.5">
                      {l.returnedQuantity === null ? <span className="text-muted">—</span> : variance === 0 ? <StatusPill tone="success">ตรง</StatusPill> : <StatusPill tone="warning">ต่าง {variance > 0 ? '+' : ''}{variance}</StatusPill>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && rest.length > 0 && (
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <Select label="เพิ่มสินค้าขึ้นรถ" containerClassName="mb-0 min-w-64 flex-1" value={addId} onChange={setAddId} placeholder="เลือกสินค้า..." options={rest.map((fg) => ({ value: fg.id, label: fg.name }))} />
          <Button variant="outline" disabled={!addId} onClick={() => { addLoadLine(sheet.id, addId); setAddId('') }}>
            <IconPlus />
            เพิ่ม
          </Button>
        </div>
      )}

      {canReturn && sheet.loadLines.length > 0 && (
        <footer className="mt-5 flex justify-end border-t border-line pt-5">
          <Button onClick={saveReturn}>บันทึกของคืน</Button>
        </footer>
      )}
      {sheet.returnRecordedAt && <p className="mt-4 text-sm text-muted">บันทึกของคืนเมื่อ {formatDateTime(sheet.returnRecordedAt)}</p>}
    </Card>
  )
}

export function DeliverySheetDetailPage({ sheetId }: { sheetId: string }) {
  const sheet = useDeliveryStore((s) => s.sheets.find((x) => x.id === sheetId))
  const printSheet = useDeliveryStore((s) => s.printSheet)
  const cancelSheet = useDeliveryStore((s) => s.cancelSheet)
  const failStop = useDeliveryStore((s) => s.failStop)
  const addStop = useDeliveryStore((s) => s.addStop)
  const removeStop = useDeliveryStore((s) => s.removeStop)
  const moveStop = useDeliveryStore((s) => s.moveStop)
  const setDriver = useDeliveryStore((s) => s.setDriver)
  const setVehicle = useDeliveryStore((s) => s.setVehicle)
  const orders = useSalesStore((s) => s.orders)
  const visits = useSalesStore((s) => s.visits)
  const customers = useSalesStore((s) => s.customers)
  const vehicles = useLogisticsStore((s) => s.vehicles)
  const route = useConsignmentStore((s) => s.routes.find((r) => r.id === sheet?.consignmentRouteId))
  const [failing, setFailing] = useState<DeliveryStop | null>(null)
  const [addId, setAddId] = useState('')

  if (!sheet) {
    return (
      <>
        <PageHeading section="ขนส่ง" parent={parent} title="ไม่พบใบส่งของ" />
        <Card>
          <EmptyState title="ไม่พบใบส่งของนี้" description="อาจถูกลบหรือยังไม่เคยสร้าง" />
        </Card>
      </>
    )
  }

  const status = sheetStatus(sheet, orders, visits)
  const isDraft = sheet.status === 'draft'
  const isOpen = isDraft || sheet.status === 'printed'
  const vehicle = vehicleById(sheet.vehicleId)
  const stops = [...sheet.stops].sort((a, b) => a.sequence - b.sequence)
  const driverNames = [...new Set(vehicles.map((v) => v.driverName))]

  // What can still be added while the sheet is a draft
  const addOptions =
    sheet.sheetType === 'direct'
      ? orders.filter((o) => o.status === 'confirmed' && !o.deliverySheetId).map((o) => ({ value: o.id, label: `${o.orderNumber} — ${customerById(o.customerId)?.name}` }))
      : customers.filter((c) => c.type === 'consignment' && c.isActive && !sheet.stops.some((s) => s.customerId === c.id)).map((c) => ({ value: c.id, label: c.name }))

  const print = () => {
    const res = printSheet(sheet.id)
    if (!res.ok) toast.error(res.message)
    else toast.success(`พิมพ์ ${sheet.sheetNumber} แล้ว แจ้งคนขับ ${sheet.driverName}`)
  }

  const cancel = async () => {
    const ok = await confirm({
      title: `ยกเลิกใบส่งของ ${sheet.sheetNumber}?`,
      message: 'คำสั่งซื้อจะกลับไปรอส่ง และใบเข้าร้านที่ยังไม่เซ็นจะถูกยกเลิก',
      confirmLabel: 'ยกเลิกใบส่งของ',
      tone: 'danger',
    })
    if (!ok) return
    const res = cancelSheet(sheet.id, '')
    if (!res.ok) toast.error(res.message)
  }

  const add = () => {
    const res = addStop(sheet.id, sheet.sheetType === 'direct' ? { customerOrderId: addId } : { customerId: addId })
    if (!res.ok) toast.error(res.message)
    else setAddId('')
  }

  const failIt = (reason: string) => {
    if (!failing) return
    const res = failStop(sheet.id, failing.id, reason)
    if (!res.ok) toast.error(res.message)
    setFailing(null)
  }

  return (
    <>
      <PageHeading
        section="ขนส่ง"
        parent={parent}
        title={sheet.sheetNumber}
        subtitle={`${sheetTypeLabel[sheet.sheetType]}${route ? ` · สาย ${route.code} ${route.name}` : ''} · ส่ง ${formatDate(sheet.deliveryDate)}`}
      />

      <Card className="mb-6">
        <CardHeader
          title="รายละเอียดเที่ยวส่งของ"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={sheetTypeTone[sheet.sheetType]}>{sheetTypeLabel[sheet.sheetType]}</StatusPill>
              <StatusPill tone={sheetStatusTone[status]}>{sheetStatusLabel[status]}</StatusPill>
            </div>
          }
        />
        <div className="grid gap-x-4 gap-y-4 sm:grid-cols-4">
          {isDraft ? (
            <Select label="รถ" value={sheet.vehicleId} onChange={(id) => setVehicle(sheet.id, id)} options={vehicles.filter((v) => v.status === 'active').map((v) => ({ value: v.id, label: `${v.code} — ${v.licensePlate}` }))} />
          ) : (
            <div>
              <p className="text-sm text-muted">รถ</p>
              <p className="text-base font-medium">{vehicle?.code} · {vehicle?.licensePlate}</p>
            </div>
          )}
          {isOpen ? (
            <Select label="คนขับ" value={sheet.driverName} onChange={(n) => setDriver(sheet.id, n)} options={driverNames.map((n) => ({ value: n, label: n }))} />
          ) : (
            <div>
              <p className="text-sm text-muted">คนขับ</p>
              <p className="text-base font-medium">{sheet.driverName}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted">พิมพ์เมื่อ</p>
            <p className="text-base font-medium">{sheet.printedAt ? formatDateTime(sheet.printedAt) : '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted">จุดส่ง</p>
            <p className="text-base font-medium tabular-nums">{sheet.stops.length}</p>
          </div>
        </div>
        {sheet.status === 'cancelled' && <Alert tone="neutral" title="ใบนี้ถูกยกเลิกแล้ว" className="mt-5">{sheet.cancelledAt ? formatDateTime(sheet.cancelledAt) : ''}</Alert>}
        {isOpen && (
          <footer className="mt-5 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
            <Button variant="outline" onClick={cancel}>
              ยกเลิกใบส่งของ
            </Button>
            {isDraft && (
              <Button onClick={print}>
                <IconPrinter />
                พิมพ์ใบส่งของ
              </Button>
            )}
          </footer>
        )}
      </Card>

      {sheet.sheetType === 'consignment_route' && <LoadCard sheet={sheet} />}

      <Card>
        <CardHeader title="จุดส่งตามลำดับ" subtitle={isDraft ? 'จัดลำดับ เพิ่ม หรือเอาจุดออกได้จนกว่าจะพิมพ์ · พิมพ์แล้วเปลี่ยนได้เฉพาะคนขับ' : undefined} />
        <div className="flex flex-col gap-2">
          {stops.length === 0 && <p className="py-3 text-muted">ไม่มีจุดส่ง</p>}
          {stops.map((stop, i) => {
            const customer = customerById(stop.customerId)
            const order = orders.find((o) => o.id === stop.customerOrderId)
            const visit = visits.find((v) => v.id === stop.visitId)
            const st = stopStatus(stop, orders, visits)
            return (
              <div key={stop.id} className="flex flex-wrap items-center gap-3 rounded-control border border-field-edge bg-field p-3.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-fg">{stop.sequence}</span>
                <div className="min-w-0 flex-1 basis-60">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {customer?.name}
                    {order && <StatusPill tone={channelTone[order.channel]}>{channelLabel[order.channel]}</StatusPill>}
                    {isExportCustomer(customer) && <StatusPill tone="accent">ส่งออก · {customer?.country}</StatusPill>}
                  </p>
                  <p className="truncate text-sm text-muted">{isExportCustomer(customer) ? EXPORT_DROP_POINT : customer?.address}</p>
                  {order && (
                    <p className="text-sm">
                      <Link to="/sales/orders/$orderId" params={{ orderId: order.id }} className="font-medium text-primary-fg hover:underline">{order.orderNumber}</Link>
                      {' · '}
                      {order.lines.map((l) => `${finishedGoodById(l.finishedGoodId ?? '')?.name} × ${l.quantity}`).join(', ')}
                    </p>
                  )}
                  {visit && (
                    <p className="text-sm">
                      <Link to="/sales/visits/$visitId" params={{ visitId: visit.id }} className="font-medium text-primary-fg hover:underline">{visit.visitNumber}</Link>
                      {' · '}ใบเข้าร้าน
                    </p>
                  )}
                  {stop.failReason && <p className="text-sm text-danger-fg">ส่งไม่ได้: {stop.failReason}</p>}
                </div>
                <StatusPill tone={stopStatusTone[st]}>{stopStatusLabel[st]}</StatusPill>
                <div className="flex shrink-0 gap-1.5">
                  {isDraft && (
                    <>
                      <Button size="sm" variant="outline" iconOnly aria-label="เลื่อนขึ้น" disabled={i === 0} onClick={() => moveStop(sheet.id, stop.id, 'up')}>
                        <IconArrowUp />
                      </Button>
                      <Button size="sm" variant="outline" iconOnly aria-label="เลื่อนลง" disabled={i === stops.length - 1} onClick={() => moveStop(sheet.id, stop.id, 'down')}>
                        <IconArrowDown />
                      </Button>
                      <Button size="sm" variant="outline" iconOnly aria-label="เอาจุดส่งออก" onClick={() => removeStop(sheet.id, stop.id)}>
                        <IconTrash />
                      </Button>
                    </>
                  )}
                  {sheet.status === 'printed' && st === 'pending' && (
                    <Button size="sm" variant="danger" outlined onClick={() => setFailing(stop)}>
                      ส่งไม่ได้
                    </Button>
                  )}
                </div>
              </div>
            )
          })}

          {isDraft && addOptions.length > 0 && (
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <Select
                label={sheet.sheetType === 'direct' ? 'เพิ่มคำสั่งซื้อ' : 'เพิ่มร้าน'}
                containerClassName="mb-0 min-w-64 flex-1"
                value={addId}
                onChange={setAddId}
                placeholder={sheet.sheetType === 'direct' ? 'เลือกคำสั่งซื้อ...' : 'เลือกร้านฝากขาย...'}
                options={addOptions}
              />
              <Button variant="outline" disabled={!addId} onClick={add}>
                <IconPlus />
                เพิ่มจุดส่ง
              </Button>
            </div>
          )}
        </div>
      </Card>

      <FailStopModal stop={failing} onClose={() => setFailing(null)} onSubmit={failIt} />
    </>
  )
}
