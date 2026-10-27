# Procurement & Logistics System - Project Context Document

**Project**: Bangkok Flower Sale Management System  
**Module**: Procurement, Production & Sales Management  
**Tech Stack**: ASP.NET Core + React + PostgreSQL/SQL Server  
**Last Updated**: October 2026  

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
- Vehicle master data (code, license plate, type, capacity) — no driver; the driver is chosen per run sheet
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
- Code: VH-001, License: กข-1234, Capacity: 2,000 Kg (no driver — see §3.4)

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

Vehicle VH-001 (2,000 Kg capacity) and driver — both picked on the run sheet, not on the route
```

**Key Point**: A vehicle route can visit multiple suppliers in a single route!

### 3.4 Vehicle Run Sheet

**VehicleRunSheet** = Daily pickup document (ใบวิ่งรถ)  
- Created for 1 VehicleRoute + 1 Vehicle + 1 Driver + 1 Date (vehicle and driver are chosen here; neither is stored on the route, and the driver is not tied to a vehicle)
- Driver = an active User with role `driver` (`driverUserId`); name and phone are copied onto the run sheet for printing
- Contains all POs whose pickup location matches a stop in the selected route
- Ordered by stop sequence
- One run sheet = one pickup trip. A vehicle or driver can have several run sheets and delivery sheets (§3.4.1) on the same day, e.g. pickup in the morning and delivery in the afternoon — there is no one-per-day limit

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

### 3.4.1 Delivery Sheet (ใบส่งของ — ขาส่ง)

> UI ทำแล้วแบบ mock 2026-10-26 (ข้อมูลใน memory ไม่มี backend) — ส่วนที่ยังต่างจากที่ออกแบบ ดู "สถานะการสร้าง" ท้าย §3.4.3
> Full detail (entity, API, messages): DESIGN "Delivery Sheet".

**DeliverySheet** = ใบส่งของ (ขาส่ง) — เอกสาร 1 เที่ยวส่งของ: เลือก **รถ + คนขับ + วันที่** แล้วเลือกจุดส่งเรียงตามลำดับ คู่กับใบวิ่งรถ (ขารับ) แต่ไม่ใช้เส้นทางรถ — แบบสายฝากขายใช้**สายฝากขาย**แทน
- **ใบส่งของ 2 แบบ (`sheetType`) ไม่ปนกันในใบเดียว** (updated 2026-10-26 — ส่งตรงไม่รวมกับสายฝากขาย)
  - `consignment_route` (สายฝากขาย) — เลือก **สาย** ระบบดึงร้านในสายเป็นจุดส่ง (`consignment_visit`) ตามลำดับ และสร้าง **ใบเข้าร้าน** (`ConsignmentVisit`) ให้ทุกจุด คนขับของใบเข้าร้าน = คนขับของใบส่งของ · ตอน Draft ตัด/เพิ่ม/เรียงร้านได้ · ของขึ้นรถตั้งต้นจากยอดประเมินลงร้านของสายนั้น
  - `direct` (ส่งตรง) — เลือก **คำสั่งซื้อ** (`customer_order`) `confirmed` ที่ยังไม่ส่งและยังไม่อยู่ในใบส่งของใบอื่นที่ยังเปิดอยู่ — ลูกค้าในประเทศ หรือส่งออก (ปลายทางสนามบิน)
- **ลำดับจุดส่ง** staff จัดเอง (ลากเรียง) ใบที่พิมพ์และหน้างานวันนี้ของคนขับเรียงตามลำดับนี้
- **ของขึ้นรถและของคืน (สายฝากขาย)** — ตอนพิมพ์ใบบันทึกของขึ้นรถต่อสินค้า (สแกน LOT) · คนขับลงของแต่ละร้านตามหน้างานได้ ไม่ต้องตรงยอดประเมิน · จบเที่ยว staff บันทึกของคืน (สแกน LOT) ของคืนกลับเข้าสต็อก · ระบบแสดงส่วนต่าง ขึ้นรถ − ลงร้าน − คืน (เตือน ไม่บล็อก)
- **ขารับกับขาส่งเป็นคนละใบ** — ขารับใช้ใบวิ่งรถ ขาส่งใช้ใบส่งของ · งานจริงรับของและส่งของคนละช่วงเวลา ไม่มีเที่ยวที่ปนกัน จึงไม่มีใบแบบผสม
- **รถ/คนขับคนเดียวกันมีหลายใบในวันเดียวได้** ทั้งใบวิ่งรถและใบส่งของ (เช่น เช้ารับวัตถุดิบ บ่ายส่งของ) ไม่ล็อก — ตอนออกใบระบบบอกว่ารถคันนี้/คนขับคนนี้มีใบอื่นในวันเดียวกันกี่ใบ (ข้อมูลประกอบ ไม่บล็อก)
- **ไม่ระบุเวลาออกรถ** ลำดับเที่ยวของวันดูจากเวลาที่พิมพ์ใบ (`printedAt`)
- `driver` ไม่เห็นราคา/ยอดเงินในใบส่งของ

**สถานะ**
```
Draft → Printed → Completed
  └────────┴──→ Cancelled
```
- **Draft** — เพิ่ม/ลบ/เรียงจุดส่ง เปลี่ยนรถ/คนขับได้
- **Printed** — พิมพ์แล้ว คนขับออกส่ง แจ้งเตือน `deliverysheet.ready` ถึงคนขับ · เปลี่ยนคนขับได้ (คนใหม่ได้รับแจ้ง คนขับของใบเข้าร้านในใบเปลี่ยนตาม) แต่เพิ่ม/ลบจุดส่งไม่ได้
- **ผลของแต่ละจุด** (`pending` → `done` / `failed`)
  - จุดคำสั่งซื้อ: staff บันทึกส่งของในคำสั่งซื้อ (เหมือนเดิม) → `done` · ❓ ค้างไว้: จะให้คนขับกด "ส่งแล้ว" เองจากหน้างานวันนี้ (พร้อมหลักฐาน เช่น รูป/ลายเซ็นผู้รับ) หรือไม่
  - จุดร้านฝากขาย: ร้านเซ็นใบเข้าร้าน → `done`
  - ส่งไม่ได้: staff กด "ส่งไม่ได้" พร้อมเหตุผล → `failed` · คำสั่งซื้อกลับไปรอส่ง ใส่ใบส่งของใบอื่นได้ · ใบเข้าร้านที่ยังไม่เซ็นถูกยกเลิก
- **Completed** — อัตโนมัติเมื่อทุกจุดเป็น `done` หรือ `failed` (แบบสายฝากขายต้องบันทึกของคืนแล้วด้วย)
- **Cancelled** — ยกเลิกได้เมื่อยังไม่มีจุดไหน `done` · คืนคำสั่งซื้อเป็นรอส่ง และยกเลิกใบเข้าร้านที่ยังไม่เซ็น

**ตัวอย่าง** (วันเดียวกัน — รถ VH-001 คนขับ สมชาย วิ่ง 2 เที่ยว)
```
RS-20260115-001 ใบวิ่งรถ (เช้า) · รถ VH-001 · คนขับ สมชาย · เส้นทาง A
├─ 1. สวน A เชียงใหม่ — PO-…: กุหลาบแดง 500 ก้าน
└─ 2. สวน B นครปฐม  — PO-…: ยิปโซ 30 กำ

DS-20260115-002 ใบส่งของ สายฝากขาย (บ่าย) · สาย CR-01 สุขุมวิท · รถ VH-001 · คนขับ สมชาย
├─ ขึ้นรถ: ช่อกุหลาบแดง 60 ช่อ, ช่อมะลิ 20 ช่อ (จากยอดประเมิน CE-20260115-001)
├─ 1. Tops ลาดพร้าว  — ใบเข้าร้าน CV-…
├─ 2. Central World — ใบเข้าร้าน CV-…
└─ 3. Big C พระราม 4 — ใบเข้าร้าน CV-…

