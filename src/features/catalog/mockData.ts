import type { BomVersion, Category, FinishedGood, MaterialFamily, RawMaterial } from '@/features/procurement/types'

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString()

export const categories: Category[] = [
  { id: 'rmc-flower', kind: 'raw_material', name: 'ดอกไม้สด', sortOrder: 1 },
  { id: 'rmc-packaging', kind: 'raw_material', name: 'บรรจุภัณฑ์', sortOrder: 2 },
  { id: 'rmc-supply', kind: 'raw_material', name: 'วัสดุปักและอุปกรณ์', sortOrder: 3 },
  { id: 'rmc-dendrobium', kind: 'raw_material', name: 'หวาย (Dendrobium)', sortOrder: 1, parentCategoryId: 'rmc-flower' },
  { id: 'rmc-mokara', kind: 'raw_material', name: 'โมกค่า (Mokara)', sortOrder: 2, parentCategoryId: 'rmc-flower' },
  { id: 'rmc-anthurium', kind: 'raw_material', name: 'หน้าวัว (Anthurium)', sortOrder: 3, parentCategoryId: 'rmc-flower' },
  { id: 'fgc-bouquet', kind: 'finished_good', name: 'ช่อดอกไม้', sortOrder: 1 },
  { id: 'fgc-vase', kind: 'finished_good', name: 'แจกันและจัดชุด', sortOrder: 2 },
  { id: 'fgc-gift', kind: 'finished_good', name: 'กล่องของขวัญ', sortOrder: 3 },
]

export const finishedGoods: FinishedGood[] = [
  { id: 'fg-rose', sku: 'FG-BQ-001', name: 'ช่อกุหลาบแดง', categoryId: 'fgc-bouquet', unit: 'ช่อ', standardPrice: 450, description: 'กุหลาบแดง 12 ก้าน ห่อกระดาษคราฟต์', isActive: true },
  { id: 'fg-tulip', sku: 'FG-BQ-002', name: 'ช่อทิวลิป', categoryId: 'fgc-bouquet', unit: 'ช่อ', standardPrice: 420, description: 'ทิวลิปคละสี 10 ก้าน', isActive: true },
  { id: 'fg-mixed', sku: 'FG-VS-001', name: 'แจกันดอกไม้ตามฤดูกาล', categoryId: 'fgc-vase', unit: 'ชุด', standardPrice: 890, description: 'ดอกไม้ตามฤดูกาลปักแจกันโฟม', isActive: true },
  { id: 'fg-orchid', sku: 'FG-GF-001', name: 'กล่องของขวัญกล้วยไม้', categoryId: 'fgc-gift', unit: 'กล่อง', standardPrice: 690, description: 'กล้วยไม้ 6 ก้านในกล่องของขวัญ', isActive: true },
  { id: 'fg-sunflower', sku: 'FG-BQ-003', name: 'ช่อทานตะวัน', categoryId: 'fgc-bouquet', unit: 'ช่อ', standardPrice: 380, description: 'ทานตะวัน 8 ก้าน ห่อกระดาษคราฟต์', isActive: true },
]

export const materialFamilies: MaterialFamily[] = [
  { id: 'fam-rose', code: 'ROSE-RED', nameTh: 'กุหลาบแดง', nameEn: 'Red Rose', categoryId: 'rmc-flower', color: 'Red', isActive: true },
  { id: 'fam-tulip', code: 'TULIP', nameTh: 'ทิวลิป', nameEn: 'Tulip', categoryId: 'rmc-flower', color: 'Mixed', isActive: true },
  { id: 'fam-orchid', code: 'ORCHID-WHITE', nameTh: 'กล้วยไม้', nameEn: 'Orchid', categoryId: 'rmc-dendrobium', color: 'White', isActive: true },
  { id: 'fam-sunflower', code: 'SUNFLOWER', nameTh: 'ทานตะวัน', nameEn: 'Sunflower', categoryId: 'rmc-flower', color: 'Yellow', isActive: true },
]

