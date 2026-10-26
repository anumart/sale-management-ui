import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEdit, IconPlus, IconPower, IconTrash } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, FilterSelect, FilterSheet, ListToolbar, MultiSelectList, StatusPill, useFilterSheet, type CriteriaChip, type DataTableColumn } from '@/components/ui'
import type { MaterialFamily } from '@/features/procurement/types'
import { useListCriteria } from '@/hooks/useListCriteria'
import { countBy, matchesText, sumCounts } from '@/lib/criteria'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { FamilyFormModal } from './FamilyFormModal'
import { useCatalogStore } from './store'
import { familyMembers, sumStock, categoryPath } from './utils'

interface Criteria {
  query: string
  active: 'all' | 'active' | 'inactive'
  categoryIds: string[]
}

const emptyCriteria: Criteria = { query: '', active: 'all', categoryIds: [] }

export function FamiliesPage() {
  const families = useCatalogStore((s) => s.materialFamilies)
  const categories = useCatalogStore((s) => s.categories)
  const rawMaterials = useCatalogStore((s) => s.rawMaterials)
  const updateFamily = useCatalogStore((s) => s.updateFamily)
  const deleteFamily = useCatalogStore((s) => s.deleteFamily)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MaterialFamily | undefined>()

  const categoryName = (id: string) => categoryPath(categories, id)
  const membersOf = (id: string) => rawMaterials.filter((r) => r.familyId === id)

  const { criteria, update, clear, page, setPage } = useListCriteria(emptyCriteria)
  const sheet = useFilterSheet()

  const needle = criteria.query.trim().toLowerCase()
  /** `skip` leaves one criterion out so the filter UI can show how many results each of its values would give. */
  const matches = (f: MaterialFamily, skip?: 'active' | 'category') => {
    if (skip !== 'active' && criteria.active !== 'all' && f.isActive !== (criteria.active === 'active')) return false
    if (skip !== 'category' && criteria.categoryIds.length && !criteria.categoryIds.includes(f.categoryId)) return false
    return matchesText(needle, f.code, f.nameTh, f.nameEn, f.color, categoryName(f.categoryId))
  }
  const rows = families.filter((f) => matches(f))

  const activeCounts = countBy(families.filter((f) => matches(f, 'active')), (f) => (f.isActive ? 'active' : 'inactive'))
  const categoryCounts = countBy(families.filter((f) => matches(f, 'category')), (f) => f.categoryId)
  const categoryIds = [...new Set(families.map((f) => f.categoryId))]

  const chips: CriteriaChip[] = criteria.categoryIds.map((id) => ({
    key: `c-${id}`,
    label: 'หมวดหมู่',
    value: categoryName(id),
    onRemove: () => update({ categoryIds: criteria.categoryIds.filter((x) => x !== id) }),
  }))
  const hasAnyCriteria = chips.length > 0 || !!criteria.query || criteria.active !== 'all'

  const openForm = (family?: MaterialFamily) => {
    setEditing(family)
    setFormOpen(true)
  }

  const handleToggle = async (f: MaterialFamily) => {
    const ok = await confirm({
      title: f.isActive ? `ปิดใช้งาน ${f.nameTh}?` : `เปิดใช้งาน ${f.nameTh}?`,
      message: f.isActive ? 'ตระกูลนี้จะไม่ถูกเลือกในฟอร์มวัตถุดิบใหม่ SKU ที่อยู่ในตระกูลไม่เปลี่ยน' : 'ตระกูลนี้จะกลับมาเลือกได้',
      confirmLabel: f.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน',
      tone: f.isActive ? 'danger' : 'primary',
    })
    if (!ok) return
    updateFamily(f.id, { isActive: !f.isActive })
    toast.success(`${f.nameTh} เปลี่ยนเป็น${f.isActive ? 'ปิดใช้งาน' : 'ใช้งาน'}`)
  }

  const handleDelete = async (f: MaterialFamily) => {
    const count = familyMembers(f.id).length
    if (count > 0) {
      toast.error(`ลบ "${f.nameTh}" ไม่ได้ (มี ${count} SKU อยู่ในตระกูล) — ย้าย SKU ออกก่อน หรือปิดใช้งานแทน`)
      return
    }
    const ok = await confirm({ title: `ลบ ${f.nameTh}?`, message: 'ลบแล้วกู้คืนไม่ได้', confirmLabel: 'ลบ', tone: 'danger' })
    if (!ok) return
    deleteFamily(f.id)
    toast.success(`ลบ "${f.nameTh}" แล้ว`)
  }

  const columns: DataTableColumn<MaterialFamily>[] = [
    { key: 'code', label: 'รหัส', sortValue: (f) => f.code, render: (f) => <span className="whitespace-nowrap tabular-nums">{f.code}</span> },
    {
      key: 'name',
      label: 'ตระกูล',
      sortValue: (f) => f.nameTh.toLowerCase(),
      render: (f) => (
        <>
          <p className="font-medium">{f.nameTh}</p>
          {(f.nameEn || f.color) && <p className="text-sm text-muted">{[f.nameEn, f.color].filter(Boolean).join(' · ')}</p>}
        </>
      ),
    },
    { key: 'category', label: 'หมวดหมู่', sortValue: (f) => categoryName(f.categoryId), render: (f) => categoryName(f.categoryId) },
    {
      key: 'skus',
      label: 'จำนวน SKU',
      sortValue: (f) => membersOf(f.id).length,
      render: (f) => {
        const members = membersOf(f.id)
        return (
          <>
            <p className="tabular-nums">{members.length}</p>
            {members.length > 0 && <p className="text-sm text-muted">{members.map((m) => m.size ?? m.grade ?? m.sku).join(' · ')}</p>}
          </>
        )
      },
    },
    {
      key: 'stock',
      label: 'สต็อกรวม',
      sortValue: (f) => sumStock(membersOf(f.id)),
      render: (f) => <span className="tabular-nums">{sumStock(membersOf(f.id)).toLocaleString()}</span>,
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
      <PageHeading section="ข้อมูลหลัก" title="ตระกูลวัตถุดิบ" />
      <Card>
        <CardHeader
          title="ตระกูลวัตถุดิบทั้งหมด"
          subtitle="พันธุ์เดียวกันที่มีหลายขนาดหรือเกรด สต็อกและราคาอยู่ที่ SKU แต่ละตัว ตระกูลใช้รวมกลุ่มและดูสต็อกรวมเท่านั้น"
          action={
            <Button iconOnly round aria-label="เพิ่มตระกูล" title="เพิ่มตระกูล" onClick={() => openForm()}>
              <IconPlus />
            </Button>
          }
        />
        <ListToolbar
          searchLabel="ค้นหาตระกูลวัตถุดิบ"
          searchPlaceholder="ค้นหารหัส, ชื่อ, สี, หมวดหมู่"
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
          sheetCount={criteria.categoryIds.length}
          onOpenSheet={sheet.openSheet}
          chips={chips}
          resultText={`พบ ${rows.length} จาก ${families.length} ตระกูล`}
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
          emptyTitle="ไม่พบตระกูลวัตถุดิบ"
          emptyDescription={hasAnyCriteria ? 'ลองลดเงื่อนไขหรือกด "ล้างเงื่อนไข"' : 'เพิ่มตระกูลเพื่อรวม SKU ขนาดต่างๆ ของพันธุ์เดียวกัน'}
          renderActions={(f) => (
            <>
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
        title="ตัวกรองตระกูลวัตถุดิบ"
        resultCount={rows.length}
        onClear={() => update({ categoryIds: [] })}
      >
        <MultiSelectList
          label="หมวดหมู่"
          options={categoryIds.map((id) => ({ value: id, label: categoryName(id), count: categoryCounts.get(id) ?? 0 }))}
          value={criteria.categoryIds}
          onChange={(ids) => update({ categoryIds: ids })}
        />
      </FilterSheet>
      <FamilyFormModal open={formOpen} onClose={() => setFormOpen(false)} family={editing} />
    </>
  )
}
