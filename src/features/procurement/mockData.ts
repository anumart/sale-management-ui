import type {
  BomEntry,
  FinishedGood,
  PlanLine,
  PlanRawMaterial,
  PurchaseOrder,
  PurchasePlan,
  RawMaterial,
  SalesHistoryRow,
  Supplier,
  SupplierRawMaterial,
  SupplierRoute,
} from './types'

export const finishedGoods: FinishedGood[] = [
  { id: 'fg-rose', name: 'ช่อกุหลาบแดง', unit: 'ช่อ' },
  { id: 'fg-tulip', name: 'ช่อทิวลิป', unit: 'ช่อ' },
  { id: 'fg-mixed', name: 'แจกันดอกไม้ตามฤดูกาล', unit: 'ชุด' },
  { id: 'fg-orchid', name: 'กล่องของขวัญกล้วยไม้', unit: 'กล่อง' },
  { id: 'fg-sunflower', name: 'ช่อทานตะวัน', unit: 'ช่อ' },
]

export const rawMaterials: RawMaterial[] = [
  { id: 'rm-rose', name: 'กุหลาบแดง (ก้าน)', unit: 'ก้าน', onHandQuantity: 480 },
  { id: 'rm-tulip', name: 'ทิวลิป (ก้าน)', unit: 'ก้าน', onHandQuantity: 220 },
  { id: 'rm-orchid', name: 'กล้วยไม้ (ก้าน)', unit: 'ก้าน', onHandQuantity: 90 },
  { id: 'rm-sunflower', name: 'ทานตะวัน (ก้าน)', unit: 'ก้าน', onHandQuantity: 150 },
  { id: 'rm-foam', name: 'โฟมปักดอกไม้', unit: 'ก้อน', onHandQuantity: 40 },
  { id: 'rm-paper', name: 'กระดาษห่อดอกไม้', unit: 'แผ่น', onHandQuantity: 60 },
]

export const bom: BomEntry[] = [
  { finishedGoodId: 'fg-rose', rawMaterialId: 'rm-rose', quantityPerUnit: 12 },
  { finishedGoodId: 'fg-rose', rawMaterialId: 'rm-paper', quantityPerUnit: 1 },
  { finishedGoodId: 'fg-rose', rawMaterialId: 'rm-foam', quantityPerUnit: 0.2 },

  { finishedGoodId: 'fg-tulip', rawMaterialId: 'rm-tulip', quantityPerUnit: 10 },
  { finishedGoodId: 'fg-tulip', rawMaterialId: 'rm-paper', quantityPerUnit: 1 },

  { finishedGoodId: 'fg-mixed', rawMaterialId: 'rm-rose', quantityPerUnit: 4 },
  { finishedGoodId: 'fg-mixed', rawMaterialId: 'rm-tulip', quantityPerUnit: 4 },
  { finishedGoodId: 'fg-mixed', rawMaterialId: 'rm-sunflower', quantityPerUnit: 3 },
  { finishedGoodId: 'fg-mixed', rawMaterialId: 'rm-foam', quantityPerUnit: 0.5 },

  { finishedGoodId: 'fg-orchid', rawMaterialId: 'rm-orchid', quantityPerUnit: 6 },
  { finishedGoodId: 'fg-orchid', rawMaterialId: 'rm-foam', quantityPerUnit: 0.3 },

  { finishedGoodId: 'fg-sunflower', rawMaterialId: 'rm-sunflower', quantityPerUnit: 8 },
  { finishedGoodId: 'fg-sunflower', rawMaterialId: 'rm-paper', quantityPerUnit: 1 },
]

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString()

