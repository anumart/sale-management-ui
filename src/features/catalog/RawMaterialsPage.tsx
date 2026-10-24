import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEdit, IconPlus, IconPower, IconTrash } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, StatusPill, type DataTableColumn } from '@/components/ui'
import type { RawMaterial } from '@/features/procurement/types'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { RawMaterialFormModal } from './RawMaterialFormModal'
import { useCatalogStore } from './store'
import { rawMaterialUsage, categoryPath } from './utils'

export function RawMaterialsPage() {
  const rawMaterials = useCatalogStore((s) => s.rawMaterials)
  const categories = useCatalogStore((s) => s.categories)
  const families = useCatalogStore((s) => s.materialFamilies)
  const updateRawMaterial = useCatalogStore((s) => s.updateRawMaterial)
  const deleteRawMaterial = useCatalogStore((s) => s.deleteRawMaterial)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RawMaterial | undefined>()

  const categoryName = (id: string) => categoryPath(categories, id)

  const familyName = (id?: string) => families.find((f) => f.id === id)?.nameTh ?? '—'

  const openForm = (material?: RawMaterial) => {
    setEditing(material)
    setFormOpen(true)
  }

  const handleToggle = async (rm: RawMaterial) => {
    const ok = await confirm({
      title: rm.isActive ? `ปิดใช้งาน ${rm.nameTh}?` : `เปิดใช้งาน ${rm.nameTh}?`,
      message: rm.isActive ? 'วัตถุดิบนี้จะไม่ถูกเลือกในสูตรสินค้าใหม่ ข้อมูลเดิมยังอยู่' : 'วัตถุดิบนี้จะกลับมาเลือกในสูตรสินค้าได้',
      confirmLabel: rm.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน',
      tone: rm.isActive ? 'danger' : 'primary',
    })
    if (!ok) return
    updateRawMaterial(rm.id, { isActive: !rm.isActive })
    toast.success(`${rm.nameTh} เปลี่ยนเป็น${rm.isActive ? 'ปิดใช้งาน' : 'ใช้งาน'}`)
  }

  const handleDelete = async (rm: RawMaterial) => {
    const reasons = rawMaterialUsage(rm.id)
    if (reasons.length > 0) {
      toast.error(`ลบ "${rm.nameTh}" ไม่ได้ (${reasons.join(', ')}) — ปิดใช้งานแทนได้`)
      return
    }
    const ok = await confirm({ title: `ลบ ${rm.nameTh}?`, message: 'ลบแล้วกู้คืนไม่ได้', confirmLabel: 'ลบ', tone: 'danger' })
    if (!ok) return
    deleteRawMaterial(rm.id)
    toast.success(`ลบ "${rm.nameTh}" แล้ว`)
  }

  const columns: DataTableColumn<RawMaterial>[] = [
    { key: 'sku', label: 'รหัส', sortValue: (r) => r.sku, render: (r) => <span className="whitespace-nowrap tabular-nums">{r.sku}</span> },
    {
      key: 'name',
      label: 'วัตถุดิบ',
      sortValue: (r) => r.nameTh.toLowerCase(),
      render: (r) => (
        <>
          <p className="font-medium">{r.nameTh}</p>
          {r.nameEn && <p className="text-sm text-muted">{r.nameEn}</p>}
          {(r.grade || r.size || r.color) && <p className="text-sm text-muted">{[r.grade && `เกรด ${r.grade}`, r.size, r.color].filter(Boolean).join(' · ')}</p>}
        </>
      ),
    },
    { key: 'category', label: 'หมวดหมู่', sortValue: (r) => categoryName(r.categoryId), render: (r) => categoryName(r.categoryId) },
    { key: 'family', label: 'ตระกูล', sortValue: (r) => familyName(r.familyId), render: (r) => familyName(r.familyId) },
    { key: 'unit', label: 'หน่วยฐาน', sortValue: (r) => r.unit, render: (r) => r.unit },
    {
      key: 'sellable',
      label: 'ขายตรง',
      sortValue: (r) => (r.isSellable ? 1 : 0),
      render: (r) => (r.isSellable ? <StatusPill tone="info">{r.sellPrice !== undefined ? `฿${r.sellPrice.toLocaleString()}` : 'ขายได้'}</StatusPill> : <span className="text-muted">—</span>),
    },
    { key: 'onHand', label: 'คงเหลือ', sortValue: (r) => r.onHandQuantity, render: (r) => <span className="tabular-nums">{r.onHandQuantity.toLocaleString()}</span> },
    {
      key: 'status',
      label: 'สถานะ',
      sortValue: (r) => (r.isActive ? 1 : 0),
      render: (r) => <StatusPill tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}</StatusPill>,
    },
  ]

  return (
    <>
      <PageHeading section="ข้อมูลหลัก" title="วัตถุดิบ" />
      <Card>
        <CardHeader
          title="วัตถุดิบทั้งหมด"
          subtitle="ระดับ SKU — เกรดหรือขนาดที่ต่างกันเป็นคนละรายการ ราคาและหน่วยที่ซื้ออยู่ที่ซัพพลายเออร์"
          action={
            <Button iconOnly round aria-label="เพิ่มวัตถุดิบ" title="เพิ่มวัตถุดิบ" onClick={() => openForm()}>
              <IconPlus />
            </Button>
          }
        />
        <DataTable
          columns={columns}
          rows={rawMaterials}
          rowKey={(r) => r.id}
          pageSize={10}
          emptyTitle="ยังไม่มีวัตถุดิบ"
          emptyDescription="เพิ่มวัตถุดิบเพื่อเริ่มต้น"
          renderActions={(r) => (
            <>
              <Button size="sm" variant="soft" iconOnly outlined aria-label="แก้ไข" tooltip="แก้ไข" onClick={() => openForm(r)}>
                <IconEdit />
              </Button>
              <Button
                size="sm"
                variant={r.isActive ? 'warning' : 'accent'}
                iconOnly
                outlined
                aria-label={r.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                tooltip={r.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                onClick={() => handleToggle(r)}
              >
                <IconPower />
              </Button>
              <Button size="sm" variant="danger" iconOnly outlined aria-label="ลบ" tooltip="ลบ" onClick={() => handleDelete(r)}>
                <IconTrash />
              </Button>
            </>
          )}
        />
      </Card>
      <RawMaterialFormModal open={formOpen} onClose={() => setFormOpen(false)} material={editing} />
    </>
  )
}
