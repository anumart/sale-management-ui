import { useEffect, useState } from 'react'
import { IconList, IconPlus, IconTrash } from '@/components/icons'
import { Button, Modal, Select, TextArea, TextField } from '@/components/ui'
import { toast } from '@/stores/toastStore'
import type { BomVersion } from '@/features/procurement/types'
import { useCatalogStore } from './store'

export interface BomEditorModalProps {
  open: boolean
  onClose: () => void
  finishedGoodId: string
  /** Edit this draft; omit to create a new draft version */
  draft?: BomVersion
  /** Pre-fill a new draft from this version's items (usually the active one) */
  copyFrom?: BomVersion
}

interface Row {
  rawMaterialId: string
  quantity: string
}

const emptyRow: Row = { rawMaterialId: '', quantity: '' }

export function BomEditorModal({ open, onClose, finishedGoodId, draft, copyFrom }: BomEditorModalProps) {
  const rawMaterials = useCatalogStore((s) => s.rawMaterials)
  const createBomVersion = useCatalogStore((s) => s.createBomVersion)
  const updateBomDraft = useCatalogStore((s) => s.updateBomDraft)
  const [rows, setRows] = useState<Row[]>([emptyRow])
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (!open) return
    setError(undefined)
    const source = draft ?? copyFrom
    setRows(source ? source.items.map((i) => ({ rawMaterialId: i.rawMaterialId, quantity: String(i.quantityPerUnit) })) : [emptyRow])
    setNote(draft?.note ?? '')
  }, [open, draft, copyFrom])

  // Offer active materials, plus any already in this recipe so it stays editable
  const usedIds = new Set(rows.map((r) => r.rawMaterialId))
  const options = rawMaterials.filter((r) => r.isActive || usedIds.has(r.id)).map((r) => ({ value: r.id, label: `${r.nameTh} (${r.unit})` }))

  const setRow = (index: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)))

  const handleSave = () => {
    const filled = rows.filter((r) => r.rawMaterialId || r.quantity.trim())
    if (filled.length === 0) return setError('เพิ่มวัตถุดิบอย่างน้อย 1 รายการ')
    if (filled.some((r) => !r.rawMaterialId)) return setError('เลือกวัตถุดิบให้ครบทุกแถว')
    const qtys = filled.map((r) => Number(r.quantity))
    if (qtys.some((q) => !Number.isFinite(q) || q <= 0)) return setError('ปริมาณต่อ 1 หน่วยต้องมากกว่า 0')
    if (new Set(filled.map((r) => r.rawMaterialId)).size !== filled.length) return setError('มีวัตถุดิบซ้ำในสูตร')

    const items = filled.map((r, i) => ({ rawMaterialId: r.rawMaterialId, quantityPerUnit: qtys[i] }))
    if (draft) {
      updateBomDraft(draft.id, items, note.trim() || undefined)
      toast.success(`บันทึกร่างสูตรเวอร์ชัน ${draft.version} แล้ว`)
    } else {
      const created = createBomVersion(finishedGoodId, items, note.trim() || undefined)
      toast.success(`สร้างร่างสูตรเวอร์ชัน ${created.version} แล้ว กด "ใช้เวอร์ชันนี้" เมื่อพร้อม`)
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={draft ? `แก้ไขร่างสูตร เวอร์ชัน ${draft.version}` : 'สร้างสูตร (BOM) เวอร์ชันใหม่'}
      description="ปริมาณวัตถุดิบต่อสินค้า 1 หน่วย ในหน่วยฐานของวัตถุดิบ เวอร์ชันใหม่จะเริ่มเป็นร่างจนกว่าจะกดใช้งาน"
      icon={<IconList />}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave}>บันทึกร่าง</Button>
        </>
      }
    >
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[1fr_8rem_auto] items-end gap-3">
            <Select
              label={index === 0 ? 'วัตถุดิบ' : undefined}
              aria-label="วัตถุดิบ"
              placeholder="เลือกวัตถุดิบ"
              value={row.rawMaterialId}
              onChange={(e) => setRow(index, { rawMaterialId: e.target.value })}
              options={options}
            />
            <TextField
              label={index === 0 ? 'ปริมาณ / 1 หน่วย' : undefined}
              aria-label="ปริมาณต่อ 1 หน่วย"
              inputMode="decimal"
              placeholder="12"
              value={row.quantity}
              onChange={(e) => setRow(index, { quantity: e.target.value })}
            />
            <Button
              size="sm"
              variant="danger"
              iconOnly
              outlined
              aria-label="ลบแถว"
              tooltip="ลบแถว"
              onClick={() => setRows((rs) => (rs.length === 1 ? [emptyRow] : rs.filter((_, i) => i !== index)))}
            >
              <IconTrash />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, emptyRow])}>
          <IconPlus />
          เพิ่มวัตถุดิบ
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
        <TextArea label="หมายเหตุเวอร์ชัน" placeholder="เช่น เพิ่มกุหลาบ 1 ก้านให้ช่อดูเต็มขึ้น" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  )
}
