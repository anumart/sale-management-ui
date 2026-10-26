import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEdit, IconEye, IconPlus, IconPower, IconTrash } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, FilterSelect, FilterSheet, ListToolbar, MultiSelectList, StatusPill, useFilterSheet, type CriteriaChip, type DataTableColumn } from '@/components/ui'
import type { FinishedGood } from '@/features/procurement/types'
import { useListCriteria } from '@/hooks/useListCriteria'
import { countBy, matchesText, sumCounts } from '@/lib/criteria'
import { formatCurrency } from '@/lib/format'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { FinishedGoodFormModal } from './FinishedGoodFormModal'
import { useCatalogStore } from './store'
import { finishedGoodUsage, categoryPath } from './utils'

interface Criteria {
  query: string
  active: 'all' | 'active' | 'inactive'
  categoryIds: string[]
  recipe: string[]
}

const emptyCriteria: Criteria = { query: '', active: 'all', categoryIds: [], recipe: [] }
const recipeLabel: Record<string, string> = { has: 'มีสูตร', none: 'ยังไม่มีสูตร' }

export function FinishedGoodsCatalogPage() {
  const navigate = useNavigate()
  const finishedGoods = useCatalogStore((s) => s.finishedGoods)
  const categories = useCatalogStore((s) => s.categories)
  const bomVersions = useCatalogStore((s) => s.bomVersions)
  const updateFinishedGood = useCatalogStore((s) => s.updateFinishedGood)
  const deleteFinishedGood = useCatalogStore((s) => s.deleteFinishedGood)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FinishedGood | undefined>()

  const categoryName = (id: string) => categoryPath(categories, id)
  const activeBom = (fgId: string) => bomVersions.find((v) => v.finishedGoodId === fgId && v.status === 'active')

  const { criteria, update, clear, page, setPage } = useListCriteria(emptyCriteria)
  const sheet = useFilterSheet()

  const needle = criteria.query.trim().toLowerCase()
  /** `skip` leaves one criterion out so the filter UI can show how many results each of its values would give. */
  const matches = (f: FinishedGood, skip?: 'active' | 'category' | 'recipe') => {
    if (skip !== 'active' && criteria.active !== 'all' && f.isActive !== (criteria.active === 'active')) return false
    if (skip !== 'category' && criteria.categoryIds.length && !criteria.categoryIds.includes(f.categoryId)) return false
    if (skip !== 'recipe' && criteria.recipe.length && !criteria.recipe.includes(activeBom(f.id) ? 'has' : 'none')) return false
    return matchesText(needle, f.name, f.sku, categoryName(f.categoryId))
  }
  const rows = finishedGoods.filter((f) => matches(f))

  const activeCounts = countBy(finishedGoods.filter((f) => matches(f, 'active')), (f) => (f.isActive ? 'active' : 'inactive'))
  const categoryCounts = countBy(finishedGoods.filter((f) => matches(f, 'category')), (f) => f.categoryId)
  const recipeCounts = countBy(finishedGoods.filter((f) => matches(f, 'recipe')), (f) => (activeBom(f.id) ? 'has' : 'none'))
  const categoryIds = [...new Set(finishedGoods.map((f) => f.categoryId))]

  const chips: CriteriaChip[] = [
    ...criteria.categoryIds.map((id) => ({
      key: `c-${id}`,
      label: 'หมวดหมู่',
      value: categoryName(id),
      onRemove: () => update({ categoryIds: criteria.categoryIds.filter((x) => x !== id) }),
    })),
    ...criteria.recipe.map((v) => ({ key: `r-${v}`, label: 'สูตร', value: recipeLabel[v], onRemove: () => update({ recipe: criteria.recipe.filter((x) => x !== v) }) })),
  ]
  const hasAnyCriteria = chips.length > 0 || !!criteria.query || criteria.active !== 'all'

  const openForm = (product?: FinishedGood) => {
    setEditing(product)
    setFormOpen(true)
  }

  const handleToggle = async (fg: FinishedGood) => {
    const ok = await confirm({
      title: fg.isActive ? `ปิดใช้งาน ${fg.name}?` : `เปิดใช้งาน ${fg.name}?`,
      message: fg.isActive ? 'สินค้านี้จะไม่ถูกเลือกในใบสั่งผลิต แผนจัดซื้อ และรายงานขายใหม่ ข้อมูลเดิมยังอยู่' : 'สินค้านี้จะกลับมาเลือกได้',
      confirmLabel: fg.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน',
      tone: fg.isActive ? 'danger' : 'primary',
    })
    if (!ok) return
    updateFinishedGood(fg.id, { isActive: !fg.isActive })
    toast.success(`${fg.name} เปลี่ยนเป็น${fg.isActive ? 'ปิดใช้งาน' : 'ใช้งาน'}`)
  }

  const handleDelete = async (fg: FinishedGood) => {
    const reasons = finishedGoodUsage(fg.id)
    if (reasons.length > 0) {
      toast.error(`ลบ "${fg.name}" ไม่ได้ (${reasons.join(', ')}) — ปิดใช้งานแทนได้`)
      return
    }
    const ok = await confirm({ title: `ลบ ${fg.name}?`, message: 'สูตร (BOM) ทุกเวอร์ชันของสินค้านี้จะถูกลบด้วย ลบแล้วกู้คืนไม่ได้', confirmLabel: 'ลบ', tone: 'danger' })
    if (!ok) return
    deleteFinishedGood(fg.id)
    toast.success(`ลบ "${fg.name}" แล้ว`)
  }

  const columns: DataTableColumn<FinishedGood>[] = [
    {
      key: 'name',
      label: 'สินค้า',
      sortValue: (f) => f.name.toLowerCase(),
      render: (f) => (
        <div className="flex items-center gap-3">
          {f.imageUrl ? (
            <img src={f.imageUrl} alt="" className="size-10 shrink-0 rounded-[0.65rem] object-cover" />
          ) : (
            <span className="size-10 shrink-0 rounded-[0.65rem] bg-fill" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="font-medium">{f.name}</p>
            <p className="text-sm text-muted tabular-nums">{f.sku}</p>
          </div>
        </div>
      ),
    },
    { key: 'category', label: 'หมวดหมู่', sortValue: (f) => categoryName(f.categoryId), render: (f) => categoryName(f.categoryId) },
    { key: 'unit', label: 'หน่วยขาย', sortValue: (f) => f.unit, render: (f) => f.unit },
    { key: 'price', label: 'ราคามาตรฐาน', sortValue: (f) => f.standardPrice, render: (f) => <span className="whitespace-nowrap tabular-nums">{formatCurrency(f.standardPrice)}</span> },
    {
      key: 'bom',
      label: 'สูตร (BOM)',
      sortValue: (f) => activeBom(f.id)?.version ?? 0,
      render: (f) => {
        const active = activeBom(f.id)
        return active ? <span className="whitespace-nowrap">เวอร์ชัน {active.version}</span> : <StatusPill tone="warning">ยังไม่มีสูตร</StatusPill>
      },
    },
    {
      key: 'status',
      label: 'สถานะ',
      sortValue: (f) => (f.isActive ? 1 : 0),
      render: (f) => <StatusPill tone={f.isActive ? 'success' : 'neutral'}>{f.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}</StatusPill>,
    },
  ]

  return (
    <>
      <PageHeading section="ข้อมูลหลัก" title="สินค้าสำเร็จรูป" />
      <Card>
        <CardHeader
          title="สินค้าสำเร็จรูปทั้งหมด"
          subtitle="จัดการข้อมูลสินค้า ราคามาตรฐาน และสูตร (BOM) แบบมีเวอร์ชัน สต็อกและ LOT ดูที่เมนูผลิต"
          action={
            <Button iconOnly round aria-label="เพิ่มสินค้า" title="เพิ่มสินค้า" onClick={() => openForm()}>
              <IconPlus />
            </Button>
          }
        />
        <ListToolbar
          searchLabel="ค้นหาสินค้า"
          searchPlaceholder="ค้นหาชื่อสินค้า, รหัส, หมวดหมู่"
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
          sheetCount={criteria.categoryIds.length + criteria.recipe.length}
          onOpenSheet={sheet.openSheet}
          chips={chips}
          resultText={`พบ ${rows.length} จาก ${finishedGoods.length} รายการ`}
          hasCriteria={hasAnyCriteria}
          onClear={clear}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(f) => f.id}
          pageSize={10}
          page={page}
          onPageChange={setPage}
          paginationVariant="jump"
          emptyTitle="ไม่พบสินค้าสำเร็จรูป"
          emptyDescription={hasAnyCriteria ? 'ลองลดเงื่อนไขหรือกด "ล้างเงื่อนไข"' : 'เพิ่มสินค้าเพื่อเริ่มต้น'}
          renderActions={(f) => (
            <>
              <Button
                size="sm"
                variant="soft"
                iconOnly
                outlined
                aria-label="ดูรายละเอียดและสูตร"
                tooltip="ดูรายละเอียดและสูตร"
                onClick={() => navigate({ to: '/catalog/finished-goods/$finishedGoodId', params: { finishedGoodId: f.id } })}
              >
                <IconEye />
              </Button>
              <Button size="sm" variant="soft" iconOnly outlined aria-label="แก้ไข" tooltip="แก้ไข" onClick={() => openForm(f)}>
                <IconEdit />
              </Button>
              <Button
                size="sm"
                variant={f.isActive ? 'warning' : 'accent'}
                iconOnly
                outlined
                aria-label={f.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                tooltip={f.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                onClick={() => handleToggle(f)}
              >
                <IconPower />
              </Button>
              <Button size="sm" variant="danger" iconOnly outlined aria-label="ลบ" tooltip="ลบ" onClick={() => handleDelete(f)}>
                <IconTrash />
              </Button>
            </>
          )}
        />
      </Card>

      <FilterSheet
        open={sheet.open}
        onClose={sheet.closeSheet}
        title="ตัวกรองสินค้าสำเร็จรูป"
        resultCount={rows.length}
        onClear={() => update({ categoryIds: [], recipe: [] })}
      >
        <MultiSelectList
          label="หมวดหมู่"
          options={categoryIds.map((id) => ({ value: id, label: categoryName(id), count: categoryCounts.get(id) ?? 0 }))}
          value={criteria.categoryIds}
          onChange={(ids) => update({ categoryIds: ids })}
        />
        <MultiSelectList
          label="สูตร (BOM)"
          options={Object.keys(recipeLabel).map((v) => ({ value: v, label: recipeLabel[v], count: recipeCounts.get(v) ?? 0 }))}
          value={criteria.recipe}
          onChange={(recipe) => update({ recipe })}
        />
      </FilterSheet>
      <FinishedGoodFormModal open={formOpen} onClose={() => setFormOpen(false)} product={editing} />
    </>
  )
}
