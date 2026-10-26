import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconArrowDown, IconArrowUp, IconEdit, IconPlus, IconTrash } from '@/components/icons'
import { Button, Card, CardHeader, Checkbox, Modal, Select, StatusPill, Switch, TextField } from '@/components/ui'
import { dayLabel, daysOfWeek, type DayOfWeek } from '@/features/logistics/types'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { useConsignmentStore } from './consignmentStore'
import { useSalesStore } from './store'
import type { ConsignmentRoute } from './types'

const allDays: DayOfWeek[] = [...daysOfWeek]

function RouteFormModal({ route, open, onClose }: { route: ConsignmentRoute | null; open: boolean; onClose: () => void }) {
  const addRoute = useConsignmentStore((s) => s.addRoute)
  const updateRoute = useConsignmentStore((s) => s.updateRoute)
  const [code, setCode] = useState(route?.code ?? '')
  const [name, setName] = useState(route?.name ?? '')
  const [days, setDays] = useState<DayOfWeek[]>(route?.daysOfWeek ?? allDays)
  const [error, setError] = useState('')

  const toggleDay = (day: DayOfWeek) => setDays((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day]))

  const save = () => {
    const input = { code, name, daysOfWeek: allDays.filter((d) => days.includes(d)) }
    const res = route ? updateRoute(route.id, input) : addRoute(input)
    if (!res.ok) {
      setError(res.message)
      return
    }
    toast.success(route ? 'บันทึกสายแล้ว' : `สร้างสาย ${code.trim().toUpperCase()} แล้ว เพิ่มร้านต่อได้เลย`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={route ? `แก้ไขสาย ${route.code}` : 'เพิ่มสายฝากขาย'}
      description="สายคือร้านฝากขายที่รถเข้าส่งตามลำดับในวันที่วิ่ง ไม่ผูกกับรถหรือคนขับ เลือกตอนออกใบส่งของ"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={save}>{route ? 'บันทึก' : 'สร้างสาย'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="รหัสสาย" required placeholder="CR-04" value={code} onChange={(e) => setCode(e.target.value)} containerClassName="sm:col-span-1" />
        <TextField label="ชื่อสาย" required placeholder="สายสุขุมวิท" value={name} onChange={(e) => setName(e.target.value)} containerClassName="sm:col-span-2" />
      </div>
      <div className="mt-1">
        <p className="mb-2 text-control font-medium text-ink-2">
          วันที่วิ่ง <span className="text-danger-fg">*</span>
        </p>
        <div className="flex flex-wrap gap-3">
          {allDays.map((day) => (
            <Checkbox key={day} label={dayLabel[day]} checked={days.includes(day)} onChange={() => toggleDay(day)} />
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">วิ่งทุกวันให้เลือกครบ 7 วัน</p>
      </div>
      {error && <p className="mt-4 text-sm text-danger-fg">{error}</p>}
    </Modal>
  )
}

function RouteCard({ route, onEdit }: { route: ConsignmentRoute; onEdit: () => void }) {
  const routes = useConsignmentStore((s) => s.routes)
  const toggleRouteActive = useConsignmentStore((s) => s.toggleRouteActive)
  const addRouteStop = useConsignmentStore((s) => s.addRouteStop)
  const removeRouteStop = useConsignmentStore((s) => s.removeRouteStop)
  const moveRouteStop = useConsignmentStore((s) => s.moveRouteStop)
  const customers = useSalesStore((s) => s.customers)
  const [addId, setAddId] = useState('')

  const stops = [...route.stops].sort((a, b) => a.sequence - b.sequence)
  const shops = customers.filter((c) => c.type === 'consignment' && c.isActive && !stops.some((s) => s.customerId === c.id))
  const otherRoutes = (customerId: string) => routes.filter((r) => r.id !== route.id && r.stops.some((s) => s.customerId === customerId))

  const remove = async (stopId: string, shopName: string) => {
    const ok = await confirm({ title: 'เอาร้านออกจากสาย?', message: `"${shopName}" จะถูกเอาออกจาก ${route.code}`, confirmLabel: 'เอาออก', tone: 'danger' })
    if (ok) removeRouteStop(route.id, stopId)
  }

  const add = () => {
    const res = addRouteStop(route.id, addId)
    if (!res.ok) toast.error(res.message)
    else setAddId('')
  }

  return (
    <Card className={route.isActive ? undefined : 'opacity-70'}>
      <CardHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span>{route.code}</span>
            <span className="font-normal">{route.name}</span>
            {!route.isActive && <StatusPill tone="neutral">ปิดใช้งาน</StatusPill>}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5">
            <span>วิ่ง</span>
            {route.daysOfWeek.length === 7 ? <StatusPill tone="primary">ทุกวัน</StatusPill> : route.daysOfWeek.map((d) => <StatusPill key={d} tone="primary">{dayLabel[d]}</StatusPill>)}
            <span>· {stops.length} ร้าน</span>
          </span>
        }
        action={
          <div className="flex items-center gap-3">
            <Switch label="ใช้งาน" checked={route.isActive} onChange={() => toggleRouteActive(route.id)} />
            <Button size="sm" variant="outline" iconOnly aria-label="แก้ไขสาย" tooltip="แก้ไขสาย" onClick={onEdit}>
              <IconEdit />
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-2">
        {stops.length === 0 && <p className="py-3 text-muted">ยังไม่มีร้านในสายนี้ เพิ่มร้านได้ด้านล่าง</p>}
        {stops.map((stop, i) => {
          const shop = customers.find((c) => c.id === stop.customerId)
          const others = otherRoutes(stop.customerId)
          return (
            <div key={stop.id} className="flex items-center gap-3 rounded-control border border-field-edge bg-field p-3.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-fg">{stop.sequence}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{shop?.name}</p>
                <p className="truncate text-sm text-muted">
                  {shop?.chain} · {shop?.address}
                </p>
              </div>
              {others.length > 0 && (
                <span className="hidden shrink-0 items-center gap-1.5 text-sm text-muted sm:flex">
                  อยู่สายอื่นด้วย
                  {others.map((r) => (
                    <StatusPill key={r.id} tone="accent">
                      {r.code}
                    </StatusPill>
                  ))}
                </span>
              )}
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" variant="outline" iconOnly aria-label="เลื่อนขึ้น" disabled={i === 0} onClick={() => moveRouteStop(route.id, stop.id, 'up')}>
                  <IconArrowUp />
                </Button>
                <Button size="sm" variant="outline" iconOnly aria-label="เลื่อนลง" disabled={i === stops.length - 1} onClick={() => moveRouteStop(route.id, stop.id, 'down')}>
                  <IconArrowDown />
                </Button>
                <Button size="sm" variant="outline" iconOnly aria-label="เอาร้านออก" onClick={() => remove(stop.id, shop?.name ?? '')}>
                  <IconTrash />
                </Button>
              </div>
            </div>
          )
        })}

        {shops.length > 0 && (
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <Select
              label="เพิ่มร้าน"
              containerClassName="mb-0 min-w-64 flex-1"
              value={addId}
              onChange={setAddId}
              placeholder="เลือกร้านฝากขาย..."
              options={shops.map((c) => ({ value: c.id, label: `${c.name}${c.chain ? ` (${c.chain})` : ''}` }))}
            />
            <Button variant="outline" disabled={!addId} onClick={add}>
              <IconPlus />
              เพิ่มร้านในสาย
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

export function ConsignmentRoutesPage() {
  const routes = useConsignmentStore((s) => s.routes)
  const [form, setForm] = useState<{ route: ConsignmentRoute | null } | null>(null)

  return (
    <>
      <PageHeading section="ขาย" title="สายฝากขาย" subtitle="สายคือลำดับร้านฝากขายที่รถเข้าส่งในวันที่วิ่ง ร้านหนึ่งอยู่ได้หลายสาย แยกจากเส้นทางรับวัตถุดิบ" />

      <div className="mb-5 flex justify-end">
        <Button variant="outline" onClick={() => setForm({ route: null })}>
          <IconPlus />
          เพิ่มสาย
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        {routes.length === 0 && <p className="text-muted">ยังไม่มีสายฝากขาย</p>}
        {routes.map((route) => (
          <RouteCard key={route.id} route={route} onEdit={() => setForm({ route })} />
        ))}
      </div>

      {form && <RouteFormModal key={form.route?.id ?? 'new'} route={form.route} open onClose={() => setForm(null)} />}
    </>
  )
}
