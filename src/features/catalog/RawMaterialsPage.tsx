import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEdit, IconPlus, IconPower, IconTrash } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, FilterSelect, FilterSheet, ListToolbar, MultiSelectList, StatusPill, useFilterSheet, type CriteriaChip, type DataTableColumn } from '@/components/ui'
import type { RawMaterial } from '@/features/procurement/types'
import { useListCriteria } from '@/hooks/useListCriteria'
import { countBy, matchesText, sumCounts } from '@/lib/criteria'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { RawMaterialFormModal } from './RawMaterialFormModal'
import { useCatalogStore } from './store'
import { rawMaterialUsage, categoryPath } from './utils'

interface Criteria {
  query: string
  active: 'all' | 'active' | 'inactive'
  categoryIds: string[]
  familyIds: string[]
  sellable: string[]
  stock: string[]
}

const emptyCriteria: Criteria = { query: '', active: 'all', categoryIds: [], familyIds: [], sellable: [], stock: [] }
const sellableLabel: Record<string, string> = { yes: 'ขายตรงได้', no: 'ไม่ขายตรง' }
const stockLabel: Record<string, string> = { low: 'ต่ำกว่าจุดสั่งซื้อ', ok: 'ปกติ' }
const NO_FAMILY = '__none'

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

  const { criteria, update, clear, page, setPage } = useListCriteria(emptyCriteria)
  const sheet = useFilterSheet()

  const stockState = (r: RawMaterial) => (r.reorderPoint !== undefined && r.onHandQuantity <= r.reorderPoint ? 'low' : 'ok')

  const needle = criteria.query.trim().toLowerCase()
  /** `skip` leaves one criterion out so the filter UI can show how many results each of its values would give. */
  const matches = (r: RawMaterial, skip?: 'active' | 'category' | 'family' | 'sellable' | 'stock') => {
    if (skip !== 'active' && criteria.active !== 'all' && r.isActive !== (criteria.active === 'active')) return false
    if (skip !== 'category' && criteria.categoryIds.length && !criteria.categoryIds.includes(r.categoryId)) return false
    if (skip !== 'family' && criteria.familyIds.length && !criteria.familyIds.includes(r.familyId ?? NO_FAMILY)) return false
    if (skip !== 'sellable' && criteria.sellable.length && !criteria.sellable.includes(r.isSellable ? 'yes' : 'no')) return false
    if (skip !== 'stock' && criteria.stock.length && !criteria.stock.includes(stockState(r))) return false
    return matchesText(needle, r.sku, r.nameTh, r.nameEn, r.customerName, r.grade, r.size, r.color, r.barcode, categoryName(r.categoryId))
  }
  const rows = rawMaterials.filter((r) => matches(r))

  const activeCounts = countBy(rawMaterials.filter((r) => matches(r, 'active')), (r) => (r.isActive ? 'active' : 'inactive'))
  const categoryCounts = countBy(rawMaterials.filter((r) => matches(r, 'category')), (r) => r.categoryId)
  const familyCounts = countBy(rawMaterials.filter((r) => matches(r, 'family')), (r) => r.familyId ?? NO_FAMILY)
  const sellableCounts = countBy(rawMaterials.filter((r) => matches(r, 'sellable')), (r) => (r.isSellable ? 'yes' : 'no'))
  const stockCounts = countBy(rawMaterials.filter((r) => matches(r, 'stock')), stockState)
  const categoryIds = [...new Set(rawMaterials.map((r) => r.categoryId))]
  const familyName2 = (id: string) => (id === NO_FAMILY ? 'ไม่มีตระกูล' : familyName(id))

  const chips: CriteriaChip[] = [
    ...criteria.categoryIds.map((id) => ({
      key: `c-${id}`,
      label: 'หมวดหมู่',
      value: categoryName(id),
      onRemove: () => update({ categoryIds: criteria.categoryIds.filter((x) => x !== id) }),
    })),
    ...criteria.familyIds.map((id) => ({
      key: `f-${id}`,
      label: 'ตระกูล',
      value: familyName2(id),
      onRemove: () => update({ familyIds: criteria.familyIds.filter((x) => x !== id) }),
    })),
    ...criteria.sellable.map((v) => ({ key: `s-${v}`, label: 'ขายตรง', value: sellableLabel[v], onRemove: () => update({ sellable: criteria.sellable.filter((x) => x !== v) }) })),
    ...criteria.stock.map((v) => ({ key: `k-${v}`, label: 'สต็อก', value: stockLabel[v], onRemove: () => update({ stock: criteria.stock.filter((x) => x !== v) }) })),
  ]
  const hasAnyCriteria = chips.length > 0 || !!criteria.query || criteria.active !== 'all'

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
        <ListToolbar
          searchLabel="ค้นหาวัตถุดิบ"
          searchPlaceholder="ค้นหารหัส, ชื่อ, เกรด, ขนาด, สี, บาร์โค้ด"
          query={criteria.query}
          onQueryChange={(query) => update({ query })}
          filters={
            <FilterSelect
              label="สถานะ"
              value={criteria.active}
              neutralValue="all"
              onChange={(active) => update({ active })}
              options={[
                { value: 'all', label: 'ทั้งหมด', count: sumCounts(activeCounts) },
                { value: 'active', label: 'ใช้งาน', tone: 'success', count: activeCounts.get('active') ?? 0 },
                { value: 'inactive', label: 'ปิดใช้งาน', tone: 'neutral', count: activeCounts.get('inactive') ?? 0 },
              ]}
              className="w-full sm:w-64"
            />
          }
          sheetCount={criteria.categoryIds.length + criteria.familyIds.length + criteria.sellable.length + criteria.stock.length}
          onOpenSheet={sheet.openSheet}
          chips={chips}
          resultText={`พบ ${rows.length} จาก ${rawMaterials.length} รายการ`}
          hasCriteria={hasAnyCriteria}
          onClear={clear}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          pageSize={10}
          page={page}
          onPageChange={setPage}
          paginationVariant="jump"
          emptyTitle="ไม่พบวัตถุดิบ"
          emptyDescription={hasAnyCriteria ? 'ลองลดเงื่อนไขหรือกด "ล้างเงื่อนไข"' : 'เพิ่มวัตถุดิบเพื่อเริ่มต้น'}
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

      <FilterSheet
        open={sheet.open}
        onClose={sheet.closeSheet}
        title="ตัวกรองวัตถุดิบ"
        resultCount={rows.length}
        onClear={() => update({ categoryIds: [], familyIds: [], sellable: [], stock: [] })}
      >
        <MultiSelectList
          label="สต็อก"
          options={Object.keys(stockLabel).map((v) => ({ value: v, label: stockLabel[v], count: stockCounts.get(v) ?? 0 }))}
          value={criteria.stock}
          onChange={(stock) => update({ stock })}
        />
        <MultiSelectList
          label="หมวดหมู่"
          options={categoryIds.map((id) => ({ value: id, label: categoryName(id), count: categoryCounts.get(id) ?? 0 }))}
          value={criteria.categoryIds}
          onChange={(ids) => update({ categoryIds: ids })}
        />
        <MultiSelectList
          label="ตระกูล"
          options={[...families.map((f) => f.id), NO_FAMILY].map((id) => ({ value: id, label: familyName2(id), count: familyCounts.get(id) ?? 0 }))}
          value={criteria.familyIds}
          onChange={(familyIds) => update({ familyIds })}
        />
        <MultiSelectList
          label="ขายตรง"
          options={Object.keys(sellableLabel).map((v) => ({ value: v, label: sellableLabel[v], count: sellableCounts.get(v) ?? 0 }))}
          value={criteria.sellable}
          onChange={(sellable) => update({ sellable })}
        />
      </FilterSheet>
      <RawMaterialFormModal open={formOpen} onClose={() => setFormOpen(false)} material={editing} />
    </>
  )
}
