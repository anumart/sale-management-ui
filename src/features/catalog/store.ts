import { create } from 'zustand'
import type { BomEntry, BomItem, BomVersion, Category, FinishedGood, MaterialFamily, RawMaterial } from '@/features/procurement/types'
import { bomVersions as initialBomVersions, categories as initialCategories, finishedGoods as initialFinishedGoods, materialFamilies as initialFamilies, rawMaterials as initialRawMaterials } from './mockData'

interface CatalogState {
  categories: Category[]
  finishedGoods: FinishedGood[]
  rawMaterials: RawMaterial[]
  materialFamilies: MaterialFamily[]
  bomVersions: BomVersion[]

  addFinishedGood: (fg: FinishedGood) => void
  updateFinishedGood: (id: string, patch: Partial<Omit<FinishedGood, 'id'>>) => void
  /** Also removes the product's BOM versions. Callers check usage first (see finishedGoodUsage). */
  deleteFinishedGood: (id: string) => void

  addRawMaterial: (rm: RawMaterial) => void
  updateRawMaterial: (id: string, patch: Partial<Omit<RawMaterial, 'id'>>) => void
  deleteRawMaterial: (id: string) => void

  addFamily: (family: MaterialFamily) => void
  updateFamily: (id: string, patch: Partial<Omit<MaterialFamily, 'id'>>) => void
  /** Callers check for members first (see familyMembers). */
  deleteFamily: (id: string) => void

  /** Creates the next draft version for a product. Returns it. */
  createBomVersion: (finishedGoodId: string, items: BomItem[], note?: string) => BomVersion
  /** Only drafts can be edited — active / archived versions are history. */
  updateBomDraft: (versionId: string, items: BomItem[], note?: string) => void
  /** Makes the version active and archives the product's previous active version. */
  activateBomVersion: (versionId: string) => void
  deleteBomDraft: (versionId: string) => void
}

/** In-memory mock "backend" for master data (raw materials, finished goods, BOM) — session-only state. */
export const useCatalogStore = create<CatalogState>((set, get) => ({
  categories: initialCategories,
  finishedGoods: initialFinishedGoods,
  rawMaterials: initialRawMaterials,
  materialFamilies: initialFamilies,
  bomVersions: initialBomVersions,

  addFinishedGood: (fg) => set({ finishedGoods: [...get().finishedGoods, fg] }),
  updateFinishedGood: (id, patch) => set({ finishedGoods: get().finishedGoods.map((f) => (f.id === id ? { ...f, ...patch } : f)) }),
  deleteFinishedGood: (id) =>
    set({
      finishedGoods: get().finishedGoods.filter((f) => f.id !== id),
      bomVersions: get().bomVersions.filter((v) => v.finishedGoodId !== id),
    }),

  addRawMaterial: (rm) => set({ rawMaterials: [...get().rawMaterials, rm] }),
  updateRawMaterial: (id, patch) => set({ rawMaterials: get().rawMaterials.map((r) => (r.id === id ? { ...r, ...patch } : r)) }),
  deleteRawMaterial: (id) => set({ rawMaterials: get().rawMaterials.filter((r) => r.id !== id) }),

  addFamily: (family) => set({ materialFamilies: [...get().materialFamilies, family] }),
  updateFamily: (id, patch) => set({ materialFamilies: get().materialFamilies.map((f) => (f.id === id ? { ...f, ...patch } : f)) }),
  deleteFamily: (id) => set({ materialFamilies: get().materialFamilies.filter((f) => f.id !== id) }),

  createBomVersion: (finishedGoodId, items, note) => {
    const mine = get().bomVersions.filter((v) => v.finishedGoodId === finishedGoodId)
    const version: BomVersion = {
      id: `bom-${finishedGoodId}-v${Date.now()}`,
      finishedGoodId,
      version: Math.max(0, ...mine.map((v) => v.version)) + 1,
      status: 'draft',
      effectiveFrom: new Date().toISOString(),
      note,
      createdAt: new Date().toISOString(),
      items,
    }
    set({ bomVersions: [...get().bomVersions, version] })
    return version
  },

  updateBomDraft: (versionId, items, note) =>
    set({ bomVersions: get().bomVersions.map((v) => (v.id === versionId && v.status === 'draft' ? { ...v, items, note } : v)) }),

  activateBomVersion: (versionId) => {
    const target = get().bomVersions.find((v) => v.id === versionId)
    if (!target || target.status === 'active') return
    set({
      bomVersions: get().bomVersions.map((v) => {
        if (v.finishedGoodId !== target.finishedGoodId) return v
        if (v.id === versionId) return { ...v, status: 'active' as const, effectiveFrom: new Date().toISOString() }
        return v.status === 'active' ? { ...v, status: 'archived' as const } : v
      }),
    })
  },

  deleteBomDraft: (versionId) => set({ bomVersions: get().bomVersions.filter((v) => !(v.id === versionId && v.status === 'draft')) }),
}))

/** Flattened lines of every finished good's active BOM version — what demand / allocation maths read. */
export function activeBomEntries(): BomEntry[] {
  return useCatalogStore
    .getState()
    .bomVersions.filter((v) => v.status === 'active')
    .flatMap((v) => v.items.map((item) => ({ finishedGoodId: v.finishedGoodId, ...item })))
}

/** Snapshot reads for plain functions and pickers (master data is only edited on its own pages); `activeOnly` hides deactivated items. */
export function getFinishedGoods(activeOnly = false) {
  const all = useCatalogStore.getState().finishedGoods
  return activeOnly ? all.filter((f) => f.isActive) : all
}

export function getRawMaterials(activeOnly = false) {
  const all = useCatalogStore.getState().rawMaterials
  return activeOnly ? all.filter((r) => r.isActive) : all
}
