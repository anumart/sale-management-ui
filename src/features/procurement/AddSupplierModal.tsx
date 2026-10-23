import { useState, type ChangeEvent } from 'react'
import { IconBuilding } from '@/components/icons'
import { Button, Modal, SegmentedControl, TextArea, TextField } from '@/components/ui'
import { toast } from '@/stores/toastStore'
import { useProcurementStore } from './store'
import type { Supplier, SupplierType } from './types'
import { individualDisplayName, isValidTaxId, supplierTypeLabel } from './utils'

export interface AddSupplierModalProps {
  open: boolean
  onClose: () => void
}

const emptyForm = {
  title: '',
  firstName: '',
  lastName: '',
  companyName: '',
  branchCode: '00000',
  taxId: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
}

const typeOptions = (Object.keys(supplierTypeLabel) as SupplierType[]).map((value) => ({ value, label: supplierTypeLabel[value] }))

export function AddSupplierModal({ open, onClose }: AddSupplierModalProps) {
  const addSupplier = useProcurementStore((s) => s.addSupplier)
  const [supplierType, setSupplierType] = useState<SupplierType>('company')
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyForm, string>>>({})

  const isCompany = supplierType === 'company'

  const set = (key: keyof typeof emptyForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleClose = () => {
    setSupplierType('company')
    setForm(emptyForm)
    setErrors({})
    onClose()
  }

  const handleSave = () => {
    const nextErrors: typeof errors = {}
    if (isCompany) {
      if (!form.companyName.trim()) nextErrors.companyName = 'กรุณากรอกชื่อนิติบุคคล'
      if (!/^\d{5}$/.test(form.branchCode.trim())) nextErrors.branchCode = 'รหัสสาขา 5 หลัก (สำนักงานใหญ่ = 00000)'
      if (!form.contactPerson.trim()) nextErrors.contactPerson = 'กรุณากรอกผู้ติดต่อ'
    } else {
      if (!form.firstName.trim()) nextErrors.firstName = 'กรุณากรอกชื่อ'
      if (!form.lastName.trim()) nextErrors.lastName = 'กรุณากรอกนามสกุล'
    }
    if (form.taxId.trim() && !isValidTaxId(form.taxId.trim())) nextErrors.taxId = 'ต้องเป็นตัวเลข 13 หลัก'
    if (!form.phone.trim()) nextErrors.phone = 'กรุณากรอกเบอร์โทรศัพท์'
    if (!form.address.trim()) nextErrors.address = 'กรุณากรอกที่อยู่'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const base = {
      id: `sup-${Date.now()}`,
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      address: form.address.trim(),
      taxId: form.taxId.trim() || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    let supplier: Supplier
    if (isCompany) {
      supplier = {
        ...base,
        supplierType: 'company',
        name: form.companyName.trim(),
        companyName: form.companyName.trim(),
        branchCode: form.branchCode.trim(),
        contactPerson: form.contactPerson.trim(),
      }
    } else {
      const name = individualDisplayName(form.title.trim(), form.firstName.trim(), form.lastName.trim())
      supplier = {
        ...base,
        supplierType: 'individual',
        name,
        title: form.title.trim() || undefined,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        contactPerson: name,
      }
    }
    addSupplier(supplier)
    toast.success(`เพิ่มซัพพลายเออร์ "${supplier.name}" แล้ว`)
    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="เพิ่มซัพพลายเออร์"
      description="ลงทะเบียนซัพพลายเออร์ที่เป็นบุคคลธรรมดาหรือนิติบุคคล แล้วเพิ่มสวน/จุดรับสินค้าภายหลัง"
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
        <div className="sm:col-span-2">
          <SegmentedControl variant="light" aria-label="ประเภทซัพพลายเออร์" value={supplierType} options={typeOptions} onChange={setSupplierType} />
        </div>
        {isCompany ? (
          <>
            <TextField
              label="ชื่อนิติบุคคล"
              required
              placeholder="บริษัท ปทุมมาฟาร์ม จำกัด"
              value={form.companyName}
              onChange={set('companyName')}
              error={errors.companyName}
              containerClassName="sm:col-span-2"
            />
            <TextField label="รหัสสาขา" required placeholder="00000" value={form.branchCode} onChange={set('branchCode')} error={errors.branchCode} />
            <TextField label="เลขประจำตัวผู้เสียภาษี" placeholder="0105561234567" value={form.taxId} onChange={set('taxId')} error={errors.taxId} />
            <TextField
              label="ผู้ติดต่อ"
              required
              placeholder="คุณสมหญิง ปทุมมา"
              value={form.contactPerson}
              onChange={set('contactPerson')}
              error={errors.contactPerson}
              containerClassName="sm:col-span-2"
            />
          </>
        ) : (
          <>
            <TextField label="คำนำหน้า" placeholder="นาย / นาง / นางสาว" value={form.title} onChange={set('title')} />
            <TextField label="เลขบัตรประชาชน" placeholder="3101201234567" value={form.taxId} onChange={set('taxId')} error={errors.taxId} />
            <TextField label="ชื่อ" required placeholder="วิภา" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
            <TextField label="นามสกุล" required placeholder="คลองจั่น" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
          </>
        )}
        <TextField label="โทรศัพท์" required placeholder="02-731-5588" value={form.phone} onChange={set('phone')} error={errors.phone} />
        <TextField label="อีเมล" type="email" placeholder="contact@supplier.co.th" value={form.email} onChange={set('email')} />
        <TextArea
          label={isCompany ? 'ที่อยู่สำนักงาน / ตามทะเบียน' : 'ที่อยู่ตามบัตรประชาชน / ที่พัก'}
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
