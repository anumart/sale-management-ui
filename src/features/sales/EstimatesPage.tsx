import { useNavigate } from '@tanstack/react-router'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconChevronLeft, IconChevronRight, IconEye, IconPlus } from '@/components/icons'
import { Alert, Button, Card, CardHeader, DataTable, DatePicker, StatusPill, type DataTableColumn } from '@/components/ui'
import { useProductionStore } from '@/features/production/store'
import { useListCriteria } from '@/hooks/useListCriteria'
import { dayLabel } from '@/features/logistics/types'
import { toast } from '@/stores/toastStore'
import { useConsignmentStore } from './consignmentStore'
import { dayOfWeekOf, estimateQuantity, routeRunsOn, toYmd, ymdFromToday } from './estimates'
import { useSalesStore } from './store'
import type { ConsignmentEstimate, ConsignmentRoute, EstimateStatus } from './types'
import { formatDate } from './utils'

export const estimateStatusLabel: Record<EstimateStatus, string> = { draft: 'ร่าง', confirmed: 'ยืนยันแล้ว', cancelled: 'ยกเลิก' }
export const estimateStatusTone: Record<EstimateStatus, 'gray' | 'success' | 'neutral'> = { draft: 'gray', confirmed: 'success', cancelled: 'neutral' }

interface Criteria {
  date: string
}

const shiftDay = (ymd: string, days: number) => toYmd(new Date(new Date(`${ymd}T12:00`).getTime() + days * 86_400_000))

interface Row {
  route: ConsignmentRoute
  estimate: ConsignmentEstimate | undefined
}

export function EstimatesPage() {
  const navigate = useNavigate()
  const routes = useConsignmentStore((s) => s.routes)
  const estimates = useConsignmentStore((s) => s.estimates)
  const createEstimate = useConsignmentStore((s) => s.createEstimate)
  const customers = useSalesStore((s) => s.customers)
  const productionOrders = useProductionStore((s) => s.orders)
  const { criteria, update } = useListCriteria<Criteria>({ date: ymdFromToday(1) })

  const running = routes.filter((r) => r.isActive && routeRunsOn(r, criteria.date))
  const rows: Row[] = running.map((route) => ({ route, estimate: estimates.find((e) => e.consignmentRouteId === route.id && e.deliveryDate === criteria.date && e.status !== 'cancelled') }))
  const missing = rows.filter((r) => !r.estimate).length

  // A shop on two routes that run the same day is easy to over-stock
  const sharedShops = customers.filter((c) => running.filter((r) => r.stops.some((s) => s.customerId === c.id)).length > 1)

  const planned = (e: ConsignmentEstimate) => productionOrders.filter((p) => p.consignmentEstimateId === e.id).reduce((sum, p) => sum + p.plannedQuantity, 0)

  const open = (e: ConsignmentEstimate) => navigate({ to: '/sales/estimates/$estimateId', params: { estimateId: e.id } })
  const create = (route: ConsignmentRoute) => {
    const res = createEstimate(route.id, criteria.date)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success(`สร้างยอดประเมินสาย ${route.code} แล้ว ปรับตัวเลขที่ระบบแนะนำได้เลย`)
    navigate({ to: '/sales/estimates/$estimateId', params: { estimateId: res.id } })
  }

  const columns: DataTableColumn<Row>[] = [
    {
      key: 'route',
      label: 'สาย',
      sortValue: (r) => r.route.code,
      render: (r) => (
        <div>
          <p className="font-medium">{r.route.code}</p>
          <p className="text-sm text-muted">{r.route.name}</p>
        </div>
      ),
    },
    { key: 'shops', label: 'ร้าน', sortValue: (r) => r.route.stops.length, render: (r) => <span className="tabular-nums">{r.route.stops.length} ร้าน</span> },
    {
      key: 'status',
      label: 'ยอดประเมิน',
      sortValue: (r) => r.estimate?.status ?? 'z',
      render: (r) => (r.estimate ? <StatusPill tone={estimateStatusTone[r.estimate.status as 'draft' | 'confirmed']}>{estimateStatusLabel[r.estimate.status]}</StatusPill> : <StatusPill tone="warning">ยังไม่ประเมิน</StatusPill>),
    },
    { key: 'number', label: 'เลขที่', sortValue: (r) => r.estimate?.estimateNumber ?? '', render: (r) => r.estimate?.estimateNumber ?? '—' },
    { key: 'qty', label: 'ประเมินรวม', sortValue: (r) => (r.estimate ? estimateQuantity(r.estimate) : -1), render: (r) => (r.estimate ? <span className="tabular-nums">{estimateQuantity(r.estimate)} ชิ้น</span> : '—') },
    {
      key: 'production',
      label: 'สั่งผลิตแล้ว',
      sortValue: (r) => (r.estimate ? planned(r.estimate) : -1),
      render: (r) => (r.estimate ? <span className="tabular-nums">{planned(r.estimate)} ชิ้น</span> : '—'),
    },
  ]

  return (
    <>
      <PageHeading section="ขาย" title="ยอดประเมินลงร้าน" subtitle="พนักงานประเมินว่าจะผลิตของลงแต่ละร้านเท่าไรต่อสาย ใช้วางแผนผลิตเท่านั้น ไม่ใช่คำสั่งซื้อและไม่ใช่ยอดขาย" />

      <Card>
        <CardHeader
          title="สายที่วิ่งตามวันส่ง"
          subtitle={`${formatDate(criteria.date)} (วัน${dayLabel[dayOfWeekOf(criteria.date)]}) · วิ่ง ${running.length} สาย${missing > 0 ? ` · ยังไม่ประเมิน ${missing} สาย` : ''}`}
          action={
            <div className="flex items-end gap-2">
              <Button variant="outline" iconOnly aria-label="วันก่อนหน้า" tooltip="วันก่อนหน้า" onClick={() => update({ date: shiftDay(criteria.date, -1) })}>
                <IconChevronLeft />
              </Button>
              <DatePicker aria-label="วันส่ง" value={criteria.date} onChange={(date) => date && update({ date })} containerClassName="w-48" />
              <Button variant="outline" iconOnly aria-label="วันถัดไป" tooltip="วันถัดไป" onClick={() => update({ date: shiftDay(criteria.date, 1) })}>
                <IconChevronRight />
              </Button>
            </div>
          }
        />

        {sharedShops.length > 0 && (
          <Alert tone="info" title="มีร้านที่อยู่หลายสายในวันเดียวกัน" className="mb-5">
            {sharedShops.map((c) => c.name).join(', ')} — ตรวจให้แน่ใจว่าไม่ประเมินซ้ำโดยไม่ตั้งใจ
          </Alert>
        )}

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.route.id}
          defaultSort={{ key: 'route', dir: 'asc' }}
          emptyTitle="ไม่มีสายที่วิ่งวันนี้"
          emptyDescription="ตั้งวันที่วิ่งของสายได้ที่ ขาย → สายฝากขาย"
          renderActions={(r) =>
            r.estimate ? (
              <Button size="sm" variant="soft" iconOnly outlined aria-label="เปิดยอดประเมิน" tooltip="เปิดยอดประเมิน" onClick={() => open(r.estimate!)}>
                <IconEye />
              </Button>
            ) : (
              <Button size="sm" variant="primary" iconOnly outlined aria-label="สร้างยอดประเมิน" tooltip="สร้างยอดประเมิน" onClick={() => create(r.route)}>
                <IconPlus />
              </Button>
            )
          }
        />
      </Card>
    </>
  )
}
