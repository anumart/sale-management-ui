# Software Requirement Specification (SRS) / Functional Requirement Document (FRD)

**ระบบ**: Bangkok Flower Sale Management System
**เอกสาร**: SRS/FRD v1.0
**วันที่**: 2026-10-30
**สถานะ**: Draft
**ความสัมพันธ์กับเอกสารอื่น**:
- `BRD.md` = ความต้องการระดับธุรกิจ (ทำอะไร ทำไม) — เอกสารนี้แปลงเป็น ความต้องการระดับซอฟต์แวร์ (ระบบต้องทำอะไรได้บ้าง รายละเอียดเชิงพฤติกรรม)
- `PROCUREMENT_SYSTEM_DESIGN.md` / `PROCUREMENT_SYSTEM_SPEC.md` = ออกแบบตัวแทนข้อมูล / หน้าจอ / API (เอกสารประกอบ)
- `ERD.md` / `DFD.md` = โมเดลข้อมูล / ไดอะแกรมกระบวนการ
- `DESIGN.md` = design system ของ UI

**สถานะการสร้างจริงใน repo ปัจจุบัน**: ระบบนี้เป็น **frontend mock** ทั้งหมด (`VITE_USE_MOCK=true`, ข้อมูลใน `src/mocks/`) ยังไม่มี backend จริง ทุก requirement ด้านล่างทำเครื่องหมาย:
- ✅ = มีหน้าจอ/พฤติกรรมใน mock UI แล้ว
- 📝 = ออกแบบแล้วยังไม่สร้าง
- ⏳ = target design ยังไม่เริ่ม (รวม Phase C, AI planning)
- (backend) = ต้องทำที่ backend เมื่อมี API จริง

> Requirement ใช้รหัส `FR-XXX-NN` สำหรับอ้างอิง/traceability ไปถึง `BR-XXX-NN` ใน BRD

---

## 1. บทนำ (Introduction)

### 1.1 วัตถุประสงค์เอกสาร
เอกสารนี้ระบุ **ความต้องการเชิงหน้าที่และเชิงซอฟต์แวร์** ของระบบจัดการขายดอกไม้ ครอบคลุม พฤติกรรมของระบบต่อหน้าจอ/ต่อการกระทำ, กฎ validation, สถานะและ transition, ข้อมูลป้อนเข้า-ผลลัพธ์, และ edge cases — เพื่อให้ทีมพัฒนา (frontend + backend) สร้างระบบได้ครบและตรวจสอบได้

### 1.2 ขอบเขตซอฟต์แวร์
โมดูล 12 กลุ่ม: Authentication & Users · Catalog · Procurement · Logistics (ขารับ/ขาส่ง) · Production · Inventory · Sales · Billing · Notifications (in-app + LINE) · Audit Log · System Settings · Dashboard

### 1.3 คำนิยามและตัวย่อ
ดู Glossary ใน `BRD.md` §10.1 — ที่นี่เพิ่ม:
- **FR** = Functional Requirement · **NFR** = Non-Functional Requirement
- **mock UI** = หน้าจอที่ทำงานกับข้อมูลในหน่วยความจำ (ไม่มี backend)
- **ตัวอักษร `D`** ในบริบทการวางแผนผลิต = delivery date (วันส่ง)

### 1.4 ข้อสมมติทั่วไป
1. ระบบนี้ single-company, single-currency (ยังไม่รองรับหลายบริษัท/หลายสกุลเงิน — สกุลเงินส่งออกเป็น open question Q1)
2. ข้อมูล master data (สินค้า วัตถุดิบ ซัพพลายเออร์ ลูกค้า) ถูกป้อนโดย staff/admin ผ่านหน้าจอ ไม่มีการ import อัตโนมัตินอกจาก email import ของคำสั่งซื้อ
3. เวลาในระบบเป็นเวลาท้องถิ่น (Asia/Bangkok) — วันที่เอกสาร (run date, delivery date) เป็น date-only, timestamp เป็น timestamptz
4. หน่วยสกุลเงินหลักคือบาท (฿) — แสดงทุกจำนวนเงินพร้อมสัญลักษณ์

---

## 2. คำอธิบายทั่วไป (Overall Description)

### 2.1 ผู้ใช้ปลายทางและบทบาท
4 บทบาท (`admin`, `staff`, `driver`, `production`) — ดูรายละเอียดและ matrix สิทธิ์ใน `BRD.md` §4/§5.12. สรุปพฤติกรรมระดับซอฟต์แวร์:
- **admin** = ทุกอย่าง + จัดการผู้ใช้ + ตั้งค่าระบบ + ดู Audit Log
- **staff** = ทุกอย่างยกเว้นจัดการผู้ใช้/ตั้งค่าระบบ/audit log
- **driver** = เฉพาะงานที่ถูกมอบหมาย (วิ่งรถ/ส่งของ/เข้าร้าน) — **ไม่เห็นราคา/ยอดเงิน**
- **production** = ทำงานตามใบสั่งผลิต + เปิด/ปิดไลน์ซ่อม + ดูแผน/คลัง/สูตร

หน้าแรกหลัง login: `admin`/`staff` → `/` (dashboard) · `driver` → `/my-jobs` · `production` → `/production/orders`

### 2.2 โครงสร้างหน้าจอ (Sitemap)
| กลุ่มเมนู | หน้าจอ | Route | Roles | สถานะ |
|---|---|---|---|---|
| — | เข้าสู่ระบบ / ตั้งรหัสใหม่ครั้งแรก | `/login` | public | 📝 |
| — | โปรไฟล์ (เปลี่ยนรหัส, เชื่อม LINE) | `/profile` | ทุก role | 📝 |
| — | แจ้งเตือน (กระดิ่ง topbar, ไม่มีหน้าแยก) | — | ทุก role | 📝 |
| แดชบอร์ด | ภาพรวม + การ์ดความเสี่ยง | `/` | admin, staff | ✅ |
| จัดซื้อ | แผนจัดซื้อ: รายการ · wizard สร้าง · รายละเอียด | `/procurement/plans` `/new/step-1` `/new/step-2` `/{id}` | admin, staff | ✅ |
| | ใบสั่งซื้อ: รายการ · รายละเอียด | `/procurement/purchase-orders` `/{id}` | admin, staff | ✅ |
| | ซัพพลายเออร์: รายการ · รายละเอียด (จุดรับ, RM ที่ขาย) | `/procurement/suppliers` `/{id}` | admin, staff | ✅ |
| งานวันนี้ | งานวันนี้ของคนขับ (มือถือ) | `/my-jobs` | driver | 📝 |
| ขนส่ง | ใบวิ่งรถ: รายการ · ออกใบ · รายละเอียด/พิมพ์ · บันทึกรับของ | `/logistics/run-sheets` `/generate` `/{id}` `/{id}/record-receipt` | admin, staff · driver ดูของตัวเอง | ✅ (เลือกคนขับ 📝) |
| | ใบส่งของ: รายการ · ออกใบ · รายละเอียด/พิมพ์ | `/logistics/delivery-sheets` `/new` `/{id}` | admin, staff · driver ดูของตัวเอง | ✅ (สิทธิ์ driver 📝) |
| | รถ · เส้นทางรถ | `/logistics/vehicles` `/logistics/routes` | admin, staff | ✅ |
| ผลิต | วางแผนผลิต (+ ความต้องการตามวันส่ง) | `/production/planning` | admin, staff · production ดู | ✅ |
| | ใบสั่งผลิต: รายการ · รายละเอียด | `/production/orders` `/{id}` | admin, staff · production ทำ | ✅ |
| | สินค้าสำเร็จรูป (สต็อก+LOT) | `/production/finished-goods` | admin, staff · production ดู | ✅ |
| | สต็อกวัตถุดิบ (แท็บถัดจาก FG) | `/production/raw-materials` | admin, staff · production ดู | 📝 |
| | ไลน์ผลิต | `/production/lines` | admin, staff · production เปิด/ปิดซ่อม | ✅ |
| ขาย | คำสั่งซื้อ: รายการ (+ นำเข้าอีเมล) · รายละเอียด | `/sales/orders` `/{id}` | admin, staff | ✅ |
| | เข้าร้าน: รายการ · สแกน/เซ็น | `/sales/visits` `/{id}` | admin, staff · driver เฉพาะงานที่มอบหมาย | ✅ |
| | ยอดขายจากร้าน · ใบแจ้งหนี้ · สรุปผลฝากขาย · ลูกค้า | `/sales/reports` `/sales/invoices` `/sales/performance` `/sales/customers` | admin, staff | ✅ |
| | สายฝากขาย · ยอดประเมินลงร้าน | `/sales/consignment-routes` `/sales/estimates` `/{id}` | admin, staff | ✅ (mock) |
| ข้อมูลหลัก | สินค้าสำเร็จรูป+สูตร · วัตถุดิบ · ตระกูล | `/catalog/finished-goods` `/{id}` `/catalog/raw-materials` `/catalog/families` | admin, staff · production ดู | ✅ |
| ผู้ดูแลระบบ | จัดการผู้ใช้ · ตั้งค่าระบบ · ประวัติส่ง LINE · Audit Log | `/admin/users` `/admin/settings` `/admin/line-deliveries` `/admin/audit-log` | admin | ตั้งค่า ✅ / อื่น 📝 |

**หมายเหตุ sidebar**: `driver` เห็นเฉพาะ "งานวันนี้" · `production` เห็นเมนูผลิต + ข้อมูลหลัก · เมนูผู้ดูแลระบบ (4 แท็บ) แสดงเฉพาะ `admin`

---

## 3. ความต้องการเชิงหน้าที่ (Functional Requirements)

### 3.1 Authentication & Users (FR-AUTH) ✅📝

**หน้าจอ**: `/login` 📝 · `/profile` 📝 · `/admin/users` 📝