DS-20260115-003 ใบส่งของ ส่งตรง · รถ VH-002 · คนขับ สมศักดิ์
├─ 1. ร้านดอกไม้ป้าแดง          — SO-2026-0123: ช่อกุหลาบแดง 20 ช่อ
└─ 2. สนามบินสุวรรณภูมิ (ส่งออก) — SO-2026-0124: Hana Flowers (JP)
```

### 3.4.2 Driver's Jobs Today (งานวันนี้)

> Designed 2026-10-26, not yet built.

หน้าแรกของ `driver` หลัง login (`/my-jobs`) ออกแบบสำหรับมือถือ
- แสดง **ใบวิ่งรถ + ใบส่งของ** ที่ตัวเองเป็นคนขับของวันนี้ สถานะ `Printed` เรียงตามเวลาพิมพ์ (= เที่ยวที่ 1, 2, …) · ใบที่จบแล้ว (`Completed`) อยู่ท้ายแบบจาง · ไม่แสดง `Draft` / `Cancelled`
- **ใบวิ่งรถ**: จุดรับตามลำดับ ที่อยู่ ผู้ติดต่อ (กดโทรได้) วัตถุดิบ + จำนวน — ดูอย่างเดียว (คนขับไม่บันทึกรับของ)
- **ใบส่งของ**: จุดส่งตามลำดับ ที่อยู่ ผู้ติดต่อ สินค้า + จำนวน และสถานะแต่ละจุด · จุดร้านฝากขายกดเปิดใบเข้าร้านเพื่อสแกนของที่เหลือและให้ร้านเซ็น
- เลือกดูวันอื่นได้ (ย้อนหลัง/ล่วงหน้า) อ่านอย่างเดียว · ไม่แสดงราคา/ยอดเงิน
- sidebar ของ `driver` มีแค่เมนู **งานวันนี้** — รายละเอียดใบเปิดผ่านลิงก์ในหน้านี้หรือจากแจ้งเตือน

### 3.4.3 Sales Types & Daily Fulfilment (ประเภทการขาย)

> UI ทำแล้วแบบ mock 2026-10-26 (ข้อมูลใน memory ไม่มี backend) — ส่วนที่ยังต่างจากที่ออกแบบ ดู "สถานะการสร้าง" ท้าย §3.4.3
> Full detail (entities, API, FLOW 8): DESIGN "Sales Types & Daily Fulfilment". ส่วนส่งออกยังมีคำถามค้าง (❓)

**ขาย 3 แบบ**

| | ฝากขาย | ขายขาด (fixed order) | ส่งออก (fixed order ต่างประเทศ) |
|---|---|---|---|
| รับยอด | staff ประเมินยอดลงร้านรายสาย — **ไม่ใช่คำสั่งซื้อ** | อีเมล/ไฟล์ (คัดกรองแล้ว) หรือโทรสั่ง | คีย์เองจาก platform ซื้อขายดอกไม้/ต้นไม้ |
| เอกสารที่สร้าง | ยอดประเมินลงร้าน (`ConsignmentEstimate`) | คำสั่งซื้อ (`CustomerOrder`) | คำสั่งซื้อ (`CustomerOrder`) |
| ยอดจริง | ของที่สแกนลงร้าน (ใบเข้าร้าน) · ยอดขายจากร้าน | ตามคำสั่งซื้อ | ตามคำสั่งซื้อ |
| สั่งวัตถุดิบ | ประเมินจากยอดขายย้อนหลัง (ร่วมกับขายขาด) | ประเมินจากยอดขายย้อนหลัง | ยอดแน่นอนจากคำสั่งซื้อ สั่งก่อนวันส่ง |
| ใบสั่งผลิต | 1 ใบต่อ สาย × วันส่ง × สินค้า | 1 ใบต่อ คำสั่งซื้อ × สินค้า | 1 ใบต่อ คำสั่งซื้อ × สินค้า |
| จัดส่ง | ใบส่งของแบบสายฝากขาย | ใบส่งของแบบส่งตรง | ใบส่งของแบบส่งตรง ปลายทางสนามบิน |
| เก็บเงิน | ใบแจ้งหนี้จากยอดขายจากร้าน (GP — ❓ ค้าง) | ใบแจ้งหนี้ตามที่ส่ง | commercial invoice + packing list ภาษาอังกฤษ (ระบบออก) — ❓ สกุลเงิน/ช่องทางรับเงิน |

**สายฝากขาย (`ConsignmentRoute`)** — ข้อมูลหลักของฝ่ายขาย แยกจากเส้นทางรถ (ขารับวัตถุดิบ)
- `code`, `name`, ร้านเรียงตามลำดับ (`ConsignmentRouteStop`), `daysOfWeek` **วันที่วิ่ง** (บังคับ เลือกอย่างน้อย 1 วัน — วิ่งทุกวันให้เลือกครบ 7 วัน), `isActive`
- ร้าน 1 ร้านอยู่ได้หลายสาย และ**อาจโดน 2 สายในวันเดียวกันได้** · ร้านเดิมซ้ำในสายเดียวกันไม่ได้
- ไม่ผูกรถหรือคนขับ — เลือกตอนออกใบส่งของ

**ยอดประเมินลงร้าน (`ConsignmentEstimate`)** — 1 ใบต่อ สาย × วันส่ง (`CE-YYYYMMDD-###`)
- รายการ = ร้านในสาย × สินค้า × จำนวนประเมิน · ระบบแนะนำตัวเลข (ยอดขายล่าสุดของร้าน, ของที่ยังเหลือในร้าน, ของเสียรอบก่อน) staff แก้ได้เสมอ
- **ไม่ใช่คำสั่งซื้อและไม่ใช่ยอดขาย** — ใช้วางแผนผลิตและเตรียมของขึ้นรถเท่านั้น
- ร้านที่อยู่ในยอดประเมินของสายอื่นในวันเดียวกัน ระบบเตือน (ไม่บล็อก) กันประเมินซ้ำโดยไม่ตั้งใจ
- สถานะ `draft` → `confirmed` (นับเข้าแผนผลิต) · `cancelled` · แก้ได้จนกว่าใบส่งของของสายนั้นจะพิมพ์ — แก้หลังสั่งผลิตแล้ว ระบบแสดงส่วนต่างกับใบสั่งผลิต ไม่แก้ใบสั่งผลิตให้อัตโนมัติ
- เก็บไว้เทียบกับยอดที่ลงร้านจริง (ใบเข้าร้าน) เพื่อปรับยอดแนะนำรอบต่อไป

**คำสั่งซื้อ (ขายขาด + ส่งออก)** — เพิ่มจากของเดิม
- `channel`: `email` (นำเข้าจากอีเมล/ไฟล์ เป็นร่างจนคัดกรองแล้วยืนยัน) · `phone` · `platform` · `manual`
- `platformName?` + `platformOrderRef?` — คู่นี้ซ้ำไม่ได้ (กันคีย์ซ้ำ)
- ลูกค้าส่งออก = **ผู้ซื้อต่างประเทศแต่ละราย** เก็บเป็นลูกค้า (มีสั่งซ้ำ) เพิ่ม `country`, `nameEn`, `addressEn`, `currency?` ❓ · platform เป็นแค่ช่องทาง ไม่ใช่ลูกค้า
- ปลายทางส่งของ: ในประเทศ = ที่อยู่ลูกค้า · ส่งออก = **สนามบิน** (รถเราไปส่ง)
- ❓ ค้าง (ส่งออก): สกุลเงินและช่องทางรับเงิน · สินค้า/การแพ็กแยกจากในประเทศไหม · ใบรับรองสุขอนามัยพืช (phytosanitary) · packing list ละเอียดระดับกล่องไหม · เก็บ AWB/เที่ยวบินไหม · เที่ยวเดียวขนหลายคำสั่งซื้อได้ไหม

**สั่งผลิต**
- ปกติสั่งผลิตบ่าย ส่งเช้าวันถัดไป แต่**สั่งได้ทุกเวลา** ไม่มีตัดรอบ — คำสั่งซื้อ (อีเมล/โทร) ที่มาทีหลัง สั่งผลิตเพิ่มได้
- หน้าวางแผนผลิตเลือก **วันส่ง** แล้วแสดงความต้องการทั้งหมดของวันนั้น: ยอดประเมินแต่ละสาย (`confirmed`) + คำสั่งซื้อ `confirmed` ที่ส่งวันนั้น พร้อมสถานะว่าสั่งผลิตแล้วหรือยัง
- ใบสั่งผลิต (1 ใบ = 1 สินค้า = 1 LOT เหมือนเดิม)
  - ฝากขาย: 1 ใบต่อ สาย × วันส่ง × สินค้า · ยอดตั้งต้น = ผลรวมยอดประเมินของร้านในสาย แก้ได้ (เช่น ใช้สต็อกที่มีอยู่) · `source = consignment_route`
  - ขายขาด/ส่งออก: 1 ใบต่อ คำสั่งซื้อ × สินค้า · `source = customer_order`
  - ผลิตเข้าสต็อก: `source = manual`
- LOT ที่ผลิตเสร็จถูกกันไว้ให้สายหรือคำสั่งซื้อนั้น

**สั่งวัตถุดิบ**
- ฝากขาย + ขายขาดในประเทศ: ประเมินจากยอดขายย้อนหลัง (แผนจัดซื้อเดิม) — คำสั่งซื้ออีเมลมาเช้า ผลิตบ่าย สั่งวัตถุดิบไม่ทัน จึงใช้สต็อกที่ซื้อไว้จากยอดประเมิน
- ส่งออก: คำสั่งซื้อรู้ล่วงหน้า เพิ่มเข้าแผนจัดซื้อเป็น**ยอดแน่นอน** · ยอดประเมินจากประวัติไม่นับช่องทาง `platform` เพื่อไม่ให้นับซ้ำ

**จัดส่ง** — ใบส่งของ 2 แบบ ไม่ปนกัน (§3.4.1)
- **สายฝากขาย**: เลือกสาย ระบบดึงร้านตามลำดับ + ยอดขึ้นรถจากยอดประเมิน · คนขับลงของแต่ละร้านตามหน้างานได้ ไม่ต้องตรงยอดประเมิน · ของที่เหลือกลับเข้าสต็อก
- **ส่งตรง**: เลือกคำสั่งซื้อ (ลูกค้าในประเทศ หรือส่งออกไปสนามบิน)