export const initialSuppliers: Supplier[] = [
  {
    id: 'sup-chatuchak',
    name: 'ตลาดดอกไม้จตุจักร',
    phone: '02-123-4567',
    email: 'contact@chatuchakflower.co.th',
    contactPerson: 'คุณสมชาย ตลาดจตุจักร',
    address: '8 ซอยพหลโยธิน 32 แขวงจันทรเกษม เขตจตุจักร กรุงเทพมหานคร 10900',
    isActive: true,
    createdAt: day(-620),
  },
  {
    id: 'sup-bkkwholesale',
    name: 'บางกอก ฟลาวเวอร์ ค้าส่ง',
    phone: '02-234-5678',
    email: 'sales@bkkflowerwholesale.co.th',
    contactPerson: 'คุณมาลี ปากคลอง',
    address: '119 ถนนจักรเพชร แขวงวังบูรพาภิรมย์ เขตพระนคร กรุงเทพมหานคร 10200',
    isActive: true,
    createdAt: day(-590),
  },
  {
    id: 'sup-dutch',
    name: 'บริษัท ดัตช์ อิมพอร์ต จำกัด',
    phone: '02-345-6789',
    email: 'johan@dutchimport.co.th',
    contactPerson: 'Mr. Johan de Vries',
    address: '99 อาคารดัตช์อิมพอร์ต ถนนสุขุมวิท แขวงบางจาก เขตพระโขนง กรุงเทพมหานคร 10260',
    isActive: true,
    createdAt: day(-540),
  },
  {
    id: 'sup-greenleaf',
    name: 'กรีนลีฟ ซัพพลาย',
    phone: '02-456-7890',
    email: 'info@greenleafsupplies.co.th',
    contactPerson: 'คุณธนพล กรีนลีฟ',
    address: '55/3 หมู่ 4 ถนนเอกชัย ตำบลนาดี อำเภอเมืองสมุทรสาคร จังหวัดสมุทรสาคร 74000',
    isActive: true,
    createdAt: day(-500),
  },
  {
    id: 'sup-patumma',
    name: 'บริษัท ปทุมมาฟาร์ม จำกัด',
    phone: '053-201-4477',
    email: 'contact@pathummafarm.co.th',
    contactPerson: 'คุณสมหญิง ปทุมมา',
    address: '45/2 หมู่ 3 ตำบลแม่แรม อำเภอแม่ริม จังหวัดเชียงใหม่ 50180',
    isActive: true,
    createdAt: day(-310),
  },
  {
    id: 'sup-klongchan',
    name: 'สวนพฤกษชาติคลองจั่น',
    phone: '02-731-5588',
    contactPerson: 'คุณวิภา คลองจั่น',
    address: '99/1 ถนนนวมินทร์ แขวงคลองจั่น เขตบางกะปิ กรุงเทพมหานคร 10240',
    isActive: true,
    createdAt: day(-180),
  },
  {
    id: 'sup-banglen',
    name: 'สวนกล้วยไม้บางเลน',
    phone: '034-395-2211',
    email: 'banglenorchid@gmail.com',
    contactPerson: 'คุณประยุทธ บางเลน',
    address: '12 หมู่ 6 ตำบลบางเลน อำเภอบางเลน จังหวัดนครปฐม 73130',
    isActive: false,
    createdAt: day(-720),
  },
]