| ID | ความต้องการ | BR |
|---|---|---|
| FR-AUTH-01 | ระบบต้องรองรับ login ด้วย `phone` + `password` เท่านั้น | BR-AUTH-01 |
| FR-AUTH-02 | ข้อผิดพลาดต้องตอบรวมว่า "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง" — **ห้ามระบุว่าผิดช่องไหน** | BR-AUTH-01 |
| FR-AUTH-03 | password อย่างน้อย 8 ตัวอักษร | BR-AUTH-01 |
| FR-AUTH-04 | รหัสผิด 5 ครั้งติดต่อกัน → ล็อกบัญชี 15 นาที · login สำเร็จแล้วรีเซ็ตตัวนับ · admin ปลดล็อกก่อนได้ | BR-AUTH-01 |
| FR-AUTH-05 | "ลืมรหัสผ่าน" รอบแรกไม่มี OTP/อีเมล — แจ้ง admin ให้รีเซ็ต → ระบบออก **รหัสชั่วคราว** แสดงครั้งเดียว → บังคับเปลี่ยนตอน login ครั้งถัดไป (`mustChangePassword`) | BR-AUTH-02 |
| FR-AUTH-06 | อายุ session: `driver`/`production` = 30 วัน · `admin`/`staff` = 12 ชั่วโมง | BR-AUTH-03 |
| FR-AUTH-07 | ปิดบัญชี/เปลี่ยน role/รีเซ็ตรหัส → session ของผู้ใช้คนนั้นถูกยกเลิก **ทันที** | BR-AUTH-04 |
| FR-AUTH-08 | ห้ามผู้ใช้ปิดบัญชี/เปลี่ยน role ตัวเอง · ต้องเหลือ `admin` active อย่างน้อย 1 คน · ไม่มีการลบผู้ใช้ (ใช้ `isActive=false`) | BR-AUTH-04 |
| FR-AUTH-09 | หน้า `/admin/users` (admin เท่านั้น): รายการ (ชื่อ, เบอร์, role, สถานะใช้งาน/ปิด/ล็อก, LINE, login ล่าสุด) + ค้นหาชื่อ/เบอร์ + กรอง role/สถานะ | BR-AUTH-05 |
| FR-AUTH-10 | เพิ่มผู้ใช้ (ชื่อ, นามสกุล, เบอร์, email?, role) → ระบบออก **รหัสชั่วคราว** แสดงครั้งเดียวให้ admin ส่งต่อ | BR-AUTH-02 |
| FR-AUTH-11 | ปุ่มต่อแถว: แก้ไข · รีเซ็ตรหัส (รหัสชั่วคราวใหม่) · ปลดล็อก (เมื่อถูกล็อก) · ปิด/เปิดบัญชี · ยกเลิกเชื่อม LINE | BR-AUTH-05 |
| FR-AUTH-12 | `phone` บังคับ ห้ามซ้ำ (รวมบัญชีที่ปิดแล้ว) · normalize เป็น `0XXXXXXXXX` (พิมพ์ขีด/เว้นวรรค/`+66` ได้ ระบบแปลง) | BR-AUTH-06 |
| FR-AUTH-13 | ตรวจสิทธิ์ที่ **backend ทุก API** — เข้า URL ตรงแล้วไม่มีสิทธิ์ → หน้า "ไม่มีสิทธิ์เข้าหน้านี้" | BR-AUTH-04 |
| FR-AUTH-14 | หน้า `/profile` (ทุก role): ชื่อ/เบอร์/role (อ่านอย่างเดียว), เปลี่ยนรหัสผ่าน, เชื่อม/ยกเลิก LINE, ลิงก์เพิ่มเพื่อน OA | BR-AUTH-05 |

### 3.2 Catalog — ข้อมูลหลัก (FR-CAT) ✅

**หน้าจอ**: `/catalog/finished-goods` (+ `/{id}` รายละเอียด+สูตร) · `/catalog/raw-materials` · `/catalog/families`

| ID | ความต้องการ | BR |
|---|---|---|
| FR-CAT-01 | `Category`: 2 ระดับสูงสุด (กลุ่ม → ชนิด) ชนิดเดียวกัน (`raw_material` หรือ `finished_good`) · child ห้ามมีลูก · `GET /categories?kind=` ต้องคืนกลุ่มพร้อม children | BR-CAT-05 |
| FR-CAT-02 | `Category` ห้ามลบเมื่อมีลูก/SKU/ตระกูล/สินค้า FG อ้างอิง | BR-CAT-06 |
| FR-CAT-03 | `MaterialFamily`: `code` unique, `nameTh`, `nameEn?`, `categoryId`, `color?`, `isActive` — ตระกูล**ไม่มีสต็อก/ราคา** (ยอดรวม = ผลรวม SKU ของมัน) | BR-CAT-01 |
| FR-CAT-04 | ตระกูลที่มี SKU ห้ามลบ (ปิดใช้งาน หรือย้าย SKU ออกก่อน) · เลือกตระกูลในฟอร์ม SKU ต้อง pre-fill name/category/color | BR-CAT-06 |
| FR-CAT-05 | `RawMaterial` (ระดับ SKU — ขนาด/เกรดต่างกัน = คนละ SKU): `sku` unique, `familyId?`, `nameTh` (บังคับ), `nameEn?`, `customerName?` (ค้นได้, แสดงบนเอกสารลูกค้า), `categoryId`, `unit` (หน่วยฐาน ใช้ BOM/สต็อก/แผน), `grade?`/`size?`/`color?`/`description?`, `isActive` | BR-CAT-01 |
| FR-CAT-06 | `RawMaterial` เพิ่มเติม: `barcode?`, `reorderPoint?`, `standardCost?` (อ้างอิง — ราคาจริงอยู่ที่ `SupplierRawMaterial`) | — |
| FR-CAT-07 | `RawMaterial` **ขายตรง** (`isSellable`, default false) + `sellPrice?` — ขายแล้วหักสต็อกโดยตรง ไม่ผ่าน production order · ห้ามสร้าง FG แบบสูตร 1 บรรทัดเพื่อเลี่ยง (ต้องมี processing จริง เช่น จัดเป็นช่อ) | BR-CAT-03 |
| FR-CAT-08 | `RawMaterial` ห้ามลบเมื่อถูกอ้างโดย BOM/ข้อเสนอซัพพลายเออร์/ใบสั่งผลิต (ใช้ deactivate) | BR-CAT-06 |
| FR-CAT-09 | `FinishedGood`: `sku` unique, `name`, `categoryId`, `unit`, `standardPrice` (list price), `description?`, `imageUrl?`, `isActive` · ห้ามลบเมื่อมี production order/LOT/customer order อ้าง | BR-CAT-06 |
| FR-CAT-10 | `BomVersion` (versioned): `version` (1,2,…) ต่อ finished good, `status` = `draft`/`active`/`archived`, `effectiveFrom`, `note?` — มี **active ได้แค่ 1 ต่อสินค้า** | BR-CAT-02 |
| FR-CAT-11 | เปิดใช้ (`POST /bom-versions/{id}/activate`) → เวอร์ชัน active เดิมถูก archive อัตโนมัติ · แก้/ลบได้เฉพาะ draft · archived เก็บไว้ (ลบไม่ได้) | BR-CAT-02 |
| FR-CAT-12 | `BomItem`: (`bom_version_id`,`raw_material_id`) PK, `quantity_per_unit` (หน่วยฐานต่อ 1 FG) | — |
| FR-CAT-13 | แผนจัดซื้อ/ใบสั่งผลิตใหม่ต้องอ่าน BOM **active เท่านั้น** · ใบสั่งผลิตเดิมเก็บ allocated quantities ไว้ ไม่เปลี่ยนเมื่อสูตรใหม่ถูกเปิด | BR-CAT-02 |

### 3.3 Procurement (FR-PROC) ✅⏳

**หน้าจอ**: `/procurement/plans` (+ wizard 2 หน้า + `/{id}`) · `/procurement/purchase-orders` (+ `/{id}`) · `/procurement/suppliers` (+ `/{id}`)

#### 3.3.1 สร้างแผนจัดซื้อ (wizard)

| ID | ความต้องการ | BR |
|---|---|---|
| FR-PROC-01 | หน้า 1 ต้องรองรับที่มาข้อมูล 3 แบบ: (1) ยอดขายย้อนหลัง (เลือกเดือน/ปี + กรองหมวด) (2) คำสั่งซื้อที่ confirmed (3) เลือกสินค้าเอง | BR-PROC-01 |
| FR-PROC-02 | แสดงสินค้าขายได้พร้อมจำนวนขาย + trend (▲%/▼%) เรียงตามจำนวน/ชื่อ · Checkbox เลือกสินค้า + ปรับจำนวน (adjustment) | BR-PROC-01 |
| FR-PROC-03 | แสดง "แผนการจัดซื้อ" (สินค้าที่จะผลิต + จำนวน editable/ลบได้) แล้ว **ประมาณวัตถุดิบที่ต้องใช้** = Σ(BOM active × planned qty) ต่อวัตถุดิบ | BR-PROC-02 |
| FR-PROC-04 | หน้า 2 (ตรวจสอบและสร้าง): แสดงรายการสินค้า (qty, unit) + สรุปวัตถุดิบ (RM, รวมจำนวน, หน่วย, จำนวนซัพพลายเออร์ที่ขาย) · สร้างแผน → แสดงผลสำเร็จ + redirect ไปรายการ | BR-PROC-02 |
| FR-PROC-05 | `PurchasePlan`: `name` (auto `แผน_YYYY-MM`), `status`=`draft`/`ordered`/`archived`, `source_month`/`source_year`, `created_by_user_id`, `created_at` | — |
| FR-PROC-06 | `PlanLine`: (`plan_id`,`finished_good_id`) PK, `base_quantity` (ผลรวม picks), `adjustment_pct` (derived), `planned_quantity` (editable) | — |
| FR-PROC-07 | `PlanRawMaterial`: `required_quantity` (BOM × planned), **`on_hand_snapshot`** (freeze ตอนสร้างแผน), `net_required_quantity` = `max(required − snapshot, 0)` | BR-PROC-02 |

