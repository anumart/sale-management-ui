import { useState, type ChangeEvent } from 'react'
import { IconTruck } from '@/components/icons'
import { Button, Modal, TextField } from '@/components/ui'
import { toast } from '@/stores/toastStore'
import { useLogisticsStore } from './store'

export interface AddVehicleModalProps {
  open: boolean
  onClose: () => void
}

const emptyForm = { code: '', licensePlate: '', driverName: '', driverPhone: '', capacityKg: '' }

export function AddVehicleModal({ open, onClose }: AddVehicleModalProps) {
  const addVehicle = useLogisticsStore((s) => s.addVehicle)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyForm, string>>>({})

  const set = (key: keyof typeof emptyForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleClose = () => {
    setForm(emptyForm)
    setErrors({})
    onClose()
  }

  const handleSave = () => {
    const nextErrors: typeof errors = {}
    if (!form.code.trim()) nextErrors.code = 'กรุณากรอกรหัสรถ'
    if (!form.licensePlate.trim()) nextErrors.licensePlate = 'กรุณากรอกทะเบียนรถ'
    if (!form.driverName.trim()) nextErrors.driverName = 'กรุณากรอกชื่อคนขับ'
    if (!form.capacityKg || Number(form.capacityKg) <= 0) nextErrors.capacityKg = 'กรุณากรอกน้ำหนักบรรทุกให้ถูกต้อง'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    addVehicle({
      id: `v-${Date.now()}`,
      code: form.code.trim(),
      licensePlate: form.licensePlate.trim(),
      driverName: form.driverName.trim(),
      driverPhone: form.driverPhone.trim(),
      capacityKg: Number(form.capacityKg),
      status: 'active',
    })
    toast.success(`เพิ่มรถ ${form.code.trim()} แล้ว`)
    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="เพิ่มรถ"
      description="ลงทะเบียนรถขนส่งและคนขับใหม่"
      icon={<IconTruck />}
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave}>บันทึก</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="รหัสรถ" required placeholder="VH-004" value={form.code} onChange={set('code')} error={errors.code} />
        <TextField label="ทะเบียนรถ" required placeholder="1กข-1234 กรุงเทพฯ" value={form.licensePlate} onChange={set('licensePlate')} error={errors.licensePlate} />
        <TextField label="ชื่อคนขับ" required placeholder="สมชาย ใจดี" value={form.driverName} onChange={set('driverName')} error={errors.driverName} />
        <TextField label="เบอร์โทรคนขับ" placeholder="081-234-5678" value={form.driverPhone} onChange={set('driverPhone')} />
        <TextField
          label="น้ำหนักบรรทุก (กก.)"
          required
          type="number"
          placeholder="2000"
          value={form.capacityKg}
          onChange={set('capacityKg')}
          error={errors.capacityKg}
          containerClassName="sm:col-span-2"
        />
      </div>
    </Modal>
  )
}