**สถานะการสร้าง (mock UI, 2026-10-26)** — ที่ทำจริงต่างจากที่ออกแบบเล็กน้อย
- ✅ สายฝากขาย (เพิ่ม/แก้/เปิด-ปิด, เรียงร้าน, วันที่วิ่งบังคับ) · ยอดประเมินลงร้าน (ตารางร้าน × สินค้า, ยอดแนะนำ, ยืนยัน/ยกเลิก, ล็อกเมื่อใบส่งของพิมพ์แล้ว, เตือนร้านซ้ำสาย) · ใบส่งของทั้ง 2 แบบ (ร่าง → พิมพ์แล้ว → เสร็จสิ้น/ยกเลิก, ส่งไม่ได้, ของขึ้นรถ/ของคืน) · ความต้องการตามวันส่งในหน้าวางแผนผลิต · ช่องทางคำสั่งซื้อ + คีย์คำสั่งซื้อ + ผู้ซื้อต่างประเทศ
- **คำสั่งซื้อที่คีย์เอง** (โทร / platform / คีย์เอง) สร้างเป็น `confirmed` ทันที เพราะพนักงานรู้เนื้อหาแล้ว ไม่มีขั้นคัดกรองแบบอีเมล
- **สถานะใบส่งของ**: เก็บแค่ `draft` / `printed` / `cancelled` — `completed` และสถานะรายจุด (`pending` / `done` / `failed`) คำนวณจากคำสั่งซื้อที่ส่งแล้วและใบเข้าร้านที่เซ็นแล้ว (จุดที่ส่งไม่ได้เก็บ `failReason`)
- **ใบเข้าร้าน**: สถานะเพิ่ม `cancelled` · ใบที่สร้างจากใบส่งของข้ามกฎ "ร้านมีใบเข้าร้านร่างอยู่แล้ว" เพราะร้านเดียวอยู่ 2 สายในวันเดียวกันได้
- ⚠️ **ของคืน** บันทึกเป็นจำนวนต่อสินค้า ยังไม่สแกน LOT และยังไม่ปรับยอด LOT ในคลัง · LOT ของสายฝากขายไม่ได้จองให้สายโดยเฉพาะ
- ⚠️ **คนขับ** เลือกจากรายชื่อคนขับของรถ (ยังไม่มีระบบผู้ใช้) · ⚠️ สิทธิ์ตาม role และ `/my-jobs` ยังไม่ได้ทำ
- ⏳ ยังไม่ทำ: เอกสารส่งออก (commercial invoice / packing list) · แผนจัดซื้อรวมยอดส่งออกเป็นยอดแน่นอนและไม่นับยอด platform ซ้ำ (ตอนนี้คำสั่งซื้อ `confirmed` ทุกช่องทางเข้าแผนตามตรรกะเดิม) · สต็อกวัตถุดิบเป็นแท็บแยก

### 3.5 System Settings (Configurable Thresholds)

Admin-tunable business rules on the **ตั้งค่าระบบ** page (`/admin/settings`, menu ผู้ดูแลระบบ — the current code still serves it at `/settings` from the gear button until the admin menu is built). Full rationale: DESIGN "System Settings (Configurable Thresholds)".

| Key | กลุ่ม | ใช้ที่ | ค่าเริ่มต้น | ช่วงที่ตั้งได้ |
|-----|------|-------|-----------|--------------|
| `wasteWarnPercent` | ขาย | หน้าสรุปผลฝากขาย: อัตราของเสีย (ของเสีย ÷ ของที่ส่งเข้าร้าน) ตั้งแต่ค่านี้เป็นสีส้ม | 10 % | 0–100 |
| `wasteDangerPercent` | ขาย | ตั้งแต่ค่านี้เป็นสีแดง | 15 % | 0–100, ต้อง > `wasteWarnPercent` |
| `wasteMinDelivered` | ขาย | สาขาที่ส่งน้อยกว่านี้ไม่ติดอันดับ "สาขาที่ของเสียสูง" | 100 ชิ้น | 0–100,000 |
| `receiptVariancePercent` | จัดซื้อ | รับของต่างจากที่สั่ง (± %) เกินค่านี้ขึ้นการ์ดความเสี่ยงที่แดชบอร์ด | 10 % | 0–100 |
| `expiryWarningDays` | คลังสินค้า | LOT สินค้าสำเร็จรูปที่ยังมีของและจะหมดอายุภายในกี่วัน ขึ้นการ์ดความเสี่ยง | 7 วัน | 0–60 |
| `lowYieldPercent` | ผลิต | ใบสั่งผลิตที่ปิดแล้วมีอัตราผลผลิตต่ำกว่าค่านี้ ขึ้นการ์ดความเสี่ยง | 95 % | 0–100 |

- **ใช้เตือนเท่านั้น ไม่บล็อกการทำงาน** — ทุกค่าใช้กำหนดสีแถว อันดับ หรือรายการในการ์ดความเสี่ยง ผู้ใช้ยังส่งของ ใช้ LOT หรือรับของได้ตามปกติ (หน้างานจริงยืดหยุ่น ระบบที่บล็อกมากเกินไปผู้ใช้ไม่ชอบ)
- **รายงานคิดใหม่ตามค่าปัจจุบันเสมอ** — รวมช่วงย้อนหลัง ไม่มีค่าที่มีวันที่เริ่มใช้ (effective date)
- **ประวัติการแก้ค่าเก็บไว้ตรวจสอบเท่านั้น** — ใคร แก้ค่าไหน จากเท่าไรเป็นเท่าไร เมื่อไร ไม่มี logic ใดอ่านประวัติไปคำนวณ · เก็บใน Audit Log (`entityType = SystemSetting`)
- **ผู้ดูแลระบบแก้ได้คนเดียว** (role `admin`, §3.6) — โค้ดปัจจุบันยังใช้ flag `isAdmin` ชั่วคราวจนกว่าระบบ login จะสร้างเสร็จ ผู้ใช้ที่ไม่ใช่ admin ไม่เห็นเมนู และเข้า `/admin/settings` ตรง ๆ จะเจอข้อความไม่มีสิทธิ์
- ค่าเป็นชุดเดียวทั้งระบบ (ยังไม่มีตั้งทับรายหมวดหรือรายสินค้า)
- Implementation ปัจจุบัน: `src/features/settings/` (`definitions.ts` = รายการค่าและกฎตรวจ, `store.ts` = ค่าปัจจุบัน + ประวัติ เก็บใน localStorage จนกว่าจะมี backend)

### 3.6 Users, Roles & Authentication

> Designed 2026-10-25, not yet built. Full detail (entities, API, messages): DESIGN "Users, Roles & Authentication".

| Role | ใคร | ขอบเขต |
|------|-----|--------|
| `admin` | ผู้ดูแลระบบ | ทำได้ทุกอย่าง รวมถึงจัดการผู้ใช้และตั้งค่าระบบ |
| `staff` | พนักงานทั่วไป | ทำได้ทุกอย่าง **ยกเว้น** จัดการผู้ใช้และตั้งค่าระบบ |
| `driver` | คนขับรถ | ดูใบวิ่งรถที่ตัวเองถูกมอบหมาย, ทำงานเข้าร้านฝากขายที่ตัวเองถูกมอบหมาย |
| `production` | พนักงานผลิต | ทำงานตามใบสั่งผลิต (เริ่มผลิต / บันทึกผล / ปิดงาน), ดูแผนผลิต สต็อก สูตร |

ผู้ใช้ 1 คนมีได้ 1 role

**User data**

| ฟิลด์ | บังคับ | หมายเหตุ |
|------|-------|---------|
| `firstName`, `lastName` | ✔ | ชื่อ, นามสกุล |
| `phone` | ✔ | ใช้ login ห้ามซ้ำ (รวมบัญชีที่ปิดแล้ว) เก็บรูปแบบเดียว `0XXXXXXXXX` (10 หลัก) — ตอนกรอกพิมพ์ขีด/เว้นวรรค/ขึ้นต้น `+66` ได้ ระบบแปลงให้ |
| `email` | — | ไม่บังคับ ไม่ใช้ login |
| `role` | ✔ | `admin` / `staff` / `driver` / `production` |
| `lineUserId`, `lineDisplayName`, `linePictureUrl`, `lineLinkedAt`, `lineStatus` | — | ข้อมูลการเชื่อม LINE (ดูหัวข้อ LINE) |

ฟิลด์ที่ระบบจัดการเอง (ผู้ใช้ไม่กรอก): `passwordHash` (ไม่เก็บรหัสผ่านตรง ๆ), `isActive`, `mustChangePassword`, `failedLoginCount`, `lockedUntil`, `lastLoginAt`, `createdAt`

**Login**
- **Login ด้วยเบอร์โทร + รหัสผ่าน** ผิดแล้วตอบรวม ๆ ว่า "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง" ไม่บอกว่าผิดช่องไหน
- **ล็อกบัญชี** เมื่อรหัสผิด 5 ครั้งติดกัน นาน 15 นาที (admin ปลดล็อกก่อนได้) login สำเร็จแล้วรีเซ็ตตัวนับ
- **รหัสผ่าน** อย่างน้อย 8 ตัวอักษร
- **ลืมรหัสผ่าน** ไม่มี OTP/อีเมลในรอบแรก — แจ้ง admin ให้รีเซ็ต ระบบออกรหัสชั่วคราว และบังคับเปลี่ยนตอน login ครั้งถัดไป (`mustChangePassword`) เช่นเดียวกับบัญชีที่ admin เพิ่งสร้าง
- **อายุ session** `driver` / `production` 30 วัน (ใช้มือถือ/แท็บเล็ตหน้างาน) · `admin` / `staff` 12 ชั่วโมง
- **ปิดบัญชี, เปลี่ยน role, รีเซ็ตรหัส** มีผลทันที — session เดิมของผู้ใช้คนนั้นถูกยกเลิกทั้งหมด
- **ไม่มีการลบผู้ใช้** ใช้ปิดบัญชี (`isActive = false`) เพราะชื่ออยู่ในเอกสารย้อนหลัง
- **admin คนแรก** สร้างตอนติดตั้งระบบ (seed)