#### 3.3.2 เลือกซัพพลายเออร์และสร้าง PO

| ID | ความต้องการ | BR |
|---|---|---|
| FR-PROC-08 | หน้ารายละเอียดแผน: (1) ตารางวัตถุดิบ (ต้องใช้ / ต้องซื้อสุทธิ / สั่งแล้ว / ความคืบหน้า) ดูอย่างเดียว (2) ตารางซัพพลายเออร์ที่ขายวัตถุดิบในแผน (ชื่อ, เบอร์, จำนวนวัตถุดิบที่ขาย, จำนวนรายการที่สั่งแล้ว, ยอดรวม) กดแถวเพื่อเปิด drawer (side panel) ต่อซัพพลายเออร์ | BR-PROC-03 |
| FR-PROC-09 | drawer (side panel) ต่อซัพพลายเออร์ (1 สายโทรศัพท์): แถว = วัตถุดิบในแผนที่ซัพพลายเออร์รายนี้ขาย · คอลัมน์ จุดรับ (Route ของซัพพลายเออร์นั้น) · จำนวนที่สั่ง (หน่วยซัพพลายเออร์) · ราคา/หน่วย (default จาก `SupplierRawMaterial.price_per_supplier_unit` แก้ได้) · รวม · วัตถุดิบเดียวกันเพิ่มแถวอีกจุดรับได้ · **วันรับของ** 1 วันต่อซัพพลายเออร์ (บังคับเมื่อมีรายการสั่ง) | BR-PROC-03, BR-PROC-04 |
| FR-PROC-10 | บันทึกด้วยปุ่มเดียวที่ footer drawer (side panel): แถวจำนวน > 0 → บันทึกเป็น `PlanOrderLine` (ต้องมี `supplier_route_id`, จำนวนเต็ม > 0, ราคา ≥ 0) · แถวจำนวน 0/ว่าง = ไม่สั่งวัตถุดิบนั้นกับรายนี้ (ข้ามอัตโนมัติ ไม่เก็บรายการ และลบรายการเดิมถ้าเคยบันทึก) · ไม่มีสถานะการโทร · ปิด drawer (side panel) ขณะมีแก้ไขที่ยังไม่บันทึก → ถามยืนยัน · เฉพาะรายการที่บันทึกแล้วนับเข้าความคืบหน้าและการสร้าง PO | BR-PROC-03 |
| FR-PROC-11 | Validation: จุดรับต้อง active และเป็นของซัพพลายเออร์นั้น · ห้ามซ้ำ (วัตถุดิบ + จุดรับ) ในซัพพลายเออร์เดียว · แผนต้องเป็น `draft` · **สั่งเกินยอดที่ต้องซื้อ = แสดงคำเตือนเท่านั้น ไม่บล็อก** | BR-PROC-03, BR07 |
| FR-PROC-12 | หน่วยสั่งซื้อ = แพ็กของซัพพลายเออร์ (1 หน่วย = N หน่วยฐาน เช่น 1 มัด = 10 ดอก): แสดงจำนวนแนะนำ = ปัดขึ้น(ต้องซื้อสุทธิ ÷ N) (ต้องการ 95 ดอก → 10 มัด) และ "= X หน่วยฐาน" ต่อแถว · ความคืบหน้าของวัตถุดิบ = Σ(จำนวน × N) · แสดงราคาต่อหน่วยฐานเพื่อเทียบข้ามซัพพลายเออร์ | BR-PROC-04 |
| FR-PROC-13 | **สร้าง PO**: ระบบ **group `PlanOrderLine` ที่บันทึกแล้วโดย `supplier_id` แล้วสร้าง 1 PO ต่อซัพพลายเออร์ (หลายจุดรับก็ใบเดียว)** — แต่ละ line ระบุจุดรับ (`supplier_route_id`) ของตัวเอง แสดง route info (ชื่อ, ที่อยู่, contact, phone) ต่อ line/จุดรับ + `po_number` auto + `total_amount` + `expected_delivery_date` = `delivery_date` ที่ตกลงกับซัพพลายเออร์ + `status='ordered'` · **ไม่ส่ง PO ให้ซัพพลายเออร์** | BR-PROC-05 |
| FR-PROC-14 | `PurchaseOrderLine`: `raw_material_id`, `quantity` (หน่วย supplier), `price_per_unit`, `total`, `supplier_route_id` (จุดรับ), `run_sheet_id` (ว่างจนกว่าจะจัดเข้าใบวิ่งรถ), `received_at` ; วันรับของ (`expected_delivery_date`) อยู่ที่ PO | — |
| FR-PROC-15 | ผลลัพธ์: "สร้างใบสั่งซื้อสำเร็จ N ใบ (ผู้ขาย M ราย) รวม ฿X" แสดงรายการ PO ที่สร้าง + ปุ่มดูรายละเอียด | BR-PROC-05 |
| FR-PROC-16 | สร้าง PO แบบ manual (ไม่ผ่านแผน) ได้ — เลือกซัพพลายเออร์และวันรับของ · **แต่ละ line ต้องระบุจุดรับ (บังคับ — ไม่มีจุดรับจัดเข้าใบวิ่งรถไม่ได้)** · 1 PO ต่อซัพพลายเออร์ · รายการเลือกได้เฉพาะวัตถุดิบที่ซัพพลายเออร์ขาย · **หน่วยสั่งซื้อเหมือนหน้าแผนจัดซื้อ**: จำนวน/ราคาเป็นหน่วยของซัพพลายเออร์ (แพ็ก) และแสดงจำนวน/ราคาเทียบหน่วยฐาน (เช่น = 100 ดอก, ฿x / ดอก) · หน้าแก้ไข PO ใช้กติกาเดียวกัน | BR-PROC-06 |
| FR-PROC-17 | **สถานะ PO**: `ordered` (สั่งแล้ว รอรับ) → `received` (ตอนยืนยันรับของในใบวิ่งรถ) · `ordered` → `cancelled` (confirm dialog) · **ไม่มี `draft`/`sent`/`confirmed`** เพราะไม่ส่ง PO ให้ซัพพลายเออร์ · **แก้ PO ได้ (วันรับของ, รายการ, จุดรับ, จำนวน, ราคา) และยกเลิกได้จนกว่าจะมี line ใดถูกยืนยันรับของ** แม้ใบวิ่งรถพิมพ์แล้ว (ระบบเตือนว่าฉบับที่พิมพ์ไปอาจไม่ตรง) | BR-PROC-07 |
| FR-PROC-18 | จุดรับและการผูกใบวิ่งรถอยู่ที่ระดับ **PO line** (`supplier_route_id`, `run_sheet_id`, `received_at`) ส่วน `PurchaseOrder` มี `received_at` เมื่อรับครบทุก line · การสร้างใบวิ่งรถ (เลือกเส้นทาง รถ วันที่) รวม line ของ PO สถานะ `ordered` ที่วันรับของ ≤ วันที่วิ่ง ยังไม่อยู่ใบวิ่งรถ และจุดรับอยู่ในเส้นทาง · PO ที่ถูกยกเลิกหลุดจากใบวิ่งรถ · PO ที่มีหลายจุดรับอาจอยู่หลายใบวิ่งรถ และเป็น `received` เมื่อ line สุดท้ายถูกตรวจรับ | BR-PROC-08, BR-LOG-R-07 |
| FR-PROC-19 | ⏳ (backend) แผนจัดซื้อต้อง: รวมคำสั่งซื้อส่งออกเป็น "ยอดแน่นอน" และ **ไม่นับยอด sales history จาก channel=`platform`** (กันซ้ำ) | BR-PROC-08 |

### 3.4 Logistics — ขารับ ใบวิ่งรถ (FR-LOG-P) ✅📝

**หน้าจอ**: `/logistics/vehicles` · `/logistics/routes` · `/logistics/run-sheets` (+ `/generate` `/{id}` `/{id}/record-receipt`)

