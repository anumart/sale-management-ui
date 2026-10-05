import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { IconCart, IconCheck, IconChevronRight, IconFactory, IconInbox, IconPrinter, IconReceipt, IconTruck, IconUsers } from '@/components/icons'
import { Card, CardHeader, EmptyState } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { DashboardData } from '../useDashboard'

interface Todo {
  key: string
  icon: ReactNode
  label: string
  detail: string
  count: number
  to: string
  /** Late or blocking work */
  urgent?: boolean
}

/** Work waiting on someone, in flow order (purchase → pickup → production → sales). Rows with nothing to do are hidden. */
export function TodoCard({ data }: { data: DashboardData }) {
  const todos: Todo[] = [
    { key: 'po-draft', icon: <IconCart />, label: 'ส่งใบสั่งซื้อให้ซัพพลายเออร์', detail: 'ใบสั่งซื้อที่ยังเป็นร่าง', count: data.draftPos.length, to: '/procurement/purchase-orders' },
    { key: 'po-sent', icon: <IconCart />, label: 'รอซัพพลายเออร์ยืนยัน', detail: 'ส่งแล้ว ยังไม่ได้รับการยืนยัน', count: data.sentPos.length, to: '/procurement/purchase-orders' },
    { key: 'rs-print', icon: <IconPrinter />, label: 'พิมพ์ใบวิ่งรถ', detail: 'ใบวิ่งรถที่ยังเป็นร่าง', count: data.toPrint.length, to: '/logistics/run-sheets' },
    { key: 'rs-receive', icon: <IconTruck />, label: 'บันทึกรับของ', detail: 'รถออกรับของแล้ว รอบันทึกจำนวนที่ได้รับจริง', count: data.toReceive.length, to: '/logistics/run-sheets', urgent: true },
    { key: 'imports', icon: <IconInbox />, label: 'ตรวจอีเมลสั่งซื้อ', detail: 'ไฟล์จากอีเมลที่ระบบอ่านไม่ครบ', count: data.reviewImports.length, to: '/sales/orders' },
    { key: 'co-review', icon: <IconInbox />, label: 'ยืนยันคำสั่งซื้อลูกค้า', detail: 'รอตรวจสอบหรือรอยืนยัน', count: data.toReview.length, to: '/sales/orders' },
    { key: 'co-plan', icon: <IconFactory />, label: 'วางแผนผลิต', detail: 'คำสั่งซื้อยืนยันแล้ว ยังไม่มีใบสั่งผลิต', count: data.awaitingProduction.length, to: '/production/planning', urgent: true },
    { key: 'visits', icon: <IconUsers />, label: 'ให้ร้านลงชื่อใบเข้าร้าน', detail: 'ใบเข้าร้านที่ยังเป็นร่าง', count: data.draftVisits.length, to: '/sales/visits' },
    { key: 'reports', icon: <IconReceipt />, label: 'ตรวจรายงานยอดขายร้านฝากขาย', detail: 'รายงานที่ร้านส่งมา รอตรวจ', count: data.pendingReports.length, to: '/sales/reports' },
    { key: 'invoices', icon: <IconReceipt />, label: 'ติดตามใบแจ้งหนี้', detail: data.overdue.length ? `เกินกำหนด ${data.overdue.length} ใบ` : 'รอชำระ', count: data.unpaid.length, to: '/sales/invoices', urgent: data.overdue.length > 0 },
  ].filter((t) => t.count > 0)

  const total = todos.reduce((sum, t) => sum + t.count, 0)

  return (
    <Card>
      <CardHeader title="งานที่ต้องทำ" subtitle={total ? `ค้างอยู่ ${total} รายการ` : 'ไม่มีงานค้าง'} />
      {todos.length === 0 ? (
        <EmptyState title="ไม่มีงานค้าง" description="ทุกขั้นตอนเรียบร้อยแล้ว" />
      ) : (
        <ul className="-mx-2 flex flex-col">
          {todos.map((t) => (
            <li key={t.key}>
              <Link to={t.to} className="group flex items-center gap-3.5 rounded-control px-2 py-2.5 transition-colors hover:bg-hover">
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-full [&>svg]:size-5',
                    t.urgent ? 'bg-warning-bg text-warning-fg' : 'bg-theme-soft text-theme',
                  )}
                >
                  {t.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.label}</span>
                  <span className="block truncate text-sm text-muted">{t.detail}</span>
                </span>
                <span className={cn('min-w-8 rounded-full px-2.5 py-0.5 text-center text-sm font-semibold', t.urgent ? 'bg-warning text-white' : 'bg-fill-strong text-ink')}>
                  {t.count}
                </span>
                <IconChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {todos.length > 0 && data.overdue.length === 0 && data.latePos.length === 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-success-fg [&>svg]:size-4">
          <IconCheck /> ไม่มีรายการที่เลยกำหนด
        </p>
      )}
    </Card>
  )
}
