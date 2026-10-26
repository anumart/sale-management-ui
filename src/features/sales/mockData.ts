import type { ConsignmentVisit, ConsignmentWeek, Customer, CustomerOrder, EmailImport, Invoice, SalesReport, ShopStock } from './types'

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString()
/** `offset` days from today at hh:00 local time — the cron job runs at 06:00 */
const at = (offset: number, hour: number) => {
  const d = new Date(Date.now() + offset * 86_400_000)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

/** Selling price per product (THB). Price is per product, not per LOT. */
export const productPrices: Record<string, number> = {
  'fg-rose': 450,
  'fg-tulip': 520,
  'fg-mixed': 890,
  'fg-orchid': 1200,
  'fg-sunflower': 320,
}

/** Consignment branches of the retail chains (the "Final_Market / store" split in the customer's weekly report). */
const branch = (id: string, code: string, chain: string, name: string, gpPercent: number, address: string): Customer => ({
  id,
  code,
  name,
  type: 'consignment',
  contactPerson: 'แผนกดอกไม้สด',
  phone: '02-555-0700',
  email: `${id.replace('cus-', '')}@example.com`,
  address,
  isActive: true,
  importProfile: null,
  chain,
  gpPercent,
})

const chainBranches: Customer[] = [
  branch('cus-tops-ladprao', 'C-S101', 'Tops', 'ท็อปส์ ลาดพร้าว', 32, 'ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900'),
  branch('cus-tops-chidlom', 'C-S102', 'Tops', 'ท็อปส์ ชิดลม', 32, 'ถนนเพลินจิต แขวงลุมพินี เขตปทุมวัน กรุงเทพมหานคร 10330'),
  branch('cus-tops-rama9', 'C-S103', 'Tops', 'ท็อปส์ พระราม 9', 32, 'ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310'),
  branch('cus-makro-wangnoi', 'C-S201', 'Makro', 'แม็คโคร วังน้อย', 25, 'ถนนพหลโยธิน ตำบลลำไทร อำเภอวังน้อย พระนครศรีอยุธยา 13170'),
  branch('cus-makro-pattaya', 'C-S202', 'Makro', 'แม็คโคร พัทยาใต้', 25, 'ถนนสุขุมวิท ตำบลหนองปรือ อำเภอบางละมุง ชลบุรี 20150'),
  branch('cus-lotuss-sukhumvit50', 'C-S301', "Lotus's", "โลตัส สุขุมวิท 50", 28, 'ถนนสุขุมวิท แขวงพระโขนง เขตคลองเตย กรุงเทพมหานคร 10260'),
  branch('cus-lotuss-fortune', 'C-S302', "Lotus's", "โลตัส ฟอร์จูนทาวน์", 28, 'ถนนรัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400'),
  branch('cus-villa-ratchaphruek', 'C-S401', 'Villa Market', 'วิลล่า ราชพฤกษ์', 30, 'ถนนราชพฤกษ์ ตำบลบางรักพัฒนา อำเภอบางบัวทอง นนทบุรี 11110'),
  branch('cus-mall-paragon', 'C-S501', 'The Mall', 'สยามพารากอน', 35, 'ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330'),
]

export const initialCustomers: Customer[] = [
  {
    id: 'cus-lotus',
    code: 'C-D001',
    name: 'โรงแรมโลตัส ริเวอร์ไซด์',
    type: 'direct',
    contactPerson: 'คุณอรทัย ฝ่ายจัดซื้อ',
    phone: '02-555-0101',
    email: 'orders@lotusriverside.example',
    address: '88 ถนนเจริญกรุง แขวงบางรัก เขตบางรัก กรุงเทพมหานคร 10500',
    isActive: true,
    chain: null,
    gpPercent: null,
    importProfile: {
      senderEmail: 'orders@lotusriverside.example',
      fileType: 'xlsx',
      headerRow: 4,
      productColumn: 'B',
      quantityColumn: 'D',
      deliveryDateCell: 'F2',
      skuMap: [
        { customerSku: 'LRH-RR12', finishedGoodId: 'fg-rose' },
        { customerSku: 'LRH-TL10', finishedGoodId: 'fg-tulip' },
        { customerSku: 'LRH-OR6', finishedGoodId: 'fg-orchid' },
      ],
    },
  },
  {
    id: 'cus-siamevent',
    code: 'C-D002',
    name: 'สยาม อีเวนต์ สตูดิโอ',
    type: 'direct',
    contactPerson: 'คุณภาณุ อีเวนต์',
    phone: '02-555-0202',
    email: 'purchase@siamevent.example',
    address: '19 ซอยสุขุมวิท 21 แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    isActive: true,
    chain: null,
    gpPercent: null,
    importProfile: {
      senderEmail: 'purchase@siamevent.example',
      fileType: 'csv',
      headerRow: 1,
      productColumn: 'item_code',
      quantityColumn: 'qty',
      deliveryDateCell: 'delivery_date',
      skuMap: [
        { customerSku: 'SE-MIX', finishedGoodId: 'fg-mixed' },
        { customerSku: 'SE-SUN', finishedGoodId: 'fg-sunflower' },
        { customerSku: 'SE-ROSE', finishedGoodId: 'fg-rose' },
      ],
    },
  },
  {
    id: 'cus-wedding',
    code: 'C-D003',
    name: 'เจ้าพระยา เวดดิ้ง เฮาส์',
    type: 'direct',
    contactPerson: 'คุณมยุรี เวดดิ้ง',
    phone: '02-555-0303',
    email: 'booking@cpwedding.example',
    address: '250 ถนนอรุณอมรินทร์ แขวงวัดอรุณ เขตบางกอกใหญ่ กรุงเทพมหานคร 10600',
    isActive: true,
    chain: null,
    gpPercent: null,
    importProfile: {
      senderEmail: 'booking@cpwedding.example',
      fileType: 'pdf',
      headerRow: 6,
      productColumn: 'Item',
      quantityColumn: 'Qty',
      deliveryDateCell: 'Event Date',
      skuMap: [
        { customerSku: 'CPW-ORCHID-BOX', finishedGoodId: 'fg-orchid' },
        { customerSku: 'CPW-ROSE', finishedGoodId: 'fg-rose' },
      ],
    },
  },
  {
    id: 'cus-ari',
    code: 'C-S001',
    name: 'ร้านดอกไม้หัวมุมอารีย์',
    type: 'consignment',
    contactPerson: 'คุณนิดา หน้าร้าน',
    phone: '081-555-0404',
    email: 'aricorner@example.com',
    address: '12 ซอยอารีย์ 1 แขวงสามเสนใน เขตพญาไท กรุงเทพมหานคร 10400',
    isActive: true,
    chain: 'ร้านอิสระ',
    gpPercent: 20,
    importProfile: null,
  },
  {
    id: 'cus-thonglor',
    code: 'C-S002',
    name: 'ทองหล่อ เดลี่ มาร์ท',
    type: 'consignment',
    contactPerson: 'คุณเอก ผู้จัดการร้าน',
    phone: '081-555-0505',
    email: 'thonglordaily@example.com',
    address: '55 ซอยทองหล่อ 13 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    isActive: true,
    chain: 'ร้านอิสระ',
    gpPercent: 20,
    importProfile: null,
  },
  {
    id: 'cus-sathorn',
    code: 'C-S003',
    name: 'บูธสถานีสาทร',
    type: 'consignment',
    contactPerson: 'คุณพร ประจำบูธ',
    phone: '081-555-0606',
    email: 'sathornkiosk@example.com',
    address: 'สถานีช่องนนทรี ถนนนราธิวาสราชนครินทร์ แขวงสีลม เขตบางรัก กรุงเทพมหานคร 10500',
    isActive: true,
    chain: 'ร้านอิสระ',
    gpPercent: 20,
    importProfile: null,
  },
  {
    id: 'cus-hana-jp',
    code: 'C-D101',
    name: 'Hana Flowers Co., Ltd. (ญี่ปุ่น)',
    type: 'direct',
    contactPerson: 'Mr. Sato',
    phone: '+81-3-5550-1234',
    email: 'sato@hana-flowers.example.jp',
    address: 'ส่งที่สนามบินสุวรรณภูมิ (ผู้ซื้ออยู่ที่โตเกียว)',
    isActive: true,
    importProfile: null,
    chain: null,
    gpPercent: null,
    country: 'ญี่ปุ่น',
    nameEn: 'Hana Flowers Co., Ltd.',
    addressEn: '2-11-5 Ota-ku, Tokyo 144-0052, Japan',
  },
  {
    id: 'cus-bloom-sg',
    code: 'C-D102',
    name: 'Bloom & Co. (สิงคโปร์)',
    type: 'direct',
    contactPerson: 'Ms. Tan',
    phone: '+65-6555-0188',
    email: 'tan@bloomco.example.sg',
    address: 'ส่งที่สนามบินสุวรรณภูมิ (ผู้ซื้ออยู่ที่สิงคโปร์)',
    isActive: true,
    importProfile: null,
    chain: null,
    gpPercent: null,
    country: 'สิงคโปร์',
    nameEn: 'Bloom & Co. Pte Ltd',
    addressEn: '18 Jalan Besar, Singapore 208787',
  },
  ...chainBranches,
]

export const initialImports: EmailImport[] = [
  {
    id: 'imp-1',
    receivedAt: at(-1, 6),
    fromAddress: 'orders@lotusriverside.example',
    subject: 'สั่งดอกไม้สำหรับพรุ่งนี้',
    attachmentName: 'LRH_PO_order.xlsx',
    customerId: 'cus-lotus',
    status: 'parsed',
    orderId: 'co-1',
    issues: [],
  },
  {
    id: 'imp-2',
    receivedAt: at(0, 6),
    fromAddress: 'purchase@siamevent.example',
    subject: 'สั่งของ - งานวันศุกร์',
    attachmentName: 'siam_event_order.csv',
    customerId: 'cus-siamevent',
    status: 'parsed',
    orderId: 'co-2',
    issues: [],
  },
  {
    id: 'imp-3',
    receivedAt: at(0, 6),
    fromAddress: 'booking@cpwedding.example',
    subject: 'ดอกไม้งานแต่ง - วันเสาร์',
    attachmentName: 'CPW_order_form.pdf',
    customerId: 'cus-wedding',
    status: 'needs_review',
    orderId: 'co-3',
    issues: ['แถว 3: รหัสสินค้า "CPW-LILY-12" ไม่อยู่ใน format ของลูกค้ารายนี้'],
  },
  {
    id: 'imp-4',
    receivedAt: at(0, 6),
    fromAddress: 'events@newvenue.example',
    subject: 'ใบเสนอราคาและสั่งซื้อ',
    attachmentName: 'order.docx',
    customerId: null,
    status: 'failed',
    orderId: null,
    issues: ['ไม่มี format ลูกค้าที่ตรงกับผู้ส่ง events@newvenue.example'],
  },
  {
    id: 'imp-5',
    receivedAt: at(-2, 6),
    fromAddress: 'booking@cpwedding.example',
    subject: 'ดอกไม้งานแต่ง - ห้องบอลรูม',
    attachmentName: 'CPW_order_form_ballroom.pdf',
    customerId: 'cus-wedding',
    status: 'parsed',
    orderId: 'co-4',
    issues: [],
  },
  {
    id: 'imp-6',
    receivedAt: at(-1, 6),
    fromAddress: 'purchase@siamevent.example',
    subject: 'สั่งของ - งานเปิดตัวสินค้า',
    attachmentName: 'siam_event_launch.csv',
    customerId: 'cus-siamevent',
    status: 'parsed',
    orderId: 'co-5',
    issues: [],
  },
  {
    id: 'imp-7',
    receivedAt: at(0, 6),
    fromAddress: 'orders@lotusriverside.example',
    subject: 'สั่งดอกไม้ประจำสัปดาห์ (ล็อบบี้และห้องอาหาร)',
    attachmentName: 'LRH_PO_weekly.xlsx',
    customerId: 'cus-lotus',
    status: 'parsed',
    orderId: 'co-6',
    issues: [],
  },
]

export const initialCustomerOrders: CustomerOrder[] = [
  {
    id: 'co-0',
    orderNumber: 'ORD-2026-0100',
    customerId: 'cus-lotus',
    importId: null,
    channel: 'email',
    platformName: null,
    platformOrderRef: null,
    deliverySheetId: null,
    receivedAt: at(-8, 6),
    requestedDeliveryDate: day(-5),
    status: 'delivered',
    lines: [
      { id: 'col-0a', customerSku: 'LRH-RR12', finishedGoodId: 'fg-rose', quantity: 12 },
      { id: 'col-0b', customerSku: 'LRH-OR6', finishedGoodId: 'fg-orchid', quantity: 4 },
    ],
    purchasePlanId: null,
    confirmedAt: at(-8, 8),
    deliveredAt: day(-5),
    deliveredLines: [
      { finishedGoodId: 'fg-rose', quantity: 12, batchNumbers: ['BH-2026-0090'] },
      { finishedGoodId: 'fg-orchid', quantity: 4, batchNumbers: ['BH-2026-0091'] },
    ],
    invoiceId: 'inv-1',
  },
  {
    id: 'co-1',
    orderNumber: 'ORD-2026-0101',
    customerId: 'cus-lotus',
    importId: 'imp-1',
    channel: 'email',
    platformName: null,
    platformOrderRef: null,
    deliverySheetId: null,
    receivedAt: at(-1, 6),
    requestedDeliveryDate: day(1),
    status: 'confirmed',
    lines: [
      { id: 'col-1a', customerSku: 'LRH-RR12', finishedGoodId: 'fg-rose', quantity: 16 },
      { id: 'col-1b', customerSku: 'LRH-TL10', finishedGoodId: 'fg-tulip', quantity: 9 },
    ],
    purchasePlanId: null,
    confirmedAt: at(-1, 8),
    deliveredAt: null,
    deliveredLines: [],
    invoiceId: null,
  },
  {
    id: 'co-2',
    orderNumber: 'ORD-2026-0102',
    customerId: 'cus-siamevent',
    importId: 'imp-2',
    channel: 'email',
    platformName: null,
    platformOrderRef: null,
    deliverySheetId: null,
    receivedAt: at(0, 6),
    requestedDeliveryDate: day(2),
    status: 'draft',
    lines: [
      { id: 'col-2a', customerSku: 'SE-MIX', finishedGoodId: 'fg-mixed', quantity: 8 },
      { id: 'col-2b', customerSku: 'SE-SUN', finishedGoodId: 'fg-sunflower', quantity: 20 },
    ],
    purchasePlanId: null,
    confirmedAt: null,
    deliveredAt: null,
    deliveredLines: [],
    invoiceId: null,
  },
  {
    id: 'co-3',
    orderNumber: 'ORD-2026-0103',
    customerId: 'cus-wedding',
    importId: 'imp-3',
    channel: 'email',
    platformName: null,
    platformOrderRef: null,
    deliverySheetId: null,
    receivedAt: at(0, 6),
    requestedDeliveryDate: day(3),
    status: 'draft',
    lines: [
      { id: 'col-3a', customerSku: 'CPW-ORCHID-BOX', finishedGoodId: 'fg-orchid', quantity: 6 },
      { id: 'col-3b', customerSku: 'CPW-LILY-12', finishedGoodId: null, quantity: 10 },
    ],
    purchasePlanId: null,
    confirmedAt: null,
    deliveredAt: null,
    deliveredLines: [],
    invoiceId: null,
  },
  // Confirmed, not yet produced and no purchase plan: these fill the "customer orders" source of the purchase-plan wizard
  {
    id: 'co-4',
    orderNumber: 'ORD-2026-0104',
    customerId: 'cus-wedding',
    importId: 'imp-5',
    channel: 'email',
    platformName: null,
    platformOrderRef: null,
    deliverySheetId: null,
    receivedAt: at(-2, 6),
    requestedDeliveryDate: day(4),
    status: 'confirmed',
    lines: [
      { id: 'col-4a', customerSku: 'CPW-ORCHID-BOX', finishedGoodId: 'fg-orchid', quantity: 30 },
      { id: 'col-4b', customerSku: 'CPW-ROSE', finishedGoodId: 'fg-rose', quantity: 40 },
    ],
    purchasePlanId: null,
    confirmedAt: at(-2, 9),
    deliveredAt: null,
    deliveredLines: [],
    invoiceId: null,
  },
  {
    id: 'co-5',
    orderNumber: 'ORD-2026-0105',
    customerId: 'cus-siamevent',
    importId: 'imp-6',
    channel: 'email',
    platformName: null,
    platformOrderRef: null,
    deliverySheetId: null,
    receivedAt: at(-1, 6),
    requestedDeliveryDate: day(5),
    status: 'confirmed',
    lines: [
      { id: 'col-5a', customerSku: 'SE-MIX', finishedGoodId: 'fg-mixed', quantity: 15 },
      { id: 'col-5b', customerSku: 'SE-SUN', finishedGoodId: 'fg-sunflower', quantity: 50 },
      { id: 'col-5c', customerSku: 'SE-ROSE', finishedGoodId: 'fg-rose', quantity: 24 },
    ],
    purchasePlanId: null,
    confirmedAt: at(-1, 9),
    deliveredAt: null,
    deliveredLines: [],
    invoiceId: null,
  },
  {
    id: 'co-6',
    orderNumber: 'ORD-2026-0106',
    customerId: 'cus-lotus',
    importId: 'imp-7',
    channel: 'email',
    platformName: null,
    platformOrderRef: null,
    deliverySheetId: null,
    receivedAt: at(0, 6),
    requestedDeliveryDate: day(3),
    status: 'confirmed',
    lines: [
      { id: 'col-6a', customerSku: 'LRH-RR12', finishedGoodId: 'fg-rose', quantity: 60 },
      { id: 'col-6b', customerSku: 'LRH-TL10', finishedGoodId: 'fg-tulip', quantity: 30 },
      { id: 'col-6c', customerSku: 'LRH-OR6', finishedGoodId: 'fg-orchid', quantity: 10 },
    ],
    purchasePlanId: null,
    confirmedAt: at(0, 9),
    deliveredAt: null,
    deliveredLines: [],
    invoiceId: null,
  },
  {
    id: 'co-7',
    orderNumber: 'ORD-2026-0107',
    customerId: 'cus-lotus',
    importId: null,
    receivedAt: at(0, 10),
    requestedDeliveryDate: day(1),
    channel: 'phone',
    platformName: null,
    platformOrderRef: null,
    deliverySheetId: null,
    status: 'confirmed',
    lines: [{ id: 'col-7a', customerSku: null, finishedGoodId: 'fg-mixed', quantity: 6 }],
    purchasePlanId: null,
    confirmedAt: at(0, 10),
    deliveredAt: null,
    deliveredLines: [],
    invoiceId: null,
  },
  {
    id: 'co-8',
    orderNumber: 'ORD-2026-0108',
    customerId: 'cus-hana-jp',
    importId: null,
    receivedAt: at(-1, 14),
    requestedDeliveryDate: day(1),
    channel: 'platform',
    platformName: 'FloraTrade',
    platformOrderRef: 'FT-88231',
    deliverySheetId: null,
    status: 'confirmed',
    lines: [
      { id: 'col-8a', customerSku: null, finishedGoodId: 'fg-orchid', quantity: 20 },
      { id: 'col-8b', customerSku: null, finishedGoodId: 'fg-rose', quantity: 30 },
    ],
    purchasePlanId: null,
    confirmedAt: at(-1, 14),
    deliveredAt: null,
    deliveredLines: [],
    invoiceId: null,
  },
  {
    id: 'co-9',
    orderNumber: 'ORD-2026-0109',
    customerId: 'cus-bloom-sg',
    importId: null,
    receivedAt: at(0, 9),
    requestedDeliveryDate: day(2),
    channel: 'platform',
    platformName: 'FloraTrade',
    platformOrderRef: 'FT-88307',
    deliverySheetId: null,
    status: 'confirmed',
    lines: [{ id: 'col-9a', customerSku: null, finishedGoodId: 'fg-orchid', quantity: 12 }],
    purchasePlanId: null,
    confirmedAt: at(0, 9),
    deliveredAt: null,
    deliveredLines: [],
    invoiceId: null,
  },
]

const lot = (n: number) => ({ batchNumber: `BH-2026-${String(n).padStart(4, '0')}`, barcode: `FG-2026-${String(n).padStart(4, '0')}` })

export const initialShopStock: ShopStock[] = [
  { customerId: 'cus-ari', finishedGoodId: 'fg-rose', ...lot(92), quantity: 8 },
  { customerId: 'cus-ari', finishedGoodId: 'fg-sunflower', ...lot(93), quantity: 9 },
  { customerId: 'cus-ari', finishedGoodId: 'fg-rose', ...lot(96), quantity: 15 },
  { customerId: 'cus-thonglor', finishedGoodId: 'fg-tulip', ...lot(94), quantity: 10 },
  { customerId: 'cus-thonglor', finishedGoodId: 'fg-mixed', ...lot(95), quantity: 4 },
]

export const initialVisits: ConsignmentVisit[] = [
  {
    id: 'vis-1',
    visitNumber: 'VIS-2026-0001',
    customerId: 'cus-ari',
    visitDate: day(-7),
    driverName: 'สมชาย ร.',
    status: 'signed',
    previousBalance: [],
    counted: [],
    spoiled: [],
    delivered: [
      { batchId: 'batch-092', finishedGoodId: 'fg-rose', ...lot(92), quantity: 20 },
      { batchId: 'batch-093', finishedGoodId: 'fg-sunflower', ...lot(93), quantity: 15 },
    ],
    signedBy: 'คุณนิดา',
    signedAt: day(-7),
  },
  {
    id: 'vis-2',
    visitNumber: 'VIS-2026-0002',
    customerId: 'cus-thonglor',
    visitDate: day(-5),
    driverName: 'สมชาย ร.',
    status: 'signed',
    previousBalance: [],
    counted: [],
    spoiled: [],
    delivered: [
      { batchId: 'batch-094', finishedGoodId: 'fg-tulip', ...lot(94), quantity: 10 },
      { batchId: 'batch-095', finishedGoodId: 'fg-mixed', ...lot(95), quantity: 4 },
    ],
    signedBy: 'คุณเอก',
    signedAt: day(-5),
  },
  {
    id: 'vis-3',
    visitNumber: 'VIS-2026-0003',
    customerId: 'cus-ari',
    visitDate: day(-3),
    driverName: 'สมชาย ร.',
    status: 'signed',
    previousBalance: [
      { finishedGoodId: 'fg-rose', ...lot(92), quantity: 20 },
      { finishedGoodId: 'fg-sunflower', ...lot(93), quantity: 15 },
    ],
    counted: [
      { finishedGoodId: 'fg-rose', ...lot(92), quantity: 8 },
      { finishedGoodId: 'fg-sunflower', ...lot(93), quantity: 9 },
    ],
    spoiled: [
      { finishedGoodId: 'fg-rose', ...lot(92), quantity: 2 },
      { finishedGoodId: 'fg-sunflower', ...lot(93), quantity: 1 },
    ],
    delivered: [{ batchId: 'batch-096', finishedGoodId: 'fg-rose', ...lot(96), quantity: 15 }],
    signedBy: 'คุณนิดา',
    signedAt: day(-3),
  },
  {
    id: 'vis-4',
    visitNumber: 'VIS-2026-0004',
    customerId: 'cus-thonglor',
    visitDate: day(0),
    driverName: 'สมชาย ร.',
    status: 'draft',
    previousBalance: [
      { finishedGoodId: 'fg-tulip', ...lot(94), quantity: 10 },
      { finishedGoodId: 'fg-mixed', ...lot(95), quantity: 4 },
    ],
    counted: [],
    spoiled: [],
    delivered: [],
    signedBy: null,
    signedAt: null,
  },
]

export const initialSalesReports: SalesReport[] = [
  {
    id: 'sr-1',
    reportNumber: 'SR-2026-0001',
    customerId: 'cus-ari',
    receivedAt: day(-1),
    periodFrom: day(-8),
    periodTo: day(-2),
    lines: [
      { finishedGoodId: 'fg-rose', reportedQuantity: 10, confirmedQuantity: null },
      { finishedGoodId: 'fg-sunflower', reportedQuantity: 4, confirmedQuantity: null },
    ],
    status: 'pending',
    note: '',
    invoiceId: null,
  },
]

export const initialInvoices: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-0101',
    customerId: 'cus-lotus',
    source: 'customer_order',
    sourceId: 'co-0',
    issuedAt: day(-5),
    dueDate: day(25),
    lines: [
      { finishedGoodId: 'fg-rose', quantity: 12, unitPrice: 450 },
      { finishedGoodId: 'fg-orchid', quantity: 4, unitPrice: 1200 },
    ],
    status: 'paid',
    paidAt: day(-1),
  },
]