| ID | ความต้องการ | BR |
|---|---|---|
| FR-LOG-P-01 | `Vehicle`: `code` unique (VH-001), `license_plate` (รูปแบบ กข-1234 กรุงเทพฯ), `type`, `capacity_kg` > 0, `status`=`active`/`inactive` — **ไม่มี driver fields** (คนขับถูกลบออกจาก vehicle) | BR-LOG-P-01 |
| FR-LOG-P-02 | `VehicleRoute`: `route_name`, `run_days` (Mon..Sun), `is_active` — **ไม่มี vehicleId** (ไม่ผูกกับรถ) | BR-LOG-P-02 |
| FR-LOG-P-03 | `VehicleRouteStop`: `sequence` (unique ต่อ route) + `supplier_route_id` (FK จุดรับ) + denormalized info (supplier name, route name, pickup address, contact, phone) สำหรับแสดงผล · ห้ามเพิ่มจุดรับ inactive · ต้องมี ≥1 จุด/เส้นทาง | BR-LOG-P-02 |
| FR-LOG-P-04 | แก้ไขเส้นทาง: เพิ่ม/ลบ/เรียงลำดับ (drag reorder) จุดรับ | BR-LOG-P-02 |
| FR-LOG-P-05 | **ออกใบวิ่งรถ** (`/logistics/run-sheets/generate`): เลือกเส้นทาง + รถ + คนขับ (User role=driver) + วันที่ · validate รถ active, เส้นทาง active, วันที่ตรงกับ `run_days` | BR-LOG-P-03 |
| FR-LOG-P-06 | ระบบต้อง query PO ที่ `status=ordered`, วันรับของ ≤ วันที่วิ่ง, มี line ที่ยังไม่มี `run_sheet_id` และ `line.supplier_route_id` ตรงกับจุดในเส้นทาง → group เข้าจุด (stop) ตาม `sequence` · **สร้าง stop เฉพาะจุดที่มี PO** · ต้องมี ≥1 stop ที่มี PO | BR-LOG-P-04 |
| FR-LOG-P-07 | แสดง preview: ป้ายรถ(ทะเบียน)+คนขับ, stop เรียงตามลำดับ, ต่อ stop มี PO + line items (RM, qty, unit) + รวมยอดต่อ stop + รวมทั้งใบ (฿, จำนวน PO, จำนวน stop) · ให้ลบ/แก้ไขรายการได้ | BR-LOG-P-04 |
| FR-LOG-P-08 | สร้าง/พิมพ์: `VehicleRunSheet` (`run_sheet_number`=`RS-YYYYMMDD-###` unique) + `run_sheet_stop` (copy route info) + `run_sheet_receipt_line` (FK `purchase_order_line`) · `status='draft'` | — |
| FR-LOG-P-09 | **ไม่จำกัด 1 ใบต่อรถ/คนขับต่อวัน** — ตอนออกใบแสดง info "รถ VH-001 มีอีก N ใบวันนี้ / คนขับ X มีอีก M ใบ" (ข้อมูลประกอบ ไม่บล็อก) · ดูได้จาก `GET /logistics/day-load` | BR-LOG-P-03 |
| FR-LOG-P-10 | **ไม่ระบุเวลาออกรับ** — ลำดับเที่ยวของวันดูจากเวลาพิมพ์ (`printed_at`) | BR-LOG-P-05 |
| FR-LOG-P-11 | สถานะ: `draft → printed → in_progress → completed` (ไม่มี cancelled ใน build ปัจจุบัน) | — |
| FR-LOG-P-12 | พิมพ์: เฉพาะจาก `draft` → `printed` (บันทึก `printed_at`/`printed_by`) · พิมพ์ซ้ำได้ (ไม่แจ้งเตือนซ้ำ — dedupeKey) | BR-LOG-P-05 |
| FR-LOG-P-13 | หน้าพิมพ์ A4 (`/{id}/print`): หัวใบ (เลข, วันที่, รถ, คนขับ, เส้นทาง, ความจุ) + ต่อ stop (ที่อยู่, contact, PO, line items, รวมยอด, ช่องกรอกจำนวนรับจริง+ลายเซ็น) + summary (รวม PO/stop/ยอด/น้ำหนัก ~) + ลายเซ็นคนขับ/ผู้จัดการ | BR-LOG-P-05 |
| FR-LOG-P-14 | `driver` ที่เปิดหน้าใบวิ่งรถ/งานวันนี้ **ห้ามแสดงราคา/ยอดเงิน** | BR-AUTH-06 |

### 3.5 Logistics — บันทึกรับของจริง (FR-LOG-R) ✅⏳

**หน้าจอ**: `/logistics/run-sheets/{id}/record-receipt`

| ID | ความต้องการ | BR |
|---|---|---|
| FR-LOG-R-01 | Entry gate: เปิดหน้าขณะ `printed` → แสดงข้อความ "ใบนี้ยังออกไปรับของ — ยืนยันคนขับกลับแล้วเพื่อเริ่มบันทึก" + ปุ่ม **"คนขับกลับแล้ว — เริ่มบันทึกรับของ"** (→ `in_progress`, stamp `returned_at`) และ "กลับไปดูใบ" · ใบ `completed` → ข้อความแทน (ไม่ให้แก้) · **เฉพาะ `in_progress` ถึงเห็นฟอร์ม** | BR-LOG-R-02 |
| FR-LOG-R-02 | ฟอร์ม: วันที่/เวลาที่รับ + ต่อ stop ต่อ line: แสดง Ordered Qty (จากใบ) + input Actual Received Qty + input Notes (optional) · auto คำนวณ variance (actual − ordered) | BR-LOG-R-03 |
| FR-LOG-R-03 | **บันทึกจุดนี้**: ปุ่มต่อจุดจอด · ต้องกรอกวัตถุดิบ/จำนวน/ราคาครบทุกบรรทัดของจุดนั้น · เขียนลง PO line + ตั้ง `checked_at` · อยู่ `in_progress` · ไม่เปลี่ยน `completed_date` · แก้จุดที่บันทึกแล้วต้องบันทึกซ้ำ (ระหว่างนั้นนับเป็นยังไม่ตรวจ) · **ไม่มีปุ่มบันทึกร่างรวมทั้งใบ** | BR-LOG-R-04 |
| FR-LOG-R-04 | Review summary: รวมสั่ง vs รวมรับ · variance % ต่อ stop · รายการ variance ต่อ line | BR-LOG-R-05 |
| FR-LOG-R-05 | **Tint แถวอัตโนมัติ**: รับน้อยกว่าสั่ง (มากกว่า 0) = ส้ม · ต่ำกว่า 20% หรือ ไม่ได้รับเลย = แดง (กฎคงที่บนหน้านี้ ยังไม่ config) | BR-LOG-R-06 |
| FR-LOG-R-06 | **Confirm & Close**: จำนวน/ราคาที่รับของทุกบรรทัด default จากที่สั่ง (แก้ได้) · validate ทุกบรรทัดมีวัตถุดิบ จำนวน ≥ 0 และราคา ≥ 0 · ถามยืนยัน (ปิดใบ + line ทั้งหมดในใบนี้เป็นรับแล้ว · PO ที่รับครบทุก line เป็น `received`) · **ต้องตรวจครบทุกจุดจอดก่อน** | BR-LOG-R-05 |
| FR-LOG-R-07 | ยืนยันแล้ว: `status='completed'` + `completed_at`/`completed_by` · stop เก็บ `total_ordered_qty`, `total_received_qty`, `variance`, `variance_pct`, `received_notes`, `completed_date`, `completed_by` | BR-LOG-R-05 |
| FR-LOG-R-08 | ผลลัพธ์: "บันทึกรับของสำเร็จ · รวมสั่ง X · รวมรับ Y · variance Z (P%) · N รายการรับครบ / M รายการรับบางส่วน / K รายการไม่ได้รับ" | BR-LOG-R-05 |
| FR-LOG-R-09 | การยืนยันเขียนลง PO lines: `received_raw_material_id` (เปลี่ยนเป็นวัตถุดิบอื่นได้เมื่อของที่จุดรับหมดแล้วคนขับซื้อตัวแทน), `received_quantity` (0 = ไม่ได้ของ), `received_price_per_unit` · เพิ่มบรรทัดที่ไม่อยู่ใน PO ได้ (`added_at_receipt`) · ค่าที่สั่งไม่ถูกทับ · line ที่ตรวจรับได้ `received_at` · PO → `received` + `received_at` เมื่อรับครบทุก line | BR-LOG-R-07 |

### 3.6 Logistics — ขาส่ง ใบส่งของ (FR-LOG-D) ✅📝

**หน้าจอ**: `/logistics/delivery-sheets` (+ `/new` `/{id}`)

| ID | ความต้องการ | BR |
|---|---|---|
| FR-LOG-D-01 | สร้างใบ (`/new`): เลือก `sheet_type` (`consignment_route` หรือ `direct` — ห้ามปน) + `delivery_date` + `vehicle_id` + `driver_user_id` + จุดส่งเรียงลำดับ | BR-LOG-D-01 |
| FR-LOG-D-02 | Candidates (`GET /delivery-sheets/candidates?date=&sheetType=`): `direct` → คำสั่งซื้อ `confirmed` ที่ยังไม่ส่งและไม่อยู่ในใบเปิด (draft/printed) อื่น · `consignment_route` → สาย active ที่วิ่งวันนั้น + estimate (ถ้ามี) | BR-LOG-D-02 |
| FR-LOG-D-03 | **`consignment_route` sheet**: เลือกสาย → จุดส่ง = ร้านในสายตามลำดับ + สร้าง `ConsignmentVisit` ทุกจุด (คนขับของ visit = คนขับของใบ) + `load_lines` default จาก estimate ของสายนั้น · Draft ตัด/เพิ่ม/เรียงร้านได้ | BR-LOG-D-02 |
| FR-LOG-D-04 | **`direct` sheet**: เลือกคำสั่งซื้อ `confirmed` → จุดส่งต่อ 1 คำสั่งซื้อ (ลูกค้าในประเทศ หรือ ส่งออกปลายทางสนามบิน) | BR-LOG-D-02 |
| FR-LOG-D-05 | Validation: รถ active · คนขับ active role=driver · ≥1 จุด · `consignment_route`: สาย active, ร้าน active ห้ามซ้ำในใบ (แต่ร้านเดียวอยู่ 2 สายวันเดียวกันได้ จึงข้ามกฎ "ร้านมี visit draft แล้ว") · `direct`: คำสั่งซื้อ confirmed, ยังไม่ส่ง, ไม่อยู่ใบเปิดอื่น | BR-LOG-D-02 |
| FR-LOG-D-06 | `DeliverySheet`: `sheet_number`=`DS-YYYYMMDD-###` unique, `sheet_type`, `consignment_route_id?`, `consignment_estimate_id?`, `delivery_date`, `vehicle_id`, `driver_user_id`, `driver_name`/`driver_phone` (copy สำหรับพิมพ์), `status`, `printed_at`, `return_recorded_at?` | — |
| FR-LOG-D-07 | สถานะ: `draft → printed → completed` (+ `cancelled`) · Completed = ทุกจุด `done`/`failed` (+ แบบสายต้องบันทึกของคืนก่อน) | BR-LOG-D-05 |
| FR-LOG-D-08 | Draft: เพิ่ม/ลบ/เรียงจุด (drag) + เปลี่ยนรถ/คนขับได้ · Printed: เปลี่ยน **คนขับ** ได้ (คนใหม่ได้รับแจ้ง, ใบเข้าร้านในใบเปลี่ยนตาม) แต่เพิ่ม/ลบจุดส่งไม่ได้ | BR-LOG-D-03 |
| FR-LOG-D-09 | พิมพ์ (`POST /{id}/print`): `draft → printed` + `printed_at` + สร้าง notification `deliverysheet.ready` ถึงคนขับ | BR-LOG-D-03 |
| FR-LOG-D-10 | ผลรายจุด (`pending → done`/`failed`): จุด `customer_order` = staff บันทึกส่งของในคำสั่งซื้อ · จุด `consignment_visit` = ร้านเซ็นใบเข้าร้าน → `done` | BR-LOG-D-04 |
| FR-LOG-D-11 | ส่งไม่ได้ (`POST /{id}/stops/{stopId}/fail` `{reason}`): จุด → `failed` + `fail_reason` · คำสั่งซื้อกลับไปรอส่ง (ใส่ใบอื่นได้) · ใบเข้าร้านที่ยังไม่เซ็น → `cancelled` | BR-LOG-D-04 |
| FR-LOG-D-12 | **ของขึ้นรถ/ของคืน** (`consignment_route`): ตอนพิมพ์ บันทึก `loaded_quantity` + LOTs ต่อ load line (สแกน barcode) · จบเที่ยว staff บันทึก `returned_quantity` + LOTs (`POST /{id}/return`) → ของเข้า FG stock · แสดงส่วนต่าง `loaded − delivered − returned` (เตือน ไม่บล็อก) | BR-LOG-D-06 |
| FR-LOG-D-13 | ยกเลิก (`POST /{id}/cancel` `{reason}`): เฉพาะเมื่อยังไม่มีจุด `done` · คืนคำสั่งซื้อเป็นรอส่ง + ยกเลิกใบเข้าร้านที่ยังไม่เซ็น | BR-LOG-D-05 |
| FR-LOG-D-14 | `driver` ไม่เห็นราคา/ยอดเงิน | BR-AUTH-06 |
| FR-LOG-D-15 | ⏳ (backend) สร้าง `DeliverySheet` (route) → สร้าง `ConsignmentVisit` per stop อัตโนมัติ | BR-LOG-D-02 |

