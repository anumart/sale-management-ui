import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@/components/icons'
import { Button, Card, CardHeader, Select, StatusPill } from '@/components/ui'
import { confirm } from '@/stores/confirmStore'
import { AddRouteModal } from './AddRouteModal'
import { pickupPointById, pickupPoints } from './mockData'
import { useLogisticsStore } from './store'
import { dayLabel, type VehicleRoute } from './types'

function RouteStops({ route }: { route: VehicleRoute }) {
  const moveStop = useLogisticsStore((s) => s.moveStop)
  const removeStopFromRoute = useLogisticsStore((s) => s.removeStopFromRoute)
  const [addPointId, setAddPointId] = useState('')
  const addStopToRoute = useLogisticsStore((s) => s.addStopToRoute)

  const stops = [...route.stops].sort((a, b) => a.sequence - b.sequence)
  const availablePoints = pickupPoints.filter((p) => !stops.some((s) => s.pickupPointId === p.id))

  const handleRemove = async (stopId: string, label: string) => {
    const ok = await confirm({ title: `ลบจุดจอด?`, message: `"${label}" จะถูกลบออกจาก ${route.routeName}`, confirmLabel: 'ลบ', tone: 'danger' })
    if (ok) removeStopFromRoute(route.id, stopId)
  }

  return (
    <div className="flex flex-col gap-2">
      {stops.length === 0 && <p className="py-4 text-muted">ยังไม่มีจุดจอด เพิ่มจุดรับของได้ด้านล่าง</p>}
      {stops.map((stop, i) => {
        const point = pickupPointById(stop.pickupPointId)
        return (
          <div key={stop.id} className="flex items-center gap-3 rounded-control border border-field-edge bg-field p-3.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-fg">
              {stop.sequence}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {point?.supplierName} — {point?.routeName}
              </p>
              <p className="truncate text-sm text-muted">
                {point?.location} · {point?.contactPerson} · {point?.phone}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button
                size="sm"
                variant="outline"
                iconOnly
                aria-label="เลื่อนขึ้น"
                disabled={i === 0}
                onClick={() => moveStop(route.id, stop.id, 'up')}
              >
                <IconArrowUp />
              </Button>
              <Button
                size="sm"
                variant="outline"
                iconOnly
                aria-label="เลื่อนลง"
                disabled={i === stops.length - 1}
                onClick={() => moveStop(route.id, stop.id, 'down')}
              >
                <IconArrowDown />
              </Button>
              <Button size="sm" variant="outline" iconOnly aria-label="ลบจุดจอด" onClick={() => handleRemove(stop.id, point?.routeName ?? '')}>
                <IconTrash />
              </Button>
            </div>
          </div>
        )
      })}

      {availablePoints.length > 0 && (
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <Select
            label="เพิ่มจุดรับของ"
            containerClassName="mb-0 min-w-64 flex-1"
            value={addPointId}
            onChange={setAddPointId}
            placeholder="เลือกจุดรับสินค้าของซัพพลายเออร์..."
            options={availablePoints.map((p) => ({ value: p.id, label: `${p.supplierName} — ${p.routeName}` }))}
          />
          <Button
            variant="outline"
            disabled={!addPointId}
            onClick={() => {
              addStopToRoute(route.id, addPointId)
              setAddPointId('')
            }}
          >
            <IconPlus />
            เพิ่มจุดจอด
          </Button>
        </div>
      )}
    </div>
  )
}

export function VehicleRoutesPage() {
  const vehicleRoutes = useLogisticsStore((s) => s.vehicleRoutes)
  const [routeModalOpen, setRouteModalOpen] = useState(false)

  return (
    <>
      <PageHeading section="ขนส่ง" title="เส้นทางรถ" />

      <Card>
        <CardHeader
          title="เส้นทางทั้งหมด"
          subtitle="เส้นทางคือลำดับจุดรับสินค้าและวันที่วิ่ง ไม่ผูกกับรถ เลือกรถตอนสร้างใบวิ่งรถ"
          action={
            <Button variant="outline" onClick={() => setRouteModalOpen(true)}>
              <IconPlus />
              เพิ่มเส้นทาง
            </Button>
          }
        />

        {vehicleRoutes.length === 0 && <p className="text-muted">ยังไม่มีเส้นทาง</p>}

        <div className="flex flex-col gap-6">
          {vehicleRoutes.map((route) => (
            <div key={route.id} className="border-t border-line pt-5 first:border-t-0 first:pt-0">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-medium">{route.routeName}</h3>
                  <p className="text-sm text-muted">วิ่งวัน: {route.runDays.map((d) => dayLabel[d]).join(', ')}</p>
                </div>
                <StatusPill tone={route.isActive ? 'success' : 'neutral'}>{route.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}</StatusPill>
              </div>
              <RouteStops route={route} />
            </div>
          ))}
        </div>
      </Card>

      <AddRouteModal open={routeModalOpen} onClose={() => setRouteModalOpen(false)} />
    </>
  )
}
