import { useEffect, useState, type ChangeEvent } from 'react'
import { IconBox } from '@/components/icons'
import { Button, Modal, Select, TextArea, TextField } from '@/components/ui'
import { toast } from '@/stores/toastStore'
import type { FinishedGood } from '@/features/procurement/types'
import { useCatalogStore } from './store'
import { categoryOptions as buildCategoryOptions } from './utils'

export interface FinishedGoodFormModalProps {
  open: boolean
  onClose: () => void
  /** Editing this product; omit to create a new one */
  product?: FinishedGood
}

const emptyForm = { sku: '', name: '', categoryId: '', unit: '', standardPrice: '', imageUrl: '', description: '' }

export function FinishedGoodFormModal({ open, onClose, product }: FinishedGoodFormModalProps) {
  const finishedGoods = useCatalogStore((s) => s.finishedGoods)
  const categories = useCatalogStore((s) => s.categories)
  const addFinishedGood = useCatalogStore((s) => s.addFinishedGood)
  const updateFinishedGood = useCatalogStore((s) => s.updateFinishedGood)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyForm, string>>>({})

  const categoryOptions = buildCategoryOptions(categories, 'finished_good')

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(
      product
        ? {
            sku: product.sku,
            name: product.name,
            categoryId: product.categoryId,
            unit: product.unit,
            standardPrice: String(product.standardPrice),
            imageUrl: product.imageUrl ?? '',
            description: product.description ?? '',
          }
        : emptyForm,
    )
  }, [open, product])

  const set = (key: keyof typeof emptyForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))
  const setValue = (key: keyof typeof emptyForm) => (value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleSave = () => {
    const sku = form.sku.trim()
    const price = Number(form.standardPrice)
    const nextErrors: typeof errors = {}
    if (!sku) nextErrors.sku = 'กรุณากรอกรหัสสินค้า'
    else if (finishedGoods.some((f) => f.id !== product?.id && f.sku.toLowerCase() === sku.toLowerCase())) nextErrors.sku = 'รหัสนี้ถูกใช้แล้ว'
    if (!form.name.trim()) nextErrors.name = 'กรุณากรอกชื่อสินค้า'
    if (!form.categoryId) nextErrors.categoryId = 'กรุณาเลือกหมวดหมู่'
    if (!form.unit.trim()) nextErrors.unit = 'กรุณากรอกหน่วยขาย'
    if (!form.standardPrice.trim() || !Number.isFinite(price) || price < 0) nextErrors.standardPrice = 'กรุณากรอกราคาเป็นตัวเลข ตั้งแต่ 0 ขึ้นไป'
    if (form.imageUrl.trim() && !/^(https?:\/\/|\/)/i.test(form.imageUrl.trim())) nextErrors.imageUrl = 'ลิงก์รูปต้องขึ้นต้นด้วย http(s):// หรือ /'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const fields = {
      sku,
      name: form.name.trim(),
      categoryId: form.categoryId,
      unit: form.unit.trim(),
      standardPrice: price,
      imageUrl: form.imageUrl.trim() || undefined,
      description: form.description.trim() || undefined,
    }
    if (product) {
      updateFinishedGood(product.id, fields)
      toast.success(`บันทึกสินค้า "${fields.name}" แล้ว`)
    } else {
      addFinishedGood({ id: `fg-${Date.now()}`, ...fields, isActive: true })
      toast.success(`เพิ่มสินค้า "${fields.name}" แล้ว เพิ่มสูตร (BOM) ในหน้ารายละเอียดเพื่อให้ผลิตได้`)
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'แก้ไขสินค้าสำเร็จรูป' : 'เพิ่มสินค้าสำเร็จรูป'}
      description="ราคาตามลูกค้าและร้านฝากขายตั้งในส่วนงานขาย ที่นี่เป็นราคามาตรฐาน"
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
        <TextField label="รหัสสินค้า (SKU)" required placeholder="FG-BQ-004" value={form.sku} onChange={set('sku')} error={errors.sku} />
        <Select label="หมวดหมู่" required placeholder="เลือกหมวดหมู่" value={form.categoryId} onChange={setValue('categoryId')} options={categoryOptions} error={errors.categoryId} />
        <TextField label="ชื่อสินค้า" required placeholder="ช่อกุหลาบชมพู" value={form.name} onChange={set('name')} error={errors.name} containerClassName="sm:col-span-2" />
        <TextField label="หน่วยขาย" required placeholder="ช่อ" value={form.unit} onChange={set('unit')} error={errors.unit} />
        <TextField
          label="ราคามาตรฐาน (฿)"
          required
          inputMode="decimal"
          placeholder="450"
          value={form.standardPrice}
          onChange={set('standardPrice')}
          error={errors.standardPrice}
        />
        <TextField label="ลิงก์รูปสินค้า" placeholder="https://..." value={form.imageUrl} onChange={set('imageUrl')} error={errors.imageUrl} containerClassName="sm:col-span-2" />
        <TextArea label="คำอธิบาย" value={form.description} onChange={set('description')} containerClassName="sm:col-span-2" />
      </div>
    </Modal>
  )
}
