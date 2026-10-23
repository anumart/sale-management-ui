import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconPlus, IconPower, IconTrash } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, StatusPill, type DataTableColumn, type PillTone } from '@/components/ui'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { AddVehicleModal } from './AddVehicleModal'
import { useLogisticsStore } from './store'
import type { Vehicle, VehicleStatus } from './types'

const statusTone: Record<VehicleStatus, PillTone> = { active: 'success', inactive: 'neutral' }
const statusLabel: Record<VehicleStatus, string> = { active: 'ใช้งาน', inactive: 'ปิดใช้งาน' }

const pageSize = 5

export function VehiclesListPage() {
  const vehicles = useLogisticsStore((s) => s.vehicles)
  const toggleVehicleStatus = useLogisticsStore((s) => s.toggleVehicleStatus)
  const [modalOpen, setModalOpen] = useState(false)

  const handleToggle = async (vehicleId: string, code: string, status: VehicleStatus) => {
    const goingInactive = status === 'active'
    const ok = await confirm({
      title: goingInactive ? `ปิดใช้งาน ${code}?` : `เปิดใช้งาน ${code}?`,
      message: goingInactive
        ? 'รถคันนี้จะไม่สามารถเลือกได้เมื่อสร้างใบวิ่งรถใหม่'
        : 'รถคันนี้จะกลับมาเลือกได้เมื่อสร้างใบวิ่งรถ',
      confirmLabel: goingInactive ? 'ปิดใช้งาน' : 'เปิดใช้งาน',
      tone: goingInactive ? 'danger' : 'primary',
    })
    if (!ok) return
    toggleVehicleStatus(vehicleId)
    toast.success(`${code} เปลี่ยนเป็น${goingInactive ? 'ปิดใช้งาน' : 'ใช้งาน'}`)
  }

  const columns: DataTableColumn<Vehicle>[] = [
    { key: 'code', label: 'รหัส', sortValue: (v) => v.code, render: (v) => <span className="font-medium">{v.code}</span> },
    { key: 'licensePlate', label: 'ทะเบียนรถ', sortValue: (v) => v.licensePlate, render: (v) => <span className="whitespace-nowrap">{v.licensePlate}</span> },
    { key: 'driverName', label: 'คนขับ', sortValue: (v) => v.driverName.toLowerCase(), render: (v) => v.driverName },
    { key: 'driverPhone', label: 'โทรศัพท์', sortValue: (v) => v.driverPhone, render: (v) => <span className="whitespace-nowrap">{v.driverPhone}</span> },
    {
      key: 'capacityKg',
      label: 'น้ำหนักบรรทุก',
      sortValue: (v) => v.capacityKg,
      render: (v) => <span className="tabular-nums whitespace-nowrap">{v.capacityKg.toLocaleString()} กก.</span>,
    },
    {
      key: 'status',
      label: 'สถานะ',
      sortValue: (v) => (v.status === 'active' ? 1 : 0),
      render: (v) => <StatusPill tone={statusTone[v.status]}>{statusLabel[v.status]}</StatusPill>,
    },
  ]

  return (
    <>
      <PageHeading section="ขนส่ง" title="รถ" />
      <Card>
        <CardHeader
          title="รถทั้งหมด"
          subtitle="เลือกรถตอนสร้างใบวิ่งรถ รถไม่ผูกกับเส้นทางตายตัว"
          action={
            <Button onClick={() => setModalOpen(true)}>
              <IconPlus />
              เพิ่มรถ
            </Button>
          }
        />

        <DataTable
          columns={columns}
          rows={vehicles}
          rowKey={(v) => v.id}
          pageSize={pageSize}
          emptyTitle="ไม่พบรถ"
          emptyDescription="เพิ่มรถเพื่อเริ่มต้น"
          renderActions={(v) => (
            <>
              <Button
                size="sm"
                variant={v.status === 'active' ? 'danger' : 'accent'}
                iconOnly
                outlined
                aria-label={v.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                tooltip={v.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                onClick={() => handleToggle(v.id, v.code, v.status)}
              >
                {v.status === 'active' ? <IconTrash /> : <IconPower />}
              </Button>
            </>
          )}
        />
      </Card>

      <AddVehicleModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
