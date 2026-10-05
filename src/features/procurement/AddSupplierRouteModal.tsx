import { useState, type ChangeEvent } from 'react'
import { IconMapPin } from '@/components/icons'
import { Button, Modal, TextArea, TextField } from '@/components/ui'
import { toast } from '@/stores/toastStore'
import { useProcurementStore } from './store'

export interface AddSupplierRouteModalProps {
  open: boolean
  onClose: () => void
  supplierId: string
}

const emptyForm = { routeCode: '', routeName: '', province: '', address: '', contactPerson: '', phone: '', operatingHours: '' }

export function AddSupplierRouteModal({ open, onClose, supplierId }: AddSupplierRouteModalProps) {
  const addSupplierRoute = useProcurementStore((s) => s.addSupplierRoute)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyForm, string>>>({})

  const set = (key: keyof typeof emptyForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleClose = () => {
    setForm(emptyForm)
    setErrors({})
    onClose()
  }

  const handleSave = () => {
    const nextErrors: typeof errors = {}
    if (!form.routeName.trim()) nextErrors.routeName = 'กรุณากรอกชื่อจุดรับสินค้า/สวน'
    if (!form.province.trim()) nextErrors.province = 'กรุณากรอกจังหวัด'
    if (!form.address.trim()) nextErrors.address = 'กรุณากรอกที่อยู่จุดรับสินค้า'
    if (!form.contactPerson.trim()) nextErrors.contactPerson = 'กรุณากรอกผู้ติดต่อ'
    if (!form.phone.trim()) nextErrors.phone = 'กรุณากรอกเบอร์โทรศัพท์'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    addSupplierRoute({
      id: `sr-${Date.now()}`,
      supplierId,
      routeCode: form.routeCode.trim() || `SR-${Date.now().toString().slice(-6)}`,
      routeName: form.routeName.trim(),
      province: form.province.trim(),
      address: form.address.trim(),
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      operatingHours: form.operatingHours.trim() || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
      rawMaterials: [],
    })
    toast.success(`เพิ่มจุดรับสินค้า "${form.routeName.trim()}" แล้ว`)
    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="เพิ่มจุดรับสินค้า"
      description="ลงทะเบียนสวน/คลังที่เป็นจุดรับสินค้าใหม่ของซัพพลายเออร์รายนี้"
      icon={<IconMapPin />}
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
        <TextField label="รหัสจุดรับสินค้า" placeholder="เว้นว่างเพื่อให้ระบบสร้างให้" value={form.routeCode} onChange={set('routeCode')} />
        <TextField label="ชื่อจุดรับสินค้า / สวน" required placeholder="สวนดอกกุหลาบแม่ริม" value={form.routeName} onChange={set('routeName')} error={errors.routeName} />
        <TextField label="จังหวัด" required placeholder="เชียงใหม่" value={form.province} onChange={set('province')} error={errors.province} />
        <TextField label="เวลาทำการ" placeholder="06:00–10:00 น. ทุกวัน" value={form.operatingHours} onChange={set('operatingHours')} />
        <TextField label="ผู้ติดต่อ" required placeholder="คุณสมหญิง ปทุมมา" value={form.contactPerson} onChange={set('contactPerson')} error={errors.contactPerson} />
        <TextField label="โทรศัพท์" required placeholder="053-201-4477" value={form.phone} onChange={set('phone')} error={errors.phone} />
        <TextArea
          label="ที่อยู่จุดรับสินค้า"
          required
          placeholder="45/2 หมู่ 3 ตำบลแม่แรม อำเภอแม่ริม จังหวัดเชียงใหม่ 50180"
          value={form.address}
          onChange={set('address')}
          error={errors.address}
          containerClassName="sm:col-span-2"
        />
      </div>
    </Modal>
  )
}