### 3.7 งานวันนี้ของคนขับ (FR-DRV) 📝

**หน้าจอ**: `/my-jobs` (มือถือ)

| ID | ความต้องการ | BR |
|---|---|---|
| FR-DRV-01 | แสดงใบวิ่งรถ + ใบส่งของของวันนี้ที่ตัวเองเป็นคนขับ (`driver_user_id` = ตัวเอง) สถานะ `printed` เรียงตาม `printed_at` (= เที่ยว 1,2,…) · `completed` อยู่ท้ายแบบจาง · ไม่แสดง `draft`/`cancelled` | BR-DRV-01 |
| FR-DRV-02 | ใบวิ่งรถ: แสดงจุดรับตามลำดับ (ที่อยู่, ผู้ติดต่อ กดโทรได้, รายการ+จำนวน) — **view-only** | BR-DRV-02 |
| FR-DRV-03 | ใบส่งของ: จุดส่งตามลำดับ + สถานะรายจุด · จุด `consignment_visit` กดเปิดใบเข้าร้านเพื่อสแกนของที่เหลือ + ให้ร้านเซ็น | BR-DRV-03 |
| FR-DRV-04 | เลือกดูวันอื่นได้ (ย้อนหลัง/ล่วงหน้า) — read-only · ไม่แสดงราคา/ยอดเงิน | BR-DRV-04 |
| FR-DRV-05 | sidebar ของ `driver` มีเฉพาะ "งานวันนี้" | BR-DRV-04 |
| FR-DRV-06 | (backend) `GET /me/jobs?date=` คืนเฉพาะใบของตัวเอง ไม่มีราคา | BR-DRV-01 |

### 3.8 Production (FR-PRD) ✅⏳

**หน้าจอ**: `/production/planning` · `/production/orders` (+ `/{id}`) · `/production/lines`

| ID | ความต้องการ | BR |
|---|---|---|
| FR-PRD-01 | หน้าวางแผนผลิต: เลือก **วันส่ง (delivery date D)** → แสดงความต้องการทั้งหมดของวันนั้น: (1) ยอดประเมิน `confirmed` ทุกสายที่ส่งวัน D (2) คำสั่งซื้อ `confirmed` ที่ส่งวัน D — พร้อมบอกว่าสั่งผลิตแล้วหรือยัง | BR-PRD-01 |
| FR-PRD-02 | สั่งผลิตได้ทุกเวลา ไม่มีตัดรอบ (คำสั่งที่มาทีหลังสั่งผลิตเพิ่มได้) | BR-PRD-02 |
| FR-PRD-03 | `ProductionOrder.source` = `consignment_route`/`customer_order`/`manual` · 1 ใบ = 1 สินค้า = 1 LOT · ฝากขาย: ยอดตั้งต้น = ผลรวมยอดประเมินของร้านในสาย (แก้ได้ เช่น ใช้สต็อกเดิม) · ขายขาด/ส่งออก: 1 ใบต่อ คำสั่งซื้อ×สินค้า | BR-PRD-03 |
| FR-PRD-04 | `ProductionOrder`: `order_number` unique (`PROD-…`), `finished_good_id`, `planned_quantity`, `production_line_id`, `batch_number` unique, `delivery_date`, `customer_id?`, `status`, `qc_status`, `yield_rate`, `defects_found`, `operator_user_id` (แทน `operator_name`) | — |
| FR-PRD-05 | สถานะ: `draft → confirmed → in_production → completed` · `production` ทำงานได้เฉพาะ `start`/`qc-check`/`complete` — **สร้างใบใหม่ไม่ได้** | BR-PRD-04 |
| FR-PRD-06 | **จองวัตถุดิบ** (`allocate`): `quantity_allocated += allocated`, `quantity_available -= allocated` ตอนอนุมัติ/confirm | BR-PRD-05 |
| FR-PRD-07 | **เริ่มผลิต** (`POST /{id}/start`): `status → in_production` + `start_date` + `operator` · เบิกวัตถุดิบ: `on_hand -= allocated`, `allocated -= allocated` (หักครั้งเดียวตรงนี้) | BR-PRD-05 |
| FR-PRD-08 | **QC** (`POST /{id}/qc-check`): ผล `passed`/`failed` + บันทึก | BR-PRD-04 |
| FR-PRD-09 | **ปิดงาน** (`POST /{id}/complete`): บันทึก `actual_quantity`, `actual_rm_used`, `defects_found` · คำนวณ `yield_rate = actual/planned × 100` · **reconcile RM**: ถ้า `actual_used > allocated` → หักส่วนเกินจาก on_hand · ถ้า `actual_used < allocated` → คืนส่วนเหลือเข้า on_hand · `status → completed` + `end_date` | BR-PRD-05 |
| FR-PRD-10 | **จด LOT** (`POST /{id}/register-finished-goods`): สร้าง `FinishedGoodsBatch` (copy `yield_rate`, **ไม่มีเกรด**, `barcode` unique, `expiration_date`) + เพิ่ม FG `on_hand` · **ไม่แตะ RM inventory** (สะสางแล้วที่ start/complete) | BR-PRD-06, BR-PRD-07 |
| FR-PRD-11 | LOT ที่ผลิตเสร็จ **ถูกกัน (reserve) ให้สาย/คำสั่งซื้อ** ของใบนั้น (`reserved_for_order_id`) | BR-PRD-06 |
| FR-PRD-12 | `ProductionLine`: `code` unique, `capacity_per_hour`, `status`=`available`/`in_use`/`maintenance`, `compatible_products[]` (FG IDs) · `production` เปิด/ปิดซ่อมได้ (`maintenance`) → notification `production_line.maintenance` | BR-PRD-04 |
| FR-PRD-13 | ⏳ (backend) notification `production_order.confirmed` ส่งถึง user `production` ทุกคนตอน `status → confirmed` | — |
| FR-PRD-14 | ⏳ **AI production planning** (FLOW 4-5, target design): score = Deadline(40%)+Profit(30%)+Stock(30%) → `products_to_make`/`products_deferred`/`rm_allocations`/`warnings` · validate allocation ≤ `quantity_available` — **ยังไม่ทำ** | BR-PRD-08 |

### 3.9 Inventory (FR-INV) ✅📝⏳

| ID | ความต้องการ | BR |
|---|---|---|
| FR-INV-01 | `RawMaterialInventory`: `on_hand`, `allocated` (จองโดยใบสั่งผลิต), `available` (= on_hand − allocated), `on_order`, `reorder_point`, `status`=`available`/`low_stock`/`critical` | BR-INV-01 |
| FR-INV-02 | หน้า `/production/raw-materials` (แท็บถัดจาก FG): แสดง on_hand / reserved / available + ความเคลื่อนไหวราย RM — 📝 ยังไม่ทำ (ตอนนี้ดูได้ในหน้าวางแผนผลิต) | BR-INV-01 |
| FR-INV-03 | หน้า `/production/finished-goods`: สต็อก FG ราย LOT (จำนวน, คงเหลือ, อายุ, barcode) + กรองใกล้หมดอายุ | BR-INV-02 |
| FR-INV-04 | `FinishedGoodsBatch` สร้างตอน register-fg (FR-PRD-10) · สถานะ `available`/`reserved`/`depleted`/`expired` · อายุหมด = เตือน (ไม่บล็อก) | BR-INV-02 |
| FR-INV-05 | ⏳ (backend) ของคืนจากใบส่งของ (FR-LOG-D-12) ต้องคืน LOT เข้า FG stock จริง (ตอนนี้ mock บันทึกเป็นจำนวนต่อสินค้า ยังไม่สแกน LOT) | BR-INV-04 |

### 3.10 Sales (FR-SAL) ✅📝

**หน้าจอ**: `/sales/consignment-routes` · `/sales/estimates` (+ `/{id}`) · `/sales/orders` (+ `/{id}`) · `/sales/visits` (+ `/{id}`) · `/sales/reports` (+ `/{id}`) · `/sales/customers` (+ `/{id}`) · `/sales/performance`

#### 3.10.1 สายฝากขาย & ยอดประเมิน

