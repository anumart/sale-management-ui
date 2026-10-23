# Procurement & Logistics System - Project Context Document

**Project**: Bangkok Flower Sale Management System  
**Module**: Procurement, Production & Sales Management  
**Tech Stack**: ASP.NET Core + React + PostgreSQL/SQL Server  
**Last Updated**: September 2026  

---

## 1. Executive Summary

This document summarizes the **Procurement & Logistics Management System** covering:
- Purchase planning & template management
- Purchase order generation (grouped by Supplier + Route)
- Vehicle & vehicle route management  
- Vehicle run sheet generation & printing
- **NEW**: Post-delivery receipt recording with quantity reconciliation

---

## 2. System Scope & Key Modules

```
Overall Flow:
Purchase Planning
    ↓
Purchase Order (Group by: Supplier + SupplierRoute)
    ↓
Vehicle Route Assignment
    ↓
Vehicle Run Sheet Generation (FLOW 3a)
    ↓
Print Run Sheet (Driver takes to pickup)
    ↓
Record Delivery Receipt (FLOW 3b) ← NEW
    ↓
Update PO Status & Close Run Sheet
```

### 2.1 Procurement Module
- Create purchase templates from sales history
- View raw materials summary by supplier & route
- Multi-supplier, multi-route ordering with tracking
- Automatic purchase order generation

### 2.2 Logistics Module (NEW)
- Vehicle master data (code, license plate, driver, capacity)
- Vehicle route management (fixed daily routes with ordered stops)
- Vehicle run sheet generation (bundles POs for a specific vehicle+date)
- **Record delivery receipts** (actual quantities received vs. ordered)

---

## 3. Key Business Concepts

### 3.1 Supplier & Route Management

**Supplier** = บริษัท/ร้านดอกไม้หลัก (e.g., "Supplier A Co.")

**SupplierRoute** = สวน/สถานที่ส่งสินค้า (e.g., "Route A - Chiang Mai")  
- Each Supplier can have multiple Routes
- Each Route has a location, contact person, phone
- Raw materials and prices belong to the **Supplier** (`SupplierRawMaterial`), not to the Route — all routes of a supplier share the same catalog; the route only says where to pick up

**Supplier types** (`supplierType`):
| Type | Meaning | Type-specific fields |
|---|---|---|
| `individual` | บุคคลธรรมดา (e.g. a farmer) | `title`, `firstName`, `lastName` |
| `company` | นิติบุคคล | `companyName`, `branchCode` (5 digits, `00000` = head office) |

Common fields: `name` (display name, derived: individual = title+first+last, company = companyName), `contactPerson` (the person themself for individual), `phone`, `email?`, `address` (registered/head-office), `taxId?` (13-digit national ID for individual, corporate tax ID for company), `isActive`, `createdAt`.
Persistence suggestion: one `Suppliers` table with a `SupplierType` discriminator (EF Core TPH); type-specific columns nullable.

**SupplierRoute location** (a Supplier has 1..n routes/gardens; the route is where the vehicle drives to pick up goods):
- Address parts: `addressLine`, `subdistrict`, `district`, `province`, `postalCode`; `address` is the composed full text (kept denormalized for run sheets)
- Navigation: `latitude`, `longitude` (WGS84, both or neither), `mapUrl` (Google Maps link; if empty it is built from the coordinates), `directions` (landmarks / how to get in)
- Validation: postal code 5 digits; latitude −90..90; longitude −180..180; `mapUrl` must be http(s)
- Index `SupplierRoutes(SupplierId)`; coordinates are used later for route ordering/navigation (see future enhancements)

**SupplierRawMaterial** = Raw material a supplier sells (supplier unit, units per supplier unit, price)  
- Raw materials and prices belong to the **Supplier**, not to the Route. All routes of a supplier share the same catalog; a route only says where to pick up