**Permissions**

✏️ = แก้ไขได้ · 👁 = ดูอย่างเดียว · — = ไม่เห็นเมนูและเรียก API ไม่ได้

| เมนู / หน้า | admin | staff | driver | production |
|---|---|---|---|---|
| แดชบอร์ด | ✏️ | ✏️ | — | — |
| จัดซื้อ: แผนจัดซื้อ, ใบสั่งซื้อ, ซัพพลายเออร์ | ✏️ | ✏️ | — | — |
| งานวันนี้ | — | — | 👁 ของตัวเอง | — |
| ขนส่ง: ใบวิ่งรถ (รวมบันทึกรับของ) | ✏️ | ✏️ | 👁 เฉพาะใบที่ตัวเองเป็นคนขับ | — |
| ขนส่ง: ใบส่งของ | ✏️ | ✏️ | 👁 เฉพาะใบที่ตัวเองเป็นคนขับ | — |
| ขนส่ง: รถ, เส้นทางรถ | ✏️ | ✏️ | — | — |
| ผลิต: วางแผนผลิต | ✏️ | ✏️ | — | 👁 |
| ผลิต: ใบสั่งผลิต | ✏️ | ✏️ | — | ✏️ เริ่มผลิต / บันทึกผล / ปิดงาน — **สร้างใหม่ไม่ได้** |
| ผลิต: สินค้าสำเร็จรูป, สต็อกวัตถุดิบ | ✏️ | ✏️ | — | 👁 |
| ผลิต: ไลน์ผลิต | ✏️ | ✏️ | — | ✏️ เฉพาะเปิด/ปิดซ่อม |
| ขาย: เข้าร้าน | ✏️ | ✏️ (สร้างผ่านใบส่งของ) | ✏️ เฉพาะงานที่ถูกมอบหมาย (สแกน, ให้ร้านเซ็น) | — |
| ขาย: คำสั่งซื้อ, ยอดขายจากร้าน, ใบแจ้งหนี้, สรุปผลฝากขาย, ลูกค้า | ✏️ | ✏️ | — | — |
| ขาย: สายฝากขาย, ยอดประเมินลงร้าน | ✏️ | ✏️ | — | — |
| ข้อมูลหลัก: สินค้า, สูตร, วัตถุดิบ | ✏️ | ✏️ | — | 👁 |
| ผู้ดูแลระบบ: จัดการผู้ใช้, ตั้งค่าระบบ (รวม LINE OA), ประวัติการส่ง LINE, Audit Log | ✏️ | — | — | — |
| โปรไฟล์ตัวเอง (เปลี่ยนรหัส, เชื่อม LINE) | ✏️ | ✏️ | ✏️ | ✏️ |

- **ตรวจสิทธิ์ที่ backend ทุก API** ไม่ใช่แค่ซ่อนเมนู · เข้า URL ตรงแล้วไม่มีสิทธิ์ → หน้า "ไม่มีสิทธิ์เข้าหน้านี้"
- **หน้าแรกหลัง login** `admin` / `staff` → แดชบอร์ด · `driver` → งานวันนี้ (`/my-jobs`) · `production` → ใบสั่งผลิต
- **`driver` ไม่เห็นราคาและยอดเงิน** ในหน้าที่เปิดให้ (ใบวิ่งรถแสดงจุดรับ สินค้า จำนวน แต่ไม่แสดงราคา/ยอดรวม)
- **คนขับไม่ได้ผูกกับรถ** — เลือกคนขับพร้อมรถทุกครั้งที่ออกใบ: ใบวิ่งรถ (`VehicleRunSheet.driverUserId`) และใบส่งของ (`DeliverySheet.driverUserId`) · ใบเข้าร้านรับคนขับจากใบส่งของ (`ConsignmentVisit.driverUserId`) · คนขับ/รถคนเดียวกันมีหลายใบในวันเดียวได้
- **คนขับไม่บันทึกรับของเอง** — พนักงานบันทึกจากใบวิ่งรถกระดาษหลังคนขับกลับมา (FLOW 3b เดิม)

**User management** (`/admin/users`, admin only)
- รายการผู้ใช้: ชื่อ-นามสกุล, เบอร์โทร, role, สถานะ (ใช้งาน / ปิด / ล็อก), LINE (เชื่อมแล้ว / ยังไม่เชื่อม / บล็อก OA), login ล่าสุด · ค้นหาชื่อ/เบอร์ · กรองตาม role และสถานะ
- เพิ่ม / แก้ไขผู้ใช้: ชื่อ, นามสกุล, เบอร์โทร, email, role — ตอนสร้างระบบออก **รหัสชั่วคราว** แสดงครั้งเดียวให้ admin ส่งต่อ
- ปุ่มต่อแถว: แก้ไข, รีเซ็ตรหัส (ได้รหัสชั่วคราวใหม่), ปลดล็อก (เมื่อถูกล็อก), ปิด/เปิดบัญชี, ยกเลิกการเชื่อม LINE
- กฎ: ปิดบัญชีหรือเปลี่ยน role ของตัวเองไม่ได้ · ต้องเหลือ `admin` ที่ใช้งานอยู่อย่างน้อย 1 คน · ไม่มีปุ่มลบ

**Changes to existing entities**

| ตอนนี้ | เปลี่ยนเป็น | เหตุผล |
|-------|-----------|-------|
| `Vehicle.driverName` / `driverPhone` / `driverAddress` | **ลบออก** | คนขับไม่ได้ผูกกับรถ |
| `VehicleRunSheet.driverName` / `driverPhone` (copy จาก Vehicle) | `driverUserId` (FK User, บังคับ) + `driverName` / `driverPhone` (copy จาก User ตอนสร้าง สำหรับพิมพ์) | เลือกคนขับตอนออกใบวิ่งรถ, คนขับเห็นใบของตัวเอง |
| `ConsignmentVisit.driverName` | `deliverySheetId` (FK) + `driverUserId` (FK User, copy จากใบส่งของ) | ใบเข้าร้านสร้างจากใบส่งของ คนขับเห็นงานที่ถูกมอบหมาย |
| `ConsignmentVisit.status` `draft` / `signed` | + `cancelled` | ใบเข้าร้านที่ส่งไม่ได้หรือใบส่งของถูกยกเลิก |
| `CustomerOrder` (ไม่มี) | + `deliverySheetId?` (FK ใบส่งของที่ยังเปิดอยู่) | กันคำสั่งซื้อเดียวอยู่ในใบส่งของ 2 ใบ |
| `ProductionOrder.operatorName` | `operatorUserId` (FK User) | คนที่ทำงานตามใบสั่งผลิต |
| `PurchaseOrder.createdByName`, `VehicleRunSheet.createdBy` / `printedBy` | `…UserId` (FK User) | บันทึกว่าใครทำ (รายละเอียดทุกการเปลี่ยนอยู่ใน Audit Log) |

### 3.7 LINE Integration

> Designed 2026-10-25, not yet built. Full detail: DESIGN "LINE Integration".

| ฟิลด์ (บน User) | หมายเหตุ |
|------|---------|
| `lineUserId` | รหัสผู้ใช้ LINE (`U` + 32 ตัว) ห้ามซ้ำ ว่างได้ — ได้จากการเชื่อมผ่าน LINE Login เท่านั้น กรอกมือไม่ได้ |
| `lineDisplayName`, `linePictureUrl` | ชื่อและรูปจาก LINE ให้ admin เห็นว่าผูกถูกคน |
| `lineLinkedAt` | วันที่เชื่อม |
| `lineStatus` | `unlinked` / `linked` / `blocked` (ผู้ใช้บล็อก OA → webhook `unfollow`; กลับมาเพิ่มเพื่อน → `follow` = `linked`) |

- **ส่งผ่าน LINE Messaging API ของ OA บริษัท** (push message) — ไม่ใช้ LINE Notify (ปิดบริการแล้ว)
- **เชื่อมบัญชีด้วยปุ่ม "เชื่อมต่อ LINE" (LINE Login)** ในหน้าโปรไฟล์ของผู้ใช้เอง: กดปุ่ม → LINE ขอยืนยัน → ระบบได้ `lineUserId` และชวนเพิ่มเพื่อน OA ในขั้นตอนเดียว (`bot_prompt=aggressive`)
  - LINE Login channel **ต้องอยู่ provider เดียวกับ** Messaging API channel ของ OA ไม่อย่างนั้น `lineUserId` จะไม่ตรงกับที่ OA ใช้ส่ง
  - ใช้ `state` กัน CSRF · 1 บัญชี LINE ผูกได้กับผู้ใช้ 1 คน
  - ผู้ใช้ยกเลิกการเชื่อมเองได้ · admin ยกเลิกให้ได้จากหน้าจัดการผู้ใช้
  - LINE ใช้เพื่อแจ้งเตือนเท่านั้น **ไม่ใช้ login** (login ยังเป็นเบอร์โทร + รหัสผ่าน)
- เหตุการณ์ที่แจ้ง, ผู้รับ, แจ้งเตือนในระบบ, การส่ง LINE และการติดตามว่าส่งผ่านหรือไม่ — ดู §3.8

**LINE OA settings** (card on `/admin/settings`, admin only)