| ID | ความต้องการ | BR |
|---|---|---|
| FR-SAL-01 | `ConsignmentRoute`: `code` unique (CR-01), `name`, `days_of_week` (บังคับ ≥ 1 วัน ถ้าวิ่งทุกวันเลือกครบ 7), `is_active` — ข้อมูลฝ่ายขาย แยกจาก `VehicleRoute` | BR-SAL-01 |
| FR-SAL-02 | `ConsignmentRouteStop`: `sequence` + `customer_id` (ร้าน type=consignment) — unique (route, customer) · ร้าน 1 ร้านอยู่ได้หลายสาย · ร้านเดิมซ้ำในสายเดียวกันไม่ได้ | BR-SAL-01 |
| FR-SAL-03 | สายที่ถูกใช้แล้ว: deactivate แทน delete | BR-SAL-01 |
| FR-SAL-04 | `ConsignmentEstimate` (`CE-YYYYMMDD-###` unique): `delivery_date` + `consignment_route_id` — unique (route, date) ท่ามกลาง non-cancelled · `status`=`draft`/`confirmed`/`cancelled` | BR-SAL-02 |
| FR-SAL-05 | `ConsignmentEstimateLine`: `customer_id` + `finished_good_id` + `suggested_quantity` (system) + `estimated_quantity` (staff, ≥ 0) | BR-SAL-02 |
| FR-SAL-06 | ระบบแนะนำ (`GET /consignment-estimates/suggest?date=&routeId=`): จากยอดขายล่าสุดของร้าน + ของที่เหลือในร้าน + ของเสียรอบก่อน · แจ้ง `other_routes_same_day` ร้านที่อยู่สายอื่นวันเดียวกัน (เตือน ไม่บล็อก) | BR-SAL-02, BR-SAL-03 |
| FR-SAL-07 | ยืนยัน (`POST /{id}/confirm`) → นับเข้าแผนผลิต · ยกเลิก (`/cancel`) | BR-SAL-03 |
| FR-SAL-08 | แก้ไขได้จนกว่า **ใบส่งของของสายนั้นจะ printed** · แก้หลังสั่งผลิตแล้ว → แสดงส่วนต่างกับใบสั่งผลิต (ไม่แก้ใบสั่งผลิตให้อัตโนมัติ) | BR-SAL-03 |
| FR-SAL-09 | `delivery_date` ของยอดประเมินต้องตรงกับ `days_of_week` ของสาย (validate) | BR-SAL-02 |
| FR-SAL-10 | จัดเก็บเพื่อเทียบกับยอดจริง (ใบเข้าร้าน) ปรับ `suggested` รอบถัดไป | BR-SAL-03 |

#### 3.10.2 คำสั่งซื้อ & นำเข้าอีเมล

| ID | ความต้องการ | BR |
|---|---|---|
| FR-SAL-11 | `CustomerOrder`: `order_number` unique, `customer_id`, `import_id?`, `received_at`, `requested_delivery_date`, `channel`=`email`/`phone`/`platform`/`manual`, `platform_name?`+`platform_order_ref?` (**unique pair**), `status`=`draft`/`confirmed`/`delivered`/`cancelled`, `purchase_plan_id?`, `delivery_sheet_id?`, `invoice_id?` | BR-SAL-04 |
| FR-SAL-12 | `CustomerOrderLine`: `customer_sku` + `finished_good_id?` (null จนกว่าจะ map) + `quantity` | — |
| FR-SAL-13 | คีย์เอง (`phone`/`platform`/`manual`) → สร้างเป็น `confirmed` ทันที (พนักงานรู้เนื้อหาแล้ว ไม่มีขั้นคัดกรอง) | BR-SAL-04 |
| FR-SAL-14 | `channel=email` → สร้างเป็น `draft` จนกว่าคัดกรอง/ยืนยัน | BR-SAL-04 |
| FR-SAL-15 | `EmailImport`: `received_at`, `from_address`, `subject`, `attachment_name`, `customer_id`, `status`=`parsed`/`needs_review`/`failed`, `order_id?`, `issues` (รายการปัญหา parse) | BR-SAL-05 |
| FR-SAL-16 | `Customer` import profile: `import_sender_email`, `import_file_type` (xlsx/csv/pdf), `import_header_row`, `import_product_column`, `import_quantity_column`, `import_delivery_date_cell` | BR-SAL-05 |
| FR-SAL-17 | `CustomerSKUMap`: (`customer_id`,`customer_sku`) PK + `finished_good_id` — map รหัสสินค้าของลูกค้า → SKU จริง | BR-SAL-05 |
| FR-SAL-18 | รายการที่ map ไม่ได้ → `needs_review` พร้อม `issues` | BR-SAL-05 |
| FR-SAL-19 | `Customer` (ส่งออก): เพิ่ม `country`, `name_en`, `address_en` — ผู้ซื้อต่างประเทศเก็บเป็นลูกค้า (platform เป็นแค่ช่องทาง) | BR-SAL-06 |

#### 3.10.3 เข้าร้าน & ยอดขายจากร้าน

| ID | ความต้องการ | BR |
|---|---|---|
| FR-SAL-20 | `ConsignmentVisit`: `visit_number` unique, `customer_id`, `visit_date`, `driver_user_id` (copy จากใบส่งของ), `delivery_sheet_id`, `status`=`draft`/`signed`/`cancelled`, `signed_by`, `signed_at` | BR-SAL-07 |
| FR-SAL-21 | `ConsignmentVisitLine`: `kind`=`previous_balance`/`counted`/`spoiled`/`delivered` + `finished_good_id` + `batch_number?` + `barcode?` + `quantity` | BR-SAL-07 |
| FR-SAL-22 | สถานะเพิ่ม `cancelled` (ของที่ส่งไม่ได้ / ใบส่งของถูกยกเลิก) | BR-SAL-07 |
| FR-SAL-23 | `SalesReport`: `report_number` unique, `customer_id`, `received_at`, `period_from`/`period_to`, `status`=`pending`/`confirmed`/`invoiced`, `invoice_id?` | BR-SAL-08 |
| FR-SAL-24 | `SalesReportLine`: (`sales_report_id`,`finished_good_id`) PK, `reported_quantity`, `confirmed_quantity` | BR-SAL-08 |
| FR-SAL-25 | หน้า `/sales/performance` (สรุปผลฝากขาย): อัตราของเสีย = ของเสีย ÷ ของส่งเข้าร้าน · สี/อันดับใช้ `wasteWarnPercent`/`wasteDangerPercent`/`wasteMinDelivered` | BR-SAL-09 |

### 3.11 Billing (FR-BILL) ✅📝

**หน้าจอ**: `/sales/invoices` (+ `/{id}`)

| ID | ความต้องการ | BR |
|---|---|---|
| FR-BILL-01 | `Invoice`: `invoice_number` unique, `customer_id`, `source`=`customer_order`/`sales_report`, `source_id` (polymorphic, ไม่มี FK), `issued_at`, `due_date`, `status`=`issued`/`paid`, `paid_at` | BR-BILL-01 |
| FR-BILL-02 | `InvoiceLine`: (`invoice_id`,`finished_good_id`) PK, `quantity`, `unit_price` | — |
| FR-BILL-03 | บันทึกการรับชำระ → `status='paid'` + `paid_at` | BR-BILL-02 |
| FR-BILL-04 | ❓ Q1/Q2: เอกสารส่งออก (commercial invoice + packing list ภาษาอังกฤษ) — **ยังไม่ทำ** จนกว่าจะสรุปสกุลเงิน/ช่องทางรับเงิน/รูปแบบแพ็กกิ้ง | BR-BILL-03 |

### 3.12 Notifications (FR-NTF) 📝

| ID | ความต้องการ | BR |
|---|---|---|
| FR-NTF-01 | โครงสร้าง: 1 เหตุการณ์ → 1 `Notification` → N `NotificationRecipient` (in-app inbox) → N `NotificationDelivery` (ต่อ channel==line) → N `NotificationDeliveryAttempt` (ทุกการเรียก LINE) | BR-NTF-01 |
| FR-NTF-02 | แจ้ง in-app **ทุกครั้ง** · LINE เพิ่มเมื่อ: `line_enabled` + `line_status='linked'` + ไม่ blocked — ไม่เข้าเงื่อนไข → `skipped` + `skip_reason` | BR-NTF-01 |
| FR-NTF-03 | ผู้รับถูก resolve ตอนเกิดเหตุการณ์ (snapshot, active เท่านั้น) · เนื้อหาเป็น snapshot ข้อความสำเร็จรูป · ผู้ใช้ปิดไม่ได้ | BR-NTF-04 |
| FR-NTF-04 | `dedupeKey` unique: `runsheet.ready:{id}:{driverUserId}` · `deliverysheet.ready:{id}:{driverUserId}` · `production_order.confirmed:{id}` · `production_line.maintenance:{lineId}:{changedAt}` — กดพิมพ์ซ้ำไม่แจ้งซ้ำ แต่เปลี่ยนคนขับแล้วคนใหม่ได้รับ | BR-NTF-03 |
| FR-NTF-05 | เหตุการณ์รอบแรก 4 รายการ (ดูตารางใน BRD) — `admin`/`staff` ยังไม่ได้รับ | BR-NTF-02 |
| FR-NTF-06 | **Transactional outbox**: สร้าง `Notification`+`Recipient`+`Delivery(pending)` ใน transaction เดียวกับการเปลี่ยนสถานะเอกสาร → background worker ส่ง LINE แยก — LINE ล่มไม่งานหลักล้ม ไม่มีแจ้งเตือนหาย | BR-NTF-05 |
| FR-NTF-07 | ทุกข้อความมีลิงก์ (in-app = path, LINE = URL เต็มจาก `app_base_url`) · เปิดลิงก์เอกสารที่ไม่มีสิทธิ์ → หน้าไม่มีสิทธิ์ | BR-NTF-06 |
| FR-NTF-08 | กระดิ่ง topbar (ไม่มีหน้าแยก): นับ unread · เปิดเป็น popover (ใหม่สุดก่อน, scroll โหลดเพิ่มทีละ 20, แท็บ "ทั้งหมด"/"ยังไม่อ่าน") · กด = อ่าน (`read_at`) + เปิดลิงก์ · ปุ่ม "อ่านทั้งหมด" | BR-NTF-06 |
| FR-NTF-09 | LINE send: ทุก attempt ส่ง `X-Line-Retry-Key` (= `retry_key` ของ delivery) → LINE รับข้อความเดิมได้ครั้งเดียว · บันทึกทุก attempt (`http_status`, `x_line_request_id`, `error`, `duration_ms`) | BR-NTF-05 |
| FR-NTF-10 | `max_attempts`=3 (รอ 1 นาที แล้ว 5 นาที) · error mapping: 200→`sent` · 409→`sent` (ไม่ส่งซ้ำ) · 429 quota→`failed` (ไม่ retry) · 429 rate→retry · 400→`failed` · 401/403→`failed` (แก้ค่า LINE OA) · 5xx→retry · timeout/network→retry | BR-NTF-05 |
| FR-NTF-11 | worker ค้าง: `sending` เกิน 5 นาที → กลับ `pending` (ปลอดภัยเพราะ retry key) | BR-NTF-15 |
| FR-NTF-12 | ส่งใหม่ด้วยมือ (admin, `POST /line-deliveries/{id}/resend`): เฉพาะ `failed` → สร้าง `NotificationDelivery` ใหม่ (`retry_key` ใหม่, `resent_from_delivery_id`, `resent_by_user_id`) ตัวเดิมเก็บเป็นประวัติ | BR-NTF-08 |
| FR-NTF-13 | หน้า `/admin/line-deliveries` (admin): สรุปช่วงวัน (sent/failed/skipped/pending) + ตาราง (เวลา, เหตุการณ์, ผู้รับ, สถานะ, จำนวนครั้งลอง, เหตุผล) + กรอง + detail ทุก attempt + ปุ่มส่งใหม่ | BR-NTF-08 |
| FR-NTF-14 | LINE OA settings (card บน `/admin/settings`, admin): switch เปิด/ปิด, Messaging API (Channel ID/secret/token), LINE Login (Channel ID/secret), Basic ID, App base URL, Webhook/Callback URL (system-generated, read-only) | BR-NTF-14 |
| FR-NTF-15 | ค่าลับ: เข้ารหัสก่อนเก็บ · แสดงแบบปิดบัง (`••••abcd`) · กรอกทับได้แต่ดูค่าเดิมไม่ได้ · API ไม่ส่งค่าลับกลับ · ปุ่ม "ทดสอบส่ง" ไปหา LINE ของ admin ที่กด · แก้ค่าบันทึก Audit Log (ค่าลับเป็น `••••`) | BR-NTF-14 |
| FR-NTF-16 | Webhook (`POST /api/line/webhook`): ตรวจ `X-Line-Signature` · follow → `line_status='linked'` · unfollow → `blocked` | — |
| FR-NTF-17 | ระยะเก็บ: in-app 180 วัน · LINE delivery + attempt 1 ปี | BR-NTF-07 |

