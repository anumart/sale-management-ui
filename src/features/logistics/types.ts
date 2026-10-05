export type VehicleStatus = 'active' | 'inactive'
export type RunSheetStatus = 'draft' | 'printed' | 'in_progress' | 'completed'

export const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export type DayOfWeek = (typeof daysOfWeek)[number]

export const dayLabel: Record<DayOfWeek, string> = { Mon: 'จ.', Tue: 'อ.', Wed: 'พ.', Thu: 'พฤ.', Fri: 'ศ.', Sat: 'ส.', Sun: 'อา.' }

export interface Vehicle {
  id: string
  code: string
  licensePlate: string
  driverName: string
  driverPhone: string
  capacityKg: number
  status: VehicleStatus
}

/** A pickup point = an existing SupplierRoute ("garden") — see PROCUREMENT_SYSTEM_DESIGN.md Business Context. */
export interface PickupPoint {
  id: string
  supplierName: string
  routeName: string
  location: string
  contactPerson: string
  phone: string
}

export interface RouteStop {
  id: string
  sequence: number
  pickupPointId: string
}

/** A vehicle's fixed daily route: an ordered list of stops, each an existing pickup point. */
export interface VehicleRoute {
  id: string
  vehicleId: string
  routeName: string
  runDays: DayOfWeek[]
  isActive: boolean
  stops: RouteStop[]
}

/** A purchase order line waiting to be picked up (not yet assigned to a run sheet). */
export interface PendingOrderLine {
  id: string
  poNumber: string
  pickupPointId: string
  rawMaterialName: string
  unit: string
  orderedQuantity: number
  pricePerUnit: number
}

/** Same shape once bundled into a run sheet stop, plus the FLOW 3b receipt fields. */
export interface ReceiptLineItem {
  id: string
  poNumber: string
  rawMaterialName: string
  unit: string
  orderedQuantity: number
  pricePerUnit: number
  /** null until FLOW 3b records the actual quantity received */
  actualReceivedQuantity: number | null
}

export interface RunSheetStop {
  id: string
  sequence: number
  pickupPointId: string
  lineItems: ReceiptLineItem[]
  receivedNotes: string
}

export interface RunSheet {
  id: string
  runSheetNumber: string
  vehicleId: string
  vehicleRouteId: string
  runDate: string
  status: RunSheetStatus
  createdAt: string
  printedAt: string | null
  /** Set when staff confirm "Driver Returned — Start Receipt" (printed → in_progress) */
  returnedAt: string | null
  completedAt: string | null
  stops: RunSheetStop[]
}