| ค่า | หมายเหตุ |
|-----|---------|
| เปิด/ปิดการส่ง LINE | สวิตช์เดียวทั้งระบบ (ปิด = ส่งแค่ในระบบ) |
| Messaging API: Channel ID, Channel secret, Channel access token | ใช้ส่งข้อความ และตรวจลายเซ็น webhook (`X-Line-Signature`) |
| LINE Login: Channel ID, Channel secret | ใช้ปุ่มเชื่อมต่อ LINE |
| Basic ID / ลิงก์เพิ่มเพื่อน | เช่น `@bangkokflower` แสดงในหน้าโปรไฟล์ |
| App base URL | เช่น `https://app.example.com` ใช้ต่อเป็นลิงก์เต็มในข้อความ LINE |
| Webhook URL, Callback URL | ระบบสร้างให้ แสดงอย่างเดียว ให้ admin คัดลอกไปวางใน LINE Developers |

- **ค่าลับ** (secret, token) เข้ารหัสก่อนเก็บ · หน้าจอแสดงแบบปิดบัง (`••••abcd`) กรอกทับได้แต่ดูค่าเดิมไม่ได้ · API ไม่ส่งค่าลับกลับ
- ปุ่ม **"ทดสอบส่ง"** ส่งข้อความหา LINE ของ admin ที่กด (ต้องเชื่อม LINE แล้ว)
- การแก้ค่าบันทึกลง Audit Log โดยค่าลับบันทึกเป็น `"••••"` (รู้แค่ว่ามีการเปลี่ยน)

### 3.8 Notifications (In-app & LINE)

> Designed 2026-10-25, not yet built. Full detail (entities, API): DESIGN "Notifications (In-app & LINE)".

**หลักการ**
- **1 เหตุการณ์ → 1 `Notification`** (เนื้อหา) **→ ผู้รับหลายคน** (`NotificationRecipient` = กล่องแจ้งเตือนในระบบของแต่ละคน) **→ การส่งต่อช่องทาง** (`NotificationDelivery` ต่อผู้รับต่อช่องทาง — ตอนนี้มีช่องทางเดียวคือ `line`) **→ ทุกครั้งที่เรียก LINE** (`NotificationDeliveryAttempt`)
- **แจ้งในระบบทุกครั้ง** LINE ส่งเพิ่มเมื่อ: เปิดการส่ง LINE อยู่, ผู้ใช้เชื่อม LINE แล้ว, ไม่ได้บล็อก OA — ไม่เข้าเงื่อนไข = `skipped` พร้อมเหตุผล
- **ผู้ใช้ปิดการแจ้งเตือนเองไม่ได้** ผู้รับกำหนดตามตารางเหตุการณ์
- **ผู้รับกำหนดตอนเกิดเหตุการณ์ (snapshot)** — บัญชีที่ปิดอยู่ไม่ได้รับ · ผู้ใช้ที่เพิ่มทีหลังไม่ได้รับย้อนหลัง
- **เนื้อหาเก็บเป็นข้อความสำเร็จรูป (snapshot)** — แก้เอกสารต้นทางทีหลัง ข้อความเดิมไม่เปลี่ยน (เห็นว่าตอนนั้นแจ้งอะไรไป)
- **กันแจ้งซ้ำ** ด้วย `dedupeKey` ห้ามซ้ำ เช่น `runsheet.ready:{runSheetId}:{driverUserId}` — กดพิมพ์ใบวิ่งรถซ้ำไม่แจ้งซ้ำ แต่เปลี่ยนคนขับแล้วคนใหม่ได้รับ
- **Transactional outbox** — สร้าง `Notification` + `NotificationRecipient` + `NotificationDelivery` (`pending`) ใน transaction เดียวกับการเปลี่ยนสถานะเอกสาร แล้วให้ background worker ส่ง LINE แยก: LINE ล่มไม่ทำให้งานหลักล้ม และไม่มีแจ้งเตือนหาย
- **ทุกข้อความมีลิงก์** เปิดหน้าที่เกี่ยวข้อง (in-app = path, LINE = URL เต็มจาก `appBaseUrl`) · เปิดลิงก์ของเอกสารที่ไม่มีสิทธิ์แล้ว → หน้าไม่มีสิทธิ์
- **ระยะเก็บข้อมูล** (ยืนยัน 2026-10-26) แจ้งเตือนในระบบ 180 วัน · ผลการส่ง LINE และ attempt 1 ปี

**เหตุการณ์ (รอบแรก)** — แจ้งทั้งในระบบและ LINE

| `eventType` | ส่งถึง | เมื่อไร | `dedupeKey` | ข้อความตัวอย่าง |
|-------------|-------|--------|-------------|----------------|
| `runsheet.ready` | คนขับของใบวิ่งรถ (`driverUserId`) | ใบวิ่งรถเปลี่ยนเป็น `Printed` · เปลี่ยนคนขับขณะ `Printed` (คนใหม่ได้รับ) | `runsheet.ready:{runSheetId}:{driverUserId}` | "ใบวิ่งรถ RS-… วันที่ 15 ม.ค. พร้อมแล้ว · รถ VH-001 · เส้นทาง A · 3 จุดรับ" |
| `deliverysheet.ready` | คนขับของใบส่งของ (`driverUserId`) | ใบส่งของเปลี่ยนเป็น `Printed` · เปลี่ยนคนขับขณะ `Printed` (คนใหม่ได้รับ) | `deliverysheet.ready:{deliverySheetId}:{driverUserId}` | "ใบส่งของ DS-… วันที่ 15 ม.ค. พร้อมแล้ว · รถ VH-001 · 3 จุดส่ง (เข้าร้านฝากขาย 2)" |
| `production_order.confirmed` | ผู้ใช้ `production` ที่ใช้งานอยู่ทุกคน | ใบสั่งผลิตเปลี่ยนเป็น `Confirmed` | `production_order.confirmed:{productionOrderId}` | "ใบสั่งผลิต PROD-… ช่อกุหลาบแดง 200 ช่อ · ไลน์ LINE-A ยืนยันแล้ว" |
| `production_line.maintenance` | ผู้ใช้ `production` ที่ใช้งานอยู่ทุกคน | ไลน์ผลิตเปลี่ยนเป็น `maintenance` | `production_line.maintenance:{lineId}:{changedAt}` | "ไลน์ LINE-A ปิดซ่อม" |

`admin` และ `staff` ยังไม่ได้รับแจ้งเตือนในรอบแรก

งานเข้าร้านฝากขายแจ้งผ่าน `deliverysheet.ready` (ใบเข้าร้านสร้างจากใบส่งของเสมอ) — แทน `visit.assigned` เดิม **1 ใบ = 1 แจ้งเตือน** (ใบวิ่งรถ → `runsheet.ready`, ใบส่งของ → `deliverysheet.ready`) ไม่แจ้งแยกรายร้าน

**แจ้งเตือนในระบบ**
- **กระดิ่งที่ topbar อย่างเดียว ไม่มีหน้าแยก** — แสดงจำนวนที่ยังไม่อ่าน · กดแล้วเปิดรายการ เรียงใหม่สุดก่อน, เลื่อนลงโหลดเพิ่มทีละ 20, แท็บ "ทั้งหมด / ยังไม่อ่าน"
- กดรายการ = อ่านแล้ว (`readAt`) + เปิดลิงก์ · ปุ่ม "อ่านทั้งหมด"

**การส่ง LINE และการรู้ว่าส่งผ่านหรือไม่**
- **"ส่งผ่าน" = LINE Messaging API ตอบรับข้อความ (HTTP 200)** — LINE ไม่บอกผลรายคนว่าผู้ใช้เปิดอ่านหรือไม่สำหรับ push message ระบบจึงรู้ได้แค่ "LINE รับแล้ว" / "LINE ไม่รับ (พร้อมเหตุผล)"
- **ทุกการเรียก LINE ถูกบันทึก** (`NotificationDeliveryAttempt`): HTTP status, `x-line-request-id` (ใช้อ้างอิงเวลาติดต่อ LINE), ข้อความ error, เวลาที่ใช้
- **ส่งซ้ำไม่ทำให้ผู้ใช้ได้ข้อความซ้ำ** — ทุก delivery มี `retryKey` (UUID) ส่งเป็น header `X-Line-Retry-Key` ทุก attempt ของ delivery เดียวกัน LINE รับข้อความนั้นได้ครั้งเดียว
- **สถานะ delivery**

```
pending ──▶ sending ──▶ sent
   ▲           │
   └── retry ──┤ (retryable error, attemptCount < maxAttempts; รอ nextAttemptAt)
               └──▶ failed (permanent error หรือครบ maxAttempts)
pending ──▶ skipped (line_disabled | not_linked | blocked | user_inactive — ตรวจตอนจะส่ง)
```

- **ผลจาก LINE → สิ่งที่ระบบทำ**

