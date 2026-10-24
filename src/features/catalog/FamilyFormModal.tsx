import { useEffect, useState, type ChangeEvent } from 'react'
import { IconList } from '@/components/icons'
import { Button, Modal, Select, TextField } from '@/components/ui'
import { toast } from '@/stores/toastStore'
import type { MaterialFamily } from '@/features/procurement/types'
import { useCatalogStore } from './store'
import { categoryOptions as buildCategoryOptions } from './utils'

export interface FamilyFormModalProps {
  open: boolean
  onClose: () => void
  /** Editing this family; omit to create a new one */
  family?: MaterialFamily
}

const emptyForm = { code: '', nameTh: '', nameEn: '', categoryId: '', color: '' }

export function FamilyFormModal({ open, onClose, family }: FamilyFormModalProps) {
  const families = useCatalogStore((s) => s.materialFamilies)
  const categories = useCatalogStore((s) => s.categories)
  const addFamily = useCatalogStore((s) => s.addFamily)
  const updateFamily = useCatalogStore((s) => s.updateFamily)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyForm, string>>>({})

  const categoryOptions = buildCategoryOptions(categories, 'raw_material')

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(
      family
        ? { code: family.code, nameTh: family.nameTh, nameEn: family.nameEn ?? '', categoryId: family.categoryId, color: family.color ?? '' }
        : emptyForm,
    )
  }, [open, family])

  const set = (key: keyof typeof emptyForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSave = () => {
    const code = form.code.trim()
    const nextErrors: typeof errors = {}
    if (!code) nextErrors.code = 'กรุณากรอกรหัสตระกูล'
    else if (families.some((f) => f.id !== family?.id && f.code.toLowerCase() === code.toLowerCase())) nextErrors.code = 'รหัสนี้ถูกใช้แล้ว'
    if (!form.nameTh.trim()) nextErrors.nameTh = 'กรุณากรอกชื่อตระกูล (ไทย)'
    if (!form.categoryId) nextErrors.categoryId = 'กรุณาเลือกหมวดหมู่'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const fields = {
      code,
      nameTh: form.nameTh.trim(),
      nameEn: form.nameEn.trim() || undefined,
      categoryId: form.categoryId,
      color: form.color.trim() || undefined,
    }
    if (family) {
      updateFamily(family.id, fields)
      toast.success(`บันทึกตระกูล "${fields.nameTh}" แล้ว`)
    } else {
      addFamily({ id: `fam-${Date.now()}`, ...fields, isActive: true })
      toast.success(`เพิ่มตระกูล "${fields.nameTh}" แล้ว`)
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={family ? 'แก้ไขตระกูลวัตถุดิบ' : 'เพิ่มตระกูลวัตถุดิบ'}
      description="ตระกูลคือพันธุ์เดียวกันที่มีหลายขนาดหรือเกรด สต็อกและราคาอยู่ที่ SKU แต่ละตัว"
      icon={<IconList />}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave}>บันทึก</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="รหัสตระกูล" required placeholder="ANTH-CALISTO" value={form.code} onChange={set('code')} error={errors.code} />
        <Select label="หมวดหมู่" required placeholder="เลือกหมวดหมู่" value={form.categoryId} onChange={set('categoryId')} options={categoryOptions} error={errors.categoryId} />
        <TextField label="ชื่อตระกูล (ไทย)" required placeholder="หน้าวัว คาลิสโต้" value={form.nameTh} onChange={set('nameTh')} error={errors.nameTh} />
        <TextField label="ชื่อตระกูล (อังกฤษ)" placeholder="Anth. Calisto" value={form.nameEn} onChange={set('nameEn')} />
        <TextField label="สี" placeholder="Scarlet" value={form.color} onChange={set('color')} />
      </div>
    </Modal>
  )
}
