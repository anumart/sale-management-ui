import { Link } from '@tanstack/react-router'
import { IconFactory } from '@/components/icons'
import { Alert, Card, CardHeader, StatusPill } from '@/components/ui'
import { finishedGoodById } from '@/features/procurement/mockData'
import { lineStatusLabel, lineStatusTone, orderStatusLabel, orderStatusTone, qcStatusLabel, qcStatusTone } from '@/features/production/utils'
import { formatDateTime, formatNumber } from '@/lib/format'
import type { DashboardData } from '../useDashboard'

/** The single production line and what's on it: running orders first, then the queue. */
export function ProductionCard({ data }: { data: DashboardData }) {
  const line = data.lines[0]
  const orders = [...data.inProduction, ...data.queued].slice(0, 4)

  return (
    <Card>
      <CardHeader
        title="ไลน์ผลิต"
        subtitle={line ? `${line.code} · ${formatNumber(line.capacityPerHour)} ชิ้น/ชม.` : undefined}
        action={line && <StatusPill tone={lineStatusTone[line.status]}>{lineStatusLabel[line.status]}</StatusPill>}
      />

      {data.lineDown.length > 0 && (
        <Alert tone="danger" title="ไลน์ผลิตปิดซ่อม" className="mb-4">
          ผลิตไม่ได้จนกว่าจะเปิดไลน์ ใบสั่งผลิตที่รอคิวจะเลื่อนออกไป
        </Alert>
      )}

      {orders.length === 0 ? (
        <p className="flex items-center gap-2 rounded-control bg-fill px-4 py-3 text-sm text-muted [&>svg]:size-5">
          <IconFactory /> ไม่มีใบสั่งผลิตที่กำลังผลิตหรือรอคิว
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {orders.map((o) => {
            const fg = finishedGoodById(o.finishedGoodId)
            return (
              <li key={o.id}>
                <Link
                  to="/production/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="block rounded-control border border-field-edge bg-field p-3.5 transition-colors hover:bg-hover"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium">{fg?.name}</span>
                    <StatusPill tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status]}</StatusPill>
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    <span>{o.orderNumber}</span>
                    <span>
                      {formatNumber(o.plannedQuantity)} {fg?.unit}
                    </span>
                    {o.startDate && <span>เริ่ม {formatDateTime(o.startDate)}</span>}
                    {o.status === 'in_production' && <span className="ml-auto">QC: {qcLabel(o.qcStatus)}</span>}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-4 flex justify-end">
        <Link to="/production/orders" className="text-control font-medium text-primary-fg transition-colors hover:text-primary-fg-hover">
          ดูใบสั่งผลิตทั้งหมด
        </Link>
      </div>
    </Card>
  )
}

function qcLabel(status: keyof typeof qcStatusLabel) {
  return <StatusPill tone={qcStatusTone[status]}>{qcStatusLabel[status]}</StatusPill>
}