| ผลจาก LINE | `errorCode` | ความหมาย | ระบบทำ |
|-----------|-------------|---------|--------|
| 200 | — | LINE รับข้อความแล้ว | `sent` |
| 409 (retry key เคยถูกรับแล้ว) | — | attempt ก่อนหน้าสำเร็จแล้วแต่ระบบไม่ได้รับคำตอบ | `sent` (ไม่ส่งซ้ำ) |
| 429 โควตาเดือนนี้หมด | `quota_exceeded` | ข้อความเกินแพ็กเกจ OA | `failed` ไม่ลองซ้ำ |
| 429 ส่งเร็วเกิน | `rate_limited` | เกิน rate limit | ลองซ้ำ |
| 400 | `bad_request` | ข้อความหรือผู้รับไม่ถูกต้อง | `failed` ไม่ลองซ้ำ |
| 401 / 403 | `auth_error` | access token ผิด/หมดอายุ/ไม่มีสิทธิ์ | `failed` ไม่ลองซ้ำ — ต้องแก้ค่าใน LINE OA settings |
| 5xx | `server_error` | LINE ขัดข้อง | ลองซ้ำ |
| timeout / เชื่อมต่อไม่ได้ | `timeout` / `network` | ไม่รู้ว่า LINE รับหรือไม่ | ลองซ้ำ (ปลอดภัยเพราะ retry key) |

- **นโยบายลองซ้ำ** `maxAttempts` = 3 (ครั้งแรก + ลองซ้ำ 2 ครั้ง) · รอ 1 นาที แล้ว 5 นาที (ยืนยัน 2026-10-26)
- **worker ค้าง** — delivery ที่อยู่ใน `sending` เกิน 5 นาที กลับเป็น `pending` (ปลอดภัยเพราะ retry key)
- **ส่งใหม่ด้วยมือ (admin)** สำหรับ `failed` — สร้าง `NotificationDelivery` ใหม่ (`retryKey` ใหม่, `resentFromDeliveryId` ชี้ตัวเดิม, `resentByUserId`) ตัวเดิมคงไว้เป็นประวัติ

**หน้าประวัติการส่ง LINE** (`/admin/line-deliveries`, admin เท่านั้น)
- สรุปช่วงวันที่เลือก: ส่งผ่าน / ไม่ผ่าน / ข้าม / รอส่ง
- ตาราง: เวลา, เหตุการณ์, ผู้รับ, สถานะ, จำนวนครั้งที่ลอง, เหตุผล (`errorCode` / `skipReason`) · กรองสถานะ, เหตุการณ์, ผู้รับ, ช่วงวัน
- รายละเอียด: ข้อความที่ส่ง + ทุก attempt (เวลา, HTTP status, LINE request id, error)
- ปุ่ม "ส่งใหม่" สำหรับรายการ `failed`

### 3.9 Audit Log

> Designed 2026-10-26, not yet built. Full detail (entity, API): DESIGN "Audit Log".

บันทึกว่า **ใคร ทำอะไร กับข้อมูลไหน เมื่อไร เปลี่ยนจากอะไรเป็นอะไร** ให้ admin ตรวจสอบย้อนหลัง

**หลักการ**
- **Append-only** — แอปเพิ่มได้อย่างเดียว ไม่มีแก้ ไม่มีลบ (ระดับฐานข้อมูลให้สิทธิ์ INSERT/SELECT เท่านั้น) · ล้างได้เฉพาะงานตามระยะเก็บข้อมูล
- **บันทึกใน transaction เดียวกับการเปลี่ยนข้อมูล** — ข้อมูลเปลี่ยนแล้วต้องมี log เสมอ ถ้าเขียน log ไม่ได้ การเปลี่ยนข้อมูลก็ไม่เกิด
- **เก็บ snapshot ของผู้กระทำ** (ชื่อ, role ตอนนั้น) — เปลี่ยนชื่อหรือ role ทีหลัง log เดิมยังถูกต้อง
- **เก็บเฉพาะฟิลด์ที่เปลี่ยน** (`changes`: field, from, to) ไม่เก็บทั้ง record
- **ห้ามเก็บข้อมูลลับ** — รหัสผ่าน, password hash, secret / token ของ LINE บันทึกเป็น `"••••"` (รู้แค่ว่ามีการเปลี่ยน)
- **ไม่บันทึกการเปิดดู** (read) และการอ่านแจ้งเตือน — มากเกินและไม่มีประโยชน์ตรวจสอบ
- งานระบบ (worker, ตั้งเวลา) บันทึกเป็นผู้กระทำ `system`
- **ระยะเก็บข้อมูล** (ยืนยัน 2026-10-26) 2 ปี
- แทนที่ประวัติการแก้ค่าแบบเดิม (`SettingChange`) — ประวัติในหน้าตั้งค่าระบบอ่านจาก Audit Log ที่กรอง `entityType = SystemSetting`

**สิ่งที่บันทึก**

| กลุ่ม | ข้อมูล | `action` |
|------|-------|----------|
| เอกสารงาน | แผนจัดซื้อ, ใบสั่งซื้อ, ใบวิ่งรถ + บันทึกรับของ, ใบส่งของ, ใบสั่งผลิต, คำสั่งซื้อ, ใบเข้าร้าน, ยอดขายจากร้าน, ใบแจ้งหนี้ + รับชำระ | `create`, `update`, `delete`, `status_change` |
| ข้อมูลหลัก | ซัพพลายเออร์ + จุดรับ + วัตถุดิบที่ขาย, รถ, เส้นทางรถ, ไลน์ผลิต, ลูกค้า, สินค้าสำเร็จรูป + สูตร (BOM), วัตถุดิบ, ตระกูลวัตถุดิบ | `create`, `update`, `delete`, `activate`, `deactivate` |
| ผู้ใช้ (โดย admin) | สร้าง, แก้ไข, เปลี่ยน role, รีเซ็ตรหัส, ปลดล็อก, ปิด/เปิดบัญชี, ยกเลิกการเชื่อม LINE | `create`, `update`, `password_reset`, `unlock`, `activate`, `deactivate`, `line_unlink` |
| การเข้าสู่ระบบ | login สำเร็จ / ไม่สำเร็จ, logout, บัญชีถูกล็อก, เปลี่ยนรหัสตัวเอง, เชื่อม / ยกเลิก LINE ของตัวเอง | `login_success`, `login_failed`, `logout`, `account_locked`, `password_change`, `line_link`, `line_unlink` |
| ตั้งค่าระบบ | เกณฑ์เตือน, ค่า LINE OA, ส่ง LINE ใหม่ด้วยมือ | `update`, `resend` |

`login_failed` ที่ไม่พบผู้ใช้ เก็บเบอร์โทรที่กรอกไว้ใน `entityLabel` (ไม่มี `actorUserId`) — ใช้ดูการเดารหัส

**หน้า Audit Log** (`/admin/audit-log`, admin เท่านั้น)
- ตาราง: เวลา, ผู้ใช้ (+ role), การกระทำ, ข้อมูล (ชนิด + เลขเอกสาร/ชื่อ เป็นลิงก์ไปหน้าเอกสาร), สรุป
- กรอง: ช่วงวัน (ค่าเริ่มต้น 7 วันล่าสุด), ผู้ใช้, การกระทำ, ชนิดข้อมูล · ค้นหาเลขเอกสาร/ชื่อ
- รายละเอียด: ตารางฟิลด์ที่เปลี่ยน (ชื่อฟิลด์ / ค่าเดิม / ค่าใหม่), IP, อุปกรณ์ (user agent), request id
- ส่งออก CSV ตามตัวกรองปัจจุบัน (การส่งออกเองก็ถูกบันทึก `action = export`)

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

**Output**: Printable run sheet — one per pickup trip; the same vehicle/driver may have more run sheets and delivery sheets that day (§3.4.1)

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
   - Flag items with variance: a line received short is tinted amber, more than 20 % short (or nothing received) red — fixed rule on this page
   - The dashboard risk card lists lines whose ± variance exceeds `receiptVariancePercent` (System Settings §3.5, default 10 %)
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
- **Vehicle**: Truck master data (code, license, type, capacity) — no driver
- **VehicleRoute**: Fixed daily route (ordered stops, days of week); no vehicle reference
- **VehicleRouteStop**: Ordered stop referencing a SupplierRoute

### 6.4 Run Sheet Entities
- **VehicleRunSheet**: Daily pickup document
  - `driverUserId` (FK User, role driver — chosen at generation) + `driverName` / `driverPhone` copied for printing
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
- `runSheetNumber` unique (`RS-YYYYMMDD-###`) — no uniqueness on (vehicle, date) or (driver, date)
- **DeliverySheet** (§3.4.1): `deliverySheetNumber` (`DS-YYYYMMDD-###`, unique), `sheetType` (`consignment_route` / `direct`), `consignmentRouteId?` + `consignmentEstimateId?` (route sheets), `returnRecordedAt?`, `deliveryDate`, `vehicleId`, `driverUserId` + `driverName` / `driverPhone` copied for printing, `status` (Draft → Printed → Completed / Cancelled), `printedAt?`, `completedAt?`, `cancelledAt?`, `cancelReason?`
- **DeliverySheetLoadLine** (route sheets): `finishedGoodId`, `loadedQuantity` + LOTs scanned on loading, `returnedQuantity?` + LOTs scanned back, `variance` (loaded − delivered at shops − returned)
- **DeliverySheetStop**: `sequence`, `stopType` (`customer_order` on `direct` sheets / `consignment_visit` on `consignment_route` sheets), `customerId` + name / address / contact copied for printing, `customerOrderId?`, `consignmentVisitId?`, `status` (`pending` / `done` / `failed`), `failReason?`, `resolvedAt?`
- Changes: `CustomerOrder.deliverySheetId?` · `ConsignmentVisit.deliverySheetId` + `driverUserId` (from the sheet), status adds `cancelled`