export const rawMaterials: RawMaterial[] = [
  { id: 'rm-rose', sku: 'RM-FL-001', familyId: 'fam-rose', nameTh: 'กุหลาบแดง (ก้าน)', nameEn: 'Red Rose', customerName: 'กุหลาบแดงก้านยาว', color: 'Red', categoryId: 'rmc-flower', unit: 'ก้าน', grade: 'A', size: 'ก้านยาว 60 ซม.', reorderPoint: 100, isSellable: true, sellPrice: 25, isActive: true, onHandQuantity: 480 },
  { id: 'rm-tulip', sku: 'RM-FL-002', familyId: 'fam-tulip', nameTh: 'ทิวลิป (ก้าน)', nameEn: 'Tulip', color: 'Mixed', categoryId: 'rmc-flower', unit: 'ก้าน', grade: 'A', reorderPoint: 80, isSellable: true, sellPrice: 22, isActive: true, onHandQuantity: 220 },
  { id: 'rm-orchid', sku: 'RM-FL-003', familyId: 'fam-orchid', nameTh: 'กล้วยไม้ (ก้าน)', nameEn: 'Orchid', color: 'White', categoryId: 'rmc-dendrobium', unit: 'ก้าน', grade: 'A', reorderPoint: 40, isSellable: true, sellPrice: 45, isActive: true, onHandQuantity: 90 },
  { id: 'rm-sunflower', sku: 'RM-FL-004', familyId: 'fam-sunflower', nameTh: 'ทานตะวัน (ก้าน)', nameEn: 'Sunflower', color: 'Yellow', categoryId: 'rmc-flower', unit: 'ก้าน', grade: 'A', reorderPoint: 60, isSellable: true, sellPrice: 20, isActive: true, onHandQuantity: 150 },
  { id: 'rm-rose-short', sku: 'RM-FL-005', familyId: 'fam-rose', nameTh: 'กุหลาบแดง (ก้าน)', nameEn: 'Red Rose', color: 'Red', categoryId: 'rmc-flower', unit: 'ก้าน', grade: 'A', size: 'ก้านสั้น 40 ซม.', reorderPoint: 100, isSellable: true, sellPrice: 18, isActive: true, onHandQuantity: 200 },
  { id: 'rm-foam', sku: 'RM-SP-001', nameTh: 'โฟมปักดอกไม้', nameEn: 'Floral Foam', categoryId: 'rmc-supply', unit: 'ก้อน', isSellable: false, isActive: true, onHandQuantity: 40 },
  { id: 'rm-paper', sku: 'RM-PK-001', nameTh: 'กระดาษห่อดอกไม้', nameEn: 'Wrapping Paper', categoryId: 'rmc-packaging', unit: 'แผ่น', isSellable: false, isActive: true, onHandQuantity: 60 },
]

/** Every recipe revision. Exactly one version per finished good is `active`; older ones stay for traceability. */
export const bomVersions: BomVersion[] = [
  {
    id: 'bom-rose-v1',
    finishedGoodId: 'fg-rose',
    version: 1,
    status: 'active',
    effectiveFrom: day(-400),
    createdAt: day(-400),
    items: [
      { rawMaterialId: 'rm-rose', quantityPerUnit: 12 },
      { rawMaterialId: 'rm-paper', quantityPerUnit: 1 },
      { rawMaterialId: 'rm-foam', quantityPerUnit: 0.2 },
    ],
  },
  {
    id: 'bom-tulip-v1',
    finishedGoodId: 'fg-tulip',
    version: 1,
    status: 'active',
    effectiveFrom: day(-400),
    createdAt: day(-400),
    items: [
      { rawMaterialId: 'rm-tulip', quantityPerUnit: 10 },
      { rawMaterialId: 'rm-paper', quantityPerUnit: 1 },
    ],
  },
  {
    id: 'bom-mixed-v1',
    finishedGoodId: 'fg-mixed',
    version: 1,
    status: 'archived',
    effectiveFrom: day(-400),
    createdAt: day(-400),
    note: 'สูตรเดิม ใช้ดอกไม้ 3 ชนิด',
    items: [
      { rawMaterialId: 'rm-rose', quantityPerUnit: 3 },
      { rawMaterialId: 'rm-tulip', quantityPerUnit: 3 },
      { rawMaterialId: 'rm-sunflower', quantityPerUnit: 3 },
      { rawMaterialId: 'rm-foam', quantityPerUnit: 0.5 },
    ],
  },
  {
    id: 'bom-mixed-v2',
    finishedGoodId: 'fg-mixed',
    version: 2,
    status: 'active',
    effectiveFrom: day(-120),
    createdAt: day(-125),
    note: 'เพิ่มกุหลาบและทิวลิปอย่างละ 1 ก้านให้ช่อดูเต็มขึ้น',
    items: [
      { rawMaterialId: 'rm-rose', quantityPerUnit: 4 },
      { rawMaterialId: 'rm-tulip', quantityPerUnit: 4 },
      { rawMaterialId: 'rm-sunflower', quantityPerUnit: 3 },
      { rawMaterialId: 'rm-foam', quantityPerUnit: 0.5 },
    ],
  },
  {
    id: 'bom-orchid-v1',
    finishedGoodId: 'fg-orchid',
    version: 1,
    status: 'active',
    effectiveFrom: day(-400),
    createdAt: day(-400),
    items: [
      { rawMaterialId: 'rm-orchid', quantityPerUnit: 6 },
      { rawMaterialId: 'rm-foam', quantityPerUnit: 0.3 },
    ],
  },
  {
    id: 'bom-sunflower-v1',
    finishedGoodId: 'fg-sunflower',
    version: 1,
    status: 'active',
    effectiveFrom: day(-400),
    createdAt: day(-400),
    items: [
      { rawMaterialId: 'rm-sunflower', quantityPerUnit: 8 },
      { rawMaterialId: 'rm-paper', quantityPerUnit: 1 },
    ],
  },
]
