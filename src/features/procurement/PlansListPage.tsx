import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { IconEye, IconPlus, IconSearch } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, SegmentedControl, StatusPill, type DataTableColumn, type PillTone } from '@/components/ui'
import { PageHeading } from '@/components/layout/PageHeading'
import { formatDateTime } from '@/lib/format'
import { useProcurementStore } from './store'
import type { PurchasePlan, PlanStatus } from './types'
import { monthName, thaiYear } from './utils'

const statusTone: Record<PlanStatus, PillTone> = { draft: 'gray', ordered: 'success', archived: 'neutral' }
const statusLabel: Record<PlanStatus, string> = { draft: 'ร่าง', ordered: 'สั่งซื้อแล้ว', archived: 'เก็บถาวร' }
const pageSize = 5

export function PlansListPage() {
  const navigate = useNavigate()
  const plans = useProcurementStore((s) => s.plans)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PlanStatus | 'all'>('all')
  const [page, setPage] = useState(1)

  const filtered = plans.filter(
    (p) => (status === 'all' || p.status === status) && p.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  const columns: DataTableColumn<PurchasePlan>[] = [
    { key: 'name', label: 'ชื่อแผน', sortValue: (p) => p.name.toLowerCase(), render: (p) => <span className="font-medium">{p.name}</span> },
    {
      key: 'source',
      label: 'เดือนอ้างอิง',
      sortValue: (p) => p.sourceYear * 12 + p.sourceMonth,
      render: (p) => (
        <span className="whitespace-nowrap">
          {monthName(p.sourceMonth)} {thaiYear(p.sourceYear)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'สถานะ',
      sortValue: (p) => p.status,
      render: (p) => <StatusPill tone={statusTone[p.status]}>{statusLabel[p.status]}</StatusPill>,
    },
    { key: 'createdBy', label: 'สร้างโดย', sortValue: (p) => p.createdByName.toLowerCase(), render: (p) => p.createdByName },
    {
      key: 'createdAt',
      label: 'สร้างเมื่อ',
      sortValue: (p) => p.createdAt,
      render: (p) => <span className="whitespace-nowrap">{formatDateTime(p.createdAt)}</span>,
    },
  ]

  return (
    <>
      <PageHeading section="จัดซื้อ" title="แผนจัดซื้อ" />
      <Card>
        <CardHeader
          title="แผนจัดซื้อ"
          subtitle="แต่ละแผนใช้ได้ครั้งเดียวต่อรอบการจัดซื้อ"
          action={
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="flex h-11 w-56 items-center gap-2 rounded-full border border-field-edge bg-field px-4 text-muted focus-within:border-primary">
                <IconSearch className="size-5 shrink-0" />
                <span className="sr-only">ค้นหาแผน</span>
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="ค้นหาชื่อแผน..."
                  className="min-w-0 flex-1 bg-transparent text-control text-ink outline-none"
                />
              </label>
              <SegmentedControl
                variant="mask"
                aria-label="กรองตามสถานะ"
                value={status}
                onChange={(v) => {
                  setStatus(v)
                  setPage(1)
                }}
                options={[
                  { value: 'all', label: 'ทั้งหมด' },
                  { value: 'draft', label: 'ร่าง' },
                  { value: 'ordered', label: 'สั่งซื้อแล้ว' },
                  { value: 'archived', label: 'เก็บถาวร' },
                ]}
              />
              <Button
                iconOnly
                round
                aria-label="สร้างแผนจัดซื้อ"
                title="สร้างแผนจัดซื้อ"
                onClick={() => navigate({ to: '/procurement/plans/new/step-1' })}
              >
                <IconPlus />
              </Button>
            </div>
          }
        />

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(p) => p.id}
          pageSize={pageSize}
          page={page}
          onPageChange={setPage}
          emptyTitle="ไม่พบแผนจัดซื้อ"
          emptyDescription="ลองเปลี่ยนคำค้นหาหรือตัวกรอง หรือสร้างแผนใหม่"
          renderActions={(plan) => (
            <Button
              size="sm"
              variant="soft"
              iconOnly
              outlined
              aria-label="ดู"
              tooltip="ดู"
              onClick={() => navigate({ to: '/procurement/plans/$planId', params: { planId: plan.id } })}
            >
              <IconEye />
            </Button>
          )}
        />
      </Card>
    </>
  )
}
