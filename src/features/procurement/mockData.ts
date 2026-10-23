import type {
  PlanLine,
  PlanRawMaterial,
  PurchaseOrder,
  PurchasePlan,
  SalesHistoryRow,
  Supplier,
  SupplierRawMaterial,
  SupplierRoute,
} from './types'
import { activeBomEntries, useCatalogStore } from '@/features/catalog/store'
import { formatRouteAddress } from './utils'

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString()

export const initialSuppliers: Supplier[] = [
  {
    id: 'sup-chatuchak',
    supplierType: 'individual',
    title: 'นาย',
    firstName: 'สมชาย',
    lastName: 'ตลาดจตุจักร',
    name: 'นายสมชาย ตลาดจตุจักร',
    taxId: '3101201234567',
    phone: '02-123-4567',
    email: 'contact@chatuchakflower.co.th',
    contactPerson: 'คุณสมชาย ตลาดจตุจักร',
    address: '8 ซอยพหลโยธิน 32 แขวงจันทรเกษม เขตจตุจักร กรุงเทพมหานคร 10900',
    isActive: true,
    createdAt: day(-620),
  },
  {
    id: 'sup-bkkwholesale',
    supplierType: 'company',
    companyName: 'บางกอก ฟลาวเวอร์ ค้าส่ง',
    branchCode: '00000',
    name: 'บางกอก ฟลาวเวอร์ ค้าส่ง',
    taxId: '0105561234567',
    phone: '02-234-5678',
    email: 'sales@bkkflowerwholesale.co.th',
    contactPerson: 'คุณมาลี ปากคลอง',
    address: '119 ถนนจักรเพชร แขวงวังบูรพาภิรมย์ เขตพระนคร กรุงเทพมหานคร 10200',
    isActive: true,
    createdAt: day(-590),
  },
  {
    id: 'sup-dutch',
    supplierType: 'company',
    companyName: 'บริษัท ดัตช์ อิมพอร์ต จำกัด',
    branchCode: '00000',
    name: 'บริษัท ดัตช์ อิมพอร์ต จำกัด',
    taxId: '0105559876543',
    phone: '02-345-6789',
    email: 'johan@dutchimport.co.th',
    contactPerson: 'Mr. Johan de Vries',
    address: '99 อาคารดัตช์อิมพอร์ต ถนนสุขุมวิท แขวงบางจาก เขตพระโขนง กรุงเทพมหานคร 10260',
    isActive: true,
    createdAt: day(-540),
  },
  {
    id: 'sup-greenleaf',
    supplierType: 'company',
    companyName: 'กรีนลีฟ ซัพพลาย',
    branchCode: '00001',
    name: 'กรีนลีฟ ซัพพลาย',
    taxId: '0745562345678',
    phone: '02-456-7890',
    email: 'info@greenleafsupplies.co.th',
    contactPerson: 'คุณธนพล กรีนลีฟ',
    address: '55/3 หมู่ 4 ถนนเอกชัย ตำบลนาดี อำเภอเมืองสมุทรสาคร จังหวัดสมุทรสาคร 74000',
    isActive: true,
    createdAt: day(-500),
  },
  {
    id: 'sup-patumma',
    supplierType: 'company',
    companyName: 'บริษัท ปทุมมาฟาร์ม จำกัด',
    branchCode: '00000',
    name: 'บริษัท ปทุมมาฟาร์ม จำกัด',
    taxId: '0505563456789',
    phone: '053-201-4477',
    email: 'contact@pathummafarm.co.th',
    contactPerson: 'คุณสมหญิง ปทุมมา',
    address: '45/2 หมู่ 3 ตำบลแม่แรม อำเภอแม่ริม จังหวัดเชียงใหม่ 50180',
    isActive: true,
    createdAt: day(-310),
  },
  {
    id: 'sup-klongchan',
    supplierType: 'individual',
    title: 'นาง',
    firstName: 'วิภา',
    lastName: 'คลองจั่น',
    name: 'นางวิภา คลองจั่น',
    taxId: '3100502345678',
    phone: '02-731-5588',
    contactPerson: 'คุณวิภา คลองจั่น',
    address: '99/1 ถนนนวมินทร์ แขวงคลองจั่น เขตบางกะปิ กรุงเทพมหานคร 10240',
    isActive: true,
    createdAt: day(-180),
  },
  {
    id: 'sup-banglen',
    supplierType: 'individual',
    title: 'นาย',
    firstName: 'ประยุทธ',
    lastName: 'บางเลน',
    name: 'นายประยุทธ บางเลน',
    taxId: '3730102345678',
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
    addressLine: '8 ซอยพหลโยธิน 32',
    subdistrict: 'จันทรเกษม',
    district: 'จตุจักร',
    province: 'กรุงเทพมหานคร',
    postalCode: '10900',
    address: formatRouteAddress({ addressLine: '8 ซอยพหลโยธิน 32', subdistrict: 'จันทรเกษม', district: 'จตุจักร', province: 'กรุงเทพมหานคร', postalCode: '10900' }),
    latitude: 13.8021,
    longitude: 100.55,
    directions: 'ประตู 2 ตลาดนัดจตุจักร ฝั่งตรงข้ามสวนจตุจักร',
    contactPerson: 'คุณสมชาย ตลาดจตุจักร',
    phone: '02-123-4567',
    operatingHours: '04:00–09:00 น. (จันทร์, พฤหัสบดี)',
    isActive: true,
    createdAt: day(-600),
  },
  {
    id: 'sr-2',
    supplierId: 'sup-bkkwholesale',
    routeCode: 'SR-BKW-001',
    routeName: 'จุดรับสินค้าปากคลองตลาด',
    addressLine: '119 ถนนจักรเพชร',
    subdistrict: 'วังบูรพาภิรมย์',
    district: 'พระนคร',
    province: 'กรุงเทพมหานคร',
    postalCode: '10200',
    address: formatRouteAddress({ addressLine: '119 ถนนจักรเพชร', subdistrict: 'วังบูรพาภิรมย์', district: 'พระนคร', province: 'กรุงเทพมหานคร', postalCode: '10200' }),
    latitude: 13.7427,
    longitude: 100.4968,
    directions: 'ลานจอดรถหลังตลาดปากคลอง',
    contactPerson: 'คุณมาลี ปากคลอง',
    phone: '02-234-5678',
    operatingHours: '03:00–07:00 น. ทุกวัน',
    isActive: true,
    createdAt: day(-570),
  },
  {
    id: 'sr-3',
    supplierId: 'sup-dutch',
    routeCode: 'SR-DIC-001',
    routeName: 'คลังสินค้านำเข้าดัตช์ - บางจาก',
    addressLine: '99 อาคารดัตช์อิมพอร์ต ถนนสุขุมวิท',
    subdistrict: 'บางจาก',
    district: 'พระโขนง',
    province: 'กรุงเทพมหานคร',
    postalCode: '10260',
    address: formatRouteAddress({ addressLine: '99 อาคารดัตช์อิมพอร์ต ถนนสุขุมวิท', subdistrict: 'บางจาก', district: 'พระโขนง', province: 'กรุงเทพมหานคร', postalCode: '10260' }),
    latitude: 13.6862,
    longitude: 100.6039,
    directions: 'ท่าขนถ่ายสินค้าด้านหลังอาคาร',
    contactPerson: 'Mr. Johan de Vries',
    phone: '02-345-6789',
    operatingHours: '08:00–17:00 น. จันทร์-ศุกร์',
    isActive: true,
    createdAt: day(-530),
  },
  {
    id: 'sr-4',
    supplierId: 'sup-greenleaf',
    routeCode: 'SR-GLS-001',
    routeName: 'คลังบรรจุภัณฑ์สมุทรสาคร',
    addressLine: '55/3 หมู่ 4 ถนนเอกชัย',
    subdistrict: 'นาดี',
    district: 'เมืองสมุทรสาคร',
    province: 'สมุทรสาคร',
    postalCode: '74000',
    address: formatRouteAddress({ addressLine: '55/3 หมู่ 4 ถนนเอกชัย', subdistrict: 'นาดี', district: 'เมืองสมุทรสาคร', province: 'สมุทรสาคร', postalCode: '74000' }),
    latitude: 13.5475,
    longitude: 100.2744,
    contactPerson: 'คุณธนพล กรีนลีฟ',
    phone: '02-456-7890',
    operatingHours: '08:30–17:30 น. จันทร์-เสาร์',
    isActive: true,
    createdAt: day(-490),
  },
  {
    id: 'sr-5',
    supplierId: 'sup-patumma',
    routeCode: 'SR-PTM-001',
    routeName: 'สวนดอกกุหลาบแม่ริม',
    addressLine: '45/2 หมู่ 3',
    subdistrict: 'แม่แรม',
    district: 'แม่ริม',
    province: 'เชียงใหม่',
    postalCode: '50180',
    address: formatRouteAddress({ addressLine: '45/2 หมู่ 3', subdistrict: 'แม่แรม', district: 'แม่ริม', province: 'เชียงใหม่', postalCode: '50180' }),
    latitude: 18.9055,
    longitude: 98.942,
    directions: 'ทางเข้าสวนอยู่ก่อนถึงตลาดแม่ริม ป้ายสีเขียว',
    contactPerson: 'คุณสมหญิง ปทุมมา',
    phone: '053-201-4477',
    operatingHours: '06:00–10:00 น. ทุกวัน',
    isActive: true,
    createdAt: day(-300),
  },
  {
    id: 'sr-6',
    supplierId: 'sup-patumma',
    routeCode: 'SR-PTM-002',
    routeName: 'สวนคาร์เนชั่นสันทราย',
    addressLine: '78 หมู่ 5',
    subdistrict: 'สันนาเม็ง',
    district: 'สันทราย',
    province: 'เชียงใหม่',
    postalCode: '50210',
    address: formatRouteAddress({ addressLine: '78 หมู่ 5', subdistrict: 'สันนาเม็ง', district: 'สันทราย', province: 'เชียงใหม่', postalCode: '50210' }),
    latitude: 18.857,
    longitude: 99.042,
    contactPerson: 'คุณประเสริฐ สันทราย',
    phone: '053-884-2200',
    operatingHours: '06:30–10:30 น. ทุกวัน',
    isActive: true,
    createdAt: day(-280),
  },
  {
    id: 'sr-7',
    supplierId: 'sup-klongchan',
    routeCode: 'SR-KLC-001',
    routeName: 'สวนพฤกษชาติคลองจั่น',
    addressLine: '99/1 ถนนนวมินทร์',
    subdistrict: 'คลองจั่น',
    district: 'บางกะปิ',
    province: 'กรุงเทพมหานคร',
    postalCode: '10240',
    address: formatRouteAddress({ addressLine: '99/1 ถนนนวมินทร์', subdistrict: 'คลองจั่น', district: 'บางกะปิ', province: 'กรุงเทพมหานคร', postalCode: '10240' }),
    latitude: 13.784,
    longitude: 100.635,
    contactPerson: 'คุณวิภา คลองจั่น',
    phone: '02-731-5588',
    operatingHours: '06:00–11:00 น. ทุกวัน (นัดหมายล่วงหน้า)',
    isActive: true,
    createdAt: day(-180),
  },
  {
    id: 'sr-8',
    supplierId: 'sup-banglen',
    routeCode: 'SR-BGL-001',
    routeName: 'สวนกล้วยไม้บางเลน',
    addressLine: '12 หมู่ 6',
    subdistrict: 'บางเลน',
    district: 'บางเลน',
    province: 'นครปฐม',
    postalCode: '73130',
    address: formatRouteAddress({ addressLine: '12 หมู่ 6', subdistrict: 'บางเลน', district: 'บางเลน', province: 'นครปฐม', postalCode: '73130' }),
    latitude: 14.015,
    longitude: 100.16,
    contactPerson: 'คุณประยุทธ บางเลน',
    phone: '034-395-2211',
    isActive: false,
    createdAt: day(-720),
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
  return useCatalogStore.getState().rawMaterials.find((r) => r.id === id)
}

export function finishedGoodById(id: string) {
  return useCatalogStore.getState().finishedGoods.find((f) => f.id === id)
}

/** Sum(plannedQuantity x BOM quantityPerUnit) for every raw material touched by the given lines. */
export function computeRequiredQuantities(lines: PlanLine[]): Map<string, number> {
  const required = new Map<string, number>()
  for (const line of lines) {
    const entries = activeBomEntries().filter((b) => b.finishedGoodId === line.finishedGoodId)
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
