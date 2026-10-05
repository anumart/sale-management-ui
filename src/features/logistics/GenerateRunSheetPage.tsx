import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { Button, Card, CardHeader, Select, TextField } from '@/components/ui'
import { formatCurrency } from '@/lib/format'
import { toast } from '@/stores/toastStore'
import { pickupPointById } from './mockData'
import { useLogisticsStore } from './store'

const today = new Date().toISOString().slice(0, 10)
const runSheetsParent = { label: 'ใบวิ่งรถ', to: '/logistics/run-sheets' }

export function GenerateRunSheetPage() {
  const navigate = useNavigate()
  const vehicles = useLogisticsStore((s) => s.vehicles)
  const vehicleRoutes = useLogisticsStore((s) => s.vehicleRoutes)
  const pendingOrders = useLogisticsStore((s) => s.pendingOrders)
  const generateRunSheet = useLogisticsStore((s) => s.generateRunSheet)

  const [vehicleId, setVehicleId] = useState('')
  const [runDate, setRunDate] = useState(today)

  const activeVehicles = vehicles.filter((v) => v.status === 'active')
  const route = useMemo(() => vehicleRoutes.find((r) => r.vehicleId === vehicleId && r.isActive), [vehicleRoutes, vehicleId])

  const preview = useMemo(() => {
    if (!route) return []
    return [...route.stops]
      .sort((a, b) => a.sequence - b.sequence)
      .map((stop) => ({
        stop,
        point: pickupPointById(stop.pickupPointId),
        orders: pendingOrders.filter((po) => po.pickupPointId === stop.pickupPointId),
      }))
  }, [route, pendingOrders])

  const matchedStops = preview.filter((p) => p.orders.length > 0)
  const grandTotal = matchedStops.reduce((sum, s) => sum + s.orders.reduce((s2, o) => s2 + o.orderedQuantity * o.pricePerUnit, 0), 0)

  const handleGenerate = () => {
    const runSheet = generateRunSheet(vehicleId, new Date(runDate).toISOString())
    if (!runSheet) {
      toast.error(route ? 'ยังไม่มีใบสั่งซื้อค้างที่ตรงกับเส้นทางของรถคันนี้' : 'รถคันนี้ยังไม่มีเส้นทางที่ใช้งาน')
      return
    }
    toast.success(`สร้าง ${runSheet.runSheetNumber} แล้ว มี ${runSheet.stops.length} จุดจอด`)
    navigate({ to: '/logistics/run-sheets/$runSheetId', params: { runSheetId: runSheet.id } })
  }

  return (
    <>
      <PageHeading
        section="Logistics"
        parent={runSheetsParent}
        title="สร้างใบวิ่งรถ"
        subtitle="เลือกรถและวันที่ ระบบจะรวมใบสั่งซื้อที่ตรงกันตามจุดจอดให้อัตโนมัติ"
      />

      <Card className="mb-6">
        <CardHeader title="รายละเอียดการวิ่งรถ" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="รถ"
            required
            placeholder="เลือกรถ..."
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            options={activeVehicles.map((v) => ({ value: v.id, label: `${v.code} — ${v.driverName}` }))}
          />
          <TextField label="วันที่วิ่ง" required type="date" value={runDate} onChange={(e) => setRunDate(e.target.value)} />
        </div>
        {vehicleId && !route && <p className="mt-3 text-sm text-danger-fg">รถคันนี้ยังไม่มีเส้นทางที่ใช้งาน กรุณากำหนดเส้นทางที่แท็บเส้นทางรถก่อน</p>}
      </Card>

      {route && (
        <Card className="mb-6">
          <CardHeader title={route.routeName} subtitle={`มีใบสั่งซื้อค้าง ${matchedStops.length} จาก ${preview.length} จุดจอด`} />
          <div className="flex flex-col gap-4">
            {preview.map(({ stop, point, orders }) => (
              <div key={stop.id} className="rounded-control border border-line p-4">
                <div className="mb-2 flex items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-fg">
                    {stop.sequence}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">
                      {point?.supplierName} — {point?.routeName}
                    </p>
                    <p className="text-sm text-muted">
                      {point?.location} · {point?.contactPerson}
                    </p>
                  </div>
                </div>
                {orders.length === 0 ? (
                  <p className="pl-10 text-sm text-muted">ไม่มีใบสั่งซื้อค้างสำหรับจุดจอดนี้</p>
                ) : (
                  <div className="overflow-x-auto pl-10">
                    <table className="w-full border-separate text-sm [border-spacing:0_0.375rem]">
                      <thead>
                        <tr className="text-left text-muted">
                          <th className="py-1.5 pr-3 pl-3.5 font-light">เลขที่ใบสั่งซื้อ</th>
                          <th className="py-1.5 pr-3 font-light">วัตถุดิบ</th>
                          <th className="py-1.5 pr-3 font-light">จำนวน</th>
                          <th className="py-1.5 pr-3.5 font-light">รวม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => (
                          <tr key={o.id}>
                            <td className="rounded-l-[0.875rem] border-y border-l border-line py-1.5 pr-3 pl-3.5">{o.poNumber}</td>
                            <td className="border-y border-line py-1.5 pr-3">{o.rawMaterialName}</td>
                            <td className="border-y border-line py-1.5 pr-3 tabular-nums">
                              {o.orderedQuantity.toLocaleString()} {o.unit}
                            </td>
                            <td className="rounded-r-[0.875rem] border-y border-r border-line py-1.5 pr-3.5 tabular-nums">{formatCurrency(o.orderedQuantity * o.pricePerUnit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
          <footer className="mt-5 flex items-center justify-between border-t border-line pt-5">
            <p className="text-base font-semibold">
              Total: <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
            </p>
            <Button disabled={matchedStops.length === 0} onClick={handleGenerate}>
              สร้างและพิมพ์ใบวิ่งรถ
            </Button>
          </footer>
        </Card>
      )}
    </>
  )
}