### 3.13 Audit Log (FR-AUD) 📝

| ID | ความต้องการ | BR |
|---|---|---|
| FR-AUD-01 | Append-only (แอปเพิ่มอย่างเดียว ไม่แก้ไม่ลบ) — DB role INSERT+SELECT เท่านั้น · ล้างได้ตาม job ระยะเก็บ (2 ปี) | BR-AUD-01 |
| FR-AUD-02 | บันทึกใน transaction เดียวกับการเปลี่ยนข้อมูล — เขียน log ไม่ได้ = การเปลี่ยนไม่เกิด | BR-AUD-02 |
| FR-AUD-03 | `AuditLog`: `occurred_at`, `actor_user_id?` + `actor_name`/`actor_role` (snapshot), `action`, `entity_type`, `entity_id?`, `entity_label?`, `summary` (ไทย), `changes` (JSON `[{field,label,from,to}]` — เปลี่ยนเฉพาะฟิลด์ที่เปลี่ยน), `ip_address?`, `user_agent?`, `request_id?` | BR-AUD-03 |
| FR-AUD-04 | `login_failed` ที่ไม่พบผู้ใช้ → เก็บเบอร์ที่กรอกใน `entity_label` (ไม่มี `actor_user_id`) | BR-AUD-04 |
| FR-AUD-05 | ห้ามเก็บรหัสผ่าน/password hash/LINE secret/token → mask เป็น `••••` · ไม่บันทึกการเปิดดู (read) · งานระบบเป็น `actor='system'` | BR-AUD-03 |
| FR-AUD-06 | `action`: create, update, delete, status_change, activate, deactivate, login_success, login_failed, logout, account_locked, password_change, password_reset, unlock, line_link, line_unlink, resend, export | BR-AUD-04 |
| FR-AUD-07 | หน้า `/admin/audit-log` (admin): ตาราง (เวลา, ผู้ใช้+role, การกระทำ, ข้อมูล [entity type + เลขเอกสาร/ชื่อ = ลิงก์], สรุป) + กรอง (ช่วงวัน default 7 วัน, ผู้ใช้, action, entity type) + ค้นหาเลขเอกสาร/ชื่อ | BR-AUD-05 |
| FR-AUD-08 | Detail: ตารางฟิลด์ที่เปลี่ยน (ชื่อ/ค่าเดิม/ค่าใหม่) + IP + user agent + request id | BR-AUD-05 |
| FR-AUD-09 | ส่งออก CSV ตาม filter ปัจจุบัน (ตัวการส่งออกถูกบันทึก `action='export'`) | BR-AUD-05 |

### 3.14 System Settings (FR-SET) ✅

**หน้าจอ**: `/admin/settings` (โค้ดปัจจุบันยัง `/settings` จากปุ่มเฟือง)

| ID | ความต้องการ | BR |
|---|---|---|
| FR-SET-01 | ค่า 6 ตัว + ช่วงตั้งได้: `wasteWarnPercent` (0-100, def 10) · `wasteDangerPercent` (0-100, def 15, ต้อง > warn) · `wasteMinDelivered` (0-100000, def 100) · `receiptVariancePercent` (0-100, def 10) · `expiryWarningDays` (0-60, def 7) · `lowYieldPercent` (0-100, def 95) | BR-SET-01 |
| FR-SET-02 | แต่ละค่า: การ์ดต่อกลุ่ม (ขาย/จัดซื้อ/คลัง/ผลิต) มี number field + หน่วย + hint · ปุ่ม "คืนค่าเริ่มต้น" ถ้าต่างจาก default · Save/ discard | BR-SET-01 |
| FR-SET-03 | **ใช้เตือนเท่านั้น ไม่บล็อก** ทุกค่า — กำหนดสีแถว/อันดับ/รายการในการ์ดความเสี่ยง | BR-SET-02 |
| FR-SET-04 | รายงานคิดใหม่ตามค่าปัจจุบันเสมอ (รวมช่วงย้อนหลัง) — ไม่มี effective date | BR-SET-03 |
| FR-SET-05 | Admin เท่านั้น (role=`admin`) — โค้ดปัจจุบันใช้ flag `isAdmin` ชั่วคราว · ผู้ใช้ที่ไม่ใช่ admin ไม่เห็นเมนู, เข้า URL ตรงเจอ "ไม่มีสิทธิ์" | BR-SET-04 |
| FR-SET-06 | Save บันทึก Audit Log ต่อค่าที่เปลี่ยนจริง (`entityType='SystemSetting'`, `changes=[{field:'value',from,to}]`) · ไม่มีการเปลี่ยน = ปุ่ม save disabled | BR-SET-03 |
| FR-SET-07 | ประวัติการแก้ค่า (when, value, from, to, by) = `GET /audit-logs?entityType=SystemSetting` | BR-SET-03 |
| FR-SET-08 | ค่าเป็นชุดเดียวทั้งระบบ (ยังไม่ตั้งทับรายหมวด/รายสินค้า) | BR-SET-04 |

### 3.15 Dashboard (FR-DASH) ✅

**หน้าจอ**: `/`

| ID | ความต้องการ | BR |
|---|---|---|
| FR-DASH-01 | ภาพรวม + การ์ดความเสี่ยง (risk cards): (1) รับของ variance เกิน `receiptVariancePercent` (2) LOT ใกล้หมดอายุใน `expiryWarningDays` (3) ใบสั่งผลิตที่ปิดแล้ว yield ต่ำกว่า `lowYieldPercent` | BR-KPI |
| FR-DASH-02 | การ์ด summary 4 ใบ (theme/accent/primary/warning) + กราฟยอดขาย + ตาราง property (ตัวอย่าง — mock) | — |
| FR-DASH-03 | แสดงเฉพาะ `admin`/`staff` (`driver`/`production` ไม่เห็น dashboard) | §2.1 |

---

## 4. ความต้องการเชิงอื่นที่ไม่ใช่ฟังก์ชัน (NFR)

| ID | หัวข้อ | ความต้องการ |
|---|---|---|
| NFR-01 | ภาษา | UI สองภาษา ไทย + อังกฤษ ทุกข้อความใหม่ (i18n th/en) |
| NFR-02 | Responsive | ทดสอบที่ 1920 / 1024 / 768 px · desktop ≥1280 เลย์เอาต์เต็ม · tablet คอลัมน์เดียว · มือถือสำหรับคนขับ (งานวันนี้ ออกแบบมือถือก่อน) |
| NFR-03 | Performance | paginate ทุกรายการ (default 10-25/หน้า) · debounce ค้นหา 300ms · virtual scroll ตาราง >1000 แถว · cache ข้อมูลหลักฝั่ง server (suppliers 5 นาที, routes 10 นาที, sales history 1 ชม., RM 1 วัน) |
| NFR-04 | ความปลอดภัย | ตรวจสิทธิ์ทุก API (ไม่ใช่แค่ซ่อนเมนู) · password ไม่เก็บตรง (`passwordHash`) · secret เข้ารหัส + แสดงปิดบัง · audit append-only · session ถูก revoke ทันทีเมื่อปิดบัญชี/เปลี่ยน role/รีเซ็ตรหัส |
| NFR-05 | ข้อมูล/Retention | แจ้งเตือน in-app 180 วัน · LINE delivery+attempt 1 ปี · audit 2 ปี · ไม่มีการลบผู้ใช้ |
| NFR-06 | Accessibility | focus ring ทุก control · modal trap focus + Esc · label ผูก input · aria บน popup (`aria-expanded`/`aria-haspopup`/`role=dialog`) · contrast AA |
| NFR-07 | ความยืดหยุ่น | ระบบ "เตือน" มากกว่า "บล็อก" — threshold ทุกตัวเป็น warn-only |
| NFR-08 | พิมพ์ | ใบวิ่งรถ/ใบส่งของ/ใบแจ้งหนี้ ต้องพิมพ์ A4 ได้ · ปุ่มพิมพ์ trigger `window.print()` + print stylesheet |
| NFR-09 | อ้างอิง UI | ใช้ shared components (`src/components/ui`) + design tokens ของ `DESIGN.md` — DataTable ตัวเดียวทั้งแอป, ห้าม hand-roll table, icon row actions, ConfirmDialog ทุก action ทำลายล้าง |