export const initialSupplierRoutes: SupplierRoute[] = [
  {
    id: 'sr-1',
    supplierId: 'sup-chatuchak',
    routeCode: 'SR-CTK-001',
    routeName: 'จุดรับสินค้าตลาดจตุจักร (หลัก)',
    province: 'กรุงเทพมหานคร',
    address: '8 ซอยพหลโยธิน 32 แขวงจันทรเกษม เขตจตุจักร กรุงเทพมหานคร 10900',
    contactPerson: 'คุณสมชาย ตลาดจตุจักร',
    phone: '02-123-4567',
    operatingHours: '04:00–09:00 น. (จันทร์, พฤหัสบดี)',
    isActive: true,
    createdAt: day(-600),
    rawMaterials: [
      { rawMaterialName: 'กุหลาบแดง (Red Rose)', unit: 'ก้าน', pricePerUnit: 15.5, availableStock: 5000 },
      { rawMaterialName: 'ทิวลิป (Tulip)', unit: 'ก้าน', pricePerUnit: 14, availableStock: 1200 },
    ],
  },
  {
    id: 'sr-2',
    supplierId: 'sup-bkkwholesale',
    routeCode: 'SR-BKW-001',
    routeName: 'จุดรับสินค้าปากคลองตลาด',
    province: 'กรุงเทพมหานคร',
    address: '119 ถนนจักรเพชร แขวงวังบูรพาภิรมย์ เขตพระนคร กรุงเทพมหานคร 10200',
    contactPerson: 'คุณมาลี ปากคลอง',
    phone: '02-234-5678',
    operatingHours: '03:00–07:00 น. ทุกวัน',
    isActive: true,
    createdAt: day(-570),
    rawMaterials: [
      { rawMaterialName: 'กุหลาบชมพู (Pink Rose)', unit: 'ก้าน', pricePerUnit: 16, availableStock: 3000 },
      { rawMaterialName: 'ทานตะวัน (Sunflower)', unit: 'ก้าน', pricePerUnit: 13, availableStock: 2500 },
    ],
  },
  {
    id: 'sr-3',
    supplierId: 'sup-dutch',
    routeCode: 'SR-DIC-001',
    routeName: 'คลังสินค้านำเข้าดัตช์ - บางจาก',
    province: 'กรุงเทพมหานคร',
    address: '99 อาคารดัตช์อิมพอร์ต ถนนสุขุมวิท แขวงบางจาก เขตพระโขนง กรุงเทพมหานคร 10260',
    contactPerson: 'Mr. Johan de Vries',
    phone: '02-345-6789',
    operatingHours: '08:00–17:00 น. จันทร์-ศุกร์',
    isActive: true,
    createdAt: day(-530),
    rawMaterials: [
      { rawMaterialName: 'กุหลาบฮอลแลนด์ (Dutch Rose)', unit: 'ก้าน', pricePerUnit: 45, availableStock: 1500 },
      { rawMaterialName: 'ลิลลี่นำเข้า (Imported Lily)', unit: 'ก้าน', pricePerUnit: 60, availableStock: 700 },
    ],
  },
  {
    id: 'sr-4',
    supplierId: 'sup-greenleaf',
    routeCode: 'SR-GLS-001',
    routeName: 'คลังบรรจุภัณฑ์สมุทรสาคร',
    province: 'สมุทรสาคร',
    address: '55/3 หมู่ 4 ถนนเอกชัย ตำบลนาดี อำเภอเมืองสมุทรสาคร จังหวัดสมุทรสาคร 74000',
    contactPerson: 'คุณธนพล กรีนลีฟ',
    phone: '02-456-7890',
    operatingHours: '08:30–17:30 น. จันทร์-เสาร์',
    isActive: true,
    createdAt: day(-490),
    rawMaterials: [
      { rawMaterialName: 'โฟมปักดอกไม้ (Floral Foam)', unit: 'ก้อน', pricePerUnit: 45, availableStock: 900 },
      { rawMaterialName: 'กระดาษห่อดอกไม้ (Wrapping Paper)', unit: 'แผ่น', pricePerUnit: 1.3, availableStock: 6000 },
    ],
  },
  {
    id: 'sr-5',
    supplierId: 'sup-patumma',
    routeCode: 'SR-PTM-001',
    routeName: 'สวนดอกกุหลาบแม่ริม',
    province: 'เชียงใหม่',
    address: '45/2 หมู่ 3 ตำบลแม่แรม อำเภอแม่ริม จังหวัดเชียงใหม่ 50180',
    contactPerson: 'คุณสมหญิง ปทุมมา',
    phone: '053-201-4477',
    operatingHours: '06:00–10:00 น. ทุกวัน',
    isActive: true,
    createdAt: day(-300),
    rawMaterials: [
      { rawMaterialName: 'กุหลาบแดง (Red Rose)', unit: 'ก้าน', pricePerUnit: 15, availableStock: 4500 },
      { rawMaterialName: 'กุหลาบขาว (White Rose)', unit: 'ก้าน', pricePerUnit: 15.5, availableStock: 2200 },
    ],
  },
  {
    id: 'sr-6',
    supplierId: 'sup-patumma',
    routeCode: 'SR-PTM-002',
    routeName: 'สวนคาร์เนชั่นสันทราย',
    province: 'เชียงใหม่',
    address: '78 หมู่ 5 ตำบลสันนาเม็ง อำเภอสันทราย จังหวัดเชียงใหม่ 50210',
    contactPerson: 'คุณประเสริฐ สันทราย',
    phone: '053-884-2200',
    operatingHours: '06:30–10:30 น. ทุกวัน',
    isActive: true,
    createdAt: day(-280),
    rawMaterials: [{ rawMaterialName: 'คาร์เนชั่น (Carnation)', unit: 'ก้าน', pricePerUnit: 12, availableStock: 4000 }],
  },
  {
    id: 'sr-7',
    supplierId: 'sup-klongchan',
    routeCode: 'SR-KLC-001',
    routeName: 'สวนพฤกษชาติคลองจั่น',
    province: 'กรุงเทพมหานคร',
    address: '99/1 ถนนนวมินทร์ แขวงคลองจั่น เขตบางกะปิ กรุงเทพมหานคร 10240',
    contactPerson: 'คุณวิภา คลองจั่น',
    phone: '02-731-5588',
    operatingHours: '06:00–11:00 น. ทุกวัน (นัดหมายล่วงหน้า)',
    isActive: true,
    createdAt: day(-180),
    rawMaterials: [
      { rawMaterialName: 'ทานตะวัน (Sunflower)', unit: 'ดอก', pricePerUnit: 14, availableStock: 800 },
      { rawMaterialName: 'บัวหลวง (Lotus)', unit: 'ดอก', pricePerUnit: 8, availableStock: 1200 },
      { rawMaterialName: 'กล้วยไม้ (Orchid)', unit: 'ช่อ', pricePerUnit: 25, availableStock: 300 },
    ],
  },
  {
    id: 'sr-8',
    supplierId: 'sup-banglen',
    routeCode: 'SR-BGL-001',
    routeName: 'สวนกล้วยไม้บางเลน',
    province: 'นครปฐม',
    address: '12 หมู่ 6 ตำบลบางเลน อำเภอบางเลน จังหวัดนครปฐม 73130',
    contactPerson: 'คุณประยุทธ บางเลน',
    phone: '034-395-2211',
    isActive: false,
    createdAt: day(-720),
    rawMaterials: [{ rawMaterialName: 'กล้วยไม้แคทลียา (Cattleya Orchid)', unit: 'ช่อ', pricePerUnit: 30, availableStock: 0 }],
  },
]

