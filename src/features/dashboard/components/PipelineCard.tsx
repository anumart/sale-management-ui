import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { IconBox, IconCart, IconChevronRight, IconClock, IconFactory, IconList, IconReceipt, IconTruck } from '@/components/icons'
import { Card, CardHeader } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatCurrency, formatNumber } from '@/lib/format'
import type { DashboardData } from '../useDashboard'

interface Stage {
  key: string
  icon: ReactNode
  label: string
  count: number
  unit: string
  note: string
  to: string
}

/**
 * The end-to-end flow from the spec (plan → PO → pickup → production → finished goods → invoice) with what's sitting in
 * each step right now. A busy step is tinted so the bottleneck stands out.
 */
export function PipelineCard({ data }: { data: DashboardData }) {
  const stages: Stage[] = [
    { key: 'plan', icon: <IconList />, label: 'แผนจัดซื้อ', count: data.draftPlans.length, unit: 'แผน', note: 'ร่าง ยังไม่สั่งซื้อ', to: '/procurement/plans' },
    { key: 'po', icon: <IconCart />, label: 'ใบสั่งซื้อ', count: data.draftPos.length + data.openPos.length, unit: 'ใบ', note: formatCurrency(data.openPoValue), to: '/procurement/purchase-orders' },
    {
      key: 'pickup',
      icon: <IconTruck />,
      label: 'รับของ',
      count: data.openRunSheets.length,
      unit: 'ใบวิ่งรถ',
      note: `${formatNumber(data.pendingPickups.length)} รายการรอจัดรถ`,
      to: '/logistics/run-sheets',
    },
    { key: 'plan-prod', icon: <IconClock />, label: 'รอวางแผนผลิต', count: data.awaitingProduction.length, unit: 'คำสั่งซื้อ', note: 'ยืนยันแล้ว ยังไม่ผลิต', to: '/production/planning' },
    {
      key: 'production',
      icon: <IconFactory />,
      label: 'ผลิต',
      count: data.inProduction.length + data.queued.length,
      unit: 'ใบสั่งผลิต',
      note: `กำลังผลิต ${data.inProduction.length} · รอคิว ${data.queued.length}`,
      to: '/production/orders',
    },
    { key: 'fg', icon: <IconBox />, label: 'สินค้าพร้อมส่ง', count: data.readyToShip.length, unit: 'คำสั่งซื้อ', note: `สต็อกว่าง ${formatNumber(data.availableUnits)} ชิ้น`, to: '/sales/orders' },
    { key: 'invoice', icon: <IconReceipt />, label: 'รอชำระเงิน', count: data.unpaid.length, unit: 'ใบแจ้งหนี้', note: formatCurrency(data.unpaidValue), to: '/sales/invoices' },
  ]
  const busiest = Math.max(...stages.map((s) => s.count))

  return (
    <Card>
      <CardHeader title="สายงาน" subtitle="งานที่ค้างอยู่ในแต่ละขั้น ตั้งแต่จัดซื้อจนเก็บเงิน" />
      <ol className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {stages.map((s, i) => {
          const hot = s.count > 0 && s.count === busiest
          return (
            <li key={s.key} className="flex min-w-[9.5rem] flex-1 items-center gap-2">
              <Link
                to={s.to}
                className={cn(
                  'flex h-full min-w-0 flex-1 flex-col rounded-control border p-3.5 transition-colors',
                  hot ? 'border-warning/50 bg-warning-bg hover:bg-warning-bg-hover' : 'border-line bg-surface hover:bg-hover',
                )}
              >
                <span className="flex items-center gap-2 text-sm text-ink-2 [&>svg]:size-4 [&>svg]:shrink-0">
                  {s.icon}
                  <span className="truncate">{s.label}</span>
                </span>
                <span className="mt-2 flex items-baseline gap-1.5">
                  <span className={cn('text-[1.75rem] leading-none font-semibold tracking-tight', s.count === 0 && 'text-muted')}>{s.count}</span>
                  <span className="text-sm text-muted">{s.unit}</span>
                </span>
                <span className="mt-1.5 truncate text-xs text-muted">{s.note}</span>
              </Link>
              {i < stages.length - 1 && <IconChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