---

## 5. อินเทอร์เฟซภายนอก (External Interfaces)

| ID | อินเทอร์เฟซ | รายละเอียด |
|---|---|---|
| EI-01 | REST API | base URL จาก `VITE_API_URL` (default `http://localhost:3000/api`) · axios instance (`src/lib/http`) · JSON · ปัจจุบันถูกแทนด้วย mock adapter (`VITE_USE_MOCK=true`) |
| EI-02 | LINE Messaging API | push message ผ่าน OA (ไม่ใช้ LINE Notify — ปิดบริการแล้ว) · ตรวจลายเซ็น webhook `X-Line-Signature` · retry key `X-Line-Retry-Key` |
| EI-03 | LINE Login | authorize URL + `state` (CSRF) + `bot_prompt=aggressive` · ต้องอยู่ provider เดียวกับ Messaging API channel |
| EI-04 | Email/File import | จับอีเมลตาม `from_address` + อ่าน attachment (xlsx/csv/pdf) ตาม profile ของลูกค้า (header row, product/qty column, delivery date cell) |
| EI-05 | พิมพ์ | A4 print stylesheet สำหรับ run sheet / delivery sheet / invoice |
| EI-06 | Barcode | สแกน LOT (delivery load/return, consignment visit) + FG batch barcode |

---

## 6. ความต้องการข้อมูล (Data Requirements)

โครงสร้างตาราง/字段 เต็มอยู่ใน `ERD.md` — สรุป entity หลัก 12 กลุ่ม:
1. **Catalog**: `category`, `material_family`, `raw_material`, `finished_good`, `bom_version`, `bom_item`
2. **Procurement**: `supplier`, `supplier_route`, `supplier_raw_material`, `purchase_plan` (+`plan_line`/`plan_raw_material`/`plan_order_line`), `purchase_order` (+`_line`)
3. **Sales**: `customer` (+`customer_sku_map`), `email_import`, `customer_order` (+`_line`), `consignment_route`(+`_stop`), `consignment_estimate`(+`_line`), `consignment_visit`(+`_line`), `shop_stock`, `sales_report`(+`_line`), `invoice`(+`_line`)
4. **Production**: `production_line`(+`_product`), `production_order`(+`_rm`), `finished_goods_batch`
5. **Inventory**: `raw_material_inventory` (view/derived), `finished_goods_inventory` (view/derived)
6. **Logistics**: `vehicle`, `vehicle_route`(+`_stop`), `run_sheet`(+`_stop`+`_receipt_line`), `delivery_sheet`(+`_load_line`+`_stop`)
7. **Users/Auth**: `user`, `user_session`
8. **Notifications**: `notification`, `notification_recipient`, `notification_delivery`, `notification_delivery_attempt`, `line_channel_config`
9. **Audit**: `audit_log`
10. **Settings**: `system_setting`

**Lifecycle สำคัญของ quantities (RM inventory)** — ส่วนที่มัก implement ผิด:
```
สร้าง PO                    → on_order += ordered
บันทึกรับของ (FLOW 3b)       → on_hand += actual_received · on_order -= ordered
ยืนยันแผนผลิต (FLOW 5)      → allocated += allocated_qty · available -= allocated_qty
เริ่มผลิต (FLOW 6 step 1)    → on_hand -= allocated · allocated -= allocated
ปิดงาน (FLOW 6 step 3)      → ถ้า actual_used > allocated: on_hand -= ส่วนเกิน
                              → ถ้า actual_used < allocated: on_hand += ส่วนเหลือ
FLOW 7 (จด FG)              → แตะเฉพาะ FG inventory — ห้ามแตะ RM
```

---

## 7. กฎ validation และ edge cases สรุป

ดูรายการเต็มใน `PROCUREMENT_SYSTEM_DESIGN.md` §Validation Rules — สรุปที่มักพลาด:
1. ห้ามเลือก (supplier+route) ซ้ำใน RM เดียว · ≥1 supplier ต่อ RM
2. Run date ต้องตรงกับ route `run_days` · ≥1 stop ที่มี PO match
3. ห้ามบันทึกรับของย้อนหลังใบวันหน้า · actual ≥ 0 · ทุก line ต้องมี actual ก่อน confirm
4. `start-receipt` เฉพาะ `printed` · `save-stop-receipt` (บันทึกทีละจุดจอด + ตั้ง `checked_at`) เฉพาะ `in_progress` · **`record-receipt` (ยืนยัน) ทำได้เมื่อทุกจุดจอดที่ยังมี PO ถูกตรวจแล้ว (`checked_at` ไม่ว่าง)** — แก้จุดที่บันทึกแล้วต้องบันทึกซ้ำ
5. Delivery sheet `direct` รับเฉพาะ order confirmed ยังไม่ส่ง+ไม่อยู่ใบเปิดอื่น · `consignment_route` ห้ามมี customer_order stop
6. ยกเลิก delivery sheet เฉพาะยังไม่มี stop `done`
7. Estimate: 1 non-cancelled ต่อ (route, date) · delivery date ต้องตรง `days_of_week` ของสาย · editable จนกว่าใบส่งของ printed
8. `CustomerOrder` (`platform_name`,`platform_order_ref`) unique เมื่อตั้งค่า
9. BOM: active ได้ 1 ต่อ FG · แก้/ลบได้เฉพาะ draft
10. PO status: ordered→received (ตอนยืนยันรับของใน run sheet) · ordered→cancelled · แก้ได้จนกว่าจะ received
11. User: password ≥ 8 · 5 failed → lock 15 นาที · ห้าม self deactivate/role change · ≥1 active admin
12. Notification: `dedupe_key` unique · resend เฉพาะ `failed` · max 3 attempts

---

## 8. State Machines สรุป

```
PurchaseOrder:             ordered → received  |  ordered → cancelled   (ไม่มี draft/sent/confirmed)
                              └──────┴────────┴──→ cancelled

RunSheet:                  draft → printed → in_progress → completed
                            (ไม่มี cancelled ใน build ปัจจุบัน)

DeliverySheet:             draft → printed → completed
                              └──────┴────────→ cancelled
DeliverySheetStop:         pending → done | failed

CustomerOrder (แสดง stage): needs_review | draft(to_confirm) → confirmed(awaiting_production)
                             → in_production → ready → delivered | cancelled

ProductionOrder:           draft → confirmed → in_production → completed

ConsignmentEstimate:       draft → confirmed | cancelled
ConsignmentVisit:          draft → signed | cancelled
SalesReport:               pending → confirmed → invoiced
Invoice:                   issued → paid

NotificationDelivery:      pending → sending → sent
                             └─retry─┤ → failed
                             pending → skipped (line_disabled/not_linked/blocked/user_inactive)
```

---

## 9. แผนส่งมอบ (Delivery Phases) และ traceability

ดูตาราง Phase ใน `BRD.md` §9 — สรุป dependency:
- Phase 4 (Auth/Notifications/Audit) เป็น precondition ของ driver role จริง + หน้า `/my-jobs` ที่แสดงเฉพาะงานของตัวเอง
- Phase C (ผูก PO ↔ run sheet) เป็น precondition ของการ rollup สถานะ PO จากการรับของจริง
- Backend จริง (ย้ายจาก mock) ต้องมาก่อน/พร้อมกับ Phase C และการสแกน LOT

**Matrix traceability (ตัวอย่าง)**:
| BRD | SRS |
|---|---|
| BR-PROC-05 (1 PO ต่อซัพพลายเออร์ จุดรับอยู่ที่ line) | FR-PROC-13 |
| BR-LOG-R-02 (start receipt explicit) | FR-LOG-R-01 |
| BR-LOG-D-02 (2 แบบไม่ปน) | FR-LOG-D-03, FR-LOG-D-04, FR-LOG-D-05 |
| BR-PRD-06 (ผลิต+LOT+reserve) | FR-PRD-09, FR-PRD-10, FR-PRD-11 |
| BR-SET-01 (เกณฑ์เตือน 6 ตัว) | FR-SET-01 |
| BR-NTF-05 (outbox+retry) | FR-NTF-06, FR-NTF-09, FR-NTF-10 |
| BR-AUD-02 (audit in transaction) | FR-AUD-02 |

---

## 10. ภาคผนวก

### 10.1 คำถามค้าง (Open Questions) — ถอดจาก BRD §3.3
Q1 สกุลเงิน+ช่องทางรับเงินส่งออก · Q2 แพ็กกิ้ง/phitosanitary/AWB/เที่ยวรวม · Q3 GP คำนวณยังไงตอนวางบิลฝากขาย · Q4 จุดส่งตรงให้คนขับกดเองหรือ staff บันทึก · Q5 LOT สายฝากขายจอง/ใช้ร่วม

### 10.2 เอกสารอ้างอิง
`BRD.md` (business level) · `PROCUREMENT_SYSTEM_DESIGN.md` (entities/API/pseudo-code) · `PROCUREMENT_SYSTEM_SPEC.md` (flows/validation/screens) · `ERD.md` · `DFD.md` (process/state/sequence) · `DESIGN.md` (UI design system)
