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

/** A fixed daily route: an ordered list of stops, each an existing pickup point. Not tied to a vehicle — the vehicle is chosen when the run sheet is generated. */
export interface VehicleRoute {
  id: string
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