export const supplierRawMaterials: SupplierRawMaterial[] = [
  { supplierId: 'sup-chatuchak', rawMaterialId: 'rm-rose', supplierUnit: 'มัด (25 ก้าน)', unitsPerSupplierUnit: 25, pricePerSupplierUnit: 375 },
  { supplierId: 'sup-bkkwholesale', rawMaterialId: 'rm-rose', supplierUnit: 'มัด (25 ก้าน)', unitsPerSupplierUnit: 25, pricePerSupplierUnit: 350 },
  { supplierId: 'sup-dutch', rawMaterialId: 'rm-rose', supplierUnit: 'กล่อง (100 ก้าน)', unitsPerSupplierUnit: 100, pricePerSupplierUnit: 1250 },

  { supplierId: 'sup-chatuchak', rawMaterialId: 'rm-tulip', supplierUnit: 'มัด (20 ก้าน)', unitsPerSupplierUnit: 20, pricePerSupplierUnit: 300 },
  { supplierId: 'sup-dutch', rawMaterialId: 'rm-tulip', supplierUnit: 'กล่อง (100 ก้าน)', unitsPerSupplierUnit: 100, pricePerSupplierUnit: 1400 },

  { supplierId: 'sup-bkkwholesale', rawMaterialId: 'rm-orchid', supplierUnit: 'มัด (10 ก้าน)', unitsPerSupplierUnit: 10, pricePerSupplierUnit: 450 },
  { supplierId: 'sup-greenleaf', rawMaterialId: 'rm-orchid', supplierUnit: 'ก้าน', unitsPerSupplierUnit: 1, pricePerSupplierUnit: 48 },

  { supplierId: 'sup-chatuchak', rawMaterialId: 'rm-sunflower', supplierUnit: 'มัด (10 ก้าน)', unitsPerSupplierUnit: 10, pricePerSupplierUnit: 150 },
  { supplierId: 'sup-bkkwholesale', rawMaterialId: 'rm-sunflower', supplierUnit: 'มัด (10 ก้าน)', unitsPerSupplierUnit: 10, pricePerSupplierUnit: 140 },

  { supplierId: 'sup-greenleaf', rawMaterialId: 'rm-foam', supplierUnit: 'ลัง (20 ก้อน)', unitsPerSupplierUnit: 20, pricePerSupplierUnit: 900 },

  { supplierId: 'sup-greenleaf', rawMaterialId: 'rm-paper', supplierUnit: 'รีม (500 แผ่น)', unitsPerSupplierUnit: 500, pricePerSupplierUnit: 650 },
]

