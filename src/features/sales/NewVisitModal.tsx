import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { IconMapPin } from '@/components/icons'
import { Button, Modal, Select, TextField } from '@/components/ui'
import { toast } from '@/stores/toastStore'
import { useSalesStore } from './store'
import { fromDateInput, toDateInput } from './utils'

export interface NewVisitModalProps {
  open: boolean
  onClose: () => void
  /** Preselect a shop (opened from its detail page) */
  customerId?: string
}

/** Starts a consignment visit sheet; the shop's current balance is snapshotted as the starting point. */
export function NewVisitModal({ open, onClose, customerId: presetCustomerId }: NewVisitModalProps) {
  const navigate = useNavigate()
  const customers = useSalesStore((s) => s.customers)
  const createVisit = useSalesStore((s) => s.createVisit)
  const [customerId, setCustomerId] = useState(presetCustomerId ?? '')
  const [visitDate, setVisitDate] = useState(toDateInput(new Date().toISOString()))
  const [driverName, setDriverName] = useState('')

  useEffect(() => {
    if (open) setCustomerId(presetCustomerId ?? '')
  }, [open, presetCustomerId])

  const submit = () => {
    if (!customerId || !driverName.trim()) {
      toast.error('เลือกร้านและกรอกชื่อคนขับ')
      return
    }
    const res = createVisit({ customerId, visitDate: fromDateInput(visitDate, '12:00').toISOString(), driverName: driverName.trim() })
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    onClose()
    toast.success('สร้างใบเข้าร้านแล้ว')
    navigate({ to: '/sales/visits/$visitId', params: { visitId: res.id } })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<IconMapPin />}
      title="เข้าร้านใหม่"
      description="สร้างใบเข้าร้านให้คนขับ โดยคัดลอกยอดคงเหลือปัจจุบันของร้านมาให้ตรวจ"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={submit}>สร้างใบเข้าร้าน</Button>
        </>
      }
    >
      <Select
        label="ร้าน"
        required
        placeholder="เลือกร้านฝากขาย"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        options={customers.filter((c) => c.type === 'consignment' && c.isActive).map((c) => ({ value: c.id, label: c.name }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="วันที่เข้าร้าน" type="date" required value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
        <TextField label="คนขับ" required placeholder="เช่น สมชาย ร." value={driverName} onChange={(e) => setDriverName(e.target.value)} />
      </div>
    </Modal>
  )
}
