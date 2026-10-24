import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconCheck, IconEdit, IconPlus, IconTrash } from '@/components/icons'
import { Button, Card, CardHeader, StatusPill } from '@/components/ui'
import type { BomVersion } from '@/features/procurement/types'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { BomEditorModal } from './BomEditorModal'
import { FinishedGoodFormModal } from './FinishedGoodFormModal'
import { useCatalogStore } from './store'
import { bomStatusLabel, bomStatusTone, categoryPath } from './utils'

export interface FinishedGoodDetailPageProps {
  finishedGoodId: string
}

export function FinishedGoodDetailPage({ finishedGoodId }: FinishedGoodDetailPageProps) {
  const product = useCatalogStore((s) => s.finishedGoods.find((f) => f.id === finishedGoodId))
  const categories = useCatalogStore((s) => s.categories)
  const rawMaterials = useCatalogStore((s) => s.rawMaterials)
  const allVersions = useCatalogStore((s) => s.bomVersions)
  const activateBomVersion = useCatalogStore((s) => s.activateBomVersion)
  const deleteBomDraft = useCatalogStore((s) => s.deleteBomDraft)
  const [formOpen, setFormOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingDraft, setEditingDraft] = useState<BomVersion | undefined>()
  const [copySource, setCopySource] = useState<BomVersion | undefined>()

  const versions = allVersions.filter((v) => v.finishedGoodId === finishedGoodId).sort((a, b) => b.version - a.version)
  const active = versions.find((v) => v.status === 'active')

  if (!product) {
    return (
      <>
        <PageHeading section="ข้อมูลหลัก" parent={{ label: 'สินค้าสำเร็จรูป', to: '/catalog/finished-goods' }} title="สินค้าสำเร็จรูป" />
        <Card>
          <p className="text-muted">ไม่พบสินค้า</p>
        </Card>
      </>
    )
  }

  const rm = (id: string) => rawMaterials.find((r) => r.id === id)
  const openEditor = (draft?: BomVersion, copyFrom?: BomVersion) => {
    setEditingDraft(draft)
    setCopySource(copyFrom)
    setEditorOpen(true)
  }

  const handleActivate = async (v: BomVersion) => {
    const ok = await confirm({
      title: `ใช้สูตรเวอร์ชัน ${v.version}?`,
      message: active
        ? `เวอร์ชัน ${active.version} จะถูกเก็บถาวร ใบสั่งผลิตและแผนจัดซื้อใหม่จะคำนวณจากเวอร์ชันนี้ ใบสั่งผลิตเดิมไม่เปลี่ยน`
        : 'ใบสั่งผลิตและแผนจัดซื้อใหม่จะคำนวณจากสูตรนี้',
      confirmLabel: 'ใช้เวอร์ชันนี้',
      tone: 'primary',
    })
    if (!ok) return
    activateBomVersion(v.id)
    toast.success(`${product.name} ใช้สูตรเวอร์ชัน ${v.version} แล้ว`)
  }

  const handleDeleteDraft = async (v: BomVersion) => {
    const ok = await confirm({ title: `ลบร่างสูตรเวอร์ชัน ${v.version}?`, message: 'ลบแล้วกู้คืนไม่ได้', confirmLabel: 'ลบ', tone: 'danger' })
    if (!ok) return
    deleteBomDraft(v.id)
    toast.success('ลบร่างสูตรแล้ว')
  }

  return (
    <>
      <PageHeading
        section="ข้อมูลหลัก"
        parent={{ label: 'สินค้าสำเร็จรูป', to: '/catalog/finished-goods' }}
        title={product.name}
        subtitle={`${product.sku} · ${categoryPath(categories, product.categoryId)}`}
      />

      <Card className="mb-6">
        <CardHeader
          title="ข้อมูลสินค้า"
          action={
            <Button variant="outline" onClick={() => setFormOpen(true)}>
              <IconEdit />
              แก้ไข
            </Button>
          }
        />
        <div className="flex flex-wrap items-start gap-6">
          {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="size-28 rounded-card object-cover" />}
          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">หน่วยขาย</dt>
              <dd className="font-medium">{product.unit}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">ราคามาตรฐาน</dt>
              <dd className="font-medium tabular-nums">{formatCurrency(product.standardPrice)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">สถานะ</dt>
              <dd>
                <StatusPill tone={product.isActive ? 'success' : 'neutral'}>{product.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}</StatusPill>
              </dd>
            </div>
            {product.description && (
              <div className="col-span-full">
                <dt className="text-xs text-muted">คำอธิบาย</dt>
                <dd className="text-ink-2">{product.description}</dd>
              </div>
            )}
          </dl>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="สูตร (BOM)"
          subtitle="มีเวอร์ชันที่ใช้งานได้ 1 เวอร์ชันต่อสินค้า เวอร์ชันเก่าเก็บไว้ดูย้อนหลัง"
          action={
            <Button onClick={() => openEditor(undefined, active)}>
              <IconPlus />
              สร้างเวอร์ชันใหม่
            </Button>
          }
        />
        {versions.length === 0 ? (
          <p className="py-4 text-muted">ยังไม่มีสูตร — สินค้านี้ยังผลิตและวางแผนจัดซื้อไม่ได้จนกว่าจะมีสูตรที่ใช้งาน</p>
        ) : (
          <ul className="space-y-4">
            {versions.map((v) => (
              <li key={v.id} className="rounded-[0.875rem] border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold">เวอร์ชัน {v.version}</p>
                    <StatusPill tone={bomStatusTone[v.status]}>{bomStatusLabel[v.status]}</StatusPill>
                    <span className="text-sm text-muted">{v.status === 'draft' ? `สร้าง ${formatDateTime(v.createdAt)}` : `เริ่มใช้ ${formatDateTime(v.effectiveFrom)}`}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {v.status === 'draft' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openEditor(v)}>
                          <IconEdit />
                          แก้ไข
                        </Button>
                        <Button size="sm" onClick={() => handleActivate(v)}>
                          <IconCheck />
                          ใช้เวอร์ชันนี้
                        </Button>
                        <Button size="sm" variant="danger" iconOnly outlined aria-label="ลบร่าง" tooltip="ลบร่าง" onClick={() => handleDeleteDraft(v)}>
                          <IconTrash />
                        </Button>
                      </>
                    )}
                    {v.status === 'archived' && (
                      <Button size="sm" variant="outline" onClick={() => openEditor(undefined, v)}>
                        สร้างเวอร์ชันใหม่จากเวอร์ชันนี้
                      </Button>
                    )}
                  </div>
                </div>
                {v.note && <p className="mt-2 text-sm text-muted">{v.note}</p>}
                <table className="mt-3 w-full text-left text-sm">
                  <thead className="text-muted">
                    <tr>
                      <th className="py-1 font-normal">วัตถุดิบ</th>
                      <th className="py-1 text-right font-normal">ปริมาณ / 1 {product.unit}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.items.map((item) => (
                      <tr key={item.rawMaterialId} className="border-t border-line">
                        <td className="py-1.5">{rm(item.rawMaterialId)?.nameTh ?? item.rawMaterialId}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {item.quantityPerUnit} {rm(item.rawMaterialId)?.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <FinishedGoodFormModal open={formOpen} onClose={() => setFormOpen(false)} product={product} />
      <BomEditorModal open={editorOpen} onClose={() => setEditorOpen(false)} finishedGoodId={product.id} draft={editingDraft} copyFrom={copySource} />
    </>
  )
}