**Example**:
```
Supplier A (ร้านดอกไม้ใหญ่)
├─ Route A (Chiang Mai): Ms. Dao (053-xxx)
│
├─ Route B (Nakhon Pathom): Mr. Som (034-xxx)
│
└─ Route C (Prachuap): Mr. Niran (032-xxx)

Supplier A raw materials (shared by all routes):
├─ Apple @ ฿18/kg
├─ Grape @ ฿25/kg
├─ Banana @ ฿15/kg
└─ Orange @ ฿16/kg
```

### 3.1.1 Raw Materials, Finished Goods & BOM (Master Data)

**Category** — one table for both catalogs, `kind` = `raw_material` | `finished_good`; fields `name`, `sortOrder`, `parentCategoryId?`.
- Two levels at most: a top-level **group** (ดอกไม้สด, บรรจุภัณฑ์, วัสดุปักและอุปกรณ์) and optional **children** under it (genus / variety type, e.g. Dendrobium, Mokara, Anthurium). A child cannot be a parent, and parent and child share the same `kind`
- Raw materials, families and finished goods may attach to either level. A report by group rolls up the group's own items plus all its children's (`categoryGroupId`)
- A category cannot be deleted while it has children, SKUs, families or finished goods
- `GET /api/categories?kind=` returns groups with their children
- Example: ดอกไม้สด › หวาย (Dendrobium) / โมกค่า (Mokara) / หน้าวัว (Anthurium); legacy `Prod_Type` maps to the child, whose parent is the group

**MaterialFamily** (variety) — groups SKU variants (sizes / grades) of one variety, e.g. `ANTH-CALISTO` with J / XL / L / M / S / SS SKUs
- `code` (unique), `nameTh`, `nameEn?`, `categoryId`, `color?`, `isActive`. A family has **no stock or price**; combined stock = sum of its SKUs
- Not a category (a category such as Dendrobium holds many varieties) and not a SKU
- `RawMaterial.familyId?` is optional (packaging and one-off items stand alone). Choosing a family pre-fills name / category / colour on the SKU form
- A family with SKUs cannot be deleted (deactivate, or move the SKUs out first)
- Deferred (level 2): BOM lines that reference a family and allow substitute sizes — wait until the business confirms sizes are substitutable

**RawMaterial** (SKU level — a grade or size variant is a **separate** raw material, e.g. long-stem and short-stem red rose are two SKUs)
- `sku`, `familyId?`, `nameTh` (required), `nameEn?`, `customerName?` (the name customers call it by — searchable, shown on customer-facing documents), `categoryId`, `unit` (base unit used by BOM / stock / planning), `grade?`, `size?`, `color?`, `description?`, `isActive`
- Added for legacy-system migration: `barcode?`, `reorderPoint?` (base unit), `standardCost?` (reference only; real purchase prices stay on `SupplierRawMaterial`)
- Direct sale: `isSellable` (default false) and `sellPrice?` (list price per base unit; customer / consignment prices stay in Sales). A sellable raw material is sold and its stock deducted **directly** — no production order and no one-line BOM finished good. Use a `FinishedGood` only when there is real processing (the unit changes, or labour / packaging is added, e.g. sorting stems into a 10-stem bunch, garlands). Follow-up (not built yet): customer-order lines reference `itemType` (`finished_good` | `raw_material`) + `itemId`
- Legacy mapping: `Code`→`sku`, `Name1`→`nameEn` (English name), `Name2`→`nameTh` (Thai name), `Name3`→`customerName` (customer-facing name; numeric EAN-like values go to `barcode` instead). `MaterialFamily.code` is derived from `Name1` (group by normalised value: trim, strip trailing `*`, case-insensitive), `Type`→`categoryId` (via a Type→Category map, case-insensitive), `Size`→`size`, `Color`→`color`, `UOM`→`unit`, `ROP`→`reorderPoint`, `Costs`→`standardCost`, `Active`→`isActive`, `FG_Type`/sold-as-is items→`isSellable`. `PackSize` (covered by `unitsPerSupplierUnit`) and `SalPrice` are not imported
- The unit a supplier sells in (bunch, box…) and its price live on `SupplierRawMaterial` (`supplierUnit`, `unitsPerSupplierUnit`, `pricePerSupplierUnit`) — see 3.1
- Stock on hand is an inventory concern (`RawMaterialInventory`); the `onHandQuantity` on the procurement mock is a snapshot only

