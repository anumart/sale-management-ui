import { PageHeading } from '@/components/layout/PageHeading'
import { IconPower, IconWrench } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, StatusPill, type DataTableColumn } from '@/components/ui'
import { finishedGoodById } from '@/features/procurement/mockData'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { useProductionStore } from './store'
import type { ProductionLine } from './types'
import { lineStatusLabel, lineStatusTone } from './utils'

export function LinesPage() {
  const lines = useProductionStore((s) => s.lines)
  const toggleLineStatus = useProductionStore((s) => s.toggleLineStatus)

  const handleToggle = async (line: ProductionLine) => {
    if (line.status === 'available') {
      const ok = await confirm({
        title: 'ส่งไลน์เข้าซ่อมบำรุง?',
        message: `${line.name} (${line.code}) จะรับใบสั่งผลิตใหม่ไม่ได้จนกว่าจะกลับมาใช้งาน`,
        confirmLabel: 'ส่งซ่อมบำรุง',
        tone: 'danger',
      })
      if (!ok) return
      toggleLineStatus(line.id)
      toast.success(`${line.code} อยู่ระหว่างซ่อมบำรุง`)
    } else {
      toggleLineStatus(line.id)
      toast.success(`${line.code} กลับมาใช้งานแล้ว`)
    }
  }

  const columns: DataTableColumn<ProductionLine>[] = [
    { key: 'code', label: 'รหัส', sortValue: (l) => l.code, render: (l) => <span className="font-medium">{l.code}</span> },
    { key: 'name', label: 'ชื่อ', sortValue: (l) => l.name, render: (l) => l.name },
    { key: 'capacity', label: 'กำลังผลิต / ชั่วโมง', sortValue: (l) => l.capacityPerHour, render: (l) => <span className="tabular-nums">{l.capacityPerHour}</span> },
    {
      key: 'products',
      label: 'สินค้าที่ผลิตได้',
      sortable: false,
      render: (l) => <span className="text-sm text-muted">{l.compatibleFinishedGoodIds.map((id) => finishedGoodById(id)?.name).join(', ')}</span>,
    },
    { key: 'status', label: 'สถานะ', sortValue: (l) => l.status, render: (l) => <StatusPill tone={lineStatusTone[l.status]}>{lineStatusLabel[l.status]}</StatusPill> },
  ]

  return (
    <>
      <PageHeading section="ผลิต" title="ไลน์ผลิต" />
      <Card>
        <CardHeader title="ไลน์ผลิต" subtitle="โรงงานมีไลน์เดียว ระหว่างส่งซ่อมบำรุงจะสร้างใบสั่งผลิตใหม่ไม่ได้" />
        <DataTable
          columns={columns}
          rows={lines}
          rowKey={(l) => l.id}
          emptyTitle="ยังไม่มีไลน์ผลิต"
          renderActions={(l) => (
            <Button
              size="sm"
              variant={l.status === 'available' ? 'danger' : 'accent'}
              iconOnly
              outlined
              aria-label={l.status === 'available' ? 'ส่งซ่อมบำรุง' : 'กลับมาใช้งาน'}
              tooltip={l.status === 'available' ? 'ส่งซ่อมบำรุง' : 'กลับมาใช้งาน'}
              onClick={() => handleToggle(l)}
            >
              {l.status === 'available' ? <IconWrench /> : <IconPower />}
            </Button>
          )}
        />
      </Card>
    </>
  )
}
