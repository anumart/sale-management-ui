import { useProcurementStore } from '@/features/procurement/store'
import type { SupplierRoute } from '@/features/procurement/types'
import type { PickupPoint, Vehicle, VehicleRoute } from './types'

const toPickupPoint = (route: SupplierRoute): PickupPoint => {
  const { suppliers } = useProcurementStore.getState()
  return {
    id: route.id,
    supplierName: suppliers.find((sup) => sup.id === route.supplierId)?.name ?? '—',
    routeName: route.routeName,
    location: route.province === 'กรุงเทพมหานคร' ? route.district : route.province,
    contactPerson: route.contactPerson,
    phone: route.phone,
  }
}

/** Pickup points a route can stop at: the active pickup points (SupplierRoutes) of active suppliers. */
export function getPickupPoints(): PickupPoint[] {
  const { supplierRoutes, suppliers } = useProcurementStore.getState()
  return supplierRoutes.filter((r) => r.isActive && suppliers.find((sup) => sup.id === r.supplierId)?.isActive).map(toPickupPoint)
}

export function pickupPointById(id: string): PickupPoint | undefined {
  const route = useProcurementStore.getState().supplierRoutes.find((r) => r.id === id)
  return route ? toPickupPoint(route) : undefined
}

export const initialVehicles: Vehicle[] = [
  { id: 'v-1', code: 'VH-001', licensePlate: '1กข-1234 กรุงเทพฯ', driverName: 'สมชาย ใจดี', driverPhone: '081-234-5678', capacityKg: 2000, status: 'active' },
  { id: 'v-2', code: 'VH-002', licensePlate: '2ขค-5678 นครปฐม', driverName: 'นิรันดร์ สุขสวัสดิ์', driverPhone: '086-345-6789', capacityKg: 1500, status: 'active' },
  { id: 'v-3', code: 'VH-003', licensePlate: '3คง-9012 กรุงเทพฯ', driverName: 'ปรีชา บุญมี', driverPhone: '089-456-7890', capacityKg: 3000, status: 'inactive' },
]

export const initialVehicleRoutes: VehicleRoute[] = [
  {
    id: 'vr-1',
    routeName: 'เส้นทาง A (วนเหนือ)',
    runDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    isActive: true,
    stops: [
      { id: 'st-1', sequence: 1, pickupPointId: 'sr-1' },
      { id: 'st-2', sequence: 2, pickupPointId: 'sr-2' },
      { id: 'st-3', sequence: 3, pickupPointId: 'sr-3' },
    ],
  },
  {
    id: 'vr-2',
    routeName: 'เส้นทาง B (วนใต้)',
    runDays: ['Mon', 'Wed', 'Fri'],
    isActive: true,
    stops: [{ id: 'st-4', sequence: 1, pickupPointId: 'sr-4' }],
  },
]