export const salesHistory: SalesHistoryRow[] = [
  { finishedGoodId: 'fg-rose', quantitySold: 320, trendPct: 15 },
  { finishedGoodId: 'fg-tulip', quantitySold: 180, trendPct: -8 },
  { finishedGoodId: 'fg-mixed', quantitySold: 95, trendPct: 22 },
  { finishedGoodId: 'fg-orchid', quantitySold: 60, trendPct: 5 },
  { finishedGoodId: 'fg-sunflower', quantitySold: 140, trendPct: -3 },
]

export function suppliersFor(rawMaterialId: string): SupplierRawMaterial[] {
  return supplierRawMaterials.filter((s) => s.rawMaterialId === rawMaterialId)
}

export function rawMaterialById(id: string) {
  return rawMaterials.find((r) => r.id === id)
}

export function finishedGoodById(id: string) {
  return finishedGoods.find((f) => f.id === id)
}

/** Sum(plannedQuantity x BOM quantityPerUnit) for every raw material touched by the given lines. */
export function computeRequiredQuantities(lines: PlanLine[]): Map<string, number> {
  const required = new Map<string, number>()
  for (const line of lines) {
    const entries = bom.filter((b) => b.finishedGoodId === line.finishedGoodId)
    for (const entry of entries) {
      const prev = required.get(entry.rawMaterialId) ?? 0
      required.set(entry.rawMaterialId, prev + entry.quantityPerUnit * line.plannedQuantity)
    }
  }
  return required
}

/** Build the full PlanRawMaterial[] (required / on-hand snapshot / net-required) from plan lines. */
export function buildPlanRawMaterials(lines: PlanLine[]): PlanRawMaterial[] {
  const required = computeRequiredQuantities(lines)
  return [...required.entries()].map(([rawMaterialId, requiredQuantity]) => {
    const onHandQuantitySnapshot = rawMaterialById(rawMaterialId)?.onHandQuantity ?? 0
    return {
      rawMaterialId,
      requiredQuantity,
      onHandQuantitySnapshot,
      netRequiredQuantity: Math.max(0, requiredQuantity - onHandQuantitySnapshot),
      suppliers: suppliersFor(rawMaterialId).map((s) => ({
        supplierId: s.supplierId,
        callStatus: 'not_called' as const,
        confirmedQuantity: null,
        orderedQuantity: null,
      })),
    }
  })
}

