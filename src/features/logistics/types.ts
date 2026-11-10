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

/** A pickup point = an existing SupplierRoute ("garden"), read from the procurement store — its id is the SupplierRoute id. */
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

/** A fixed daily route: an ordered list of stops, each an existing pickup point. Not tied to a vehicle — the vehicle is chosen when the run sheet is generated. */
export interface VehicleRoute {
  id: string
  routeName: string
  runDays: DayOfWeek[]
  isActive: boolean
  stops: RouteStop[]
}

/**
 * One stop of a run sheet = one pickup point. It points at the purchase orders collected there; their lines (and what was
 * actually received) are read from the procurement store, so editing a PO after the sheet is printed shows up here too.
 */
export interface RunSheetStop {
  id: string
  sequence: number
  pickupPointId: string
  purchaseOrderIds: string[]
  receivedNotes: string
  /** When staff saved this stop's receipt ("ตรวจแล้ว"); null until checked. Every stop must be checked before the sheet can be confirmed. */
  checkedAt: string | null
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

/** consignment_route = a consignment sales route's shops in order; direct = customer orders (domestic or export). Never mixed on one sheet. */
export type DeliverySheetType = 'consignment_route' | 'direct'
/** Stored status. `completed` is derived: a printed sheet whose stops are all resolved (and, for route sheets, whose returns are recorded). */
export type DeliverySheetStatus = 'draft' | 'printed' | 'completed' | 'cancelled'
export type DeliveryStopStatus = 'pending' | 'done' | 'failed'

export interface DeliveryStop {
  id: string
  sequence: number
  customerId: string
  /** Direct sheets: the order being delivered */
  customerOrderId: string | null
  /** Route sheets: the check sheet made for this shop */
  visitId: string | null
  /** Set when the stop could not be delivered */
  failReason: string | null
}

/** Route sheets: what goes on the truck for one product and what comes back. */
export interface DeliveryLoadLine {
  finishedGoodId: string
  loadedQuantity: number
  /** null until the driver is back and staff record the leftovers */
  returnedQuantity: number | null
}

export interface DeliverySheet {
  id: string
  sheetNumber: string
  sheetType: DeliverySheetType
  /** yyyy-mm-dd */
  deliveryDate: string
  vehicleId: string
  driverName: string
  consignmentRouteId: string | null
  consignmentEstimateId: string | null
  status: Exclude<DeliverySheetStatus, 'completed'>
  createdAt: string
  /** Trip order of the day: no departure time, the sheets of one day are ordered by when they were printed */
  printedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  returnRecordedAt: string | null
  loadLines: DeliveryLoadLine[]
  stops: DeliveryStop[]
}
