# Procurement, Production, Manufacturing & Sales - Design Document

**System**: Purchase Planning, Production & Sales Management System  
**Module**: Purchase Planning with Template/Master + Vehicle Logistics + Production Planning + Manufacturing + Sales  
**Tech Stack**: ASP.NET Core + React + PostgreSQL/SQL Server  
**Version**: 3.0 (Added Production Planning, Manufacturing & Sales flow — target design)  
**Date**: 2024-2026  

> **Scope note**: This is one document covering two very different states. **Procurement & Logistics** (FLOW 1–3b, the Business Context entries for Supplier/Route and Vehicle/Route, Data Architecture entities #1–14, and their API endpoints) are **built** in the current frontend (`src/features/procurement`, `src/features/logistics`). Everything else added in v3.0 — **Production Planning, Manufacturing, Finished Goods & Sales** (FLOW 4–8, the Production Line business context, Data Architecture entities #15–19, and the Production/Manufacturing API endpoints) is **target design only**: no corresponding code exists yet in this repo. Every new subsection is individually marked "(Target Design)" so this stays clear even when a section is read in isolation.

---

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Business Context](#business-context)
   - [Supplier & Route Management](#supplier--route-management)
   - [Vehicle & Vehicle Route Management](#vehicle--vehicle-route-management)
   - [Production Line & Capacity Management](#production-line--capacity-management-target-design)
3. [User Flows](#user-flows)
   - [FLOW 1: Create Purchase Template](#flow-1-create-purchase-templatemaster)
   - [FLOW 2: Use Template to Create Purchase Orders](#flow-2-use-template-to-create-purchase-orders)
   - [FLOW 2.1: Purchase Order Grouping by Supplier + Route](#flow-21-create-purchase-orders---grouping-by-supplier--route-detailed)
   - [FLOW 3a: Generate & Print Vehicle Run Sheet](#flow-3a-generate--print-vehicle-run-sheet)
   - [FLOW 3b: Record Delivery Receipt](#flow-3b-record-delivery-receipt)
   - [FLOW 4: AI Production Planning](#flow-4-ai-production-planning-target-design)
   - [FLOW 5: Approve & Create Production Orders](#flow-5-approve--create-production-orders-target-design)
   - [FLOW 6: Manufacturing Execution](#flow-6-manufacturing-execution-target-design)
   - [FLOW 7: Finished Goods Registration](#flow-7-finished-goods-registration-target-design)
   - [FLOW 8: Sales & Distribution (Next Phase)](#flow-8-sales--distribution-next-phase)
4. [Data Architecture](#data-architecture)
   - [Production, Inventory & Finished Goods Entities (Target Design)](#production-inventory--finished-goods-entities-target-design)
5. [Frontend Architecture](#frontend-architecture)
   - [UI Components & Screens](#ui-components--screens)
   - [Navigation & Routing](#navigation--routing)
6. [Backend Architecture](#backend-architecture)
   - [API Endpoints](#api-endpoints)
   - [Production Planning & Manufacturing Endpoints (Target Design)](#production-planning--manufacturing-endpoints-target-design)
   - [Purchase Order Generation Logic](#purchase-order-generation-logic--critical-implementation)
   - [Status Lifecycles — Production & Inventory (Target Design)](#status-lifecycles--production--inventory-target-design)
   - [Validation Rules](#validation-rules)
   - [Error Handling & Messages](#error-handling--validation-messages)
7. [Design Guidelines](#design-guidelines)
   - [Color & Typography](#color--typography)
   - [Component Library](#component-library)
   - [Accessibility & UX](#accessibility--ux-guidelines)
8. [Performance & Deployment](#performance--deployment)
   - [Performance Considerations](#performance-considerations)
   - [Responsive Design](#responsive-design-breakpoints)
9. [Implementation Notes](#implementation-notes)
10. [Risks & Mitigation (Production Planning)](#risks--mitigation-production-planning)
11. [Implementation Roadmap](#implementation-roadmap)
12. [Future Enhancements](#future-enhancements)

---

## System Overview

### Purpose
Purchase Planning Template/Master system ช่วยให้พนักงานจัดซื้อสามารถ:
1. สร้าง Purchase Plan Template จากยอดขายในอดีต
2. ใช้ Template เพื่อวางแผนการสั่งซื้อจากหลาย Suppliers
3. สร้าง Purchase Orders (PO) จากแผนที่เตรียมไว้
4. จัดการเส้นทางรถและสร้าง Run Sheet สำหรับจัดส่ง

### Key Features
- ✅ Search & create template from sales history
- ✅ View raw materials summary by supplier & route
- ✅ Multi-supplier, multi-route ordering with tracking
- ✅ Automatic purchase order generation (grouped by Supplier + Route)
- ✅ Vehicle & vehicle route management (master data)
- ✅ Vehicle run sheet generation & printing (daily pickup routes)
- ✅ Inventory reservation & balance checking
- ⏳ AI-based production planning (target design — FLOW 4-5, not yet implemented)
- ⏳ Manufacturing execution & QC tracking (target design — FLOW 6, not yet implemented)
- ⏳ Finished goods batch registration & traceability (target design — FLOW 7, not yet implemented)
- ⏳ Sales & distribution (next phase — FLOW 8, not yet designed in detail)

---

## Business Context

### Supplier & Route Management

**Scenario**: Supplier (ร้านดอกไม้) 1 ร้าน มีหลายสวน/สถานที่

```
Supplier A (ร้านดอกไม้ใหญ่)
├─ Route A: สวน Chiang Mai - Ms. Dao (053-xxx)
│  └─ Apple: 1,000 Kg @ ฿18/kg
│  └─ Grape: 500 Kg @ ฿25/kg
│
├─ Route B: สวน Nakhon Pathom - Mr. Som (034-xxx)
│  └─ Apple: 800 Kg @ ฿20/kg
│  └─ Banana: 600 Kg @ ฿15/kg
│
└─ Route C: สวน Prachuap - Mr. Niran (032-xxx)
   └─ Orange: 2,000 Kg @ ฿16/kg
   └─ Pineapple: 900 Kg @ ฿22/kg
```

**Key Changes**:
1. **Supplier** = ร้านดอกไม้หลัก (บริษัท)
2. **SupplierRoute** = สวน/สถานที่ส่งสินค้า (หลายแห่ง)
3. **SupplierRouteRawMaterial** = สินค้าจากแต่ละสวน (ราคาอาจต่างกัน)

---

### Vehicle & Vehicle Route Management

**Scenario**: เส้นทางประจำ (Vehicle Route) คือลำดับ stop และวันที่วิ่ง ไม่ผูกกับรถ รถที่วิ่งจริงเลือกตอนออกใบวิ่งรถ

```
VehicleRoute A (เส้นทาง A - วิ่งทุกวันจันทร์-ศุกร์)
├─ Stop 1 (ลำดับที่ 1): Supplier A - Route A (Chiang Mai)
├─ Stop 2 (ลำดับที่ 2): Supplier B - Route C (Bangkok)
└─ Stop 3 (ลำดับที่ 3): Supplier A - Route B (Nakhon Pathom)

VehicleRoute B (เส้นทาง B - วิ่งทุกวันจันทร์-ศุกร์)
└─ Stop 1 (ลำดับที่ 1): Supplier C - Route C (Prachuap)

Vehicle A (รถที่ 1): ทะเบียน กข-1234, คนขับ Mr. Somchai, 2,000 Kg
Vehicle B (รถที่ 2): ทะเบียน กข-5678, คนขับ Mr. Niran, 1,500 Kg

ใบวิ่งรถ 15-Jan: เส้นทาง A + Vehicle A
ใบวิ่งรถ 16-Jan: เส้นทาง A + Vehicle B   (เปลี่ยนรถได้โดยไม่ต้องแก้เส้นทาง)
```

**Key Points**:
- 1 Vehicle = 1 ทะเบียน, 1 คนขับ, 1 ความจุ
- VehicleRoute ไม่มี vehicleId: รถอย่างไรก็ได้วิ่งเส้นทางไหนก็ได้ และรถ 1 คันวิ่งได้หลายเส้นทาง รถที่วิ่งบันทึกที่ใบวิ่งรถ (`VehicleRunSheet.vehicleId`) ตอนออกใบ
- 1 VehicleRoute = ลำดับจุดรับสินค้าที่ชัดเจน (Stop 1 → Stop 2 → Stop 3)
- แต่ละ Stop เป็น SupplierRoute ที่มีอยู่แล้ว (สวนของ Supplier ไหน)
- Stops ในเส้นทางเดียวกันอาจมาจากคนละ Supplier (ตามเส้นทางจริงของรถ)

**ความสัมพันธ์กับ PO**:
- PO ยังคงสร้าง 1 PO/Supplier+SupplierRoute (ไม่เปลี่ยน)
- VehicleRunSheet เป็นเอกสารจัดส่งที่รวบรวม POs ที่ต้องเอาจากเส้นทางของรถ
- 1 Run Sheet / 1 Vehicle / 1 วัน
- 1 Stop ใน Run Sheet อาจประกอบด้วย 0, 1, หรือหลาย POs ที่ pickup จากที่แห่งนั้น

---

### Production Line & Capacity Management (Target Design)

> **Not yet implemented** — no `src/features/production` (or similar) exists in this repo today. This subsection carries forward the production/manufacturing context from the companion comprehensive design doc so the full end-to-end flow is documented in one place.

**Scenario**: RM ที่รับเข้ามาจาก Procurement (FLOW 3b) ต้องถูกนำไปวางแผนผลิตก่อนเข้าสายการผลิตจริง

```
Overall Integrated Flow:

PROCUREMENT (FLOW 1-3b, built)
    ↓
    Raw Material Receipt & Inventory
    ↓
PRODUCTION PLANNING & MANUFACTURING (FLOW 4-7, target design)
    ↓
    Finished Goods Inventory
    ↓
SALES & DISTRIBUTION (FLOW 8, next phase — not designed in detail yet)
    ↓
    Customer Delivery
```

**ProductionLine** = สายการผลิต (เช่น LINE-A ผลิตน้ำผลไม้, LINE-B ผลิตแยม)
- แต่ละ Line มี `capacityPerHour` และ `compatibleProducts[]` (FG ที่ผลิตได้)
- มี `maintenanceSchedule` และสถานะ (Available / InUse / Maintenance)

**BillOfMaterial (BOM)** — ดูรายละเอียด entity ที่ [§4 Data Architecture, entity #7](#7-billofmaterial-recipe) — ใช้ทั้งตอนคำนวณ RM ที่ต้องซื้อ (FLOW 1) และตอนคำนวณ RM ที่ต้องเบิกเข้าสายผลิต (FLOW 4-6)

**Key timing constraint** (สำคัญ — เปลี่ยนจาก assumption เดิม):
```
เดิม (ผิด): สร้าง PO วันนี้ → สมมติว่า RM มาแน่นอน → วางแผนผลิตได้ทันที

ใหม่ (ถูกต้อง): ต้องรอ VehicleRunSheet.status = "Completed" (รับของจริงแล้ว
จาก FLOW 3b) ก่อน จึงจะวางแผนผลิตได้ เพราะจำนวนที่ได้รับจริงอาจต่างจากที่สั่ง
(variance อาจ >10%)
```

---

## User Flows

### FLOW 1: Create Purchase Template/Master

```
┌─────────────────────────────────────────────────┐
│ 1. Search Sales History                         │
│    - Select Month/Year                          │
│    - Filter by product category                 │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│ 2. View Finished Goods Sales                    │
│    - Display list with quantities               │
│    - Show sales chart                           │
│    - Sortable by qty, product name              │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│ 3. Select Products & Adjust Quantities          │
│    - Checkbox selection                         │
│    - Quantity adjustment input                  │
│    - Preview total RM needed (calculated)       │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│ 4. Create Template/Master                       │
│    - Template Name (auto: "Template_Jan2024")   │
│    - Save & display success message             │
│    - Redirect to template list                  │
└─────────────────────────────────────────────────┘
```

### FLOW 2: Use Template to Create Purchase Orders

```
┌─────────────────────────────────────────────────┐
│ 1. Open Template/Master                         │
│    - List all saved templates                   │
│    - Search & filter by date                    │
│    - Click to open detail                       │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│ 2. View Raw Materials Summary                   │
│    - Group by RM (Apple, Sugar, etc.)           │
│    - Show: Name, Total Qty Needed, Unit         │
│    - Display suppliers for each RM              │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│ 3. Select Supplier & Route                      │
│    - Click supplier name                        │
│    - Show: Main contact & phone                 │
│    - EXPAND: List all routes (gardens)          │
│    - Per route show:                            │
│      • Route name & location                    │
│      • Route contact person & phone ← IMPORTANT │
│      • RMs available at this route              │
│      • Stock & price per route                  │
│    - Click route to select                      │
│    - Validation: Cannot select same supplier+   │
│      route twice for same RM                    │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│ 4. Confirm Availability (Phone Call)            │
│    - Call supplier at selected ROUTE            │
│    - Record: Which route? (already selected)    │
│    - Record: Route contact & phone ← VERIFY     │
│    - Record: Qty able to supply from this route │
│    - Record: Expected delivery date             │
│    - Confirm: Pickup location/address           │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│ 5. Record Order Line Details                    │
│    - Show: Supplier + Route (already selected)  │
│    - Show: Route contact (for reference)        │
│    - Input: Qty ordered                         │
│    - Input: Price per unit (from this route)    │
│    - Auto-calculate: Total price                │
│    - Show: Route pickup address                 │
│    - Save order line                            │
│    - Record includes: Supplier + Route combo    │
└──────────────────┬──────────────────────────────┘
                   ↓
        Need more RM from another supplier?
              ↙ YES           NO ↘
    [Loop to Step 3]      [Continue]
                   ↓
┌─────────────────────────────────────────────────┐
│ 6. Summary Check                                │
│    - Show all RMs ordered vs. required          │
│    - Highlight incomplete items                 │
│    - Allow override if needed                   │
│    - Validation: At least 1 supplier must be    │
│      selected per RM                            │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│ 7. Group by Supplier + Route & Create POs       │
│    - System GROUPS order lines by:              │
│      • Supplier ID                              │
│      • Supplier Route ID ← CRITICAL             │
│    - Creates 1 PO per (Supplier + Route) combo  │
│    - Each PO:                                   │
│      - Links to specific supplier route         │
│      - Contains multiple RMs from that route    │
│      - Includes route pickup address            │
│      - Includes route contact details           │
│    - Auto-generate PO numbers                   │
│    - Calculate total amount per PO              │
│    - Set status to "Draft"                      │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│ 8. Display Purchase Orders Summary              │
│    - Show all created POs grouped by supplier   │
│    - Display: PO#, Supplier, Total Amount,      │
│      Status                                     │
│    - Allow: View Detail, Send to Supplier, Edit │
│    - Send to Supplier Confirmation step         │
└─────────────────────────────────────────────────┘
```

### FLOW 2.1: Create Purchase Orders - Grouping by Supplier + Route (Detailed)

```
INPUT: Template with selected order lines
       (collected from Steps 3-5)
       Each line includes: Supplier + Route combo

PROCESSING:

Step 1: Collect all order lines with Route info
        ├─ Supplier A - Route A (Chiang Mai): Apple 500 Kg @ ฿18 = ฿9,000
        ├─ Supplier A - Route B (Nakhon Pathom): Sugar 300 Kg @ ฿25 = ฿7,500
        ├─ Supplier A - Route B (Nakhon Pathom): Banana 200 Kg @ ฿15 = ฿3,000
        ├─ Supplier B - Route A (Bangkok): Apple 800 Kg @ ฿20 = ฿16,000
        ├─ Supplier B - Route A (Bangkok): Vinegar 100 L @ ฿50 = ฿5,000
        └─ Supplier C - Route C (Prachuap): Orange 300 Kg @ ฿16 = ฿4,800

Step 2: GROUP by (Supplier + Route) ← KEY CHANGE
        ├─ Supplier A - Route A (Chiang Mai)
        │   └─ Apple 500 Kg @ ฿18 = ฿9,000
        │   └─ SUBTOTAL: ฿9,000
        │   └─ Pickup: Ms. Dao (053-xxx-xxxx)
        │
        ├─ Supplier A - Route B (Nakhon Pathom)
        │   ├─ Sugar 300 Kg @ ฿25 = ฿7,500
        │   ├─ Banana 200 Kg @ ฿15 = ฿3,000
        │   └─ SUBTOTAL: ฿10,500
        │   └─ Pickup: Mr. Som (034-xxx-xxxx)
        │
        ├─ Supplier B - Route A (Bangkok)
        │   ├─ Apple 800 Kg @ ฿20 = ฿16,000
        │   ├─ Vinegar 100 L @ ฿50 = ฿5,000
        │   └─ SUBTOTAL: ฿21,000
        │   └─ Pickup: Mr. Somchai (02-xxx-xxxx)
        │
        └─ Supplier C - Route C (Prachuap)
            └─ Orange 300 Kg @ ฿16 = ฿4,800
            └─ SUBTOTAL: ฿4,800
            └─ Pickup: Mr. Niran (032-xxx-xxxx)

Step 3: CREATE 1 PO per (Supplier + Route) Combo
        ├─ PO-2024-001: Supplier A - Route A (Chiang Mai)
        │   Contact: Ms. Dao (053-xxx-xxxx)
        │   Pickup: 123 Moo 5, Hang Dong, Chiang Mai
        │   Items: Apple (500 Kg)
        │   Total: ฿9,000
        │   Expected Delivery: 10-Jan-2024
        │
        ├─ PO-2024-002: Supplier A - Route B (Nakhon Pathom)
        │   Contact: Mr. Som (034-xxx-xxxx)
        │   Pickup: 456 Moo 8, Sam Phran, Nakhon Pathom
        │   Items: Sugar (300 Kg), Banana (200 Kg)
        │   Total: ฿10,500
        │   Expected Delivery: 12-Jan-2024
        │
        ├─ PO-2024-003: Supplier B - Route A (Bangkok)
        │   Contact: Mr. Somchai (02-xxx-xxxx)
        │   Pickup: 789 Soi X, Bang Rak, Bangkok
        │   Items: Apple (800 Kg), Vinegar (100 L)
        │   Total: ฿21,000
        │   Expected Delivery: 11-Jan-2024
        │
        └─ PO-2024-004: Supplier C - Route C (Prachuap)
            Contact: Mr. Niran (032-xxx-xxxx)
            Pickup: 999 Moo 2, Bang Saphan, Prachuap
            Items: Orange (300 Kg)
            Total: ฿4,800
            Expected Delivery: 08-Jan-2024

Step 4: SET Status & Metadata
        ├─ Status: Draft
        ├─ Created By: Current User
        ├─ Created Date: Now
        ├─ SupplierRouteId: Link to specific route ← IMPORTANT
        ├─ PickupAddress: Route address for logistics
        ├─ PickupContact: Route contact person & phone
        ├─ Expected Delivery: Earliest date from order lines
        ├─ Total Amount: Sum of all lines for this route
        └─ PO Status: Ready for confirmation

OUTPUT: List of Purchase Orders
        - One PO per (Supplier + Route) combo
        - 4 POs in example above (not 3!)
        - Each PO has specific pickup location
        - Each PO has specific contact person
        - Multiple items (RMs) per PO from same route
        - All in Draft status
```

### FLOW 3a: Generate & Print Vehicle Run Sheet

```
┌──────────────────────────────────────────────────┐
│ 1. Select Route, Vehicle & Date                  │
│    - Dropdown: Choose VehicleRoute               │
│    - Dropdown/List: Choose Vehicle               │
│    - Date Picker: Select run date                │
│    - System validates vehicle is active          │
└────────────────────┬─────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 2. Load Vehicle Route & Fetch POs                │
│    - System loads the selected VehicleRoute      │
│    - Load ordered stops (Stop 1 → Stop 2 → ...) │
│    - Query: Find all Draft/Confirmed POs whose  │
│      supplierRouteId matches a stop in route    │
│    - Group POs by stop (in sequence order)      │
└────────────────────┬─────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 3. Preview Run Sheet                             │
│    - Display vehicle info (license, driver)      │
│    - Display stops in order                      │
│    - Per stop show:                              │
│      • Route name & pickup address               │
│      • Supplier name & contact                   │
│      • List of POs to pickup from this stop      │
│      • Line items (RM name, qty, unit)          │
│      • Total amount per stop                     │
│    - Allow to remove/edit POs if needed          │
└────────────────────┬─────────────────────────────┘
                     ↓
        Looks correct?
         ↙ YES      NO ↘
    [Continue]   [Edit/Remove items]
                     ↓
┌──────────────────────────────────────────────────┐
│ 4. Print / Export Run Sheet                      │
│    - Generate printable run sheet document       │
│    - Format: 1 sheet per vehicle per day         │
│    - Include: Vehicle ID, Date, Driver, Route   │
│    - Include: All stops + PO details in order    │
│    - Print or Export as PDF                      │
└────────────────────┬─────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 5. Mark POs as "Assigned to Run"                 │
│    - Update PO status/metadata                   │
│    - Link: POs ↔ VehicleRunSheet                 │
│    - Set status to "Assigned" or "In Transit"    │
│    - Log: When run sheet was printed/sent        │
└──────────────────────────────────────────────────┘
```

**Note**: This flow is **downstream from PO generation**. POs are already created (FLOW 2 & 2.1); this flow just organizes them for physical pickup by a specific vehicle on a specific date.

**Current implementation status**: Step 5 (auto-updating PO status/linking POs to the VehicleRunSheet) requires POs and Run Sheets to share a real foreign key, which the current build doesn't have yet — see the phasing note at the end of FLOW 3b. In the current build, printing a run sheet only changes the **run sheet's own** status (Draft → Printed); it does not touch any PO's status.

---

### FLOW 3b: Record Delivery Receipt

After the driver completes the route and returns with the run sheet (paper copy, filled in by hand at each stop), office staff transcribe the actual quantities into the system.

```
┌──────────────────────────────────────────────────┐
│ 1. Find the Returned Run Sheet                   │
│    - Run Sheets list, filtered/highlighted by    │
│      status: "Printed" = still out for pickup    │
│    - Staff matches the paper sheet by its         │
│      Run Sheet # (printed at the top of Screen 9)│
│    - Open the run sheet's detail page             │
└────────────────────┬─────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 2. Confirm the Driver Has Returned (EXPLICIT)     │
│    - Button: "Driver Returned — Start Receipt"    │
│    - This is a deliberate user action, not an     │
│      automatic side-effect of opening the page —  │
│      a run sheet must not silently flip status    │
│      just because someone viewed it               │
│    - Status changes: "Printed" → "InProgress"     │
│    - Records returnedAt timestamp                 │
│    - Navigates into the receipt-entry form         │
└────────────────────┬─────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 3. Record Actual Quantities Per Stop             │
│    - Per stop, per line item:                    │
│      • Show: Ordered Qty (original on run sheet) │
│      • Input: Actual Received Qty                │
│      • Input: Notes/Variance reason (optional)   │
│      • Auto-calc: Difference (+ or -)            │
│    - Validate: All items have actual qty input   │
│      before allowing final confirmation           │
│    - "Save Draft" button: persists whatever has   │
│      been typed so far WITHOUT closing the run    │
│      sheet or requiring every field to be filled  │
│      — status stays "InProgress". Lets staff       │
│      split entry across several run sheets or      │
│      step away mid-entry without losing work        │
└────────────────────┬─────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 4. Review & Confirm                              │
│    - Display summary:                            │
│      • Per stop: Ordered vs. Actual              │
│      • Variance percentage per stop              │
│      • Total variance for entire run             │
│    - Highlight stops with significant variance   │
└────────────────────┬─────────────────────────────┘
                     ↓
        Variance acceptable?
         ↙ YES      NO ↘
    [Confirm]   [Edit quantities, or Save Draft and finish later]
                     ↓
┌──────────────────────────────────────────────────┐
│ 5. Update PO Received Quantities (TARGET DESIGN)  │
│    - Per PO, update: receivedQuantity            │
│    - Update PO status:                           │
│      • If Actual == Ordered: "Received"          │
│      • If Actual < Ordered: "PartialReceived"    │
│      • If Actual > Ordered: "Received" (oversupply)
│    - Link received data to VehicleRunSheetStop   │
│    - See phasing note below — not built yet        │
└────────────────────┬─────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 6. Close Run Sheet & Log                         │
│    - Mark RunSheet status as "Completed"         │
│    - Set completedDate & completedBy user       │
│    - Log: All variances with timestamps          │
│    - Show success message with summary           │
│    - Redirect to run sheet list                  │
└──────────────────────────────────────────────────┘
```

**Note**: Actual received qty may not equal ordered qty due to:
- Supplier had less stock than promised
- Items damaged during pickup
- Supplier offered more than ordered
- Route issues (e.g., one stop couldn't be visited)

**Implementation phasing**:
- **Phase A (built)** — the Run Sheet side of this flow: steps 1–4 and 6, using the actual `RunSheetStatus` enum `Draft → Printed → InProgress → Completed`. The `InProgress` state is reached only via the explicit "Driver Returned — Start Receipt" button (step 2), never automatically. "Save Draft" (step 3) writes actual quantities into the run sheet without changing its status or requiring completion.
- **Phase B (built)** — Purchase Orders get a real, independent status lifecycle (`Draft → Sent → Confirmed`, plus `Cancelled` from any of those three), driven by explicit actions on the Purchase Orders screen (Send to supplier / Mark supplier confirmed / Cancel). This is **not yet connected** to Run Sheets.
- **Phase C (future, not yet built)** — step 5 above: linking a Run Sheet's line items to real Purchase Order records (today they're separate mock datasets, joined only by a display-only PO number) so that confirming a receipt automatically rolls up into the linked PO's status (`Received` / `PartialReceived`). This requires giving `PurchaseOrder` a real `supplierRouteId` (so it can be matched to a Run Sheet stop) and needs the PO status enum extended with a `PartiallyReceived` value. Until Phase C ships, a PO only reaches `Received` by being pre-seeded that way — there is no UI action for it yet.

---

### FLOW 4: AI Production Planning (Target Design)

> **Not yet implemented.** No production-planning UI, API, or data exists in this repo. Documented here so Procurement → Production → Sales reads as one continuous system.

**Trigger condition (hard dependency on FLOW 3b)**:
```
Trigger ONLY after: VehicleRunSheet.status == "Completed" for the relevant receipts
Trigger NEVER before: PO.status == "Confirmed" alone is not enough —
                       actual received qty (not ordered qty) must be known first,
                       because variance can exceed 10%

Trigger options (any of):
  ├─ Manual: user clicks "Run AI Planning" from a Production Planning Dashboard
  ├─ Scheduled: e.g. daily 17:00 (after receiving hours are over)
  └─ Event-driven: fired when a VehicleRunSheet transitions to "Completed"
```

> **Open dependency gap**: Step 1 below needs "sales demand" as an input, but that's supposed to come from Sales Orders (FLOW 8) — and FLOW 8 is explicitly not designed yet. Until a Sales design exists, "sales demand" has no real source. The only input actually available today is the historical-sales trend already used to build Purchase Templates in FLOW 1 (§ FLOW 1, step 2 "View Finished Goods Sales"). A production-planning implementation would need to either (a) fall back to that historical trend as a demand proxy, or (b) wait until FLOW 8 exists and ships a real pending-orders feed. This gap should be resolved explicitly when FLOW 8 is designed, not assumed away.

```
┌──────────────────────────────────────────────────┐
│ 1. Gather Inputs                                 │
│    - Sales demand (pending/forecast FG orders)    │
│    - RawMaterialInventory.quantityAvailable       │
│      (= onHand - allocated, from confirmed        │
│      receipts only)                               │
│    - ProductionLine capacity & compatibleProducts │
│    - BillOfMaterial (RM needed per FG unit)        │
└────────────────────┬─────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 2. Score & Rank Candidate Products                │
│    Score = Deadline(40%) + Profit(30%) + Stock(30%)│
│    For each product (highest score first):        │
│      - Compute RM needed via BOM                  │
│      - Check RM available:                        │
│        full → allocate; partial → allocate partial │
│        or skip; none → flag bottleneck, skip       │
│      - Find compatible & available ProductionLine  │
│      - Check deadline feasibility                  │
└────────────────────┬─────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 3. Output Recommendation                          │
│    - ProductsToMake (feasible now)                 │
│    - ProductsDeferred (waiting on RM)              │
│    - RMAllocations (proposed reservation, not yet  │
│      committed)                                    │
│    - EstimatedCompletion dates                     │
│    - Warnings & bottleneck RMs                     │
└──────────────────────────────────────────────────┘
```

**Output**: A reviewable Production Plan recommendation — nothing is committed to inventory or work orders until FLOW 5 approval.

---

### FLOW 5: Approve & Create Production Orders (Target Design)

> **Not yet implemented.**

```
┌──────────────────────────────────────────────────┐
│ 1. Review AI Recommendation                       │
│    - Planner reviews ProductsToMake/Deferred       │
│    - Can manually override line-level allocations  │
└────────────────────┬─────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 2. Approve Plan                                    │
│    - System creates ProductionOrder per approved   │
│      product (status: Draft → Confirmed)           │
│    - RawMaterialInventory.quantityAllocated += qty  │
│    - RawMaterialInventory.quantityAvailable -= qty  │
│    - Work orders routed to assigned ProductionLine  │
└──────────────────────────────────────────────────┘
```

**Validation**:
- At least 1 product must be approved
- RM allocations must not exceed `quantityAvailable`
- No circular dependencies between production orders and shared lines

---

### FLOW 6: Manufacturing Execution (Target Design)

> **Not yet implemented.**

```
┌──────────────────────────────────────────────────┐
│ 1. Start Production                                │
│    - Operator starts ProductionOrder on its line   │
│    - Record: start time, operator, line            │
│    - ProductionOrder.status → InProduction          │
│    - Issue allocated RM to the floor:               │
│      RawMaterialInventory.quantityOnHand -= alloc'dQty│
│      RawMaterialInventory.quantityAllocated -= alloc'dQty│
│      (this is the ONLY RM stock deduction in FLOW   │
│      6/7 — see reconciliation in step 3, not FLOW 7)│
└────────────────────┬─────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 2. Monitor Progress                                │
│    - Progress checked periodically (every 1-2 hrs) │
│    - QC sample testing recorded (pass/fail)         │
└────────────────────┬─────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 3. Complete Production                             │
│    - Record actual FG quantity produced & defects   │
│    - Record actualRmUsedQuantity (measured, may      │
│      differ from allocatedQty due to waste/spillage)│
│    - Reconcile variance: if actualRmUsed >           │
│      allocatedQty, deduct the extra from             │
│      quantityOnHand; if actualRmUsed < allocatedQty, │
│      credit the unused surplus back to quantityOnHand│
│    - Calculate yield = actualFgQty / plannedQty × 100│
│    - ProductionOrder.status → Completed             │
└──────────────────────────────────────────────────┘
```

**Note**: The manufacturing steps themselves are unchanged from earlier drafts of this system — what's new is that RM consumption here is no longer dependent on PO status directly; it draws from `RawMaterialInventory`, which FLOW 3b/4/5 keep in sync. **All RM stock deduction happens here (FLOW 6), not in FLOW 7** — FLOW 7 only adds Finished Goods, it does not touch `RawMaterialInventory` again.

---

### FLOW 7: Finished Goods Registration (Target Design)

> **Not yet implemented.**

```
┌──────────────────────────────────────────────────┐
│ 1. Calculate Yield & Grade                         │
│    - yieldRate = actualQuantity / plannedQuantity   │
│    - Grade: A (98-100%), B (95-97%), C (<95%)      │
└────────────────────┬─────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 2. Register Batch                                  │
│    - Create FinishedGoodsBatch                     │
│    - Generate batch barcode (e.g., FG-2024-001-A)  │
│    - Set expirationDate                            │
└────────────────────┬─────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 3. Update Inventory                                │
│    - FinishedGoodsInventory.quantityOnHand += qty   │
│    - (RM stock was already deducted & reconciled    │
│      in FLOW 6 step 3 — this step does NOT touch    │
│      RawMaterialInventory again)                    │
└──────────────────────────────────────────────────┘
```

**Output**: FG stock ready for Sales (FLOW 8), fully traceable back to its batch, production order, and the RM receipts (and their variance) that fed it.

---

### FLOW 8: Sales & Distribution (Next Phase)

> **Not yet implemented. Not yet designed in detail** — captured here only at the level the companion comprehensive design doc describes it, as a placeholder so the end-to-end picture is complete. A dedicated Sales design pass is needed before this is buildable.

```
┌──────────────────────────────────────────────────┐
│ 1. Receive Sales Orders                            │
│    - Driver sales (walk-in/route selling) or        │
│      fixed customer orders                          │
│    - Check FinishedGoodsInventory.quantityAvailable │
│    - Reserve FG for the order (quantityReserved += qty)│
└────────────────────┬─────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 2. Pick & Pack                                     │
│    - Warehouse picks from FG stock, verifies via    │
│      batch barcode                                  │
│    - FinishedGoodsInventory.quantityOnHand -= qty   │
│    - FinishedGoodsInventory.quantityReserved -= qty │
└────────────────────┬─────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│ 3. Shipping & Delivery                             │
│    - Domestic: vehicle delivery to branches/customers│
│    - Export: air cargo to airport                   │
│    - Record delivery completion & generate invoice   │
└──────────────────────────────────────────────────┘
```

**Cannot fulfill an order if**: FG batch has quality/variance issues, grade is below the customer's requirement, the batch is expiring soon, or the batch was never properly registered (FLOW 7).

---

## Data Architecture

### 1. PurchaseTemplate (Template/Master)

```
{
  id: UUID
  templateName: string (e.g., "Template_January_2024")
  templateDate: DateTime
  createdBy: string (user_id)
  createdDate: DateTime
  status: enum ["Draft", "Active", "Archived"]
  
  // Related data
  templateLineItems: PurchaseTemplateLine[]
  templateRawMaterials: TemplateRawMaterial[]
}
```

### 2. PurchaseTemplateLine

```
{
  id: UUID
  templateId: UUID (FK)
  finishedGoodId: UUID (FK)
  finishedGoodName: string
  plannedQuantity: decimal
  quantityUnit: string (e.g., "Bottle", "Pack")
}
```

### 3. TemplateRawMaterial

```
{
  id: UUID
  templateId: UUID (FK)
  rawMaterialId: UUID (FK)
  rawMaterialName: string
  requiredQuantity: decimal
  quantityUnit: string (e.g., "Kg", "Liter")
  
  // Supplier info (denormalized for easy display)
  suppliers: TemplateRawMaterialSupplier[]
}
```

### 4. TemplateRawMaterialSupplier - UPDATED

```
{
  id: UUID
  templateRMId: UUID (FK)
  supplierId: UUID (FK)
  supplierName: string
  
  // ROUTE information ← IMPORTANT
  supplierRouteId: UUID (FK) ← Know which route/garden
  routeName: string (denormalized - e.g., "Route A - Chiang Mai")
  routeAddress: string (pickup location)
  routeContactPerson: string (contact at this route)
  routePhone: string (phone for this route)
  
  // Order details
  orderedQuantity: decimal = null (filled after phone call)
  pricePerUnit: decimal = null
  totalPrice: decimal (calculated)
  expectedDeliveryDate: DateTime = null
  
  // Link to PO
  orderLineId: UUID = null (FK to PurchaseOrderLine)
}
```

### 5. SalesHistory (Reference)

```
{
  id: UUID
  date: DateTime
  finishedGoodId: UUID
  finishedGoodName: string
  soldQuantity: decimal
  unit: string
}
```

### 6. RawMaterial (Reference)

```
{
  id: UUID
  name: string
  description: string
  unit: string
  
  // BOM relation
  bom: BillOfMaterial[]
}
```

### 7. BillOfMaterial (Recipe)

```
{
  id: UUID
  finishedGoodId: UUID (FK)
  rawMaterialId: UUID (FK)
  quantityNeeded: decimal
  unit: string
}
```

### 8. Supplier (Reference) - UPDATED

```
{
  id: UUID
  name: string (e.g., "Supplier A Co.")
  email: string
  contactPerson: string (main contact)
  mainPhone: string
  mainAddress: string
  
  // Routes/Branches
  supplierRoutes: SupplierRoute[]
}
```

### 8.1 SupplierRoute (IMPORTANT)

```
{
  id: UUID
  supplierId: UUID (FK)
  routeName: string (e.g., "สวน A - Chiang Mai")
  routeCode: string (e.g., "SR-A-001")
  location: string (province/region)
  address: string (full address for pickup)
  contactPerson: string (contact at this route)
  phone: string
  email: string (optional)
  operatingHours: string (optional)
  isActive: boolean
  createdDate: DateTime
  
  // Raw materials available at this route
  supplierRouteRawMaterials: SupplierRouteRawMaterial[]
}
```

### 9. SupplierRouteRawMaterial

```
{
  id: UUID
  supplierRouteId: UUID (FK) ← Link to specific route/garden
  rawMaterialId: UUID (FK)
  rawMaterialName: string
  pricePerUnit: decimal (may differ by route)
  minOrderQty: decimal
  availableStock: decimal
  unit: string (Kg, Liter, etc.)
  lastUpdated: DateTime
  isAvailable: boolean
}
```

---

### 10. Vehicle (NEW - Master Data)

```
{
  id: UUID
  vehicleCode: string (e.g., "VH-001", unique)
  licensePlate: string (e.g., "กข-1234 Bangkok")
  vehicleType: string (e.g., "Pickup", "Van", "Truck")
  capacity: decimal (e.g., 2000 Kg)
  
  // Driver Info
  driverName: string
  driverPhone: string
  driverAddress: string (optional)
  
  // Status & Metadata
  isActive: boolean
  createdDate: DateTime
  lastModifiedDate: DateTime
  
  // Relations
  vehicleRoutes: VehicleRoute[]
  runSheets: VehicleRunSheet[]
}
```

### 11. VehicleRoute (NEW - Fixed Daily Route)

```
{
  id: UUID
  // No vehicleId: a route is not tied to a vehicle; the vehicle is recorded on the run sheet
  routeName: string (e.g., "Route A - Monday-Friday")
  routeDescription: string (optional)
  daysOfWeek: string (e.g., "Monday,Tuesday,Wednesday,Thursday,Friday" or "1,2,3,4,5")
  
  // Status
  isActive: boolean
  createdDate: DateTime
  lastModifiedDate: DateTime
  
  // Ordered stops
  routeStops: VehicleRouteStop[] (ordered by sequence)
}
```

### 12. VehicleRouteStop (NEW - Ordered Stop in Route)

```
{
  id: UUID
  vehicleRouteId: UUID (FK)
  sequence: int (1, 2, 3... determines order of stops)
  
  // References existing SupplierRoute
  supplierRouteId: UUID (FK → SupplierRoute)
  
  // Denormalized info for easy access
  supplierId: UUID (denormalized)
  supplierName: string (denormalized)
  routeName: string (denormalized - e.g., "Route A - Chiang Mai")
  pickupAddress: string (denormalized)
  pickupContactPerson: string (denormalized)
  pickupPhone: string (denormalized)
  
  createdDate: DateTime
  lastModifiedDate: DateTime
}
```

### 13. VehicleRunSheet (NEW - Daily Pickup Document)

```
{
  id: UUID
  runSheetNumber: string (e.g., "RS-2024-001-2024-01-15", unique per day+vehicle)
  vehicleId: UUID (FK)
  vehicleRouteId: UUID (FK)
  runDate: DateTime (date of the run)
  
  // Driver info (copy from Vehicle at time of run sheet creation)
  driverName: string (denormalized)
  driverPhone: string (denormalized)
  
  // Status
  status: enum ["Draft", "Printed", "InProgress", "Completed", "Cancelled"]
  
  // Metadata
  createdBy: string (user_id)
  createdDate: DateTime
  printedDate: DateTime (nullable)
  printedBy: string (nullable)
  returnedDate: DateTime (nullable — set when staff confirms "Driver Returned — Start Receipt", i.e. Printed → InProgress)
  completedDate: DateTime (nullable)
  
  // Ordered stops with POs
  runSheetStops: VehicleRunSheetStop[] (ordered by sequence from VehicleRoute)
}
```

**Current implementation**: the running mockup doesn't yet implement the `Cancelled` status above — `RunSheetStatus` is `Draft | Printed | InProgress | Completed`. `InProgress` is reached only via an explicit "Driver Returned — Start Receipt" action (see FLOW 3b), and a "Save Draft" action can update `runSheetStops` while staying `InProgress`, without requiring every item to be filled in first.

### 14. VehicleRunSheetStop (NEW - Stop with Associated POs)

```
{
  id: UUID
  runSheetId: UUID (FK)
  sequence: int (mirrors VehicleRouteStop sequence)
  
  // Route info (copy from VehicleRouteStop)
  supplierRouteId: UUID
  supplierId: UUID
  supplierName: string
  routeName: string
  pickupAddress: string
  pickupContactPerson: string
  pickupPhone: string
  
  // Notes & metadata
  notes: string (optional - e.g., "Arrived 9:00 AM", "Pickup delayed")
  actualPickupTime: DateTime (nullable, filled during run)
  
  // RECEIPT RECORDING (FLOW 3b) ← NEW
  completedDate: DateTime (nullable, filled when receipt recorded)
  completedBy: string (nullable, user who recorded receipt)
  receivedNotes: string (optional - e.g., "Grapes damaged", "Bananas not ready")
  variance: decimal (calculated: actualQty - orderedQty)
  variancePercentage: decimal (calculated: variance / orderedQty * 100)
  
  // Relationship to POs
  purchaseOrders: PurchaseOrder[] (0, 1, or many POs from this stop)
  totalAmount: decimal (sum of all POs at this stop)
  totalItems: int (sum of line items from all POs at this stop)
  
  // ACTUAL RECEIVED QUANTITIES ← NEW
  totalOrderedQuantity: decimal (sum of all ordered quantities)
  totalReceivedQuantity: decimal (sum of all actual received quantities, filled in FLOW 3b)
  
  createdDate: DateTime
}
```

---

### 14.1 PurchaseOrder (Updated for Route & Run Sheet)

```
PurchaseOrder
├─ id: UUID
├─ poNumber: string (e.g., "PO-2024-001")
├─ supplierId: UUID (FK to Supplier)
├─ supplierName: string (denormalized)
├─
├─ // ROUTE INFORMATION ← CRITICAL
├─ supplierRouteId: UUID (FK to SupplierRoute)
├─ routeName: string (e.g., "Route A - Chiang Mai")
├─ pickupAddress: string (full address)
├─ pickupContactPerson: string (person at this route)
├─ pickupPhone: string (phone at this route)
├─ pickupEmail: string (optional)
├─
├─ // RUN SHEET LINK ← NEW
├─ vehicleRunSheetId: UUID (nullable FK - filled when assigned to run)
├─ vehicleRunSheetStopId: UUID (nullable FK - which stop in run sheet)
├─
├─ // MAIN FIELDS
├─ status: enum ["Draft", "Assigned", "InTransit", "Received", "PartialReceived", "Cancelled"]
├─ totalAmount: decimal (sum of all line items)
├─ expectedDeliveryDate: DateTime (earliest from order lines)
├─ createdDate: DateTime
├─ createdBy: string (user_id)
├─ sentDate: DateTime (nullable)
├─ sentBy: string (nullable)
├─ receiveDate: DateTime (nullable)
├─ templateId: UUID (FK to PurchaseTemplate)
│
└─ purchaseOrderLines: PurchaseOrderLine[]
   ├─ id: UUID
   ├─ rawMaterialId: UUID (FK)
   ├─ rawMaterialName: string
   ├─ orderedQuantity: decimal
   ├─ unit: string
   ├─ pricePerUnit: decimal
   ├─ totalPrice: decimal (calculated)
   ├─ expectedDeliveryDate: DateTime
   ├─ supplierRouteId: UUID (reference back to route)
   ├─ receivedQuantity: decimal (nullable - filled in FLOW 3b)
   ├─ variance: decimal (nullable - calculated: receivedQuantity - orderedQuantity)
   └─ status: enum ["Pending", "Received", "Partial", "Cancelled"]
```

**Current implementation**: the fields above (`supplierRouteId`, `vehicleRunSheetId`/`vehicleRunSheetStopId`, `receivedQuantity`, per-line `status`) describe the **target design** once Run Sheets and Purchase Orders are linked (Phase C — see the phasing note at the end of FLOW 3b). The running mockup today implements a smaller, standalone `PoStatus` enum with no Run Sheet linkage yet:

```
PoStatus: "draft" | "sent" | "confirmed" | "received" | "cancelled"

Allowed transitions (Phase B):
  draft     → sent, cancelled
  sent      → confirmed, cancelled
  confirmed → cancelled            (confirmed → received is intentionally not
                                     wired up yet — see Phase C above)
  received, cancelled → (terminal)
```
Driven by explicit row actions on the Purchase Orders screen: **Send to supplier** (draft→sent), **Mark supplier confirmed** (sent→confirmed), **Cancel PO** (→cancelled, behind a confirmation dialog since it's destructive). `received` is not reachable from the UI yet; it only appears on pre-seeded example data until Phase C exists.

---

### Production, Inventory & Finished Goods Entities (Target Design)

> **Not yet implemented** — none of the entities below have a matching table, DTO, or mock dataset in this repo. They describe the target model for FLOW 4-8.

### 15. RawMaterialInventory (NEW - Target Design)

```
{
  id: UUID
  rawMaterialId: UUID (FK)
  quantityOnHand: decimal        // physical stock
  quantityAllocated: decimal     // reserved for approved production orders
  quantityAvailable: decimal     // = onHand - allocated (calculated)
  quantityOnOrder: decimal       // sum of qty on pending/confirmed POs
  minimumStock: decimal
  reorderPoint: decimal
  unitCost: decimal
  totalValue: decimal            // = onHand * unitCost
  status: enum ["Available", "LowStock", "Critical"]
  lastReceivedDate: DateTime (nullable)
  expirationDate: DateTime (nullable)
}
```

**Lifecycle of the four quantity fields** (this is the part most likely to be implemented wrong, so it's spelled out):
```
PO created                → quantityOnOrder += orderedQty
Receipt recorded (3b)     → quantityOnHand += actualReceivedQty
                            quantityOnOrder -= orderedQty
Production plan approved  → quantityAllocated += allocatedQty          (FLOW 5)
                            quantityAvailable -= allocatedQty          (available = onHand - allocated, kept in sync)
Production starts (FLOW 6,→ quantityOnHand -= allocatedQty             (RM issued to the floor)
  step 1)                   quantityAllocated -= allocatedQty
Production completes      → quantityOnHand -= (actualRmUsed - allocatedQty)   (only if actual > allocated)
  (FLOW 6, step 3)           quantityOnHand += (allocatedQty - actualRmUsed)   (only if actual < allocated; surplus credited back)

Note: RM stock is deducted exactly once per production order, across these two
steps (issue-at-start + reconcile-at-completion). FLOW 7 (Finished Goods
Registration) only adds to FinishedGoodsInventory — it never touches
RawMaterialInventory.
```

### 16. FinishedGoodsInventory (NEW - Target Design)

```
{
  id: UUID
  finishedGoodId: UUID (FK)
  quantityOnHand: decimal
  quantityReserved: decimal      // held for sales orders (FLOW 8)
  quantityAvailable: decimal     // = onHand - reserved (calculated)
  minimumStock: decimal
  reorderPoint: decimal
  status: enum ["Available", "LowStock", "Critical", "Reserved", "Expired"]
  lastProducedDate: DateTime (nullable)
  averageYield: decimal (%)      // rolling average across batches
  batches: FinishedGoodsBatch[]
}
```

### 17. ProductionLine (NEW - Target Design)

```
{
  id: UUID
  lineCode: string (e.g., "LINE-A", unique)
  lineName: string
  description: string (optional)
  capacityPerHour: decimal (units/hour)
  compatibleProducts: UUID[] (finishedGoodIds this line can produce)
  maintenanceSchedule: string (optional)
  status: enum ["Available", "InUse", "Maintenance"]
}
```

### 18. ProductionOrder (NEW - Target Design)

```
{
  id: UUID
  poNumber: string (e.g., "PROD-2024-001")
  productionPlanLineId: UUID (FK - links back to the approved AI plan line)
  finishedGoodId: UUID (FK)
  plannedQuantity: decimal
  actualQuantity: decimal (nullable, filled on completion)
  productionLineId: UUID (FK)
  batchNumber: string (e.g., "BH-2024-001-A")
  rmAllocations: RMAllocation[] (RM reserved & consumed for this order)
  status: enum ["Draft", "Confirmed", "InProduction", "Completed"]
  yieldRate: decimal (%, nullable until completed)
  defectsFound: int
  qcStatus: enum ["Pending", "Passed", "Failed"]
  operatorId: string (nullable)
  startDate: DateTime (nullable)
  endDate: DateTime (nullable)
}
```

### 19. FinishedGoodsBatch (NEW - Target Design)

```
{
  id: UUID
  batchNumber: string (e.g., "BH-2024-001-A")
  finishedGoodId: UUID (FK)
  productionOrderId: UUID (FK)
  quantity: decimal
  unit: string
  gradeLevel: enum ["A", "B", "C"]      // A: 98-100% yield, B: 95-97%, C: <95%
  qualityScore: decimal (%)
  yieldRate: decimal (%)
  location: string (warehouse shelf, optional)
  expirationDate: DateTime
  barcode: string (e.g., "FG-2024-001-A", unique)
  status: enum ["Available", "Reserved", "Sold", "Expired"]
}
```

**Traceability chain**: `FinishedGoodsBatch → ProductionOrder → RMAllocation → RawMaterialInventory` movement `→` (further back) the `VehicleRunSheetStop` receipt that brought that RM in, with its recorded variance. This is what lets Sales (FLOW 8) refuse to fulfil an order from a batch with quality/variance issues.

---

## Frontend Architecture

### UI Components & Screens

#### Screen 1: Purchase Templates List

**Path**: `/procurement/templates`

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Purchase Templates                                  │
│ [Search: ___________] [Filter ▼] [+ New Template] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Template Name          Date Created    Status       │
│ ─────────────────────────────────────────────────── │
│ Template_Jan2024       01-Jan-2024    Active   [>] │
│ Template_Dec2023       15-Dec-2023    Archived [>] │
│ Template_Nov2023       20-Nov-2023    Draft    [>] │
│                                                     │
│                        [Pagination]                 │
└─────────────────────────────────────────────────────┘
```

**Components**:
- SearchBox (templateName, date range)
- StatusBadge (Draft, Active, Archived)
- ActionMenu (Edit, View, Delete, Archive)
- CreateButton

**Interactions**:
- Click row → Open template detail
- Click [+ New Template] → Go to step 1 (Search Sales History)

---

#### Screen 2: Search Sales History & Select Products

**Path**: `/procurement/templates/create/step-1`

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│ Create Purchase Template - Step 1                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Select Time Period:                                 │
│ [Month dropdown] ▼  [Year dropdown] ▼               │
│ [Search] [Reset]                                    │
│                                                      │
│ ────────────────────────────────────────────────    │
│ Finished Goods Sales Data                           │
│ ────────────────────────────────────────────────    │
│                                                      │
│ ☐ Product Name      Qty      Unit   Sales Trend    │
│ ──────────────────────────────────────────────── │
│ ☐ Apple Juice       5,000    Bottle    ↑ +15%    │
│ ☐ Apple Jam         3,000    Bottle    → 0%      │
│ ☐ Apple Snack       2,500    Pack      ↓ -5%     │
│ ☐ Apple Vinegar     1,200    Bottle    ↑ +20%    │
│                                                      │
│ ────────────────────────────────────────────────    │
│ Selected Products Preview:                          │
│ ────────────────────────────────────────────────    │
│                                                      │
│ Product Name    Qty     Unit   Adjustment          │
│ ───────────────────────────────────────────────   │
│ Apple Juice    5,000   Bottle  [+500]            │
│ Apple Jam      3,000   Bottle  [0]               │
│ Apple Snack    2,500   Pack    [-250]            │
│                                                      │
│ Calculated Raw Materials Needed:                    │
│ • Apple: 1,500 Kg                                  │
│ • Sugar: 800 Kg                                    │
│ • Vinegar: 200 Liter                              │
│                                                      │
│ [Back] [Cancel]                    [Next: Step 2]  │
└──────────────────────────────────────────────────────┘
```

**Components**:
- MonthYearPicker
- SalesDataTable (sortable, selectable)
- AdjustmentInput (can increase/decrease from original)
- PreviewSummary (shows calculated RMs)
- ProgressIndicator (Step 1/2)

---

#### Screen 3: Review & Create Template

**Path**: `/procurement/templates/create/step-2`

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│ Create Purchase Template - Step 2                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Template Details:                                   │
│ Name: [Template_January_2024_________] (auto-gen)  │
│ Description: [_________________________]            │
│ Valid From: [01-Jan-2024]  To: [31-Jan-2024]      │
│                                                      │
│ ────────────────────────────────────────────────    │
│ Products to be Produced:                            │
│ ────────────────────────────────────────────────    │
│                                                      │
│ Product Name      Qty       Unit                    │
│ ───────────────────────────────────────────────   │
│ Apple Juice       5,500     Bottle                │
│ Apple Jam         3,000     Bottle                │
│ Apple Snack       2,250     Pack                  │
│                                                      │
│ ────────────────────────────────────────────────    │
│ Raw Materials Summary:                              │
│ ────────────────────────────────────────────────    │
│                                                      │
│ RM Name    Total Qty   Unit   Suppliers Available  │
│ ─────────────────────────────────────────────────│
│ Apple      1,500 Kg   Kg     3 suppliers ✓       │
│ Sugar      800 Kg     Kg     2 suppliers ✓       │
│ Vinegar    200 Liter  Liter  1 supplier ✓        │
│                                                      │
│ [Back]                                [Save & Continue]
│                                                      │
│ Progress: ████████████░░░░░░░░░░ 70%              │
└──────────────────────────────────────────────────────┘
```

---

#### Screen 4: Template Detail - Raw Materials View

**Path**: `/procurement/templates/{templateId}/detail`

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Template: Template_January_2024                     │
│ Created: 01-Jan-2024 by John Doe                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Raw Materials Summary by Supplier                  │
│                                                     │
│ ────────────────────────────────────────────────── │
│ RM: Apple (Required: 1,500 Kg)                    │
│ ────────────────────────────────────────────────── │
│                                                     │
│ ┌─ Supplier A                                     │
│ │                                                 │
│ │ ┌─ Route A: Chiang Mai [Expand▼]              │
│ │ │ Contact: Ms. Dao (053-xxx-xxxx)             │
│ │ │ Address: 123 Moo 5, Hang Dong, CM           │
│ │ │ Available: 1,000 Kg | Price: ฿18/kg ✓       │
│ │ │ [Select & Call]                             │
│ │ │  → Qty: [500] Kg                            │
│ │ │  → Price: [฿18] × [500] = [฿9,000]         │
│ │ │  → Delivery: [Date picker]                  │
│ │ │ [Save This Order Line]                      │
│ │ └─────────────────────────────────────────────
│ │
│ │ ┌─ Route B: Nakhon Pathom [Expand▼]          │
│ │ │ Contact: Mr. Som (034-xxx-xxxx)             │
│ │ │ Address: 456 Moo 8, Sam Phran, NP           │
│ │ │ Available: 800 Kg | Price: ฿20/kg ✓         │
│ │ │ [Select & Call]                             │
│ │ │  → Qty: [_____] Kg                          │
│ │ │  → Price: [฿20] × [_] = [_____]            │
│ │ │  → Delivery: [Date picker]                  │
│ │ │ [Save This Order Line]                      │
│ │ └─────────────────────────────────────────────
│ │
│ │ ┌─ Route C: Prachuap [Expand▼]               │
│ │ │ Contact: Mr. Niran (032-xxx-xxxx)           │
│ │ │ Address: 789 Moo 2, Bang Saphan, PK         │
│ │ │ Available: 0 Kg | Out of Stock ✗            │
│ │ └─────────────────────────────────────────────
│ └─────────────────────────────────────────────────
│                                                     │
│ ├─ Supplier B [View Routes] [Details▼]            │
│ │ [Select & Call] → Record Qty + Price           │
│ │                                                 │
│ ├─ Supplier C [View Routes] [Details▼]            │
│ │ [Select & Call] → Record Qty + Price           │
│                                                     │
│ ─ Total Ordered for Apple: [1,300/1,500] Kg      │
│ ✓ Sufficient (or ⚠️ Not enough, but allow)        │
│                                                     │
│ ────────────────────────────────────────────────── │
│ RM: Sugar (Required: 800 Kg) [Similar structure]  │
│ RM: Vinegar (Required: 200 L) [Similar structure] │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Summary Check:                                      │
│ • Apple: 1,300/1,500 ✓                            │
│ • Sugar: 800/800 ✓                                │
│ • Vinegar: 200/200 ✓                              │
│                                                     │
│ Status: Ready to create POs                        │
│                                                     │
│ [Back] [Cancel]  [Create Purchase Orders]         │
└─────────────────────────────────────────────────────┘
```

---

#### Screen 5: Purchase Orders Summary

**Path**: `/procurement/purchase-orders/created`

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Purchase Orders Created from Template               │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Successfully created 4 Purchase Orders:            │
│                                                     │
│ ┌─ PO-2024-001 - Supplier A - Route A (Chiang Mai) │
│ │ Amount: ฿9,000 | Status: Draft                  │
│ │ Contact: Ms. Dao (053-xxx-xxxx)                 │
│ │ Pickup: 123 Moo 5, Hang Dong, Chiang Mai       │
│ │ Delivery: 10-Jan-2024                           │
│ │ Items: Apple 500 Kg                             │
│ │ [View Detail] [Send to Supplier] [Edit]         │
│ └──────────────────────────────────────────────────
│                                                     │
│ ┌─ PO-2024-002 - Supplier A - Route B (Nakhon P)  │
│ │ Amount: ฿10,500 | Status: Draft                 │
│ │ Contact: Mr. Som (034-xxx-xxxx)                 │
│ │ Pickup: 456 Moo 8, Sam Phran, Nakhon Pathom    │
│ │ Delivery: 12-Jan-2024                           │
│ │ Items: Sugar 300 Kg, Banana 200 Kg              │
│ │ [View Detail] [Send to Supplier] [Edit]         │
│ └──────────────────────────────────────────────────
│                                                     │
│ ┌─ PO-2024-003 - Supplier B - Route A (Bangkok)   │
│ │ Amount: ฿21,000 | Status: Draft                 │
│ │ Contact: Mr. Somchai (02-xxx-xxxx)              │
│ │ Pickup: 789 Soi X, Bang Rak, Bangkok            │
│ │ Delivery: 11-Jan-2024                           │
│ │ Items: Apple 800 Kg, Vinegar 100 L              │
│ │ [View Detail] [Send to Supplier] [Edit]         │
│ └──────────────────────────────────────────────────
│                                                     │
│ ┌─ PO-2024-004 - Supplier C - Route C (Prachuap)  │
│ │ Amount: ฿4,800 | Status: Draft                  │
│ │ Contact: Mr. Niran (032-xxx-xxxx)               │
│ │ Pickup: 999 Moo 2, Bang Saphan, Prachuap        │
│ │ Delivery: 08-Jan-2024                           │
│ │ Items: Orange 300 Kg                            │
│ │ [View Detail] [Send to Supplier] [Edit]         │
│ └──────────────────────────────────────────────────
│                                                     │
│ Total Amount: ฿45,300                             │
│                                                     │
│ [Back to Template] [View all POs]                 │
│                   [Proceed to Supplier Confirmation]
└─────────────────────────────────────────────────────┘
```

---

#### Screen 6: Vehicle Master List (NEW)

**Path**: `/logistics/vehicles`

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│ Vehicles Management                                  │
│ [Search: ___________] [Filter ▼] [+ New Vehicle]   │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Code    License Plate    Driver Name    Status       │
│ ─────────────────────────────────────────────────── │
│ VH-001  กข-1234 Bangkok  Mr. Somchai   Active  [>] │
│ VH-002  กข-5678 Prachuap Mr. Niran     Active  [>] │
│ VH-003  กข-9999 Bangkok  Mr. Prasit    Inactive[>] │
│                                                      │
│                        [Pagination]                  │
└──────────────────────────────────────────────────────┘
```

**Components**:
- SearchBox (vehicleCode, licensePlate, driverName)
- StatusBadge (Active, Inactive)
- ActionMenu (View, Edit, Delete)
- CreateButton

---

#### Screen 7: Vehicle Routes Management (NEW)

**Path**: `/logistics/routes`

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│ Routes (not tied to a vehicle)                       │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Route Name              Days         Status       │
│ ─────────────────────────────────────────────────── │
│ Route A (Mon-Fri)   Mon,Tue,Wed,Thu,Fri Active [>] │
│ Route B (Weekend)   Sat,Sun             Active [>] │
│                                                      │
│ [+ Add New Route]                                   │
└──────────────────────────────────────────────────────┘
```

**On Route Click** → Opens Route Detail with ordered stops (can drag-to-reorder, add/remove stops).

---

#### Screen 8: Vehicle Run Sheet Generation (NEW)

**Path**: `/logistics/run-sheets/create`

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│ Generate Vehicle Run Sheet                           │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Select Route, Vehicle & Date:                       │
│ Route:   [Route A (Mon-Fri)] ▼                     │
│ Vehicle: [VH-001 - Mr. Somchai] ▼                  │
│ Date:    [15-Jan-2024] 📅                          │
│                                                      │
│ [Search POs for this route]                         │
│                                                      │
│ ────────────────────────────────────────────────    │
│ Preview: Run Sheet for VH-001 on 15-Jan-2024       │
│ ────────────────────────────────────────────────    │
│                                                      │
│ ┌─ Stop 1 (Sequence 1): Supplier A - Route A       │
│ │  Pickup: 123 Moo 5, Hang Dong, Chiang Mai       │
│ │  Contact: Ms. Dao (053-xxx-xxxx)                │
│ │                                                  │
│ │  PO-2024-001 (฿9,000)                           │
│ │  ├─ Apple: 500 Kg @ ฿18/kg                      │
│ │  └─ [Remove from run]                           │
│ │                                                  │
│ │  Total this stop: ฿9,000 | 1 PO                 │
│ └──────────────────────────────────────────────
│                                                      │
│ ┌─ Stop 2 (Sequence 2): Supplier B - Route C       │
│ │  Pickup: 789 Soi X, Bang Rak, Bangkok           │
│ │  Contact: Mr. Somchai (02-xxx-xxxx)             │
│ │                                                  │
│ │  PO-2024-003 (฿21,000)                          │
│ │  ├─ Apple: 800 Kg @ ฿20/kg                      │
│ │  ├─ Vinegar: 100 L @ ฿50/L                      │
│ │  └─ [Remove from run]                           │
│ │                                                  │
│ │  Total this stop: ฿21,000 | 1 PO                │
│ └──────────────────────────────────────────────
│                                                      │
│ ┌─ Stop 3 (Sequence 3): Supplier A - Route B       │
│ │  Pickup: 456 Moo 8, Sam Phran, Nakhon Pathom    │
│ │  Contact: Mr. Som (034-xxx-xxxx)                │
│ │                                                  │
│ │  PO-2024-002 (฿10,500)                          │
│ │  ├─ Sugar: 300 Kg @ ฿25/kg                      │
│ │  ├─ Banana: 200 Kg @ ฿15/kg                     │
│ │  └─ [Remove from run]                           │
│ │                                                  │
│ │  Total this stop: ฿10,500 | 1 PO                │
│ └──────────────────────────────────────────────
│                                                      │
│ ────────────────────────────────────────────────    │
│ Total for this run: ฿40,500 | 3 POs | 3 Stops    │
│ ────────────────────────────────────────────────    │
│                                                      │
│ [Back] [Cancel]                    [Print Run Sheet]
└──────────────────────────────────────────────────────┘
```

---

#### Screen 9: Vehicle Run Sheet - Printable View (NEW)

**Path**: `/logistics/run-sheets/{runSheetId}/print`

**Layout** (Designed for A4 printing):
```
╔════════════════════════════════════════════════════════╗
║          VEHICLE RUN SHEET (ใบวิ่งรถ)                 ║
║════════════════════════════════════════════════════════║
║                                                        ║
║ Run Sheet #: RS-2024-001-2024-01-15                   ║
║ Date: 15-January-2024                                 ║
║ Vehicle: VH-001 | License: กข-1234 Bangkok            ║
║ Driver: Mr. Somchai | Phone: 08x-xxx-xxxx             ║
║ Route: Route A (Mon-Fri) | Capacity: 2,000 Kg        ║
║                                                        ║
║────────────────────────────────────────────────────────║
║ STOP 1 - Supplier A, Route A (Chiang Mai)             ║
║────────────────────────────────────────────────────────║
║ Pickup Address: 123 Moo 5, Hang Dong, Chiang Mai      ║
║ Contact: Ms. Dao | Phone: 053-xxx-xxxx               ║
║                                                        ║
║ Purchase Order: PO-2024-001 (฿9,000)                  ║
║ ├─ Apple: 500 Kg @ ฿18/kg = ฿9,000                   ║
║ └─ Expected Delivery: 10-Jan-2024                     ║
║                                                        ║
║ Subtotal Stop 1: ฿9,000                               ║
║ Items picked: ____ Kg | Actual qty: ____ Kg           ║
║ Received signature: ________________________ Time: ___ ║
║                                                        ║
║────────────────────────────────────────────────────────║
║ STOP 2 - Supplier B, Route C (Bangkok)                ║
║────────────────────────────────────────────────────────║
║ Pickup Address: 789 Soi X, Bang Rak, Bangkok          ║
║ Contact: Mr. Somchai | Phone: 02-xxx-xxxx             ║
║                                                        ║
║ Purchase Order: PO-2024-003 (฿21,000)                 ║
║ ├─ Apple: 800 Kg @ ฿20/kg = ฿16,000                  ║
║ ├─ Vinegar: 100 L @ ฿50/L = ฿5,000                   ║
║ └─ Expected Delivery: 11-Jan-2024                     ║
║                                                        ║
║ Subtotal Stop 2: ฿21,000                              ║
║ Items picked: ____ Kg/L | Actual qty: ____ Kg/L       ║
║ Received signature: ________________________ Time: ___ ║
║                                                        ║
║────────────────────────────────────────────────────────║
║ STOP 3 - Supplier A, Route B (Nakhon Pathom)          ║
║────────────────────────────────────────────────────────║
║ Pickup Address: 456 Moo 8, Sam Phran, Nakhon Pathom   ║
║ Contact: Mr. Som | Phone: 034-xxx-xxxx                ║
║                                                        ║
║ Purchase Order: PO-2024-002 (฿10,500)                 ║
║ ├─ Sugar: 300 Kg @ ฿25/kg = ฿7,500                   ║
║ ├─ Banana: 200 Kg @ ฿15/kg = ฿3,000                  ║
║ └─ Expected Delivery: 12-Jan-2024                     ║
║                                                        ║
║ Subtotal Stop 3: ฿10,500                              ║
║ Items picked: ____ Kg | Actual qty: ____ Kg           ║
║ Received signature: ________________________ Time: ___ ║
║                                                        ║
║════════════════════════════════════════════════════════║
║ SUMMARY                                                ║
║════════════════════════════════════════════════════════║
║ Total POs: 3                                           ║
║ Total Stops: 3                                         ║
║ Total Amount: ฿40,500                                  ║
║ Total Weight: ~1,600 Kg (within 2,000 Kg capacity)   ║
║                                                        ║
║ Driver Signature: _________________ Date: ___________  ║
║ Manager Signature: ________________ Date: ___________  ║
║════════════════════════════════════════════════════════║
╚════════════════════════════════════════════════════════╝
```

---

#### Screen 10: Record Delivery Receipt (NEW)

**Path**: `/logistics/run-sheets/{runSheetId}/record-receipt`

**Entry gate** — reaching this screen while the run sheet is still `Printed` (driver not confirmed back yet) shows a short interim message instead of the form: *"This run sheet is still out for pickup. Confirm the driver has returned to start recording the receipt."* with two buttons, **"Driver Returned — Start Receipt"** (flips status to `InProgress`, then shows the form below) and **"Back to Run Sheet"**. A run sheet already `Completed` shows a similar short message instead of a re-editable form. Only `InProgress` reaches the form itself.

**Layout** (once `InProgress`):
```
┌──────────────────────────────────────────────────────┐
│ Record Delivery Receipt                              │
│ Run Sheet: RS-2024-001-2024-01-15                   │
│ Vehicle: VH-001 (กข-1234) | Driver: Mr. Somchai    │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Date Completed: [15-Jan-2024] | Time: [14:30]      │
│                                                      │
│ ────────────────────────────────────────────────    │
│ STOP 1: Supplier A - Route A (Chiang Mai)           │
│ ────────────────────────────────────────────────    │
│                                                      │
│ Item                 Ordered  Actual   Variance      │
│ ───────────────────────────────────────────────   │
│ Apple (Kg)           [500]    [500]    0 Kg ✓      │
│ Grape (Kg)           [100]    [95]    -5 Kg ⚠️      │
│                                                      │
│ Subtotal Ordered: 600 Kg | Actual: 595 Kg           │
│ Notes: [Some grapes were damaged in packaging]     │
│                                                      │
│ ────────────────────────────────────────────────    │
│ STOP 2: Supplier B - Route C (Bangkok)              │
│ ────────────────────────────────────────────────    │
│                                                      │
│ Item                 Ordered  Actual   Variance      │
│ ───────────────────────────────────────────────   │
│ Apple (Kg)           [800]    [800]    0 Kg ✓      │
│ Vinegar (L)          [100]    [110]   +10 L ✓      │
│                                                      │
│ Subtotal Ordered: 900 Kg/L | Actual: 910 Kg/L      │
│ Notes: [Supplier offered extra vinegar at same price]
│                                                      │
│ ────────────────────────────────────────────────    │
│ STOP 3: Supplier A - Route B (Nakhon Pathom)        │
│ ────────────────────────────────────────────────    │
│                                                      │
│ Item                 Ordered  Actual   Variance      │
│ ───────────────────────────────────────────────   │
│ Sugar (Kg)           [300]    [300]    0 Kg ✓      │
│ Banana (Kg)          [200]    [0]     -200 Kg ❌    │
│                                                      │
│ Subtotal Ordered: 500 Kg | Actual: 300 Kg           │
│ Notes: [Bananas were not ready, supplier will deliver tomorrow]
│                                                      │
│ ────────────────────────────────────────────────    │
│ SUMMARY                                              │
│ ────────────────────────────────────────────────    │
│ Total Ordered: 2,000 Kg                             │
│ Total Received: 1,805 Kg                            │
│ Variance: -195 Kg (-9.75%)                          │
│                                                      │
│ ✓ Items fully received: 6 items                    │
│ ⚠️ Items partially received: 2 items                │
│ ❌ Items not received: 1 item                       │
│                                                      │
│ [Back] [Save Draft]      [Confirm & Close Run Sheet]
└──────────────────────────────────────────────────────┘
```

**Components**:
- OrderedVsActualComparison (per item)
- VarianceIndicator (✓ green, ⚠️ amber, ❌ red)
- NotesInput (per stop, for tracking reasons)
- SummaryCard (total variance, completion status)

**Interactions**:
- Edit actual quantity → auto-recalc variance
- Add notes for each stop
- System flags >5% variance per stop in amber
- **Save Draft** → persists whatever's been typed so far, stays `InProgress`, does not require every field filled in, does not close the run sheet (lets staff pause mid-entry and resume later)
- **Confirm & Close Run Sheet** → validates every item has an actual quantity, asks for confirmation, then closes the run sheet (`Completed`). In the current build this only records the receipt on the run sheet itself — it does **not** update any Purchase Order's status yet (see the FLOW 3b phasing note); the confirmation dialog text reflects that honestly rather than promising a PO status update that doesn't happen

---

### Navigation & Routing

#### Route Structure

```
/procurement
├── /procurement/templates
│   ├── /procurement/templates/create/step-1
│   ├── /procurement/templates/create/step-2
│   ├── /procurement/templates/{id}/detail
│   └── /procurement/templates/{id}/edit
├── /procurement/purchase-orders
│   ├── /procurement/purchase-orders/created
│   ├── /procurement/purchase-orders/{id}
│   └── /procurement/purchase-orders/{id}/send
└── /procurement/suppliers
    ├── /procurement/suppliers/{id}
    └── /procurement/suppliers/{id}/raw-materials

/logistics
├── /logistics/vehicles
│   ├── /logistics/vehicles/create
│   ├── /logistics/vehicles/{id}/edit
│   ├── /logistics/vehicles/{id}/routes
│   │   ├── /logistics/vehicles/{id}/routes/create
│   │   └── /logistics/vehicles/{id}/routes/{routeId}/edit
│   └── /logistics/vehicles/{id}/run-sheets
├── /logistics/run-sheets
│   ├── /logistics/run-sheets/create
│   ├── /logistics/run-sheets/{id}
│   ├── /logistics/run-sheets/{id}/edit
│   ├── /logistics/run-sheets/{id}/print
│   └── /logistics/run-sheets/{id}/record-receipt
└── /logistics/routes
    └── /logistics/routes/{id}/runs
```

---

## Backend Architecture

### API Endpoints

#### Template Management

```
GET    /api/purchase-templates
       Query: ?status=Active&page=1&limit=10
       Response: PaginatedList<PurchaseTemplate>

GET    /api/purchase-templates/{id}
       Response: PurchaseTemplate with TemplateLines

POST   /api/purchase-templates
       Body: {
         templateName: string,
         description: string,
         templateLineItems: [{
           finishedGoodId: UUID,
           plannedQuantity: decimal
         }]
       }
       Response: PurchaseTemplate

PUT    /api/purchase-templates/{id}
       Body: {...}
       Response: PurchaseTemplate

DELETE /api/purchase-templates/{id}
       Response: { success: boolean }
```

#### Sales History

```
GET    /api/sales-history
       Query: ?month=1&year=2024&categoryId=null
       Response: List<SalesHistoryDto>

GET    /api/sales-history/summary
       Query: ?month=1&year=2024
       Response: {
         totalSales: decimal,
         topProducts: ProductSalesDto[],
         trend: ChartData
       }
```

#### Raw Materials

```
GET    /api/raw-materials
       Response: List<RawMaterial>

GET    /api/raw-materials/{id}
       Response: RawMaterial with Suppliers

GET    /api/raw-materials/{id}/suppliers
       Response: List<SupplierRawMaterial>

GET    /api/raw-materials/{id}/bill-of-material
       Response: List<BillOfMaterial>
```

#### Suppliers

```
GET    /api/suppliers
       Query: ?search=&page=1&limit=10
       Response: PaginatedList<Supplier>

GET    /api/suppliers/{id}
       Response: Supplier with Routes

GET    /api/suppliers/{id}/raw-materials
       Response: List<SupplierRawMaterial>

GET    /api/suppliers/{id}/routes
       Response: List<SupplierRoute>
       
       Example Response:
       [
         {
           id: "route-1",
           routeName: "Route A - Chiang Mai",
           location: "Chiang Mai",
           address: "123 Moo 5, Hang Dong",
           contactPerson: "Ms. Dao",
           phone: "053-xxx-xxxx",
           isActive: true
         },
         {
           id: "route-2",
           routeName: "Route B - Nakhon Pathom",
           location: "Nakhon Pathom",
           address: "456 Moo 8, Sam Phran",
           contactPerson: "Mr. Som",
           phone: "034-xxx-xxxx",
           isActive: true
         }
       ]
```

#### Supplier Routes

```
GET    /api/supplier-routes/{routeId}
       Response: SupplierRoute with RawMaterials detail

GET    /api/supplier-routes/{routeId}/raw-materials
       Response: List<SupplierRouteRawMaterial>
       
       Example:
       [
         {
           rawMaterialId: "apple-id",
           rawMaterialName: "Apple",
           pricePerUnit: 18,
           availableStock: 1000,
           unit: "Kg"
         },
         {
           rawMaterialId: "grape-id",
           rawMaterialName: "Grape",
           pricePerUnit: 25,
           availableStock: 500,
           unit: "Kg"
         }
       ]

POST   /api/supplier-routes
       Body: {
         supplierId: UUID,
         routeName: string,
         location: string,
         address: string,
         contactPerson: string,
         phone: string,
         email: string
       }
       Response: SupplierRoute

PUT    /api/supplier-routes/{routeId}
       Body: { routeName, location, address, ... }
       Response: SupplierRoute
```

#### Template Raw Materials (for ordering)

```
GET    /api/templates/{templateId}/raw-materials
       Response: List<TemplateRawMaterial> with Suppliers and Routes

POST   /api/templates/{templateId}/raw-materials/{rmId}/order-lines
       Body: {
         supplierId: UUID,
         supplierRouteId: UUID, ← MUST specify which route
         orderedQuantity: decimal,
         pricePerUnit: decimal,
         expectedDeliveryDate: DateTime
       }
       Response: TemplateRawMaterialSupplier

PUT    /api/templates/{templateId}/raw-materials/{rmId}/order-lines/{id}
       Body: {
         supplierId: UUID,
         supplierRouteId: UUID,
         orderedQuantity: decimal,
         pricePerUnit: decimal,
         expectedDeliveryDate: DateTime
       }
       Response: TemplateRawMaterialSupplier

DELETE /api/templates/{templateId}/raw-materials/{rmId}/order-lines/{id}
       Response: { success: boolean }
```

#### Purchase Orders

```
POST   /api/purchase-orders/generate-from-template
       Body: {
         templateId: UUID,
         approvedByUserId: UUID
       }
       Response: {
         success: boolean,
         createdPOCount: integer,
         purchaseOrders: [PurchaseOrder],
         totalAmount: decimal,
         message: string
       }
       Note: System automatically groups order lines by (Supplier + Route)
             Creates 1 PO per unique (Supplier + Route) combo
             Each PO has specific pickup location & contact

GET    /api/purchase-orders
       Query: ?status=Draft&supplierId=null&page=1&limit=10
       Response: PaginatedList<PurchaseOrder>

GET    /api/purchase-orders/{id}
       Response: PurchaseOrder with Lines

PUT    /api/purchase-orders/{id}
       Body: {...}
       Response: PurchaseOrder

POST   /api/purchase-orders/{id}/send-to-supplier
       Body: { email: string, message: string }
       Response: { success: boolean, sentAt: DateTime }
```

#### Vehicle Management (NEW)

```
GET    /api/vehicles
       Query: ?status=Active&page=1&limit=10
       Response: PaginatedList<Vehicle>

GET    /api/vehicles/{id}
       Response: Vehicle with VehicleRoutes and RunSheets

POST   /api/vehicles
       Body: {
         vehicleCode: string,
         licensePlate: string,
         vehicleType: string,
         capacity: decimal,
         driverName: string,
         driverPhone: string
       }
       Response: Vehicle

PUT    /api/vehicles/{id}
       Body: { vehicleCode, licensePlate, driverName, ... }
       Response: Vehicle

DELETE /api/vehicles/{id}
       Response: { success: boolean }
```

#### Vehicle Routes (NEW)

```
GET    /api/vehicle-routes
       Response: List<VehicleRoute> with ordered stops

POST   /api/vehicle-routes
       Body: {
         routeName: string,
         routeDescription: string,
         daysOfWeek: string (e.g., "1,2,3,4,5")
       }
       Response: VehicleRoute

PUT    /api/vehicle-routes/{routeId}
       Body: {
         routeName: string,
         daysOfWeek: string,
         isActive: boolean
       }
       Response: VehicleRoute

GET    /api/vehicle-routes/{routeId}/stops
       Response: List<VehicleRouteStop> ordered by sequence

POST   /api/vehicle-routes/{routeId}/stops
       Body: {
         sequence: int,
         supplierRouteId: UUID
       }
       Response: VehicleRouteStop

PUT    /api/vehicle-routes/{routeId}/stops/{stopId}
       Body: {
         sequence: int,
         supplierRouteId: UUID
       }
       Response: VehicleRouteStop

DELETE /api/vehicle-routes/{routeId}/stops/{stopId}
       Response: { success: boolean }

PUT    /api/vehicle-routes/{routeId}/stops/reorder
       Body: {
         stops: [
           { id: string, sequence: int },
           { id: string, sequence: int }
         ]
       }
       Response: List<VehicleRouteStop>
```

#### Vehicle Run Sheets (NEW)

```
POST   /api/vehicle-run-sheets/generate
       Body: {
         vehicleId: UUID,
         vehicleRouteId: UUID,
         runDate: DateTime
       }
       Response: {
         success: boolean,
         runSheet: VehicleRunSheet with stops and matched POs,
         totalAmount: decimal,
         message: string
       }
       Note: Automatically finds all Draft/Confirmed POs whose
             supplierRouteId matches a stop in the selected route
             Groups POs by stop in sequence order

GET    /api/vehicle-run-sheets
       Query: ?vehicleId=&status=Draft&page=1&limit=10
       Response: PaginatedList<VehicleRunSheet>

GET    /api/vehicle-run-sheets/{id}
       Response: VehicleRunSheet with stops and PO details

PUT    /api/vehicle-run-sheets/{id}
       Body: { status, notes, ... }
       Response: VehicleRunSheet

POST   /api/vehicle-run-sheets/{id}/print
       Response: { success: boolean, pdfUrl: string }
       Note: Only allowed when status = "Draft". Sets status "Draft" → "Printed".

POST   /api/vehicle-run-sheets/{id}/start-receipt
       Note: Explicit "Driver Returned — Start Receipt" action (FLOW 3b step 2).
             Only allowed when status = "Printed". Sets status "Printed" → "InProgress"
             and stamps returnedDate. Never triggered automatically just by opening
             the record-receipt page.
       Response: VehicleRunSheet

POST   /api/vehicle-run-sheets/{id}/save-receipt-draft
       Body: { stops: [{ stopId, receivedNotes, lineItems: [{ lineItemId, actualReceivedQuantity }] }] }
       Note: "Save Draft" action (FLOW 3b step 3). Only allowed when status = "InProgress".
             Persists partial entries WITHOUT requiring every item filled in and WITHOUT
             changing status or completedDate.
       Response: VehicleRunSheet

POST   /api/vehicle-run-sheets/{id}/record-receipt
       Body: {
         completedDate: DateTime,
         stops: [
           {
             stopId: UUID,
             receivedNotes: string,
             lineItems: [
               {
                 lineItemId: UUID,
                 actualReceivedQuantity: decimal,
                 variance: decimal (calculated: actualReceivedQuantity - orderedQuantity)
               }
             ]
           }
         ]
       }
       Response: {
         success: boolean,
         runSheet: VehicleRunSheet (updated with receipts),
         totalOrderedQuantity: decimal,
         totalReceivedQuantity: decimal,
         totalVariance: decimal,
         variancePercentage: decimal,
         updatedPOs: PurchaseOrder[] (with updated status),
         message: string
       }
       Note: System updates each PO's status based on actual received qty:
             - If actual == ordered: "Received"
             - If 0 < actual < ordered: "PartialReceived"
             - If actual == 0: "Cancelled" (or marked for follow-up)

DELETE /api/vehicle-run-sheets/{id}
       Response: { success: boolean }
```

---

### Production Planning & Manufacturing Endpoints (Target Design)

> **Not yet implemented** — no controller, route, or mock handler for any endpoint below exists in this repo.

#### Inventory

```
GET    /api/inventory/raw-materials
       Query: ?status=Available&page=1&limit=10
       Response: PaginatedList<RawMaterialInventory>

GET    /api/inventory/raw-materials/{id}
       Response: { onHand, allocated, available, onOrder, details: [...] }

POST   /api/inventory/raw-materials/{id}/allocate
       Body: { quantity: decimal, productionOrderId: UUID }
       Response: AllocationResult

GET    /api/inventory/finished-goods
       Query: ?status=Available&page=1&limit=10
       Response: PaginatedList<FinishedGoodsInventory>

GET    /api/inventory/finished-goods/{id}/batches
       Response: FinishedGoodsBatch[]

GET    /api/inventory/finished-goods/{id}/availability
       Response: { onHand, reserved, available, expiringBatches: Batch[] }
```

#### Production Planning (FLOW 4-5)

```
POST   /api/production-planning/run
       Body: { triggeredBy: "manual"|"scheduled"|"event", runSheetId: UUID (optional, for event trigger) }
       Note: Only meaningful once the underlying RM receipts are Completed (FLOW 3b).
       Response: {
         productsToMake: [{ finishedGoodId, plannedQuantity, productionLineId, rmAllocations: [...] }],
         productsDeferred: [{ finishedGoodId, reason, bottleneckRawMaterialId }],
         warnings: string[]
       }

POST   /api/production-plans/{id}/approve
       Body: { approvedLineIds: UUID[] }
       Note: Creates ProductionOrder per approved line; allocates RM
             (quantityAllocated += qty, quantityAvailable -= qty).
       Response: { success: boolean, productionOrders: ProductionOrder[] }
```

#### Manufacturing (FLOW 6-7)

```
GET    /api/production-orders
       Query: ?status=&productionLineId=&page=1&limit=10
       Response: PaginatedList<ProductionOrder>

POST   /api/production-orders/{id}/start
       Body: { operatorId: string }
       Note: Issues the order's allocated RM to the floor:
             RawMaterialInventory.quantityOnHand -= allocatedQty
             RawMaterialInventory.quantityAllocated -= allocatedQty
       Response: { status: "InProduction", startDate: DateTime }

POST   /api/production-orders/{id}/qc-check
       Body: { result: "Passed"|"Failed", notes: string }
       Response: ProductionOrder

POST   /api/production-orders/{id}/complete
       Body: { actualQuantity: decimal, actualRmUsedQuantity: decimal, defectsFound: int }
       Note: Calculates yieldRate = actualQuantity / plannedQuantity. Reconciles RM
             variance vs. what was issued at /start: if actualRmUsedQuantity >
             allocatedQty, deducts the extra from quantityOnHand; if less, credits
             the unused surplus back. This is the ONLY other RM stock touch besides
             /start — see FLOW 6 step 3. Sets status "Completed".
       Response: ProductionOrder

POST   /api/production-orders/{id}/register-finished-goods
       Body: {}
       Note: Creates FinishedGoodsBatch, assigns gradeLevel from yieldRate,
             generates barcode, increments FinishedGoodsInventory.quantityOnHand.
             Does NOT touch RawMaterialInventory — that was already settled by
             /start and /complete above (see FLOW 7 step 3).
       Response: { batch: FinishedGoodsBatch, inventoryUpdated: bool }
```

---

### Purchase Order Generation Logic (Critical Implementation)

```csharp
// Pseudo-code for /api/purchase-orders/generate-from-template
// Groups by (Supplier + Route) instead of just Supplier

async Task<List<PurchaseOrder>> GenerateFromTemplate(UUID templateId, UUID approvedByUserId)
{
  // Step 1: Fetch template with all order lines (including route info)
  var template = GetTemplate(templateId);
  var orderLines = GetOrderLines(templateId); // All saved supplier + route selections
  
  // Validation: Must have at least 1 order line
  if (!orderLines.Any())
    throw new Exception("Template has no order lines");
  
  // Validation: Each order line must have supplierRouteId
  if (orderLines.Any(ol => ol.SupplierRouteId == null))
    throw new Exception("All order lines must have a valid route selected");
  
  // Step 2: GROUP order lines by (Supplier + Route) ← KEY CHANGE
  var groupedBySupplierRoute = orderLines
    .GroupBy(ol => new { ol.SupplierId, ol.SupplierRouteId }) // Group by BOTH!
    .ToList();
  
  var purchaseOrders = new List<PurchaseOrder>();
  
  // Step 3: CREATE 1 PO per (Supplier + Route) Combo
  foreach (var routeGroup in groupedBySupplierRoute)
  {
    var supplier = GetSupplier(routeGroup.Key.SupplierId);
    var supplierRoute = GetSupplierRoute(routeGroup.Key.SupplierRouteId);
    var poNumber = GeneratePONumber(); // e.g., PO-2024-001
    
    var po = new PurchaseOrder
    {
      Id = Guid.NewGuid(),
      PoNumber = poNumber,
      SupplierId = supplier.Id,
      SupplierName = supplier.Name,
      
      // ROUTE INFORMATION ← CRITICAL
      SupplierRouteId = supplierRoute.Id,
      RouteName = supplierRoute.RouteName,
      PickupAddress = supplierRoute.Address,
      PickupContactPerson = supplierRoute.ContactPerson,
      PickupPhone = supplierRoute.Phone,
      
      // PO STATUS
      Status = "Draft",
      CreatedBy = approvedByUserId,
      CreatedDate = DateTime.UtcNow,
      TemplateId = templateId,
      
      // Expected delivery = earliest date from lines in this route
      ExpectedDeliveryDate = routeGroup.Min(g => g.ExpectedDeliveryDate),
      
      // Total amount = sum of all line items from this route
      TotalAmount = routeGroup.Sum(g => g.TotalPrice),
      
      // ADD ALL ORDER LINES FOR THIS (SUPPLIER + ROUTE) COMBO
      PurchaseOrderLines = routeGroup
        .Select(ol => new PurchaseOrderLine
        {
          RawMaterialId = ol.RawMaterialId,
          RawMaterialName = ol.RawMaterialName,
          OrderedQuantity = ol.OrderedQuantity,
          Unit = ol.Unit,
          PricePerUnit = ol.PricePerUnit,
          TotalPrice = ol.TotalPrice,
          ExpectedDeliveryDate = ol.ExpectedDeliveryDate,
          SupplierRouteId = supplierRoute.Id,
          Status = "Pending"
        }).ToList()
    };
    
    purchaseOrders.Add(po);
  }
  
  // Step 4: SAVE all POs to database (transaction)
  using (var transaction = BeginTransaction())
  {
    foreach (var po in purchaseOrders)
    {
      SavePurchaseOrder(po);
      SavePurchaseOrderLines(po.PurchaseOrderLines);
    }
    transaction.Commit();
  }
  
  // Step 5: RETURN created POs with route information
  return purchaseOrders;
}
```

#### Record Delivery Receipt Logic (FLOW 3b)

```csharp
// Pseudo-code for /api/vehicle-run-sheets/{id}/record-receipt

async Task<VehicleRunSheet> RecordDeliveryReceipt(UUID runSheetId, RecordReceiptDto dto)
{
  // Step 1: Fetch run sheet with stops and POs
  var runSheet = GetVehicleRunSheet(runSheetId);
  
  if (runSheet == null || (runSheet.Status != "Printed" && runSheet.Status != "InProgress"))
    throw new Exception("Run sheet not found or not in Printed/InProgress status");
  // Note: reaching "InProgress" requires the explicit start-receipt action (FLOW 3b
  // step 2) — confirming a receipt directly from "Printed" is also allowed as a
  // fallback, but the UI always routes through start-receipt first.
  
  // Step 2: Process each stop's received quantities
  foreach (var stopDto in dto.Stops)
  {
    var runSheetStop = runSheet.RunSheetStops
      .FirstOrDefault(s => s.Id == stopDto.StopId);
    
    if (runSheetStop == null)
      throw new Exception($"Stop {stopDto.StopId} not found in run sheet");
    
    // Step 3: Update each line item with actual received qty
    foreach (var lineItemDto in stopDto.LineItems)
    {
      var po = runSheetStop.PurchaseOrders
        .FirstOrDefault(p => p.PurchaseOrderLines.Any(l => l.Id == lineItemDto.LineItemId));
      
      var poLine = po?.PurchaseOrderLines
        .FirstOrDefault(l => l.Id == lineItemDto.LineItemId);
      
      if (poLine == null)
        throw new Exception($"Line item {lineItemDto.LineItemId} not found");
      
      // Record actual received quantity
      poLine.ReceivedQuantity = lineItemDto.ActualReceivedQuantity;
      poLine.Variance = lineItemDto.ActualReceivedQuantity - poLine.OrderedQuantity;
      
      // Update line status based on actual qty
      if (poLine.ReceivedQuantity == poLine.OrderedQuantity)
        poLine.Status = "Received";
      else if (poLine.ReceivedQuantity > 0 && poLine.ReceivedQuantity < poLine.OrderedQuantity)
        poLine.Status = "Partial";
      else if (poLine.ReceivedQuantity == 0)
        poLine.Status = "Cancelled"; // Mark for follow-up
      else if (poLine.ReceivedQuantity > poLine.OrderedQuantity)
        poLine.Status = "Received"; // Over-supply still counted as received
      
      SavePurchaseOrderLine(poLine);
    }
    
    // Step 4: Calculate stop-level totals
    var totalOrdered = runSheetStop.PurchaseOrders
      .SelectMany(p => p.PurchaseOrderLines)
      .Sum(l => l.OrderedQuantity);
    
    var totalReceived = runSheetStop.PurchaseOrders
      .SelectMany(p => p.PurchaseOrderLines)
      .Sum(l => l.ReceivedQuantity ?? 0);
    
    // Update stop with receipt data
    runSheetStop.TotalOrderedQuantity = totalOrdered;
    runSheetStop.TotalReceivedQuantity = totalReceived;
    runSheetStop.Variance = totalReceived - totalOrdered;
    runSheetStop.VariancePercentage = (totalOrdered > 0) 
      ? (runSheetStop.Variance / totalOrdered * 100) 
      : 0;
    runSheetStop.ReceivedNotes = stopDto.ReceivedNotes;
    runSheetStop.CompletedDate = DateTime.UtcNow;
    runSheetStop.CompletedBy = CurrentUserId;
    
    SaveVehicleRunSheetStop(runSheetStop);
  }
  
  // Step 5: Update PO-level status
  foreach (var po in runSheet.RunSheetStops.SelectMany(s => s.PurchaseOrders).Distinct())
  {
    var allLinesReceived = po.PurchaseOrderLines.All(l => l.Status == "Received");
    var anyLinesPartial = po.PurchaseOrderLines.Any(l => l.Status == "Partial");
    var anyLinesCancelled = po.PurchaseOrderLines.Any(l => l.Status == "Cancelled");
    
    if (allLinesReceived)
      po.Status = "Received";
    else if (anyLinesPartial || anyLinesCancelled)
      po.Status = "PartialReceived";
    
    SavePurchaseOrder(po);
  }
  
  // Step 6: Calculate run sheet totals
  var runSheetTotalOrdered = runSheet.RunSheetStops
    .Sum(s => s.TotalOrderedQuantity);
  var runSheetTotalReceived = runSheet.RunSheetStops
    .Sum(s => s.TotalReceivedQuantity);
  
  // Step 7: Close run sheet
  runSheet.Status = "Completed";
  runSheet.CompletedDate = DateTime.UtcNow;
  runSheet.CompletedBy = CurrentUserId;
  
  SaveVehicleRunSheet(runSheet);
  
  // Step 8: Return result with summary
  return new VehicleRunSheetReceipt
  {
    RunSheet = runSheet,
    TotalOrderedQuantity = runSheetTotalOrdered,
    TotalReceivedQuantity = runSheetTotalReceived,
    TotalVariance = runSheetTotalReceived - runSheetTotalOrdered,
    VariancePercentage = (runSheetTotalOrdered > 0)
      ? ((runSheetTotalReceived - runSheetTotalOrdered) / runSheetTotalOrdered * 100)
      : 0
  };
}
```

---

#### Vehicle Run Sheet Generation Logic

```csharp
// Pseudo-code for /api/vehicle-run-sheets/generate

async Task<VehicleRunSheet> GenerateRunSheet(UUID vehicleId, UUID vehicleRouteId, DateTime runDate)
{
  // Step 1: Validate and fetch vehicle & route
  var vehicle = GetVehicle(vehicleId);
  var vehicleRoute = GetVehicleRoute(vehicleRouteId);
  
  if (vehicle == null || !vehicle.IsActive)
    throw new Exception("Vehicle not found or inactive");
  
  if (vehicleRoute == null || !vehicleRoute.IsActive)
    throw new Exception("Vehicle route not found or inactive");
  
  // Step 2: Load ordered stops for this route
  var routeStops = GetVehicleRouteStops(vehicleRouteId)
    .OrderBy(s => s.Sequence)
    .ToList();
  
  if (!routeStops.Any())
    throw new Exception("Vehicle route has no stops");
  
  // Step 3: Create run sheet header
  var runSheetNumber = GenerateRunSheetNumber(); // e.g., RS-2024-001-2024-01-15
  var runSheet = new VehicleRunSheet
  {
    Id = Guid.NewGuid(),
    RunSheetNumber = runSheetNumber,
    VehicleId = vehicleId,
    VehicleRouteId = vehicleRouteId,
    RunDate = runDate,
    DriverName = vehicle.DriverName,
    DriverPhone = vehicle.DriverPhone,
    Status = "Draft",
    CreatedBy = CurrentUserId,
    CreatedDate = DateTime.UtcNow,
    RunSheetStops = new List<VehicleRunSheetStop>()
  };
  
  // Step 4: For each stop, find matching POs
  foreach (var routeStop in routeStops)
  {
    // Find all Draft/Confirmed POs where supplierRouteId matches this stop
    var posForStop = GetPurchaseOrders()
      .Where(po => po.SupplierRouteId == routeStop.SupplierRouteId &&
                   (po.Status == "Draft" || po.Status == "Confirmed") &&
                   po.SupplierRoute.IsActive)
      .OrderBy(po => po.PoNumber)
      .ToList();
    
    if (posForStop.Any()) // Only create stop if there are POs
    {
      var runSheetStop = new VehicleRunSheetStop
      {
        Id = Guid.NewGuid(),
        Sequence = routeStop.Sequence,
        SupplierRouteId = routeStop.SupplierRouteId,
        SupplierId = routeStop.SupplierId,
        SupplierName = routeStop.SupplierName,
        RouteName = routeStop.RouteName,
        PickupAddress = routeStop.PickupAddress,
        PickupContactPerson = routeStop.PickupContactPerson,
        PickupPhone = routeStop.PickupPhone,
        PurchaseOrders = posForStop,
        TotalAmount = posForStop.Sum(po => po.TotalAmount),
        TotalItems = posForStop.SelectMany(po => po.PurchaseOrderLines).Count(),
        CreatedDate = DateTime.UtcNow
      };
      
      runSheet.RunSheetStops.Add(runSheetStop);
    }
  }
  
  // Step 5: Sort stops by sequence (from VehicleRoute)
  runSheet.RunSheetStops = runSheet.RunSheetStops
    .OrderBy(s => s.Sequence)
    .ToList();
  
  // Step 6: Save run sheet to database
  SaveVehicleRunSheet(runSheet);
  
  return runSheet;
}
```

---

### Status Lifecycles — Production & Inventory (Target Design)

> **Not yet implemented** — these enums have no code representation yet; documented for FLOW 4-8 consistency.

```
ProductionOrder:
Draft → Confirmed → InProduction → Completed

RawMaterialInventory.status:
Available → LowStock → Critical
  - Available: quantityOnHand >= minimumStock
  - LowStock:  minimumStock > quantityOnHand >= reorderPoint
  - Critical:  quantityOnHand < reorderPoint  (triggers automatic PO suggestion)
  - Expired:   expirationDate passed (cannot be used for production, separate flag)

FinishedGoodsInventory.status:
Available → LowStock/Reserved → Sold/Expired
  - Available: quantityOnHand >= minimumStock
  - LowStock:  minimumStock > quantityOnHand >= reorderPoint
  - Critical:  quantityOnHand < reorderPoint  (triggers production order suggestion)
  - Reserved:  quantityReserved > 0 (waiting for sales fulfillment)
  - Expired:   expirationDate passed (cannot sell)

FinishedGoodsBatch.status:
Available → Reserved → Sold
         └→ Expired (if expirationDate passes while still Available/Reserved)
```

---

### Validation Rules

```javascript
// Purchase Template & PO Ordering

// Template Name
- Required
- Min length: 3
- Max length: 100
- Pattern: Alphanumeric + underscore + space

// Quantities
- Required if selected
- Min: 0.01
- Max: 999,999.99
- Decimal places: 2

// Date Fields
- Required
- Format: DD-MMM-YYYY
- Future date (for delivery)

// Phone Number
- Pattern: +66-xxx-xxx-xxxx or 08x-xxx-xxxx
- Length: 10-12 digits

// Email
- Pattern: valid email format
- Max length: 100

// Price
- Min: 0.01
- Max: 999,999.99
- Decimal places: 2

// Supplier & Route Selection
- Required for each RM (at least 1 supplier + route must be selected)
- Cannot select same supplier + route twice per RM
- SupplierRoute must be Active (isActive = true)
- SupplierRoute must have the RM available
- Must have recorded qty/price before saving order line
- At least 1 order line must exist before creating POs

// Purchase Order Generation
- Cannot proceed if no suppliers are selected for any RM
- System will group by (Supplier + Route) automatically
- Creates 1 PO per unique (Supplier + Route) combo
- Minimum 1 item per PO required
- Each PO will have unique pickup location & contact

// Vehicle Management
- Vehicle Code must be unique
- License Plate format: Thai format (e.g., "กข-1234 Bangkok")
- Capacity must be > 0
- Driver Name required
- Driver Phone format: valid Thai phone
- Vehicle must be Active to assign to routes

// Vehicle Route & Stops
- Route Name required
- At least 1 stop required per route
- Stops must have valid SupplierRoute
- Sequence numbers must be unique per route (no duplicates)
- Cannot add inactive SupplierRoute as stop
- daysOfWeek format: "1,2,3,4,5" (1=Mon, 7=Sun)

// Vehicle Run Sheet Generation
- Vehicle must be Active
- Vehicle Route must be Active
- Run Date must be valid date
- Run Date's day-of-week must match VehicleRoute.DaysOfWeek
- At least 1 stop must have matching POs

// Vehicle Run Sheet — Start Receipt (Printed → InProgress)
- Run Sheet must be in "Printed" status (no-op / rejected otherwise)
- Requires the explicit "Driver Returned — Start Receipt" action — never automatic

// Vehicle Run Sheet — Save Receipt Draft (stays InProgress)
- Run Sheet must be in "InProgress" status
- Does NOT require every line item to have a value — partial entry is allowed
- Does NOT change status or completedDate

// Vehicle Run Sheet — Confirm Receipt / Close (FLOW 3b)
- Run Sheet must be in "Printed" or "InProgress" status
- Run Sheet cannot already be "Completed"
- All line items must have actualReceivedQuantity recorded
- Actual received qty must be >= 0
- All stops must have at least one line item with actual qty
- Cannot record receipt for future-dated run sheets (only today or past)

// Purchase Order Status Transitions (Phase B — standalone, not yet linked to Run Sheets)
- draft → sent, cancelled
- sent → confirmed, cancelled
- confirmed → cancelled  (confirmed → received not yet wired up; see Phase C)
- received, cancelled → no further transitions (terminal)
- Cancel requires confirmation (destructive/irreversible in this app)

// Production Planning — Target Design (not yet implemented)
- Trigger requires all relevant Run Sheets to be "Completed" (actual RM qty known)
- AI recommendation requires at least 1 product to be feasible
- RM allocations must not exceed RawMaterialInventory.quantityAvailable
- Production line must be Available and in compatibleProducts for the FG

// Manufacturing & Finished Goods — Target Design (not yet implemented)
- ProductionOrder can only "start" from status "Confirmed"
- ProductionOrder can only "complete" from status "InProduction"
- actualQuantity must be >= 0; yieldRate = actualQuantity / plannedQuantity * 100
- FinishedGoodsBatch registration requires ProductionOrder.status == "Completed"
- gradeLevel derived from yieldRate: A (98-100%), B (95-97%), C (<95%)
```

---

### Error Handling & Validation Messages

```
Template Creation:
- "Template name is required"
- "Please select at least one product"
- "Quantity must be greater than 0"
- "Template name already exists"
- "Failed to save template. Please try again"

Supplier Ordering:
- "Supplier phone is required before recording order"
- "Quantity must not exceed supplier's stock"
- "Price per unit is required"
- "Delivery date must be in the future"
- "You have not ordered all required raw materials. Continue anyway?"
- "Route is no longer active"
- "Raw material '{rmName}' is not available at selected route"

Purchase Order Generation:
- "Template has no order lines. Please select suppliers first"
- "Please ensure at least one supplier is selected for each raw material"
- "Cannot create POs for supplier without recorded price and quantity"
- "No suppliers selected for raw material '{rmName}'. Please add supplier"
- "Failed to generate purchase orders. Please try again"
- "Purchase orders created successfully with {poCount} orders"
- "Successfully created {poCount} purchase orders for {supplierCount} suppliers"
- "Total amount: ฿{totalAmount}"

Vehicle Management:
- "Vehicle code is required and must be unique"
- "License plate format invalid (e.g., กข-1234 Bangkok)"
- "Capacity must be greater than 0"
- "Driver name is required"
- "Driver phone is invalid"
- "Vehicle not found or inactive"

Vehicle Route Management:
- "Route name is required"
- "At least one stop is required"
- "Cannot add inactive route as stop"
- "Sequence already exists for another stop"
- "SupplierRoute not found or inactive"
- "This SupplierRoute is already a stop in this route"

Vehicle Run Sheet Generation:
- "Vehicle not found or inactive"
- "Vehicle route not found or inactive"
- "Route does not belong to this vehicle"
- "Vehicle route has no stops"
- "No purchase orders available for this route on this date"
- "Today is not a scheduled day for this route"
- "Failed to generate run sheet. Please try again"
- "Run sheet created successfully with {stopCount} stops and {poCount} purchase orders"
- "Total amount: ฿{totalAmount}"

Vehicle Run Sheet — Driver Returned / Start Receipt:
- "Receipt started for {runSheetNumber}"
- "This run sheet is still out for pickup. Confirm the driver has returned to start recording the receipt."

Vehicle Run Sheet — Save Draft:
- "Draft saved"

Vehicle Run Sheet Receipt Recording:
- "Run sheet not found or not in Printed/InProgress status"
- "Cannot record receipt for already completed run sheet"
- "All line items must have actual received quantity"
- "Actual received quantity must be >= 0"
- "At least one line item per stop must have received quantity"
- "Cannot record receipt for future-dated run sheet"
- "Stop not found in run sheet"
- "Line item not found in this stop"
- "Failed to record receipt. Please try again"
- "This closes {runSheetNumber} and records the actual received quantities for all {stopCount} stop(s). This cannot be undone." (confirmation dialog — does not claim to update PO status; see Phase C)
- "Receipt recorded successfully"
- "Total ordered: {totalOrdered} Kg | Total received: {totalReceived} Kg"
- "Variance: {variance} Kg ({variancePercentage}%)"
- "{count} items fully received, {count} partially received, {count} not received"

Purchase Order Status (Phase B):
- "{poNumber} sent to {supplierName}"
- "{poNumber} confirmed by {supplierName}"
- "Cancel purchase order?" / "{poNumber} for {supplierName} ({totalAmount}) will be cancelled. This cannot be undone."
- "{poNumber} cancelled"

Data Loading:
- "Loading sales history..."
- "No data available for selected period"
- "Connection error. Please try again later"
```

---

### Success Messages & Confirmations

```
Template Created:
✅ "Template 'Template_January_2024' created successfully"
   [View Template] [Create POs] [Dismiss]

Order Line Saved:
✅ "Order from Supplier A - Route A (500 Kg) saved"

Purchase Orders Generated:
✅ "Successfully created 4 purchase orders
   Total amount: ฿45,300 across 4 routes"
   [View POs] [Proceed] [Dismiss]

Vehicle Created:
✅ "Vehicle VH-001 (กข-1234 Bangkok) created successfully"

Vehicle Route Created:
✅ "Route A added to Vehicle VH-001 with 3 stops"

Run Sheet Generated:
✅ "Run Sheet RS-2024-001-2024-01-15 generated successfully
   3 stops, 3 purchase orders, Total: ฿40,500"
   [View] [Print] [Confirm]

Run Sheet Printed:
✅ "Run Sheet printed successfully"

Delivery Receipt Recorded:
✅ "Delivery receipt recorded successfully
   Total ordered: 2,000 Kg | Total received: 1,805 Kg
   Variance: -195 Kg (-9.75%)
   6 items full, 2 items partial, 1 item missing"
   [View Run Sheet] [Close]
```

---

## Design Guidelines

### Color & Typography

#### Color Palette

```
Primary Colors:
- Brand Blue: #185FA5 (ASP.NET/Professional)
- Brand Green: #3B6D11 (Success/Confirmation)
- Brand Amber: #BA7517 (Warning/Action)

Semantic Colors:
- Success: #3B6D11 (Green) - for ✓ completed
- Warning: #BA7517 (Amber) - for ⚠️ incomplete or pending
- Danger: #A32D2D (Red) - for ❌ errors or failed
- Info: #185FA5 (Blue) - for ℹ️ information

Neutral Colors:
- Dark Text: #3d3d3a
- Light Text: #888780
- Border: #73726c
- Background: #F1EFE8

Status Indicators:
- Draft: Gray pill #888780
- Active: Green pill #3B6D11
- Confirmed: Blue pill #185FA5
- In Transit: Amber pill #BA7517
- Completed: Dark green pill #2d5c0e
- Archived: Gray pill #5F5E5A
```

#### Typography

```
Headings:
- H1 (22px, 500 weight): Page titles
- H2 (18px, 500 weight): Section titles
- H3 (16px, 500 weight): Subsection titles

Body:
- Regular: 16px, 400 weight
- Small: 14px, 400 weight
- Label: 12px, 500 weight

Font Family:
- Primary: "Anthropic Sans" or "Segoe UI" (Windows)
- Fallback: -apple-system, BlinkMacSystemFont, sans-serif
```

#### Spacing

```
Padding:
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px

Gaps:
- sm: 8px (between form fields)
- md: 12px (between sections)
- lg: 16px (between major sections)
- xl: 24px (between blocks)

Border Radius:
- Small: 4px (small components)
- Medium: 8px (cards, buttons)
- Large: 12px (large containers)
```

---

### Component Library

#### Form Components
- TextInput (with label, error state)
- NumberInput (with +/- buttons, decimal support)
- SelectDropdown (with search, multi-select option)
- DatePicker (single date, date range)
- Checkbox (single, group)
- RadioButton (group)
- PhoneInput (with Thai format validation)
- DragToReorder (for sequence ordering)

#### Data Display
- Table (sortable, filterable, paginated)
- Card (with header, content, footer)
- Badge (status indicator)
- List (ordered, unordered)
- Accordion (expandable sections)
- Timeline (for stop sequence visualization)

#### Layout
- Container (max-width: 1200px)
- Grid (12-column)
- Breadcrumb
- Tabs
- Modal/Dialog

#### Interactive
- Button (primary, secondary, danger, disabled)
- Toggle (on/off switch)
- Stepper (progress indicator)
- Toast/Notification (success, error, warning, info)
- Loading Spinner
- Modal (for confirmations, detailed views)

---

### Accessibility & UX Guidelines

```
1. Keyboard Navigation
   - Tab to move through form fields
   - Enter to submit forms
   - Escape to close modals
   - Arrow keys in dropdowns

2. Screen Reader Support
   - All images have alt text
   - Form labels associated with inputs
   - Status messages announced
   - Table headers marked properly

3. Color Contrast
   - All text meets WCAG AA standard (4.5:1)
   - Don't rely on color alone for information
   - Use icons + color for status

4. Focus Indicators
   - Clear focus outline on all interactive elements
   - Focus order matches logical reading order
   - Focus trap in modals

5. Mobile Responsive
   - Breakpoints: 320px, 768px, 1024px, 1440px
   - Touch targets: minimum 44x44px
   - Stack layout vertically on mobile
   - Optimize tables for mobile view
```

---

## Performance & Deployment

### Performance Considerations

```
Frontend:
- Lazy load tables (virtual scrolling for >1000 rows)
- Debounce search input (300ms)
- Cache template data on list view
- Cache vehicle & route data (5 min TTL)
- Optimize images & icons

Backend:
- Index on templateId, rawMaterialId, supplierRouteId, vehicleId
- Pagination: default 10-25 items per page
- Cache supplier list (5 min TTL)
- Cache vehicle routes (10 min TTL)
- Async operations for PO generation
- Async operations for run sheet generation

Caching Strategy:
- Templates: Cache 10 min
- Suppliers: Cache 5 min
- Vehicles & Routes: Cache 10 min
- Sales History: Cache 1 hour
- Raw Materials: Cache 1 day (rarely changes)
```

### Responsive Design Breakpoints

```
Desktop (1440px+):
- 2-column layout for templates list & detail
- Side-by-side form fields
- Full table display
- Drag-to-reorder for stops

Tablet (768px - 1023px):
- Single column layout
- Stacked form fields
- Responsive tables with horizontal scroll
- Mobile-optimized modals
- Simplified stop management

Mobile (320px - 767px):
- Full-width single column
- Stacked navigation
- Simplified tables with card view
- Large touch targets (44x44px minimum)
- Simplified run sheet view
```

---

## Implementation Notes

### Core Architecture

1. **Entity Framework Mapping**: Use DbContext for automatic ORM mapping
2. **Validation**: Use FluentValidation for server-side validation
3. **Error Handling**: Global exception handler middleware in ASP.NET Core
4. **Logging**: Implement structured logging (Serilog)
5. **Authentication**: Use JWT tokens for stateless API
6. **Authorization**: Role-based access control (Admin, Manager, Staff)
7. **Transactions**: Use unit of work pattern for multi-step operations
8. **Caching**: Redis for session & frequently accessed data

### Database Relationships (Important)

```
Supplier 1 --- N SupplierRoute
SupplierRoute 1 --- N SupplierRouteRawMaterial
SupplierRoute 1 --- N VehicleRouteStop (reverse: a route stop references this)
SupplierRoute 1 --- N PurchaseOrder (many POs can pickup from same route)

VehicleRoute 1 --- N VehicleRouteStop (ordered)
Vehicle 1 --- N VehicleRunSheet   (VehicleRoute 1 --- N VehicleRunSheet; the vehicle is chosen when generating the run sheet)
VehicleRouteStop N --- 1 SupplierRoute (references existing)

PurchaseOrder N --- 1 SupplierRoute (each PO pickup from 1 route)
PurchaseOrder N --- 1 VehicleRunSheet (nullable, filled when assigned to run)

VehicleRunSheet 1 --- N VehicleRunSheetStop
VehicleRunSheetStop N --- N PurchaseOrder (a stop can have 0+ POs)

--- Target design, not yet implemented ---
RawMaterialInventory 1 --- 1 RawMaterial (reference)
RawMaterialInventory N --- N ProductionOrder (via RMAllocation)

ProductionLine 1 --- N ProductionOrder
ProductionOrder 1 --- 1 FinishedGoodsBatch
ProductionOrder N --- 1 FinishedGood (via BillOfMaterial for RM needs)

FinishedGoodsInventory 1 --- N FinishedGoodsBatch
FinishedGoodsBatch N --- 1 ProductionOrder
```

---

## Risks & Mitigation (Production Planning)

> Carried forward from the companion comprehensive design doc — applies once FLOW 4-7 are built.

### Risk 1: Delivery Variance Impact on Production Timing
**Risk**: Actual received qty < ordered qty (FLOW 3b) → production delayed.
**Mitigation**: Order 10-15% safety stock; use multiple supplier routes per RM rather than depending on a single route; automatic reorder alerts when stock drops below `reorderPoint`; expedited-delivery options for premium suppliers.

### Risk 2: Bottleneck Raw Materials
**Risk**: A single scarce RM constrains every product that depends on it.
**Mitigation**: The FLOW 4 AI algorithm explicitly identifies and surfaces bottleneck RMs; prioritize allocation by profit/deadline score; diversify suppliers per RM; forecast and order early for known-critical RMs.

### Risk 3: RM Waste Due to Variance
**Risk**: `quantityAllocated` was computed against ordered quantity, but actual available (post-receipt) came in lower → production shortage mid-run.
**Mitigation**: Allocation must always be computed from `quantityAvailable` (post-receipt), never from ordered quantity; track variance history per supplier route for early warning; require quality checks at receipt time (already covered by FLOW 3b); do root-cause analysis on any receipt with variance >5%.

### Risk 4: Production Yield Variation
**Risk**: Actual yield < expected yield → FG stock shortfall vs. sales plan.
**Mitigation**: Track historical yield rates per line/product and feed them back into FLOW 4's feasibility check; QC sampling during production (not just at the end) for early detection; plan FG targets with a safety margin (e.g., 110% of demand) where yield history is volatile.

---

## Implementation Roadmap

> Status column reflects what is actually true in this repo today, not aspirational planning.

| Phase | Scope | Status in this repo |
|-------|-------|----------------------|
| **Phase 1** — Procurement & Logistics | Purchase templates, PO grouping by Supplier+Route, Vehicle/Route master data, Run Sheet generation & printing, Receipt recording (FLOW 1-3b) | **Built** (frontend, mock-backed) — see Phase A/B notes throughout this doc; Phase C (PO↔RunSheet FK linkage) still outstanding |
| **Phase 2** — Production Planning & Manufacturing | AI production planning, production order creation, manufacturing execution, QC & yield tracking, FG inventory (FLOW 4-7) | **Not started** — target design only, this document's new sections |
| **Phase 3** — Sales & Distribution | Customer order management, FG fulfillment, delivery tracking, driver sales, export shipping (FLOW 8) | **Not started** — not designed in detail yet, placeholder only |
| **Phase 4** — Analytics & Optimization | Supplier performance dashboard, yield optimization, variance analysis reports, demand forecasting, cost analysis | **Not started** — future enhancement, no design done |

---

## Future Enhancements

- [ ] Import templates from Excel
- [ ] Automated email notifications to suppliers
- [ ] SMS notifications for delivery updates
- [ ] Mobile app for vehicle drivers/field staff
- [ ] Real-time inventory sync
- [ ] Supplier performance analytics
- [ ] Predictive demand forecasting
- [ ] Supplier portal for order tracking
- [ ] Route optimization algorithm (for vehicle routing)
- [ ] GPS tracking for vehicle runs
- [ ] Barcode scanning for pickups
- [ ] Delivery confirmation photos
- [ ] Multi-language UI support (Thai/English)

---

**Document Version**: 3.0 (with Vehicle & Run Sheet Management, plus Production Planning/Manufacturing/Sales target design)  
**Last Updated**: September 2026  
**Status**: Procurement & Logistics (FLOW 1-3b) — Ready for Development / Built. Production, Manufacturing & Sales (FLOW 4-8) — Target design, not yet implemented.
