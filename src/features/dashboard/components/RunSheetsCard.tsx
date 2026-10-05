import { Link } from '@tanstack/react-router'
import { IconTruck } from '@/components/icons'
import { Card, CardHeader, StatusPill } from '@/components/ui'
import { useLogisticsStore } from '@/features/logistics/store'
import { runSheetStatusLabel, runSheetStatusTone } from '@/features/logistics/utils'
import { formatDate } from '@/features/sales/utils'
import { formatCurrency } from '@/lib/format'
import type { DashboardData } from '../useDashboard'

/** Latest run sheets, open ones first — the pickup side of the flow (FLOW 3a/3b). */
export function RunSheetsCard({ data }: { data: DashboardData }) {
  const vehicles = useLogisticsStore((s) => s.vehicles)
  const rows = [...data.runSheets]
    .sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed') || b.runDate.localeCompare(a.runDate))
    .slice(0, 4)

  return (
    <Card>
      <CardHeader
        title="ใบวิ่งรถ"
        subtitle={data.openRunSheets.length ? `ยังไม่ปิด ${data.openRunSheets.length} ใบ` : 'ปิดครบทุกใบแล้ว'}
        action={
          <Link to="/logistics/run-sheets/generate" className="text-control font-medium text-primary-fg transition-colors hover:text-primary-fg-hover">
            สร้างใบวิ่งรถ
          </Link>
        }
      />
      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const vehicle = vehicles.find((v) => v.id === r.vehicleId)
          const items = r.stops.flatMap((s) => s.lineItems)
          const value = items.reduce((sum, l) => sum + l.orderedQuantity * l.pricePerUnit, 0)
          return (
            <li key={r.id}>
              <Link
                to="/logistics/run-sheets/$runSheetId"
                params={{ runSheetId: r.id }}
                className="flex items-center gap-3.5 rounded-control border border-line bg-surface p-3.5 transition-colors hover:bg-hover"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-theme-soft text-theme [&>svg]:size-5">
                  <IconTruck />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.runSheetNumber}</span>
                  <span className="block truncate text-sm text-muted">
                    {formatDate(r.runDate)} · {vehicle ? `${vehicle.licensePlate} · ${vehicle.driverName}` : '-'} · {r.stops.length} จุด · {formatCurrency(value)}
                  </span>
                </span>
                <StatusPill tone={runSheetStatusTone[r.status]}>{runSheetStatusLabel[r.status]}</StatusPill>
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
