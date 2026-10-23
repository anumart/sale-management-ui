import { supplierRawMaterials } from '@/features/procurement/mockData'
import { useProductionStore } from '@/features/production/store'
import { useSalesStore } from '@/features/sales/store'
import type { BomStatus, Category, CategoryKind, RawMaterial } from '@/features/procurement/types'
import type { PillTone } from '@/components/ui'
import { useCatalogStore } from './store'

export const bomStatusLabel: Record<BomStatus, string> = { draft: 'ร่าง', active: 'ใช้งานอยู่', archived: 'เก็บถาวร' }
export const bomStatusTone: Record<BomStatus, PillTone> = { draft: 'warning', active: 'success', archived: 'gray' }

export const categoryKindLabel: Record<CategoryKind, string> = { raw_material: 'วัตถุดิบ', finished_good: 'สินค้าสำเร็จรูป' }

/** "ดอกไม้สด › หวาย (Dendrobium)" for a child, or just the group name. Pass the store's list so callers stay reactive. */
export function categoryPath(categories: Category[], id?: string): string {
  const category = categories.find((c) => c.id === id)
  if (!category) return '—'
  const parent = categories.find((c) => c.id === category.parentCategoryId)
  return parent ? `${parent.name} › ${category.name}` : category.name
}

/** Top-level group of a category (itself when it has no parent) — what group-level reports roll up to. */
export function categoryGroupId(categories: Category[], id: string): string {
  return categories.find((c) => c.id === id)?.parentCategoryId ?? id
}

/** Picker options for one kind: each group followed by its children, ordered by `sortOrder`. */
export function categoryOptions(categories: Category[], kind: CategoryKind) {
  const bySort = (a: Category, b: Category) => a.sortOrder - b.sortOrder
  const ofKind = categories.filter((c) => c.kind === kind)
  return ofKind
    .filter((c) => !c.parentCategoryId)
    .sort(bySort)
    .flatMap((group) => [group, ...ofKind.filter((c) => c.parentCategoryId === group.id).sort(bySort)])
    .map((c) => ({ value: c.id, label: categoryPath(categories, c.id) }))
}

/** SKUs grouped under a family. */
export function familyMembers(familyId: string): RawMaterial[] {
  return useCatalogStore.getState().rawMaterials.filter((r) => r.familyId === familyId)
}

/** Combined stock of a family's SKUs (base units; the family itself holds none). */
export const sumStock = (members: RawMaterial[]) => members.reduce((total, r) => total + r.onHandQuantity, 0)

/** Why a finished good can't be deleted (empty = safe to delete). Deactivate instead when it has history. */
export function finishedGoodUsage(id: string): string[] {
  const reasons: string[] = []
  const prod = useProductionStore.getState()
  if (prod.orders.some((o) => o.finishedGoodId === id)) reasons.push('มีใบสั่งผลิต')
  if (prod.batches.some((b) => b.finishedGoodId === id)) reasons.push('มี LOT สินค้า')
  if (useSalesStore.getState().orders.some((o) => o.lines.some((l) => l.finishedGoodId === id))) reasons.push('อยู่ในคำสั่งซื้อลูกค้า')
  return reasons
}

/** Why a raw material can't be deleted (empty = safe to delete). */
export function rawMaterialUsage(id: string): string[] {
  const reasons: string[] = []
  if (useCatalogStore.getState().bomVersions.some((v) => v.items.some((i) => i.rawMaterialId === id))) reasons.push('อยู่ในสูตรสินค้า (BOM)')
  if (supplierRawMaterials.some((o) => o.rawMaterialId === id)) reasons.push('มีซัพพลายเออร์ขายอยู่')
  if (useProductionStore.getState().orders.some((o) => o.rmAllocations.some((a) => a.rawMaterialId === id))) reasons.push('ถูกใช้ในใบสั่งผลิต')
  return reasons
}