export const initialPlans: PurchasePlan[] = [
  {
    id: 'plan-2026-08',
    name: 'แผนจัดซื้อ - สิงหาคม 2569',
    status: 'ordered',
    sourceMonth: 7,
    sourceYear: 2026,
    createdByName: 'น่าน สุวรรณภูมิ',
    createdAt: day(-20),
    lines: [
      { finishedGoodId: 'fg-rose', baseSalesQty: 280, adjustmentPct: 5, plannedQuantity: 294 },
      { finishedGoodId: 'fg-tulip', baseSalesQty: 200, adjustmentPct: 0, plannedQuantity: 200 },
      { finishedGoodId: 'fg-sunflower', baseSalesQty: 150, adjustmentPct: -5, plannedQuantity: 143 },
    ],
    rawMaterials: [
      {
        rawMaterialId: 'rm-rose',
        requiredQuantity: 3528,
        onHandQuantitySnapshot: 400,
        netRequiredQuantity: 3128,
        suppliers: [
          { supplierId: 'sup-chatuchak', callStatus: 'confirmed', confirmedQuantity: 80, orderedQuantity: 80 },
          { supplierId: 'sup-bkkwholesale', callStatus: 'confirmed', confirmedQuantity: 45, orderedQuantity: 45 },
          { supplierId: 'sup-dutch', callStatus: 'confirmed', confirmedQuantity: 32, orderedQuantity: 32 },
        ],
      },
      {
        rawMaterialId: 'rm-tulip',
        requiredQuantity: 2000,
        onHandQuantitySnapshot: 180,
        netRequiredQuantity: 1820,
        suppliers: [
          { supplierId: 'sup-chatuchak', callStatus: 'confirmed', confirmedQuantity: 55, orderedQuantity: 55 },
          { supplierId: 'sup-dutch', callStatus: 'confirmed', confirmedQuantity: 20, orderedQuantity: 20 },
        ],
      },
      {
        rawMaterialId: 'rm-sunflower',
        requiredQuantity: 1144,
        onHandQuantitySnapshot: 120,
        netRequiredQuantity: 1024,
        suppliers: [{ supplierId: 'sup-bkkwholesale', callStatus: 'confirmed', confirmedQuantity: 103, orderedQuantity: 103 }],
      },
      {
        rawMaterialId: 'rm-paper',
        requiredQuantity: 494,
        onHandQuantitySnapshot: 50,
        netRequiredQuantity: 444,
        suppliers: [{ supplierId: 'sup-greenleaf', callStatus: 'confirmed', confirmedQuantity: 1, orderedQuantity: 1 }],
      },
    ],
  },
  {
    id: 'plan-2026-09',
    name: 'แผนจัดซื้อ - กันยายน 2569',
    status: 'draft',
    sourceMonth: 8,
    sourceYear: 2026,
    createdByName: 'น่าน สุวรรณภูมิ',
    createdAt: day(-2),
    lines: [
      { finishedGoodId: 'fg-rose', baseSalesQty: 320, adjustmentPct: 10, plannedQuantity: 352 },
      { finishedGoodId: 'fg-mixed', baseSalesQty: 95, adjustmentPct: 0, plannedQuantity: 95 },
      { finishedGoodId: 'fg-orchid', baseSalesQty: 60, adjustmentPct: 15, plannedQuantity: 69 },
    ],
    rawMaterials: [
      {
        rawMaterialId: 'rm-rose',
        requiredQuantity: 4604,
        onHandQuantitySnapshot: 480,
        netRequiredQuantity: 4124,
        suppliers: [
          { supplierId: 'sup-chatuchak', callStatus: 'confirmed', confirmedQuantity: 90, orderedQuantity: 90 },
          { supplierId: 'sup-bkkwholesale', callStatus: 'called', confirmedQuantity: 60, orderedQuantity: null },
          { supplierId: 'sup-dutch', callStatus: 'not_called', confirmedQuantity: null, orderedQuantity: null },
        ],
      },
      {
        rawMaterialId: 'rm-tulip',
        requiredQuantity: 380,
        onHandQuantitySnapshot: 220,
        netRequiredQuantity: 160,
        suppliers: [{ supplierId: 'sup-chatuchak', callStatus: 'not_called', confirmedQuantity: null, orderedQuantity: null }],
      },
      {
        rawMaterialId: 'rm-sunflower',
        requiredQuantity: 285,
        onHandQuantitySnapshot: 150,
        netRequiredQuantity: 135,
        suppliers: [{ supplierId: 'sup-bkkwholesale', callStatus: 'called', confirmedQuantity: 14, orderedQuantity: null }],
      },
      {
        rawMaterialId: 'rm-orchid',
        requiredQuantity: 414,
        onHandQuantitySnapshot: 90,
        netRequiredQuantity: 324,
        suppliers: [
          { supplierId: 'sup-bkkwholesale', callStatus: 'confirmed', confirmedQuantity: 20, orderedQuantity: 20 },
          { supplierId: 'sup-greenleaf', callStatus: 'not_called', confirmedQuantity: null, orderedQuantity: null },
        ],
      },
      {
        rawMaterialId: 'rm-foam',
        requiredQuantity: 68.3,
        onHandQuantitySnapshot: 40,
        netRequiredQuantity: 28.3,
        suppliers: [{ supplierId: 'sup-greenleaf', callStatus: 'not_called', confirmedQuantity: null, orderedQuantity: null }],
      },
      {
        rawMaterialId: 'rm-paper',
        requiredQuantity: 352,
        onHandQuantitySnapshot: 60,
        netRequiredQuantity: 292,
        suppliers: [{ supplierId: 'sup-greenleaf', callStatus: 'not_called', confirmedQuantity: null, orderedQuantity: null }],
      },
    ],
  },
]

