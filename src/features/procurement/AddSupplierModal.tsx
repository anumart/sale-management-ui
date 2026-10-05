import { useState, type ChangeEvent } from 'react'
import { IconBuilding } from '@/components/icons'
import { Button, Modal, TextArea, TextField } from '@/components/ui'
import { toast } from '@/stores/toastStore'
import { useProcurementStore } from './store'

export interface AddSupplierModalProps {
  open: boolean
  onClose: () => void
}

const emptyForm = { name: '', contactPerson: '', phone: '', email: '', address: '' }

export function AddSupplierModal({ open, onClose }: AddSupplierModalProps) {
  const addSupplier = useProcurementStore((s) => s.addSupplier)
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
    if (!form.name.trim()) nextErrors.name = 'กรุณากรอกชื่อซัพพลายเออร์'
    if (!form.contactPerson.trim()) nextErrors.contactPerson = 'กรุณากรอกผู้ติดต่อ'
    if (!form.phone.trim()) nextErrors.phone = 'กรุณากรอกเบอร์โทรศัพท์'
    if (!form.address.trim()) nextErrors.address = 'กรุณากรอกที่อยู่'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    addSupplier({
      id: `sup-${Date.now()}`,
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      address: form.address.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
    })
    toast.success(`เพิ่มซัพพลายเออร์ "${form.name.trim()}" แล้ว`)
    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="เพิ่มซัพพลายเออร์"
      description="ลงทะเบียนบริษัทซัพพลายเออร์หรือเกษตรกรรายใหม่"
      icon={<IconBuilding />}
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
        <TextField
          label="ชื่อซัพพลายเออร์"
          required
          placeholder="สวนพฤกษชาติคลองจั่น"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          containerClassName="sm:col-span-2"
        />
        <TextField label="ผู้ติดต่อ" required placeholder="คุณวิภา คลองจั่น" value={form.contactPerson} onChange={set('contactPerson')} error={errors.contactPerson} />
        <TextField label="โทรศัพท์" required placeholder="02-731-5588" value={form.phone} onChange={set('phone')} error={errors.phone} />
        <TextField label="อีเมล" type="email" placeholder="contact@supplier.co.th" value={form.email} onChange={set('email')} containerClassName="sm:col-span-2" />
        <TextArea
          label="ที่อยู่"
          required
          placeholder="99/1 ถนนนวมินทร์ แขวงคลองจั่น เขตบางกะปิ กรุงเทพมหานคร 10240"
          value={form.address}
          onChange={set('address')}
          error={errors.address}
          containerClassName="sm:col-span-2"
        />
      </div>
    </Modal>
  )
}