### 6.4.1 Sales Types Entities (§3.4.3)
- **ConsignmentRoute**: `code` (unique), `name`, `daysOfWeek` (required, at least 1 day), `isActive`
- **ConsignmentRouteStop**: `consignmentRouteId`, `sequence`, `customerId` (consignment customer) — unique (route, customer); a customer may be on many routes
- **ConsignmentEstimate**: `estimateNumber` (`CE-YYYYMMDD-###`, unique), `deliveryDate`, `consignmentRouteId` — unique (route, date) among non-cancelled, `status` (`draft` / `confirmed` / `cancelled`), `confirmedAt?`, `confirmedByUserId?`
- **ConsignmentEstimateLine**: `customerId`, `finishedGoodId`, `suggestedQuantity` (system), `estimatedQuantity` (staff)
- Changes: `CustomerOrder.channel` (`email` / `phone` / `platform` / `manual`) + `platformName?` + `platformOrderRef?` (unique pair) · `Customer.country?`, `nameEn?`, `addressEn?`, `currency?` (❓ export) · `ProductionOrder.source` adds `consignment_route` + `consignmentRouteId?`, `consignmentEstimateId?`, `deliveryDate?`

### 6.5 System Settings Entities
- **SystemSetting**: one row per configurable value (`key`, `group`, `value`, `defaultValue`, `unit`, `min`, `max`)
- ~~SettingChange~~ — superseded by **AuditLog** (§3.9, `entityType = SystemSetting`)

### 6.6 User & Notification Entities
- **User**: `firstName`, `lastName`, `phone` (login, unique), `email?`, `role`, `passwordHash`, `isActive`, `mustChangePassword`, lock fields, LINE fields (`lineUserId`, `lineDisplayName`, `linePictureUrl`, `lineLinkedAt`, `lineStatus`)
- **UserSession**: refresh token per login (revoked on deactivate / role change / password reset)
- **LineChannelConfig**: single row — Messaging API + LINE Login channel credentials (secrets encrypted), `enabled`, `basicId`, `appBaseUrl`
- **Notification**: one per event occurrence — `eventType`, `sourceType` / `sourceId`, rendered `title` / `body` / `linkPath`, unique `dedupeKey`, `createdByUserId?`
- **NotificationRecipient**: a user's in-app inbox entry — `notificationId`, `userId`, `readAt?` (unique per notification + user)
- **NotificationDelivery**: one per recipient per external channel (`line`) — `status` (`pending` / `sending` / `sent` / `failed` / `skipped`), `skipReason?`, `lineUserId` snapshot, `retryKey`, `attemptCount` / `maxAttempts`, `nextAttemptAt?`, `sentAt?`, `failedAt?`, `errorCode?`, `errorMessage?`, `resentFromDeliveryId?`, `resentByUserId?`
- **AuditLog** (§3.9): append-only — `occurredAt`, `actorUserId?` + `actorName` / `actorRole` snapshot, `action`, `entityType`, `entityId?`, `entityLabel?`, `summary`, `changes` (JSON, changed fields only, secrets masked), `ipAddress?`, `userAgent?`, `requestId?`
- **NotificationDeliveryAttempt**: every LINE API call — `attemptNo`, `startedAt`, `durationMs`, `httpStatus?`, `lineRequestId?`, `outcome`, `errorCode?`, `errorMessage?`

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

### Logistics - Delivery Sheets (ขาส่ง)
- `GET /api/delivery-sheets` - list (`?date=&vehicleId=&driverUserId=&status=`)
- `GET /api/delivery-sheets/candidates?date=&sheetType=` - `direct`: confirmed, undelivered customer orders not on an open sheet · `consignment_route`: active routes running that day + their estimate
- `POST /api/delivery-sheets` - create Draft `{ sheetType, deliveryDate, vehicleId, driverUserId, consignmentRouteId?, stops[] }` (route sheets: stops pre-filled from the route, load lines from the estimate, a ConsignmentVisit per stop)
- `POST /api/delivery-sheets/{id}/return` - route sheets: record returned quantity + LOTs per load line (back to FG stock)
- `PUT /api/delivery-sheets/{id}` - Draft: vehicle, driver, stops and order · Printed: driver only
- `POST /api/delivery-sheets/{id}/print` · `POST /api/delivery-sheets/{id}/cancel` `{ reason }`
- `POST /api/delivery-sheets/{id}/stops/{stopId}/fail` `{ reason }`
- `GET /api/logistics/day-load?date=&vehicleId=&driverUserId=` - other run sheets / delivery sheets of that vehicle or driver on that day (info shown when generating)
- `GET /api/me/jobs?date=` - driver: own Printed / Completed run sheets + delivery sheets of the day, no prices

### Sales - Consignment Routes & Estimates (§3.4.3)
- `GET/POST/PUT /api/consignment-routes` - CRUD routes with ordered stops (deactivate instead of delete once used)
- `GET /api/consignment-estimates?date=&routeId=&status=` - list
- `GET /api/consignment-estimates/suggest?date=&routeId=` - suggested quantity per shop × product
- `POST /api/consignment-estimates` - create Draft `{ deliveryDate, consignmentRouteId, lines[] }` · `PUT /api/consignment-estimates/{id}` - edit until the route's delivery sheet is printed
- `POST /api/consignment-estimates/{id}/confirm` · `POST /api/consignment-estimates/{id}/cancel`
- `GET /api/production/demand?deliveryDate=` - confirmed estimates per route + confirmed orders delivering that day, with production-order coverage
- `POST /api/production-orders/from-estimate/{estimateId}` - one production order per product (route total) · `channel` / `platformOrderRef` are fields on `POST/PUT /api/customer-orders`

### System Settings
- `GET /api/settings` - current values
- `PUT /api/settings` - save (admin only); validates ranges and `wasteDangerPercent > wasteWarnPercent`, writes one AuditLog entry per changed value
- Change history = `GET /api/audit-logs?entityType=SystemSetting`

### Audit Log (admin only)
- `GET /api/audit-logs` (filter date / user / action / entity type / entity id / search) · `GET /api/audit-logs/{id}` (with changes) · `GET /api/audit-logs/export` (CSV, itself logged)

### Auth & Users
- `POST /api/auth/login` (phone + password) · `POST /api/auth/refresh` · `POST /api/auth/logout` · `POST /api/auth/change-password`
- `GET /api/me` · `GET /api/me/line/link-url` · `GET /api/line/login/callback` · `DELETE /api/me/line`
- Admin: `GET/POST /api/users`, `PUT /api/users/{id}`, `POST /api/users/{id}/reset-password | unlock | deactivate | activate`, `DELETE /api/users/{id}/line`
- Admin: `GET/PUT /api/settings/line`, `POST /api/settings/line/test` · LINE: `POST /api/line/webhook` (signature-verified)

### Notifications
- Own inbox for the topbar bell (every user): `GET /api/notifications` (`?unread=true&page=`, returns `unreadCount`), `GET /api/notifications/unread-count`, `POST /api/notifications/{recipientId}/read`, `POST /api/notifications/read-all`
- LINE deliveries (admin): `GET /api/line-deliveries` (filter status / event / user / date), `GET /api/line-deliveries/summary`, `GET /api/line-deliveries/{id}` (with attempts), `POST /api/line-deliveries/{id}/resend` (failed only → new delivery, new retry key)

---

## 8. Frontend Screens

### 8.0 Sitemap — all screens

✅ built · 📝 designed, not built · ❓ proposed, not decided