export const initialPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-1',
    poNumber: 'PO-2026-0081',
    planId: 'plan-2026-08',
    supplierId: 'sup-chatuchak',
    status: 'received',
    totalAmount: 80 * 375 + 55 * 300,
    expectedDeliveryDate: day(-15),
    createdAt: day(-19),
    lines: [
      { rawMaterialId: 'rm-rose', quantity: 80, pricePerUnit: 375, total: 80 * 375 },
      { rawMaterialId: 'rm-tulip', quantity: 55, pricePerUnit: 300, total: 55 * 300 },
    ],
  },
  {
    id: 'po-2',
    poNumber: 'PO-2026-0082',
    planId: 'plan-2026-08',
    supplierId: 'sup-bkkwholesale',
    status: 'confirmed',
    totalAmount: 45 * 350 + 103 * 140,
    expectedDeliveryDate: day(-14),
    createdAt: day(-19),
    lines: [
      { rawMaterialId: 'rm-rose', quantity: 45, pricePerUnit: 350, total: 45 * 350 },
      { rawMaterialId: 'rm-sunflower', quantity: 103, pricePerUnit: 140, total: 103 * 140 },
    ],
  },
  {
    id: 'po-3',
    poNumber: 'PO-2026-0083',
    planId: 'plan-2026-08',
    supplierId: 'sup-dutch',
    status: 'sent',
    totalAmount: 32 * 1250 + 20 * 1400,
    expectedDeliveryDate: day(-12),
    createdAt: day(-19),
    lines: [
      { rawMaterialId: 'rm-rose', quantity: 32, pricePerUnit: 1250, total: 32 * 1250 },
      { rawMaterialId: 'rm-tulip', quantity: 20, pricePerUnit: 1400, total: 20 * 1400 },
    ],
  },
  {
    id: 'po-4',
    poNumber: 'PO-2026-0084',
    planId: 'plan-2026-08',
    supplierId: 'sup-greenleaf',
    status: 'draft',
    totalAmount: 1 * 650,
    expectedDeliveryDate: day(-10),
    createdAt: day(-19),
    lines: [{ rawMaterialId: 'rm-paper', quantity: 1, pricePerUnit: 650, total: 1 * 650 }],
  },
]