/** Small deterministic PRNG so the seeded history is the same on every reload. */
function rng(seed: number) {
  let t = seed
  return () => {
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Monday 00:00 (local) of the week `offset` weeks from this one, as yyyy-mm-dd. */
export function weekStartOf(date: Date | string, offset = 0) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const HISTORY_WEEKS = 12

/** Weekly units delivered per product, and how much of it comes back spoiled, per branch. */
const branchProfiles: { customerId: string; volume: number; waste: number; mix: Partial<Record<string, number>> }[] = [
  { customerId: 'cus-tops-ladprao', volume: 220, waste: 0.09, mix: { 'fg-rose': 0.4, 'fg-sunflower': 0.3, 'fg-mixed': 0.15, 'fg-orchid': 0.15 } },
  { customerId: 'cus-tops-chidlom', volume: 190, waste: 0.1, mix: { 'fg-rose': 0.35, 'fg-tulip': 0.2, 'fg-orchid': 0.25, 'fg-mixed': 0.2 } },
  { customerId: 'cus-tops-rama9', volume: 150, waste: 0.11, mix: { 'fg-rose': 0.45, 'fg-sunflower': 0.35, 'fg-mixed': 0.2 } },
  { customerId: 'cus-makro-wangnoi', volume: 260, waste: 0.06, mix: { 'fg-rose': 0.5, 'fg-sunflower': 0.5 } },
  { customerId: 'cus-makro-pattaya', volume: 210, waste: 0.07, mix: { 'fg-rose': 0.5, 'fg-sunflower': 0.3, 'fg-mixed': 0.2 } },
  { customerId: 'cus-lotuss-sukhumvit50', volume: 120, waste: 0.08, mix: { 'fg-rose': 0.5, 'fg-sunflower': 0.5 } },
  { customerId: 'cus-lotuss-fortune', volume: 95, waste: 0.1, mix: { 'fg-rose': 0.4, 'fg-sunflower': 0.4, 'fg-tulip': 0.2 } },
  { customerId: 'cus-villa-ratchaphruek', volume: 110, waste: 0.19, mix: { 'fg-tulip': 0.35, 'fg-orchid': 0.3, 'fg-mixed': 0.35 } },
  { customerId: 'cus-mall-paragon', volume: 60, waste: 0.13, mix: { 'fg-orchid': 0.5, 'fg-mixed': 0.3, 'fg-tulip': 0.2 } },
]

/** Weeks ago that carried a festival peak (Mother's Day mid-August in the seed). */
const PEAK_WEEKS_AGO = 8
/** Branch whose sales reports stopped coming in — the history leaves `sold` empty for its last weeks. */
const LATE_REPORTER = { customerId: 'cus-makro-pattaya', weeks: 2 }

/** The last {@link HISTORY_WEEKS} complete weeks of consignment movements at the chain branches. */
export const initialConsignmentWeeks: ConsignmentWeek[] = branchProfiles.flatMap((profile, p) => {
  const rand = rng(1000 + p)
  const rows: ConsignmentWeek[] = []
  for (let ago = HISTORY_WEEKS; ago >= 1; ago--) {
    const peak = ago === PEAK_WEEKS_AGO ? 1.9 : 1
    for (const [finishedGoodId, share] of Object.entries(profile.mix)) {
      const delivered = Math.round(profile.volume * share! * peak * (0.85 + rand() * 0.3))
      const spoiled = Math.round(delivered * profile.waste * (0.7 + rand() * 0.6))
      // What's left on the shelf rolls into next week, so sold drifts a little around delivered - spoiled
      const sold = Math.max(0, Math.round((delivered - spoiled) * (0.93 + rand() * 0.1)))
      const unreported = profile.customerId === LATE_REPORTER.customerId && ago <= LATE_REPORTER.weeks
      rows.push({ weekStart: weekStartOf(new Date(), -ago), customerId: profile.customerId, finishedGoodId, delivered, spoiled, sold: unreported ? null : sold })
    }
  }
  return rows
})
