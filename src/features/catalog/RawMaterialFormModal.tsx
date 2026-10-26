import { useEffect, useState, type ChangeEvent } from 'react'
import { IconBox } from '@/components/icons'
import { Button, Modal, Select, TextArea, TextField } from '@/components/ui'
import { toast } from '@/stores/toastStore'
import type { RawMaterial } from '@/features/procurement/types'
import { useCatalogStore } from './store'
import { categoryOptions as buildCategoryOptions } from './utils'

export interface RawMaterialFormModalProps {
  open: boolean
  onClose: () => void
  /** Editing this raw material; omit to create a new one */
  material?: RawMaterial
}

const emptyForm = {
  sku: '',
  familyId: '',
  nameTh: '',
  nameEn: '',
  customerName: '',
  categoryId: '',
  unit: '',
  grade: '',
  size: '',
  color: '',
  barcode: '',
  reorderPoint: '',
  standardCost: '',
  isSellable: 'no',
  sellPrice: '',
  description: '',
}

const parseOptionalNumber = (value: string) => (value.trim() === '' ? undefined : Number(value))

export function RawMaterialFormModal({ open, onClose, material }: RawMaterialFormModalProps) {
  const rawMaterials = useCatalogStore((s) => s.rawMaterials)
  const categories = useCatalogStore((s) => s.categories)
  const families = useCatalogStore((s) => s.materialFamilies)
  const addRawMaterial = useCatalogStore((s) => s.addRawMaterial)
  const updateRawMaterial = useCatalogStore((s) => s.updateRawMaterial)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyForm, string>>>({})

  const categoryOptions = buildCategoryOptions(categories, 'raw_material')

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(
      material
        ? {
            sku: material.sku,
            familyId: material.familyId ?? '',
            nameTh: material.nameTh,
            nameEn: material.nameEn ?? '',
            customerName: material.customerName ?? '',
            categoryId: material.categoryId,
            unit: material.unit,
            grade: material.grade ?? '',
            size: material.size ?? '',
            color: material.color ?? '',
            barcode: material.barcode ?? '',
            reorderPoint: material.reorderPoint?.toString() ?? '',
            standardCost: material.standardCost?.toString() ?? '',
            isSellable: material.isSellable ? 'yes' : 'no',
            sellPrice: material.sellPrice?.toString() ?? '',
            description: material.description ?? '',
          }
        : emptyForm,
    )
  }, [open, material])

  // Picking a family pre-fills the shared fields (only where the SKU form is still empty)
  const handleFamilyChange = (familyId: string) => {
    const family = families.find((f) => f.id === familyId)
    setForm((f) =>
      family
        ? {
            ...f,
            familyId: family.id,
            nameTh: f.nameTh || family.nameTh,
            nameEn: f.nameEn || (family.nameEn ?? ''),
            categoryId: f.categoryId || family.categoryId,
            color: f.color || (family.color ?? ''),
          }
        : { ...f, familyId: '' },
    )
  }

  const familyOptions = [
    { value: '', label: 'ไม่อยู่ในตระกูล' },
    ...families.filter((f) => f.isActive || f.id === material?.familyId).map((f) => ({ value: f.id, label: `${f.nameTh} (${f.code})` })),
  ]

  const set = (key: keyof typeof emptyForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))
  const setValue = (key: keyof typeof emptyForm) => (value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleSave = () => {
    const sku = form.sku.trim()
    const nextErrors: typeof errors = {}
    if (!sku) nextErrors.sku = 'กรุณากรอกรหัสวัตถุดิบ'
    else if (rawMaterials.some((r) => r.id !== material?.id && r.sku.toLowerCase() === sku.toLowerCase())) nextErrors.sku = 'รหัสนี้ถูกใช้แล้ว'
    if (!form.nameTh.trim()) nextErrors.nameTh = 'กรุณากรอกชื่อวัตถุดิบ (ไทย)'
    if (!form.categoryId) nextErrors.categoryId = 'กรุณาเลือกหมวดหมู่'
    if (!form.unit.trim()) nextErrors.unit = 'กรุณากรอกหน่วยฐาน'
    const sellable = form.isSellable === 'yes'
    if (sellable && form.sellPrice.trim() === '') nextErrors.sellPrice = 'กรุณากรอกราคาขาย'
    for (const key of ['reorderPoint', 'standardCost', 'sellPrice'] as const) {
      const value = parseOptionalNumber(form[key])
      if (value !== undefined && (!Number.isFinite(value) || value < 0)) nextErrors[key] = 'ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const fields = {
      sku,
      familyId: form.familyId || undefined,
      nameTh: form.nameTh.trim(),
      nameEn: form.nameEn.trim() || undefined,
      customerName: form.customerName.trim() || undefined,
      categoryId: form.categoryId,
      unit: form.unit.trim(),
      grade: form.grade.trim() || undefined,
      size: form.size.trim() || undefined,
      color: form.color.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      reorderPoint: parseOptionalNumber(form.reorderPoint),
      standardCost: parseOptionalNumber(form.standardCost),
      isSellable: sellable,
      sellPrice: sellable ? parseOptionalNumber(form.sellPrice) : undefined,
      description: form.description.trim() || undefined,
    }
    if (material) {
      updateRawMaterial(material.id, fields)
      toast.success(`บันทึกวัตถุดิบ "${fields.nameTh}" แล้ว`)
    } else {
      addRawMaterial({ id: `rm-${Date.now()}`, ...fields, isActive: true, onHandQuantity: 0 })
      toast.success(`เพิ่มวัตถุดิบ "${fields.nameTh}" แล้ว`)
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={material ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบ'}
      description="เกรดหรือขนาดที่ต่างกันให้ลงทะเบียนเป็นวัตถุดิบคนละรายการ"
      icon={<IconBox />}
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
        <Select label="ตระกูล" value={form.familyId} onChange={handleFamilyChange} options={familyOptions} containerClassName="sm:col-span-2" />
        <TextField label="รหัสวัตถุดิบ (SKU)" required placeholder="RM-FL-005" value={form.sku} onChange={set('sku')} error={errors.sku} />
        <Select label="หมวดหมู่" required placeholder="เลือกหมวดหมู่" value={form.categoryId} onChange={setValue('categoryId')} options={categoryOptions} error={errors.categoryId} />
        <TextField label="ชื่อวัตถุดิบ (ไทย)" required placeholder="กุหลาบชมพู (ก้าน)" value={form.nameTh} onChange={set('nameTh')} error={errors.nameTh} />
        <TextField label="ชื่อวัตถุดิบ (อังกฤษ)" placeholder="Pink Rose" value={form.nameEn} onChange={set('nameEn')} />
        <TextField label="ชื่อที่ลูกค้าเรียก" placeholder="กุหลาบชมพูก้านยาว" value={form.customerName} onChange={set('customerName')} hint="ใช้ค้นหาและแสดงในเอกสารที่ส่งให้ลูกค้า" containerClassName="sm:col-span-2" />
        <TextField label="หน่วยฐาน" required placeholder="ก้าน" value={form.unit} onChange={set('unit')} error={errors.unit} hint="ใช้ใน BOM สต็อก และการวางแผนจัดซื้อ" />
        <TextField label="เกรด" placeholder="A" value={form.grade} onChange={set('grade')} />
        <TextField label="ขนาด" placeholder="ก้านยาว 60 ซม." value={form.size} onChange={set('size')} />
        <TextField label="สี" placeholder="Pink" value={form.color} onChange={set('color')} />
        <TextField label="บาร์โค้ด" value={form.barcode} onChange={set('barcode')} />
        <TextField label="จุดสั่งซื้อ (Reorder point)" inputMode="decimal" placeholder="100" value={form.reorderPoint} onChange={set('reorderPoint')} error={errors.reorderPoint} hint="สต็อกที่ต้องสั่งซื้อเพิ่ม (หน่วยฐาน)" />
        <TextField label="ต้นทุนอ้างอิงต่อหน่วยฐาน (บาท)" inputMode="decimal" placeholder="0" value={form.standardCost} onChange={set('standardCost')} error={errors.standardCost} hint="ราคาซื้อจริงอยู่ที่ซัพพลายเออร์" />
        <Select
          label="ขายตรงได้"
          value={form.isSellable}
          onChange={setValue('isSellable')}
          options={[
            { value: 'no', label: 'ไม่ขาย (ใช้เป็นวัตถุดิบเท่านั้น)' },
            { value: 'yes', label: 'ขายได้ (ตัดสต็อกตรง ไม่ผ่านใบสั่งผลิต)' },
          ]}
        />
        {form.isSellable === 'yes' && (
          <TextField label="ราคาขายต่อหน่วยฐาน (บาท)" required inputMode="decimal" placeholder="25" value={form.sellPrice} onChange={set('sellPrice')} error={errors.sellPrice} hint="ราคาตั้งต้น ราคาตามลูกค้าอยู่ที่ฝ่ายขาย" />
        )}
        <TextArea label="รายละเอียด" value={form.description} onChange={set('description')} containerClassName="sm:col-span-2" />
      </div>
    </Modal>
  )
}