| Menu | Screen | Route | Roles | Status |
|------|--------|-------|-------|--------|
| — | เข้าสู่ระบบ / ตั้งรหัสใหม่ครั้งแรก | `/login` | public | 📝 |
| — | โปรไฟล์ (เปลี่ยนรหัส, เชื่อม LINE) | `/profile` | ทุก role | 📝 |
| — | แจ้งเตือน: กระดิ่งที่ topbar (ไม่มีหน้าแยก) | — | ทุก role | 📝 |
| แดชบอร์ด | ภาพรวม + การ์ดความเสี่ยง | `/` | admin, staff | ✅ |
| จัดซื้อ | แผนจัดซื้อ: รายการ · สร้าง (หน้า 1: ที่มาข้อมูล 3 แบบ [ประวัติการขาย / คำสั่งซื้อ / เลือกสินค้าเอง] → แผนการจัดซื้อ แก้จำนวน/ลบได้ → ประมาณวัตถุดิบ; หน้า 2: ตรวจสอบและสร้าง) · รายละเอียด | `/procurement/plans` · `/procurement/plans/new/step-1`, `/step-2` · `/procurement/plans/{id}` | admin, staff | ✅ |
| | ใบสั่งซื้อ: รายการ · รายละเอียด | `/procurement/purchase-orders` · `/procurement/purchase-orders/{id}` | admin, staff | ✅ |
| | ซัพพลายเออร์: รายการ · รายละเอียด (จุดรับ, วัตถุดิบที่ขาย) | `/procurement/suppliers` · `/procurement/suppliers/{id}` | admin, staff | ✅ |
| งานวันนี้ | งานวันนี้ของคนขับ: ใบวิ่งรถ + ใบส่งของของวันนี้ เรียงตามเที่ยว (มือถือ, §3.4.2) | `/my-jobs` | driver | 📝 |
| ขนส่ง | ใบวิ่งรถ (ขารับ): รายการ · ออกใบ · รายละเอียด/พิมพ์ · บันทึกรับของ | `/logistics/run-sheets` · `/logistics/run-sheets/generate` · `/logistics/run-sheets/{id}` · `/logistics/run-sheets/{id}/record-receipt` | admin, staff · driver ดูเฉพาะของตัวเอง (ไม่มีบันทึกรับของ) | ✅ (เลือกคนขับ 📝) |
| | ใบส่งของ (ขาส่ง): รายการ · ออกใบ · รายละเอียด/พิมพ์ | `/logistics/delivery-sheets` · `/logistics/delivery-sheets/new` · `/logistics/delivery-sheets/{id}` | admin, staff · driver ดูเฉพาะของตัวเอง | ✅ (mock; สิทธิ์ driver 📝) |
| | รถ | `/logistics/vehicles` | admin, staff | ✅ |
| | เส้นทางรถ | `/logistics/routes` | admin, staff | ✅ |
| ผลิต | วางแผนผลิต (+ ความต้องการตามวันส่ง: ยอดประเมินทุกสาย + คำสั่งซื้อ ✅ mock) | `/production/planning` | admin, staff · production ดู | ✅ |
| | ใบสั่งผลิต: รายการ · รายละเอียด | `/production/orders` · `/production/orders/{id}` | admin, staff · production ทำงานตามใบ | ✅ |
| | สินค้าสำเร็จรูป (สต็อก + LOT) | `/production/finished-goods` | admin, staff · production ดู | ✅ |
| | สต็อกวัตถุดิบ (คงเหลือ, จอง, ความเคลื่อนไหว) — แท็บถัดจากสินค้าสำเร็จรูป | `/production/raw-materials` | admin, staff · production ดู | 📝 (ตอนนี้ดูได้ในหน้าวางแผนผลิต) |
| | ไลน์ผลิต | `/production/lines` | admin, staff · production เปิด/ปิดซ่อม | ✅ |
| ขาย | คำสั่งซื้อ: รายการ (+ นำเข้าจากอีเมล) · รายละเอียด | `/sales/orders` · `/sales/orders/{id}` | admin, staff | ✅ |
| | เข้าร้าน: รายการ · สแกน/เซ็น | `/sales/visits` · `/sales/visits/{id}` | admin, staff · driver เฉพาะงานที่ถูกมอบหมาย | ✅ (สร้างจากใบส่งของ ✅ mock) |
| | ยอดขายจากร้าน: รายการ · รายละเอียด | `/sales/reports` · `/sales/reports/{id}` | admin, staff | ✅ |
| | ใบแจ้งหนี้: รายการ · รายละเอียด (รับชำระ) | `/sales/invoices` · `/sales/invoices/{id}` | admin, staff | ✅ |
| | สรุปผลฝากขาย | `/sales/performance` | admin, staff | ✅ |
| | ลูกค้า: รายการ · รายละเอียด | `/sales/customers` · `/sales/customers/{id}` | admin, staff | ✅ |
| | สายฝากขาย: รายการ + ร้านเรียงตามลำดับ | `/sales/consignment-routes` | admin, staff | ✅ (mock) |
| | ยอดประเมินลงร้าน: รายการ (ตามวันส่ง × สาย) · รายละเอียด | `/sales/estimates` · `/sales/estimates/{id}` | admin, staff | ✅ (mock) |
| ข้อมูลหลัก | สินค้าสำเร็จรูป: รายการ · รายละเอียด + สูตร (BOM) | `/catalog/finished-goods` · `/catalog/finished-goods/{id}` | admin, staff · production ดู | ✅ |
| | วัตถุดิบ | `/catalog/raw-materials` | admin, staff · production ดู | ✅ |
| | ตระกูลวัตถุดิบ | `/catalog/families` | admin, staff · production ดู | ✅ |
| ผู้ดูแลระบบ | จัดการผู้ใช้ | `/admin/users` | admin | 📝 |
| | ตั้งค่าระบบ: เกณฑ์เตือน ✅ · LINE OA 📝 | `/admin/settings` (โค้ดตอนนี้ `/settings`) | admin | ✅ / 📝 |
| | ประวัติการส่ง LINE | `/admin/line-deliveries` | admin | 📝 |
| | Audit Log | `/admin/audit-log` | admin | 📝 |
| (dev only) | UI Kit | `/ui-kit` | — (development build เท่านั้น) | ✅ |

- **เมนูผู้ดูแลระบบ** แสดงเฉพาะ `admin` เป็นเมนูเดียวมี 4 แท็บ (จัดการผู้ใช้ · ตั้งค่าระบบ · ประวัติการส่ง LINE · Audit Log) แบบเดียวกับเมนูฝ่ายอื่น แทนปุ่มเฟืองเดิม
- **sidebar ของ `driver`** มีแค่ งานวันนี้ · `production` เห็นเมนูผลิตและข้อมูลหลัก

The numbered screens below (Screen 1–10) are the original detailed screen designs; names have since changed in the app (Purchase Templates → แผนจัดซื้อ).

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
- Delivery sheets (§3.4.1): list (filter date / type / vehicle / driver / status) · create (type, date + vehicle + driver, "รถ/คนขับคนนี้มีอีก N ใบวันนี้" info; route sheet: pick route → shops + load from estimate; direct sheet: pick orders; drag to order) · detail / print (load lines, stop status, "ส่งไม่ได้" with reason, record returns, cancel)

### Sales (§3.4.3)
- สายฝากขาย (`/sales/consignment-routes`): list + edit ordered shops, days of week
- ยอดประเมินลงร้าน (`/sales/estimates`): pick delivery date → one row per route running that day (no estimate / draft / confirmed) · detail: shops × products grid with suggested and estimated quantity, warning for shops on another route the same day, confirm
- คำสั่งซื้อ: `channel` on create/edit; platform name + order ref; export customers show country / English address

### Production
- สต็อกวัตถุดิบ (`/production/raw-materials`, tab after สินค้าสำเร็จรูป): on hand, reserved by production orders, available, movements per raw material

### Driver
- งานวันนี้ (`/my-jobs`) — see §3.4.2

### Login & Profile
- `/login`: phone + password; forced "set new password" step when `mustChangePassword`
- `/profile` (every user): name / phone / role (read only), change password, **เชื่อมต่อ LINE** / ยกเลิกการเชื่อม, OA add-friend link

### User Management (`/admin/users`, admin only)
- See §3.6

### Notifications (topbar bell only)
- See §3.8

### LINE Delivery Log (`/admin/line-deliveries`, admin only)
- See §3.8

### Audit Log (`/admin/audit-log`, admin only)
- See §3.9

### System Settings (`/admin/settings`, admin only)
- LINE OA card — see §3.7
- One card per group (ขาย / จัดซื้อ / คลังสินค้า / ผลิต): number field with unit and hint per value, "คืนค่าเริ่มต้น" when it differs from the default, Save / discard edits
- Change history table (when, value, from, to, by) — read from Audit Log
- Entry: tab ตั้งค่าระบบ in the ผู้ดูแลระบบ menu, shown only to admins (current code: gear button in the lower sidebar group, `/settings`)

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
- No limit of one run sheet per vehicle or driver per day

### Delivery Sheet (§3.4.1)
- Vehicle active · driver active with role `driver` · at least 1 stop
- `direct` sheet: customer order stops only — order `confirmed`, not delivered, not on another open (Draft / Printed) delivery sheet
- `consignment_route` sheet: route active; consignment stops only — active consignment customer, once per sheet; a route's estimate for that date need not exist (load entered by hand)
- Route sheet completes only after returns are recorded
- Stops editable only in Draft; in Printed only the driver can change
- Cancel only when no stop is `done`; frees orders and cancels unsigned visits
- Several delivery sheets / run sheets per vehicle or driver per day are allowed — shown as info, never blocked

### Consignment Route & Estimate (§3.4.3)
- Route: unique `code`, at least 1 run day, a shop at most once per route, only consignment customers
- Estimate: one non-cancelled estimate per (route, delivery date); delivery date must match the route's days of week; quantities ≥ 0
- Shop already on another route's estimate that day → warning, not blocked
- Editable until the route's delivery sheet is printed; after production orders exist, edits show the difference only
- Customer order: (`platformName`, `platformOrderRef`) unique when set

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

### Users & Auth
- phone required, normalized to 10 digits, unique across all users (incl. inactive) · email optional
- password ≥ 8 characters · 5 failed logins → locked 15 minutes
- Cannot deactivate yourself or change your own role · at least one active admin must remain · users are never deleted
- Run sheet and delivery sheet `driverUserId` must be active users with role `driver`; a consignment visit takes the driver of its delivery sheet
- One LINE account per user (`lineUserId` unique)

### Notifications
- `Notification.dedupeKey` unique — the same event never notifies twice
- One `NotificationRecipient` per (notification, user); recipients are active users only, resolved when the event happens
- Users can read / mark read only their own recipients
- Resend only when delivery status = `failed`; creates a new delivery with a new `retryKey`
- `maxAttempts` = 3; no retry on `bad_request`, `auth_error`, `quota_exceeded`

### Audit Log
- Append-only: no update / delete endpoint; the app's DB role has INSERT + SELECT only
- Written in the same transaction as the change it records
- Never stores passwords, password hashes, LINE secrets or tokens (masked `"••••"`)
- Retention job deletes entries older than 2 years (the only deletion path)

### System Settings
- Admin only (role `admin`; code still uses a temporary `isAdmin` flag)
- Each value within its min–max range; `wasteDangerPercent` > `wasteWarnPercent`
- Thresholds only warn — they never block a workflow

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
