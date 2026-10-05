import type { PendingOrderLine, PickupPoint, Vehicle, VehicleRoute } from './types'

export const pickupPoints: PickupPoint[] = [
  { id: 'pp-1', supplierName: 'ตลาดดอกไม้จตุจักร', routeName: 'เส้นทาง A - เชียงใหม่', location: 'เชียงใหม่', contactPerson: 'คุณดาว', phone: '053-201-4477' },
  { id: 'pp-2', supplierName: 'บางกอก ฟลาวเวอร์ ค้าส่ง', routeName: 'เส้นทาง C - กรุงเทพฯ', location: 'กรุงเทพฯ (ปากคลองตลาด)', contactPerson: 'คุณอนันต์', phone: '02-224-5566' },
  { id: 'pp-3', supplierName: 'ตลาดดอกไม้จตุจักร', routeName: 'เส้นทาง B - นครปฐม', location: 'นครปฐม', contactPerson: 'คุณสม', phone: '034-512-3390' },
  { id: 'pp-4', supplierName: 'บริษัท ดัตช์ อิมพอร์ต จำกัด', routeName: 'เส้นทาง C - ประจวบฯ', location: 'ประจวบคีรีขันธ์', contactPerson: 'คุณนิรันดร์', phone: '032-611-2280' },
  { id: 'pp-5', supplierName: 'กรีนลีฟ ซัพพลาย', routeName: 'เส้นทาง A - ราชบุรี', location: 'ราชบุรี', contactPerson: 'คุณกัญญา', phone: '032-771-9020' },
]

export function pickupPointById(id: string) {
  return pickupPoints.find((p) => p.id === id)
}

export const initialVehicles: Vehicle[] = [
  { id: 'v-1', code: 'VH-001', licensePlate: '1กข-1234 กรุงเทพฯ', driverName: 'สมชาย ใจดี', driverPhone: '081-234-5678', capacityKg: 2000, status: 'active' },
  { id: 'v-2', code: 'VH-002', licensePlate: '2ขค-5678 นครปฐม', driverName: 'นิรันดร์ สุขสวัสดิ์', driverPhone: '086-345-6789', capacityKg: 1500, status: 'active' },
  { id: 'v-3', code: 'VH-003', licensePlate: '3คง-9012 กรุงเทพฯ', driverName: 'ปรีชา บุญมี', driverPhone: '089-456-7890', capacityKg: 3000, status: 'inactive' },
]

export const initialVehicleRoutes: VehicleRoute[] = [
  {
    id: 'vr-1',
    vehicleId: 'v-1',
    routeName: 'เส้นทาง A (วนเหนือ)',
    runDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    isActive: true,
    stops: [
      { id: 'st-1', sequence: 1, pickupPointId: 'pp-1' },
      { id: 'st-2', sequence: 2, pickupPointId: 'pp-2' },
      { id: 'st-3', sequence: 3, pickupPointId: 'pp-3' },
    ],
  },
  {
    id: 'vr-2',
    vehicleId: 'v-2',
    routeName: 'เส้นทาง B (วนใต้)',
    runDays: ['Mon', 'Wed', 'Fri'],
    isActive: true,
    stops: [{ id: 'st-4', sequence: 1, pickupPointId: 'pp-4' }],
  },
]

/** Purchase order lines confirmed but not yet assigned to a run sheet — matched by pickup point when generating one. */
export const initialPendingOrders: PendingOrderLine[] = [
  { id: 'pol-1', poNumber: 'PO-2026-1101', pickupPointId: 'pp-1', rawMaterialName: 'กุหลาบแดง (ก้าน)', unit: 'ก้าน', orderedQuantity: 1500, pricePerUnit: 15.5 },
  { id: 'pol-2', poNumber: 'PO-2026-1102', pickupPointId: 'pp-2', rawMaterialName: 'ทิวลิป (ก้าน)', unit: 'ก้าน', orderedQuantity: 600, pricePerUnit: 13.5 },
  { id: 'pol-3', poNumber: 'PO-2026-1103', pickupPointId: 'pp-4', rawMaterialName: 'กุหลาบแดง (ก้าน)', unit: 'ก้าน', orderedQuantity: 700, pricePerUnit: 12.8 },
]
