import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { IconCheck, IconWarning } from '@/components/icons'
import { Card, CardHeader } from '@/components/ui'
import { finishedGoodById, rawMaterialById } from '@/features/procurement/mockData'
import { roundQty } from '@/features/production/utils'
import { formatDate } from '@/features/sales/utils'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import { EXPIRY_DAYS, VARIANCE_LIMIT, type DashboardData } from '../useDashboard'

interface Risk {
  key: string
  level: 'danger' | 'warning'
  title: string
  detail: ReactNode
  to: string
}

/** The risks the spec calls out (receipt variance, bottleneck raw materials, low yield) plus late and expiring items. */
export function RisksCard({ data }: { data: DashboardData }) {
  const risks: Risk[] = [
    ...data.lineDown.map((l) => ({ key: `line-${l.id}`, level: 'danger' as const, title: `${l.name} ปิดซ่อม`, detail: 'ผลิตไม่ได้จนกว่าจะเปิดไลน์', to: '/production/lines' })),
    ...(data.shortages.length
      ? [
          {
            key: 'rm',
            level: 'danger' as const,
            title: `วัตถุดิบไม่พอผลิต ${data.shortages.length} รายการ`,
            detail: data.shortages
              .map((s) => {
                const rm = rawMaterialById(s.rawMaterialId)
                return `${rm?.nameTh ?? s.rawMaterialId} ขาด ${formatNumber(roundQty(s.required - s.available))} ${rm?.unit ?? ''}`
              })
              .join(' · '),
            to: '/procurement/plans/new/step-1',
          },
        ]
      : []),
    ...data.latePos.map((p) => ({
      key: `po-${p.id}`,
      level: 'warning' as const,
      title: `${p.poNumber} เลยกำหนดส่ง`,
      detail: `กำหนดส่ง ${formatDate(p.expectedDeliveryDate)} ยังไม่ได้รับของ`,
      to: '/procurement/purchase-orders',
    })),
    ...data.varianceLines.slice(0, 3).map((v) => ({
      key: `var-${v.line.id}`,
      level: 'warning' as const,
      title: `รับ${v.line.rawMaterialName} ${v.pct < 0 ? 'ขาด' : 'เกิน'} ${Math.abs(Math.round(v.pct))}%`,
      detail: `${v.runSheet.runSheetNumber} · สั่ง ${formatNumber(v.line.orderedQuantity)} ได้ ${formatNumber(v.line.actualReceivedQuantity ?? 0)} ${v.line.unit} (เกิน ${VARIANCE_LIMIT}%)`,
      to: '/logistics/run-sheets',
    })),
    ...(data.expiring.length
      ? [
          {
            key: 'lots',
            level: 'warning' as const,
            title: `สินค้าใกล้หมดอายุ ${data.expiring.length} LOT`,
            detail: data.expiring
              .map((b) => {
                const fg = finishedGoodById(b.finishedGoodId)
                return `${b.batchNumber} ${fg?.name} ${formatNumber(b.remainingQuantity)} ${fg?.unit} (${formatDate(b.expirationDate)})`
              })
              .join(' · '),
            to: '/production/finished-goods',
          },
        ]
      : []),
    ...data.lowYield.map((o) => ({
      key: `yield-${o.id}`,
      level: 'warning' as const,
      title: `${o.orderNumber} yield ต่ำ (เกรด C)`,
      detail: `ได้ ${o.yieldRate}% ของที่วางแผน`,
      to: '/production/orders',
    })),
    ...data.overdue.map((i) => ({
      key: `inv-${i.id}`,
      level: 'warning' as const,
      title: `${i.invoiceNumber} เกินกำหนดชำระ`,
      detail: `ครบกำหนด ${formatDate(i.dueDate)}`,
      to: '/sales/invoices',
    })),
  ]

  return (
    <Card>
      <CardHeader title="ความเสี่ยง" subtitle={risks.length ? `พบ ${risks.length} เรื่องที่ควรจัดการ` : `ตรวจวัตถุดิบ การรับของ ผลผลิต และ LOT ที่หมดอายุภายใน ${EXPIRY_DAYS} วัน`} />
      {risks.length === 0 ? (
        <p className="flex items-center gap-2 rounded-control bg-success-bg px-4 py-3 text-sm text-success-fg [&>svg]:size-5">
          <IconCheck /> ไม่พบความเสี่ยง
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {risks.map((r) => (
            <li key={r.key}>
              <Link
                to={r.to}
                className={cn(
                  'flex items-start gap-3 rounded-control border px-4 py-3 transition-colors',
                  r.level === 'danger' ? 'border-danger/40 bg-danger-bg hover:bg-danger-bg-hover' : 'border-warning/40 bg-warning-bg hover:bg-warning-bg-hover',
                )}
              >
                <IconWarning className={cn('mt-0.5 size-5 shrink-0', r.level === 'danger' ? 'text-danger-fg' : 'text-warning-fg')} />
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{r.title}</span>
                  <span className="block text-sm text-ink-2">{r.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
