import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { Alert, Button, Card, CardHeader, Checkbox, DatePicker, SegmentedControl, Select, StatusPill } from '@/components/ui'
import { finishedGoodById } from '@/features/procurement/mockData'
import { useConsignmentStore } from '@/features/sales/consignmentStore'
import { estimateTotals, routeRunsOn, toYmd, ymdFromToday } from '@/features/sales/estimates'
import { customerById, useSalesStore } from '@/features/sales/store'
import { channelLabel, channelTone, EXPORT_DROP_POINT, formatDate, isExportCustomer } from '@/features/sales/utils'
import { toast } from '@/stores/toastStore'
import { useDeliveryStore } from './deliveryStore'
import { sheetTypeLabel } from './deliveryUtils'
import { useLogisticsStore } from './store'
import type { DeliverySheetType } from './types'

const parent = { label: 'ใบส่งของ', to: '/logistics/delivery-sheets' }

export function NewDeliverySheetPage() {
  const navigate = useNavigate()
  const vehicles = useLogisticsStore((s) => s.vehicles)
  const runSheets = useLogisticsStore((s) => s.runSheets)
  const sheets = useDeliveryStore((s) => s.sheets)
  const createSheet = useDeliveryStore((s) => s.createSheet)
  const orders = useSalesStore((s) => s.orders)
  const routes = useConsignmentStore((s) => s.routes)
  const estimates = useConsignmentStore((s) => s.estimates)

  const [sheetType, setSheetType] = useState<DeliverySheetType>('consignment_route')
  const [deliveryDate, setDeliveryDate] = useState(ymdFromToday(1))
  const [vehicleId, setVehicleId] = useState('')
  const [driverName, setDriverName] = useState('')
  const [routeId, setRouteId] = useState('')
  const [orderIds, setOrderIds] = useState<string[]>([])

  const activeVehicles = vehicles.filter((v) => v.status === 'active')
  const driverNames = [...new Set(vehicles.filter((v) => v.status === 'active').map((v) => v.driverName))]
  const runningRoutes = routes.filter((r) => r.isActive && routeRunsOn(r, deliveryDate))
  const route = runningRoutes.find((r) => r.id === routeId)
  const estimate = estimates.find((e) => e.consignmentRouteId === routeId && e.deliveryDate === deliveryDate && e.status !== 'cancelled')
  const candidates = useMemo(
    () => orders.filter((o) => o.status === 'confirmed' && !o.deliverySheetId).sort((a, b) => a.requestedDeliveryDate.localeCompare(b.requestedDeliveryDate)),
    [orders],
  )

  // Info only, never a block: a truck or driver can do several trips a day
  const sameVehicleToday = sheets.filter((s) => s.status !== 'cancelled' && s.deliveryDate === deliveryDate && s.vehicleId === vehicleId).length
  const runSheetsToday = runSheets.filter((r) => r.vehicleId === vehicleId && r.runDate.slice(0, 10) === deliveryDate).length
  const sameDriverToday = sheets.filter((s) => s.status !== 'cancelled' && s.deliveryDate === deliveryDate && s.driverName === driverName).length

  const pickVehicle = (id: string) => {
    setVehicleId(id)
    setDriverName(vehicles.find((v) => v.id === id)?.driverName ?? driverName)
  }
  const changeType = (type: DeliverySheetType) => {
    setSheetType(type)
    setRouteId('')
    setOrderIds([])
  }
  const toggleOrder = (id: string) => setOrderIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const canCreate = !!vehicleId && !!driverName && (sheetType === 'direct' ? orderIds.length > 0 : !!route)

  const submit = () => {
    const res = createSheet({ sheetType, deliveryDate, vehicleId, driverName, consignmentRouteId: routeId, customerOrderIds: orderIds })
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success(sheetType === 'direct' ? 'สร้างใบส่งของแล้ว ตรวจลำดับจุดส่งก่อนพิมพ์' : 'สร้างใบส่งของแล้ว สร้างใบเข้าร้านให้ทุกร้านในสายเรียบร้อย')
    navigate({ to: '/logistics/delivery-sheets/$sheetId', params: { sheetId: res.id } })
  }

  return (
    <>
      <PageHeading section="ขนส่ง" parent={parent} title="ออกใบส่งของ" subtitle="เลือกแบบใบ วันส่ง รถ และคนขับ ใบสายฝากขายกับใบส่งตรงไม่ปนกันในใบเดียว" />

      <Card className="mb-6">
        <CardHeader title="รายละเอียดเที่ยวส่งของ" />
        <div className="mb-5">
          <p className="mb-2 text-control font-medium text-ink-2">แบบใบส่งของ</p>
          <SegmentedControl
            aria-label="แบบใบส่งของ"
            variant="light"
            value={sheetType}
            onChange={changeType}
            options={[
              { value: 'consignment_route', label: sheetTypeLabel.consignment_route },
              { value: 'direct', label: sheetTypeLabel.direct },
            ]}
          />
          <p className="mt-2 text-sm text-muted">
            {sheetType === 'consignment_route' ? 'เลือกสาย ระบบดึงร้านตามลำดับและยอดขึ้นรถจากยอดประเมินให้' : 'เลือกคำสั่งซื้อที่ยืนยันแล้ว (ลูกค้าในประเทศ หรือส่งออกไปสนามบิน)'}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <DatePicker label="วันส่ง" required value={deliveryDate} onChange={(d) => { setDeliveryDate(d); setRouteId('') }} />
          <Select label="รถ" required placeholder="เลือกรถ..." value={vehicleId} onChange={pickVehicle} options={activeVehicles.map((v) => ({ value: v.id, label: `${v.code} — ${v.licensePlate}` }))} />
          <Select label="คนขับ" required placeholder="เลือกคนขับ..." value={driverName} onChange={setDriverName} options={driverNames.map((n) => ({ value: n, label: n }))} />
        </div>
        {vehicleId && (sameVehicleToday > 0 || runSheetsToday > 0 || sameDriverToday > 0) && (
          <Alert tone="info" title="วันนี้รถหรือคนขับมีงานอื่นแล้ว" className="mt-1">
            รถคันนี้มีใบส่งของอีก {sameVehicleToday} ใบ และใบวิ่งรถ {runSheetsToday} ใบ · คนขับ {driverName} มีใบส่งของอีก {sameDriverToday} ใบ (ข้อมูลประกอบ ไม่ได้ห้าม)
          </Alert>
        )}
      </Card>

      {sheetType === 'consignment_route' ? (
        <Card>
          <CardHeader title="เลือกสาย" subtitle={`แสดงเฉพาะสายที่วิ่งวันที่ ${formatDate(deliveryDate)} · ${runningRoutes.length} สาย`} />
          <Select
            label="สายฝากขาย"
            required
            placeholder={runningRoutes.length ? 'เลือกสาย...' : 'ไม่มีสายที่วิ่งวันนี้'}
            value={routeId}
            onChange={setRouteId}
            options={runningRoutes.map((r) => ({ value: r.id, label: `${r.code} — ${r.name} (${r.stops.length} ร้าน)` }))}
          />
          {route && (
            <>
              {!estimate && (
                <Alert tone="warning" title="สายนี้ยังไม่มียอดประเมินของวันที่เลือก" className="mb-5">
                  ออกใบได้ แล้วระบุของขึ้นรถเองในใบ หรือทำยอดประเมินที่ ขาย → ยอดประเมินลงร้าน ก่อน
                </Alert>
              )}
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-control font-medium text-ink-2">ร้านตามลำดับ</p>
                  <ol className="flex flex-col gap-2">
                    {[...route.stops].sort((a, b) => a.sequence - b.sequence).map((s) => (
                      <li key={s.id} className="flex items-center gap-3 rounded-control border border-line px-3.5 py-2.5">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-fg">{s.sequence}</span>
                        <span className="font-medium">{customerById(s.customerId)?.name}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <p className="mb-2 text-control font-medium text-ink-2">ของขึ้นรถ (จากยอดประเมิน)</p>
                  {estimate ? (
                    <ul className="flex flex-col gap-2">
                      {[...estimateTotals(estimate)].map(([id, qty]) => (
                        <li key={id} className="flex items-center justify-between rounded-control border border-line px-3.5 py-2.5">
                          <span className="font-medium">{finishedGoodById(id)?.name}</span>
                          <span className="tabular-nums">{qty} {finishedGoodById(id)?.unit}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted">ยังไม่มี</p>
                  )}
                </div>
              </div>
            </>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader title="เลือกคำสั่งซื้อ" subtitle="คำสั่งซื้อที่ยืนยันแล้วและยังไม่อยู่ในใบส่งของอื่น เรียงตามวันที่ต้องส่ง" />
          {candidates.length === 0 && <p className="text-muted">ไม่มีคำสั่งซื้อที่พร้อมส่ง</p>}
          <div className="flex flex-col gap-2">
            {candidates.map((o) => {
              const customer = customerById(o.customerId)
              const dueToday = toYmd(new Date(o.requestedDeliveryDate)) === deliveryDate
              return (
                <label key={o.id} className="flex cursor-pointer items-start gap-3 rounded-control border border-line p-3.5 hover:bg-fill">
                  <Checkbox checked={orderIds.includes(o.id)} onChange={() => toggleOrder(o.id)} aria-label={o.orderNumber} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {o.orderNumber} · {customer?.name}
                      <StatusPill tone={channelTone[o.channel]}>{channelLabel[o.channel]}</StatusPill>
                      {isExportCustomer(customer) && <StatusPill tone="accent">ส่งออก · {customer?.country}</StatusPill>}
                      {dueToday && <StatusPill tone="success">ครบกำหนดวันที่เลือก</StatusPill>}
                    </p>
                    <p className="text-sm text-muted">
                      ส่ง {formatDate(o.requestedDeliveryDate)} · {isExportCustomer(customer) ? EXPORT_DROP_POINT : customer?.address}
                    </p>
                    <p className="text-sm">{o.lines.map((l) => `${finishedGoodById(l.finishedGoodId ?? '')?.name ?? l.customerSku} × ${l.quantity}`).join(', ')}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </Card>
      )}

      <div className="mt-6 flex justify-end">
        <Button disabled={!canCreate} onClick={submit}>
          สร้างใบส่งของ
        </Button>
      </div>
    </>
  )
}