**FinishedGood** (product)
- `sku`, `name`, `categoryId`, `unit`, `standardPrice` (list price; customer / consignment prices belong to Sales), `description?`, `imageUrl?`, `isActive`

**BOM (versioned)** — a finished good has many `BomVersion`s, each with `BomItem`s (`rawMaterialId`, `quantityPerUnit` in the raw material's base unit)
- `version` (1, 2, …) per finished good, `status` = `draft` | `active` | `archived`, `effectiveFrom`, `note?`
- Exactly **one** `active` version per finished good. Activating a new version archives the previous one; archived versions are kept
- Purchase planning and new production orders read the active version. A production order stores the allocated quantities (and should keep its `bomVersionId`), so editing a recipe never changes past orders
- Persistence: `Categories`, `MaterialFamilies`, `RawMaterials`, `FinishedGoods`, `BomVersions` (unique filtered index on `(FinishedGoodId)` where `Status = 'active'`), `BomItems`

### 3.2 Purchase Order Grouping (KEY CONCEPT)

**PO Grouping Logic**: 1 PO per (Supplier + SupplierRoute) combo

When creating POs from a template with multiple order lines:

```
Input order lines:
├─ Supplier A - Route A: Apple 500 Kg @ ฿18
├─ Supplier A - Route B: Sugar 300 Kg @ ฿25, Banana 200 Kg @ ฿15
├─ Supplier B - Route A: Apple 800 Kg @ ฿20, Vinegar 100 L @ ฿50
└─ Supplier C - Route C: Orange 300 Kg @ ฿16

System groups by (Supplier + Route) and creates:
├─ PO-001: Supplier A - Route A → Apple 500 Kg (฿9,000)
├─ PO-002: Supplier A - Route B → Sugar 300 Kg + Banana 200 Kg (฿10,500)
├─ PO-003: Supplier B - Route A → Apple 800 Kg + Vinegar 100 L (฿21,000)
└─ PO-004: Supplier C - Route C → Orange 300 Kg (฿4,800)
```

**Important**: Each PO has a unique pickup location & contact because each route is different!

### 3.3 Vehicle & Vehicle Route Management

**Vehicle** = รถจัดส่ง  
- Code: VH-001, License: กข-1234, Driver: Mr. Somchai, Capacity: 2,000 Kg

**VehicleRoute** = Fixed daily route (ordered sequence of stops) — **not tied to a vehicle**  
- Route A runs Mon-Fri every day
- A route is only the pickup-point mapping (stops + run days). The vehicle that actually runs it is recorded when the run sheet is generated, so any vehicle can run any route and one vehicle can run several routes in a day
- Each VehicleRoute has ordered stops (Stop 1 → Stop 2 → Stop 3)
- Each stop references a SupplierRoute (from the supplier master data)

**VehicleRouteStop** = An ordered pickup point within the route  
- Sequence determines pickup order (1, 2, 3...)
- References a SupplierRoute ID
- Contains denormalized supplier/route info for easy display

**Example**:
```
VehicleRoute A (Mon-Fri)
├─ Stop 1 (Seq 1): Supplier A - Route A (Chiang Mai)
├─ Stop 2 (Seq 2): Supplier B - Route C (Bangkok)
└─ Stop 3 (Seq 3): Supplier A - Route B (Nakhon Pathom)

Vehicle VH-001 (Mr. Somchai, 2,000 Kg capacity) — picked on the run sheet, not on the route
```

**Key Point**: A vehicle route can visit multiple suppliers in a single route!

### 3.4 Vehicle Run Sheet

**VehicleRunSheet** = Daily pickup document (ใบวิ่งรถ)  
- Created for 1 VehicleRoute + 1 Vehicle + 1 Date (the vehicle is chosen here; it is not stored on the route)
- Contains all POs whose pickup location matches a stop in the selected route
- Ordered by stop sequence

**Example Run Sheet** (VH-001 on 15-Jan-2024):
```
Run Sheet RS-2024-001-2024-01-15

Stop 1 (Seq 1): Supplier A - Route A (Chiang Mai)
├─ PO-2024-001: Apple 500 Kg @ ฿18/kg = ฿9,000
└─ Subtotal: ฿9,000

Stop 2 (Seq 2): Supplier B - Route C (Bangkok)
├─ PO-2024-003: Apple 800 Kg + Vinegar 100 L = ฿21,000
└─ Subtotal: ฿21,000

Stop 3 (Seq 3): Supplier A - Route B (Nakhon Pathom)
├─ PO-2024-002: Sugar 300 Kg + Banana 200 Kg = ฿10,500
└─ Subtotal: ฿10,500

Total Run: ฿40,500 | 3 Stops | 3 POs
```

---

## 4. FLOW 3a: Generate & Print Vehicle Run Sheet

**Actors**: Purchase Planning Staff / Logistics Manager

**Steps**:
1. Select Route, Vehicle & Date
2. System loads the selected VehicleRoute & finds all matching POs (Draft/Confirmed status)
3. Group POs by stop in sequence order
4. Show preview of run sheet (stops in order with POs bundled)
5. Print or export as PDF
6. Mark all POs as "Assigned" to this run sheet *(target design — not yet implemented; see §9)*

**Output**: Printable run sheet (1 per vehicle per day)

**Current implementation**: step 6 requires a real PO↔RunSheet link that doesn't exist yet (see §10). Today, printing only changes the run sheet's own status (`Draft` → `Printed`); no PO is touched.

---

## 5. FLOW 3b: Record Delivery Receipt (NEW)

**Actors**: Warehouse / Receiving Staff (after driver returns from pickup)

**Problem Solved**: Actual quantities received may NOT equal ordered quantities due to:
- Supplier had less stock than promised
- Items damaged during loading/pickup
- Supplier had extra items available (overstock)
- Route could not be completed (e.g., supplier closed)

**Steps**:
1. Staff finds the returned run sheet (status "Printed" in the list, matched by its Run Sheet # printed on the paper) and opens it
2. Staff explicitly confirms **"Driver Returned — Start Receipt"** — a deliberate button, not automatic just from opening the page. Status: "Printed" → "InProgress", `returnedDate` stamped
3. Per stop, per line item:
   - Display: Ordered Qty (from run sheet)
   - Input: Actual Received Qty
   - Input: Notes if different (e.g., "Grapes damaged", "Not ready")
   - **Save Draft** available any time — persists entries so far without requiring every field filled in and without changing status (stays "InProgress")
4. System calculates variance (Actual - Ordered)
5. Review summary:
   - Total ordered vs. total received
   - Variance % per stop
   - Flag items with significant variance (>5%)
6. Confirm receipt recording ("Confirm & Close Run Sheet")
7. System updates:
   - VehicleRunSheet status → "Completed"
   - Each PO's receivedQuantity / status (Received / PartialReceived / Cancelled) *(target design — not yet implemented; see §9)*

**Output**: Updated run sheet with actual receipts logged. PO status updates are deferred (see §9) — the confirmation message reflects only what actually happens today.

**Key Fields Captured**:
- actualReceivedQuantity (per line item)
- variance (calculated per line item & per stop)
- receivedNotes (per stop - reason for variance)
- completedDate & completedBy

---

## 6. Data Model Summary

### 6.1 Supplier & Route Entities
- **Supplier**: Main company
- **SupplierRoute**: Specific garden/location within supplier
- **SupplierRawMaterial**: RM the supplier sells (with price), shared by all its routes

### 6.2 Purchase Order Entities
- **PurchaseTemplate**: Template from sales history
- **TemplateRawMaterial**: RM needed for template
- **PurchaseOrder**: Grouped by (Supplier + SupplierRoute)
  - `supplierRouteId` (FK - which route to pickup from)
  - `receivedQuantity` (nullable - filled in FLOW 3b)
  - `status` (Draft → Assigned → InTransit → Received/PartialReceived)
- **PurchaseOrderLine**: Line item within PO
  - `orderedQuantity` (original order)
  - `receivedQuantity` (filled in FLOW 3b)
  - `variance` (calculated)

### 6.3 Vehicle & Route Entities
- **Vehicle**: Truck master data (code, license, driver, capacity)
- **VehicleRoute**: Fixed daily route (ordered stops, days of week); no vehicle reference
- **VehicleRouteStop**: Ordered stop referencing a SupplierRoute

### 6.4 Run Sheet Entities
- **VehicleRunSheet**: Daily pickup document
  - `status` (Draft → Printed → InProgress → Completed)
  - `runDate` (the date of the pickup run)
- **VehicleRunSheetStop**: Stop within run sheet
  - `sequence` (order of pickup)
  - `purchaseOrders[]` (0, 1, or many POs from this stop)
  - `totalOrderedQuantity` (sum of ordered qty for this stop)
  - `totalReceivedQuantity` (sum of actual qty - filled in FLOW 3b)
  - `variance` (calculated: actual - ordered)
  - `variancePercentage` (%)
  - `receivedNotes` (reason for variance)
  - `completedDate` & `completedBy` (from FLOW 3b)

---

## 7. Key API Endpoints

### Procurement
- `POST /api/purchase-templates` - Create template
- `POST /api/purchase-orders/generate-from-template` - Create POs (grouped by Supplier+Route)

### Master Data (Catalog)
- `GET/POST/PUT/DELETE /api/material-families` - CRUD families (delete rejected while it has SKUs); `GET /api/raw-materials?familyId=` lists a family's SKUs
- `GET/POST/PUT/DELETE /api/raw-materials` - CRUD raw materials, including `isSellable` / `sellPrice` (delete rejected when referenced by a BOM, supplier offer or production order — deactivate instead)
- `GET/POST/PUT/DELETE /api/finished-goods` - CRUD finished goods (delete rejected when referenced by production orders, LOTs or customer orders)
- `GET/POST /api/finished-goods/{id}/bom-versions` - list / create a draft BOM version
- `PUT/DELETE /api/bom-versions/{id}` - edit / delete a draft only
- `POST /api/bom-versions/{id}/activate` - make it the active version (previous active becomes archived)

### Logistics - Vehicle Management
- `GET/POST /api/vehicles` - CRUD vehicles
- `GET/POST /api/vehicle-routes` - CRUD vehicle routes (not nested under a vehicle)

### Logistics - Run Sheet Management (FLOW 3a)
- `POST /api/vehicle-run-sheets/generate` - Generate run sheet from vehicle+date
- `GET/POST /api/vehicle-run-sheets` - List/create run sheets
- `POST /api/vehicle-run-sheets/{id}/print` - Print run sheet

### Logistics - Receipt Recording (FLOW 3b) NEW
- `POST /api/vehicle-run-sheets/{id}/record-receipt` - Record actual quantities
  - Input: stops[] with lineItems[{ lineItemId, actualReceivedQuantity, variance, notes }]
  - Output: Updated run sheet with PO statuses changed

---

## 8. Frontend Screens

### Procurement
- Screen 1: Purchase Templates List
- Screen 2: Search Sales History & Select Products
- Screen 3: Review & Create Template
- Screen 4: Template Detail - Raw Materials View (select suppliers)
- Screen 5: Purchase Orders Summary

### Master Data (menu "ข้อมูลหลัก", `/catalog`)
- Finished goods list (add / edit / activate-deactivate / delete) and detail page with versioned BOM (create draft, edit draft, activate, delete draft)
- Raw materials list (add / edit / activate-deactivate / delete)

### Logistics
- Screen 6: Vehicle Master List
- Screen 7: Vehicle Routes Management
- Screen 8: Vehicle Run Sheet Generation (FLOW 3a)
  - Select Route + Vehicle + Date → Preview stops & POs → Print
- Screen 9: Vehicle Run Sheet - Printable View (A4 format)
- Screen 10: Record Delivery Receipt (FLOW 3b) NEW
  - Load completed run sheet → Record actual quantities → Review variance → Confirm

---

## 9. Status Lifecycle

### Purchase Order Status — Target Design
```
Draft → Assigned → InTransit → Received
                          └─→ PartialReceived
                          └─→ Cancelled
```

- **Draft**: Created but not assigned to any run sheet
- **Assigned**: Assigned to a run sheet, ready for pickup
- **InTransit**: Pickup started (run sheet marked "InProgress")
- **Received**: All items received (actualReceivedQty == orderedQuantity)
- **PartialReceived**: Some items received (0 < actualReceivedQty < orderedQuantity)
- **Cancelled**: No items received (actualReceivedQty == 0)

### Purchase Order Status — Current Implementation (Phase B)
The target lifecycle above requires POs and Run Sheets to be linked by a real foreign key, which doesn't exist yet (Phase C, not built — see §10). Until then, PO status is a smaller, standalone lifecycle driven only by manual actions on the Purchase Orders screen:
```
draft → sent → confirmed
  └────────┴─────────┴──→ cancelled   (any of the three, behind a confirm dialog)
```
- **draft → sent**: "Send to supplier" button
- **sent → confirmed**: "Mark supplier confirmed" button
- **→ cancelled**: "Cancel PO" button (destructive, asks for confirmation first)
- **received**: not reachable from the UI yet — only appears on pre-seeded example data until Phase C ships

### Vehicle Run Sheet Status
```
Draft → Printed → InProgress → Completed
```

- **Draft**: Created but not printed yet
- **Printed**: Printed and ready for driver (FLOW 3a complete) — out for pickup, driver not back yet
- **InProgress**: Driver has returned; reached **only** via the explicit "Driver Returned — Start Receipt" button (never automatically from opening the receipt page). "Save Draft" can update line items repeatedly while staying in this state
- **Completed**: All receipts recorded and closed (FLOW 3b complete)

---

## 10. Important Relationships

### Key Concept: PO → Run Sheet Relationship
```
Purchase Order
├─ supplierRouteId (e.g., "Supplier A - Route A")
└─ vehicleRunSheetId (nullable - filled when assigned to run)

Vehicle Route Stop
├─ supplierRouteId (e.g., "Supplier A - Route A")
└─ sequence (order in route)

Vehicle Run Sheet Stop
├─ supplierRouteId (e.g., "Supplier A - Route A")
├─ sequence (from VehicleRoute)
└─ purchaseOrders[] (auto-matched POs with same supplierRouteId)
```

**Auto-Matching Logic**: When generating a run sheet, system finds all POs where `PO.supplierRouteId` matches a stop's `SupplierRouteId`. This creates the relationship between POs and physical stops.

**Current implementation (Phase C not built)**: `PurchaseOrder` doesn't have a `supplierRouteId` or `vehicleRunSheetId` field yet, and Run Sheets don't pull from real `PurchaseOrder` records — they use a separate, disconnected mock dataset joined only by a display-only PO number string. The auto-matching and status roll-up described above is the target design once that link is built; §9's "Current Implementation" notes describe what actually runs today.

### Key Concept: Multiple POs per Stop
A single stop in a run sheet can have 0, 1, or multiple POs:
```
Stop 1 (Supplier A - Route A)
├─ PO-001: Apple 500 Kg
├─ PO-002: Sugar 300 Kg  ← Multiple POs from same supplier/route
└─ Subtotal: 800 Kg
```

---

## 11. Validation Rules & Edge Cases

### PO Grouping
- All order lines must have a SupplierRoute selected
- Cannot select same (Supplier + Route) twice per RM
- At least 1 supplier must be selected per RM

### Vehicle Run Sheet Generation
- Vehicle must be Active
- Vehicle Route must be Active
- Run Date must match route's days-of-week (e.g., Monday run only if route runs Mon-Fri)
- At least 1 stop must have matching POs

### Receipt Recording (FLOW 3b)
- "Driver Returned — Start Receipt" only allowed when status = "Printed"; sets "InProgress" — never automatic
- "Save Draft" only allowed when status = "InProgress"; does not require every line filled in, does not change status
- "Confirm & Close Run Sheet" allowed when status is "Printed" or "InProgress"
- All line items must have actualReceivedQuantity input before confirming
- Cannot record receipt for future-dated run sheets
- Actual qty must be >= 0

### Purchase Order Status (Phase B)
- draft → sent, cancelled
- sent → confirmed, cancelled
- confirmed → cancelled only (confirmed → received deferred to Phase C)
- Cancel requires confirmation dialog (destructive/irreversible)

---

## 12. Denormalization Strategy

For performance in printing & run sheet display, fields are denormalized:

**VehicleRunSheetStop contains**:
- SupplierRoute name, address, contact (copied from master)
- Total quantities & totals (calculated once, stored for fast access)
- Variance data (calculated, stored for display)

**VehicleRouteStop contains**:
- SupplierRoute name, address, contact (copied for easy display)

**Benefit**: No joins needed for printing run sheet document, fast query for list views

---

## 13. Error Handling & User Feedback

### Success Confirmations
- "Purchase orders created successfully with 4 orders (Supplier A, B, C)"
- "Run Sheet RS-2024-001-2024-01-15 generated successfully (3 stops, 3 POs)"
- "Receipt started for RS-2024-001-2024-01-15"
- "Draft saved"
- "Delivery receipt recorded successfully (2,000 Kg ordered, 1,805 Kg received, -9.75% variance)"
- "{poNumber} sent to {supplierName}" / "{poNumber} confirmed by {supplierName}" / "{poNumber} cancelled"

### Error Messages
- "Cannot select same supplier + route twice for same raw material"
- "All line items must have actual received quantity recorded"
- "Variance exceeds 20% for Stop 2, please confirm"
- "Run sheet not found or not in Printed/InProgress status"
- "This run sheet is still out for pickup. Confirm the driver has returned to start recording the receipt."

---

## 14. Future Enhancements

- GPS tracking for vehicle routes
- Barcode scanning for quick receipt verification
- Mobile app for driver/field staff
- Route optimization algorithm
- Real-time delivery notifications
- Supplier performance analytics
- Photo capture for damaged items
- Multi-language UI (Thai/English)

---

## 15. Architecture Notes

### Tech Stack
- **Backend**: ASP.NET Core 6+
- **Frontend**: React 18+ with TypeScript
- **Database**: PostgreSQL or SQL Server
- **ORM**: Entity Framework Core
- **API**: REST API with JWT authentication

### Design Patterns Used
- Entity Framework for ORM mapping
- FluentValidation for server-side validation
- Unit of Work pattern for transactions
- Repository pattern for data access
- Global exception handler middleware
- Redis caching for frequently accessed data

### Performance Considerations
- Index on: templateId, rawMaterialId, supplierRouteId, vehicleId, vehicleRunSheetId
- Pagination: 10-25 items per page
- Cache vehicle routes (10 min TTL)
- Cache supplier list (5 min TTL)
- Lazy load tables (virtual scrolling for >1000 rows)

---

**Document Status**: Complete (with Receipt Recording feature)  
**Ready for**: Development & Implementation
