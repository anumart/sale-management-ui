# API Specification — Bangkok Flower Sale Management

**เอกสาร**: API Spec v1.0
**วันที่**: 2026-10-30
**สถานะ**: **ร่างที่ยังไม่ผ่านการอนุมัติ** รวบรวมจาก `PROCUREMENT_SYSTEM_DESIGN.md` (§Backend Architecture) และ `PROCUREMENT_SYSTEM_SPEC.md` (§7) — ยังไม่มี backend จริง ทั้งหมดถูกตอบโดย mock adapter (`src/mocks/handlers.ts`) เมื่อ `VITE_USE_MOCK=true`
**สัญลักษณ์สถานะ**:
- ✅ mock handler มีแล้ว
- 📝 ออกแบบแล้วยังไม่มี handler (ยังไม่มี mock ไม่มี backend)
- ⏳ target design (backend เท่านั้น ยังไม่เริ่ม)
- (backend) = endpoint ที่ต้องทำเมื่อย้ายจาก mock → API จริง

---

## 0. ข้อมูลทั่วไป

### 0.1 Base
- **Base URL**: จาก `VITE_API_URL` **ไม่มี prefix `/api`** (ตัดสินแล้ว 2026-11-01) production = `https://api.ops.bangkokflower.com` เช่น `/suppliers`, `/auth/login` (ค่า default ใน UI `http://localhost:3000/api` ต้องตัด `/api` ออกตอนต่อ backend)
- **ชื่อ field และ query parameter**: `camelCase` ทั้งหมด (ตัดสินแล้ว 2026-10-31) ค่า enum ยังเป็น `snake_case` ตามชนิดข้อมูลใน UI (เช่น `raw_material`, `in_use`)
- **ขอบเขตการปรับ**: หัวข้อ 1, 2, 4, 5, 8.1, 9.2, 10, 15.1, 17, 18 ปรับเป็น camelCase และเทียบกับ UI types แล้ว (ดู `docs/master-reconciliation.md` ใน sale-management-api) หัวข้ออื่นยังเป็น `snake_case` เดิม ห้ามถือเป็น contract จนกว่าจะปรับ
- **HTTP client**: axios instance `src/lib/http` (ส่ง `Authorization: Bearer <accessToken>` ถ้ามี)
- **Content type**: `application/json` (ยกเว้น email import ที่เป็น multipart/file)
- **Mock mode**: requests ถูกตอบโดย Axios adapter ใน `src/mocks/` — ไม่ hit network

### 0.2 Authentication (เมื่อมี backend — 📝)
- `POST /auth/login` → คืน `accessToken` (JWT, short-lived) + `refreshToken`
- ทุก request แนบ `Authorization: Bearer <accessToken>`
- 401 = token หมดอายุ/ไม่ถูก → client เรียก `POST /auth/refresh` แล้ว retry

### 0.3 Convention การตอบกลับ
- **Success**: 200 (GET/PUT) · 201 (POST สร้างใหม่) · 204 (DELETE ไม่มี content)
- **Error**: `4xx` client error / `5xx` server error — body:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "ข้อความไทย", "details": [{ "field": "phone", "message": "เบอร์โทรนี้มีผู้ใช้แล้ว" }] } }
  ```
- **Pagination**: query `?page=&limit=` → response:
  ```json
  { "items": [...], "total": 120, "page": 1, "limit": 10 }
  ```
- **Validation error**: 400 + `details[]` ต่อฟิลด์ (frontend แสดงใต้ field ตาม pattern ของ `TextField error`)

### 0.4 Error code ที่ใช้ซ้ำ
| code | HTTP | ใช้เมื่อ |
|---|---|---|
| `VALIDATION_ERROR` | 400 | ข้อมูลไม่ผ่าน validation (ราย field) |
| `NOT_FOUND` | 404 | ไม่พบ entity |
| `CONFLICT` | 409 | ข้อมูลซ้ำ (unique constraint) / สถานะไม่อนุญาตให้เปลี่ยน |
| `FORBIDDEN` | 403 | ไม่มีสิทธิ์ (role ไม่พอ) |
| `UNAUTHORIZED` | 401 | ไม่ได้ login / token หมด |
| `RATE_LIMITED` | 429 | เกิน rate limit |
| `INTERNAL_ERROR` | 500 | ข้อผิดพลาดฝั่ง server |

---

## 1. Auth & Users (FR-AUTH) 📝

### 1.1 Auth
```
POST /auth/login
  Body: { phone: string, password: string }
  200: { accessToken, refreshToken, user: User, mustChangePassword: boolean }
  401: "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง"
  423: locked (lockedUntil) · 403: inactive

POST /auth/refresh
  Body: { refreshToken }
  200: { accessToken, refreshToken }

POST /auth/logout
  Revoke current session · 204

POST /auth/change-password
  Body: { currentPassword, newPassword }
  200: clears mustChangePassword · 400 รหัส < 8 ตัว
```

### 1.2 Me & LINE link
```
GET  /me
  200: User (ไม่มี passwordHash) + permissions[]

GET  /me/line/link-url
  200: { url }   // LINE Login authorize URL + state + botPrompt=aggressive

GET  /line/login/callback?code=&state=
  // LINE redirect; exchange code → เก็บ lineUserId/displayName/picture → redirect /profile

DELETE /me/line
  Unlink own LINE · 204
```

### 1.3 Users (admin only) 📝
```
GET    /users?q=&role=&status=active|inactive|locked&page=&limit=
  200: PaginatedList<User>

POST   /users
  Body: { firstName, lastName, phone, email?, role }
  201: { user, temporaryPassword }   // โชว์ครั้งเดียว
  409: "เบอร์โทรนี้มีผู้ใช้แล้ว"

PUT    /users/{id}
  Body: { firstName, lastName, phone, email?, role }
  200: User

POST   /users/{id}/reset-password   → { temporaryPassword } + revoke sessions
POST   /users/{id}/unlock
POST   /users/{id}/deactivate       → revoke sessions
POST   /users/{id}/activate
DELETE /users/{id}/line             → unlink user's LINE
```
Rules: ห้าม deactivate/change role ตัวเอง · ต้องเหลือ admin active ≥ 1 · ไม่มี DELETE user

---

## 2. Catalog — Master Data (FR-CAT) ✅📝

### 2.1 Categories
```
GET  /categories?kind=raw_material|finished_good
  200: Category[]   // แบบแบน { id, kind, name, sortOrder, parentCategoryId? } ตรงกับ UI (ไม่มี children)
  // ลำดับ 2 ระดับ: parentCategoryId ว่าง = กลุ่ม (level 1), มีค่า = กลุ่มย่อย (level 2)
```

### 2.2 Material Families
```
GET    /material-families?search=&categoryId=&isActive=&page=&limit=
POST   /material-families
  Body: { code, nameTh, nameEn?, categoryId, color?, isActive }
PUT    /material-families/{id}
DELETE /material-families/{id}
  409: ถ้ามี SKU อ้าง ("ครอบครัวนี้มี SKU แล้ว ปิดการใช้งานหรือย้าย SKU ออกก่อน")

GET    /raw-materials?familyId=    // list SKUs ของตระกูล
```

### 2.3 Raw Materials
```
GET    /raw-materials?search=&categoryId=&familyId=&isActive=&isSellable=&page=&limit=
GET    /raw-materials/{id}
GET    /raw-materials/{id}/suppliers          // SupplierRawMaterial[]
GET    /raw-materials/{id}/bill-of-material   // BOM ที่ใช้ RM นี้ (refs)
POST   /raw-materials
  Body: { sku, familyId?, nameTh, nameEn?, customerName?, categoryId, unit,
          grade?, size?, color?, description?, barcode?, reorderPoint?,
          standardCost?, isSellable, sellPrice?, isActive }
  409: duplicate sku
PUT    /raw-materials/{id}
DELETE /raw-materials/{id}
  409: ถูกอ้างโดย BOM/SupplierRawMaterial/ProductionOrder ("ปิดการใช้งานแทน")
```

### 2.4 Finished Goods
```
GET    /finished-goods?search=&categoryId=&isActive=&page=&limit=
GET    /finished-goods/{id}
POST   /finished-goods
  Body: { sku, name, categoryId, unit, standardPrice, description?, imageUrl?, isActive }
PUT    /finished-goods/{id}
DELETE /finished-goods/{id}
  409: มี production order/LOT/customer order อ้าง
```

### 2.5 BOM (versioned)
```
GET    /finished-goods/{id}/bom-versions           // list ทุก version
POST   /finished-goods/{id}/bom-versions
  Body: { effectiveFrom, note?, items: [{ rawMaterialId, quantityPerUnit }] }
  // สร้างเป็น status=draft เสมอ

PUT    /bom-versions/{id}
  // แก้ได้เฉพาะ draft · 409 ถ้าไม่ใช่ draft

DELETE /bom-versions/{id}
  // ลบได้เฉพาะ draft

POST   /bom-versions/{id}/activate
  // active ใหม่ → เวอร์ชัน active เดิมถูก archive อัตโนมัติ
  // 409 ถ้าไม่ใช่ draft
```

---

## 3. Procurement (FR-PROC) ✅📝

### 3.1 Purchase Plans (แผนจัดซื้อ)
```
GET    /purchase-plans?status=&source_month=&source_year=&page=&limit=
GET    /purchase-plans/{id}
  // + plan_lines[], plan_raw_materials[], order_lines[]  (saved supplier orders)

POST   /purchase-plans                    // สร้างจาก wizard หน้า 2
  Body: { name, source_month, source_year,
          lines: [{ finished_good_id, planned_quantity }],
          raw_materials: [{ raw_material_id, required_quantity, on_hand_snapshot }] }
  201: PurchasePlan

PUT    /purchase-plans/{id}
DELETE /purchase-plans/{id}

// ที่มาข้อมูล wizard หน้า 1
GET    /sales-history?month=&year=&category_id=      // ✅ (mock)
GET    /sales-history/summary?month=&year=           // totalSales, topProducts, trend
GET    /purchase-plans/demand?channel=&month=&year=  // คำสั่งซื้อ confirmed ตามเกณฑ์

// ประมาณวัตถุดิบ
GET    /purchase-plans/{id}/raw-materials?include_suppliers=true
  // per RM: required_qty, on_hand_snapshot, net_required, suppliers[] ( SupplierRawMaterial + routes)

// บันทึกการสั่งซื้อต่อซัพพลายเออร์ (หลังโทรหา 1 ครั้ง = บันทึก 1 ครั้ง)
GET    /purchase-plans/{id}/suppliers      // ซัพพลายเออร์ที่ขายวัตถุดิบในแผน + สรุปรายการที่บันทึกแล้ว
PUT    /purchase-plans/{id}/suppliers/{supplierId}/order-lines
  Body: { delivery_date, lines: [{ raw_material_id, supplier_route_id, quantity, price_per_supplier_unit }] }
  // แทนที่รายการทั้งหมดของซัพพลายเออร์รายนี้ในแผน: วัตถุดิบที่ไม่สั่ง (จำนวน 0) ไม่ต้องส่งมา = ไม่มีรายการ
  // delivery_date = วันรับของที่ตกลงกับซัพพลายเออร์ (บังคับเมื่อมี lines) ใช้กับทุก line ของซัพพลายเออร์นี้ → expected_delivery_date ของ PO
  // quantity = จำนวนเต็ม > 0 ในหน่วยซัพพลายเออร์ (เช่น มัด) · สั่งเกินยอดที่ต้องซื้อได้ (ไม่ error)
  200: { order_lines: [...] }
  400: ไม่มี supplier_route_id / จุดรับไม่ใช่ของซัพพลายเออร์นี้ / จุดรับไม่ active / quantity ไม่ใช่จำนวนเต็ม > 0
  409: (raw_material + supplier_route) ซ้ำ หรือแผนไม่ใช่ draft
```

### 3.2 Purchase Orders
```
GET    /purchase-orders?status=&supplier_id=&supplier_route_id=&plan_id=&page=&limit=
GET    /purchase-orders/{id}               // + lines[]
PUT    /purchase-orders/{id}
  Body: { expected_delivery_date, lines: [{ raw_material_id, quantity, price_per_unit }] }
  // แก้ได้เฉพาะ status=ordered — รวมถึงหลังพิมพ์ใบวิ่งรถแล้ว จนกว่าจะยืนยันรับของ · 409 ถ้า received/cancelled

POST   /purchase-orders/generate-from-template
  Body: { plan_id }
  201: { purchase_orders: [...], total_amount, message }
  // ระบบ group order_lines ที่บันทึกแล้วโดย supplier_id สร้าง **1 PO ต่อซัพพลายเออร์** (หลายจุดรับก็ยังเป็นใบเดียว) · แต่ละ line มี supplier_route_id (จุดรับ) · status='ordered' · expected_delivery_date = delivery_date ของ order line · ไม่มีการส่ง PO ให้ซัพพลายเออร์

// ไม่มี send-to-supplier / confirm-supplier — PO ไม่ถูกส่งให้ซัพพลายเออร์ (ตกลงทางโทรศัพท์แล้ว)
// ordered → received เกิดตอนยืนยันรับของใน run sheet เท่านั้น (POST /run-sheets/{id}/receipt เขียน received_* ลง PO lines)
POST   /purchase-orders/{id}/cancel                // ordered → cancelled (confirm dialog) · PO ที่อยู่ใน run sheet จะหลุดจากใบนั้น
  Body: { reason }
```

---

## 4. Suppliers & Supplier Routes ✅📝

### 4.1 Suppliers
```
GET    /suppliers?search=&supplierType=&isActive=&page=&limit=
GET    /suppliers/{id}                    // + routes[], rawMaterials[]
POST   /suppliers
  Body: { supplierType: individual|company,
          title?, firstName?, lastName?, companyName?, branchCode?,
          taxId?, contactPerson, phone, email?, address, isActive }
PUT    /suppliers/{id}
DELETE /suppliers/{id}

GET    /suppliers/{id}/raw-materials      // SupplierRawMaterial[]
POST   /suppliers/{id}/raw-materials
  Body: { rawMaterialId, supplierUnit, unitsPerSupplierUnit, pricePerSupplierUnit }
PUT    /suppliers/{id}/raw-materials/{rawMaterialId}
DELETE /suppliers/{id}/raw-materials/{rawMaterialId}
```

### 4.2 Supplier Routes (จุดรับ)
```
GET    /suppliers/{id}/routes
GET    /supplier-routes/{routeId}         // + rawMaterials (ถ้ามี)
POST   /supplier-routes
  Body: { supplierId, routeCode, routeName, addressLine, subdistrict,
          district, province, postalCode, latitude?, longitude?, mapUrl?,
          directions?, contactPerson, phone, operatingHours?, isActive }
PUT    /supplier-routes/{routeId}
DELETE /supplier-routes/{routeId}
```

---

## 5. Logistics — Vehicles & Vehicle Routes ✅

### 5.1 Vehicles
```
GET    /vehicles?search=&isActive=&page=&limit=
GET    /vehicles/{id}
POST   /vehicles
  Body: { code, licensePlate, vehicleType, capacityKg, driverName?, driverPhone?, isActive }
  // driverName/driverPhone ไม่บังคับ (UI Vehicle มีฟิลด์นี้)
  // UI ใช้ status: 'active'|'inactive' เดิม -> API ใช้ isActive (UI ต้องปรับตอนต่อ backend)
  409: duplicate code
PUT    /vehicles/{id}
  Body: เหมือน POST
DELETE /vehicles/{id}
```

### 5.2 Vehicle Routes (เส้นทางรถ ไม่ผูกกับรถ)
```
GET    /vehicle-routes?isActive=&runsOn=          // runsOn = วันในสัปดาห์ 1-7 (1=จันทร์ ... 7=อาทิตย์)
GET    /vehicle-routes/{routeId}
POST   /vehicle-routes
  Body: { routeName, routeDescription?, runDays: [1,2,3,4,5] }   // 1=จันทร์ ... 7=อาทิตย์ อย่างน้อย 1 วัน
PUT    /vehicle-routes/{routeId}

GET    /vehicle-routes/{routeId}/stops              // ordered by sequence
POST   /vehicle-routes/{routeId}/stops
  Body: { sequence, supplierRouteId }   // UI เรียกฟิลด์นี้ว่า pickupPointId (= supplierRouteId)
  409: sequence ซ้ำ / supplierRoute inactive
PUT    /vehicle-routes/{routeId}/stops/{stopId}
DELETE /vehicle-routes/{routeId}/stops/{stopId}
PUT    /vehicle-routes/{routeId}/stops/reorder
  Body: { stops: [{ id, sequence }] }
```

---

## 6. Logistics — Run Sheets (ขารับ) ✅📝 (Phase C ⏳)

### 6.1 Generate & list
```
POST   /vehicle-run-sheets/generate
  Body: { vehicle_id, vehicle_route_id, driver_user_id, run_date }
  201: { run_sheet: RunSheetWithStopsAndPOs }
  // ระบบ query PO status=ordered, วันรับของ ≤ run_date ที่มี line ยังไม่มี run_sheet_id และ line.supplier_route_id ตรงจุดใน route
  // validate: vehicle active, route active, run_date ตรง run_days, ≥1 stop มี PO
  400: "ไม่มีใบสั่งซื้อสำหรับเส้นทางนี้ในวันที่เลือก" / "วันนี้ไม่ใช่วันที่เส้นทางนี้วิ่ง"

GET    /vehicle-run-sheets?vehicle_id=&driver_user_id=&status=&run_date=&page=&limit=
GET    /vehicle-run-sheets/{id}           // + stops[] (each + purchase_orders[] + receipt_lines[])
PUT    /vehicle-run-sheets/{id}           // Draft: notes only
DELETE /vehicle-run-sheets/{id}
```

### 6.2 Print & receipt (FLOW 3a/3b)
```
POST   /vehicle-run-sheets/{id}/print
  // draft → printed (printed_at, printed_by)
  // 409 ถ้าไม่ใช่ draft
  200: { run_sheet }

POST   /vehicle-run-sheets/{id}/start-receipt
  // printed → in_progress (returned_at) — explicit เท่านั้น ห้าม auto
  // 409 ถ้าไม่ใช่ printed

POST   /vehicle-run-sheets/{id}/stops/{stop_id}/save-receipt
  Body: { received_notes?,
          receipt_lines: [{ receipt_line_id, received_raw_material_id, actual_received_quantity, received_price_per_unit }] }
  // เฉพาะ in_progress · ต้องกรอกครบทุกบรรทัดของจุดนี้ · ตั้ง stop.checked_at · ไม่เปลี่ยน status ของใบวิ่งรถ
  // ยืนยันใบวิ่งรถ (record-receipt) ได้เมื่อทุกจุดที่ยังมี PO มี checked_at (409 ถ้ายังเหลือจุดที่ยังไม่ตรวจ)
  200: { run_sheet }

POST   /vehicle-run-sheets/{id}/record-receipt
  Body: { completed_date,
          stops: [{ stop_id, received_notes?,
                   receipt_lines: [{ receipt_line_id, actual_received_quantity }] }] }
  // validate: ทุก line ต้องมี actual ≥ 0 · ห้ามใบวันหน้า · ทุก stop มี ≥1 line
  200: { run_sheet, total_ordered, total_received, variance, variance_pct,
         updated_purchase_orders }        // ⏳ Phase C ค่อยมี updated POs
  409: "รันชีตไม่พบหรือไม่อยู่ในสถานะ printed/in_progress"
```

---

## 7. Logistics — Delivery Sheets (ขาส่ง) ✅📝

### 7.1 List & candidates
```
GET    /delivery-sheets?delivery_date=&vehicle_id=&driver_user_id=&status=&sheet_type=&page=&limit=

GET    /delivery-sheets/candidates?delivery_date=&sheet_type=consignment_route|direct
  // direct → { customer_orders: confirmed, ยังไม่ส่ง, ไม่อยู่ในใบเปิดอื่น }
  // consignment_route → { routes: active routes running วันนั้น + estimate (ถ้ามี) }
```

### 7.2 CRUD & workflow
```
POST   /delivery-sheets
  Body: { sheet_type, delivery_date, vehicle_id, driver_user_id,
          consignment_route_id?,   // consignment_route
          customer_order_ids?,     // direct
          stops: [{ sequence, customer_id | customer_order_id }],
          load_lines?: [{ finished_good_id, loaded_quantity, loaded_batch_numbers? }] }
  // route sheet: stops default จากรoute + load_lines จาก estimate + สร้าง ConsignmentVisit ทุกจุด
  201: DeliverySheet
  409: คำสั่งซื้ออยู่ในใบเปิดอื่น / ร้านซ้ำในใบนี้

GET    /delivery-sheets/{id}
PUT    /delivery-sheets/{id}
  // Draft: vehicle, driver, stops, load_lines (order = array order)
  // Printed: driver_user_id เท่านั้น
  409: พิมพ์แล้วแก้จุดส่งไม่ได้

POST   /delivery-sheets/{id}/print
  // draft → printed · สร้าง notification deliverysheet.ready
  // 409 ถ้าไม่ใช่ draft

POST   /delivery-sheets/{id}/return
  Body: { lines: [{ load_line_id, returned_quantity, returned_batch_numbers }] }
  // consignment_route: บันทึกของคืน → FG stock · sheet completes เมื่อ stops resolved
  // 409 ถ้าไม่ใช่ consignment_route

POST   /delivery-sheets/{id}/stops/{stopId}/complete
  // pending → done (consignment_visit stop: ต้องมี visit signed)
  // 409 ถ้า stop ไม่ใช่ pending

POST   /delivery-sheets/{id}/stops/{stopId}/fail
  Body: { reason }
  // pending → failed · คืนคำสั่งซื้อเป็นรอส่ง + ยกเลิก unsigned visit

POST   /delivery-sheets/{id}/cancel
  Body: { reason }
  // เฉพาะยังไม่มี stop done · คืนคำสั่งซื้อ + ยกเลิก unsigned visit
  // 409: "ยกเลิกไม่ได้ เพราะมีจุดที่ส่งสำเร็จแล้ว"
```

### 7.3 Day load & driver jobs
```
GET    /logistics/day-load?delivery_date=&vehicle_id=&driver_user_id=
  // ใบวิ่งรถ/ใบส่งของอื่นของรถ/คนขับคนเดียวกันในวันนั้น (info ไม่บล็อก)

GET    /me/jobs?delivery_date=            // driver only
  200: { run_sheets: [...], delivery_sheets: [...] }   // own, status∈{printed,completed}, เรียง printedAt, ไม่มีราคา
```

---

## 8. Sales — Consignment Routes & Estimates ✅📝

### 8.1 Consignment Routes (สายฝากขาย)
```
GET    /consignment-routes?isActive=&runsOn=&page=&limit=
GET    /consignment-routes/{id}           // + stops[] ordered
POST   /consignment-routes
  Body: { code, name, daysOfWeek: [1,2,3,4,5,6,7], stops: [{ customerId }] }   // ลำดับใน array = sequence, 1=จันทร์ ... 7=อาทิตย์
  409: duplicate code / ร้านซ้ำในสายนี้ / daysOfWeek ว่าง
PUT    /consignment-routes/{id}
  // ใช้แล้ว → deactivate แทน delete
```

### 8.2 Consignment Estimates (ยอดประเมินลงร้าน)
```
GET    /consignment-estimates?delivery_date=&consignment_route_id=&status=&page=&limit=

GET    /consignment-estimates/suggest?delivery_date=&consignment_route_id=
  200: { lines: [{ customer_id, finished_good_id,
                   suggested_quantity,
                   basis: { recent_sales, left_in_shop, last_spoiled } }],
         other_routes_same_day: [{ customer_id, route_code }] }   // เตือน ไม่บล็อก

GET    /consignment-estimates/{id}        // + lines[]
POST   /consignment-estimates
  Body: { delivery_date, consignment_route_id,
          lines: [{ customer_id, finished_good_id, estimated_quantity }] }
  409: "สาย {routeCode} มียอดประเมินวันที่ {date} แล้ว" (unique route+date non-cancelled)
  400: "สาย {routeCode} ไม่วิ่งวัน{dayName}" (delivery_date ไม่ตรง days_of_week)

PUT    /consignment-estimates/{id}
  // แก้ได้จนกว่าใบส่งของของสายนั้นจะ printed
  // 409: "แก้ไม่ได้ ใบส่งของของสายนี้พิมพ์แล้ว"

POST   /consignment-estimates/{id}/confirm
POST   /consignment-estimates/{id}/cancel
```

### 8.3 Production demand & order creation (คู่กับ production)
```
GET    /production/demand?delivery_date=
  200: { routes: [{ consignment_route, estimate, products: [{ finished_good_id, estimated_total, production_orders: [...] }] }],
         orders: [{ customer_order, channel, lines, production_orders: [...] }] }

POST   /production-orders/from-estimate/{estimateId}
  Body: { lines: [{ finished_good_id, planned_quantity, production_line_id }] }
  // 1 production order ต่อ 1 product
```

---

## 9. Sales — Customer Orders & Email Import ✅📝

### 9.1 Customer Orders (คำสั่งซื้อ)
```
GET    /customer-orders?status=&channel=&customer_id=&requested_delivery_date=&page=&limit=
GET    /customer-orders/{id}              // + lines[]
POST   /customer-orders
  Body: { customer_id, channel: email|phone|platform|manual,
          platform_name?, platform_order_ref?,
          requested_delivery_date, received_at?,
          lines: [{ customer_sku, finished_good_id?, quantity }] }
  // channel=email → draft (รอคัดกรอง) · อื่น → confirmed ทันที
  409: duplicate (platform_name, platform_order_ref)
PUT    /customer-orders/{id}
POST   /customer-orders/{id}/confirm      // draft → confirmed
POST   /customer-orders/{id}/deliver      // confirmed → delivered (ตอนส่งสำเร็จ)
POST   /customer-orders/{id}/cancel       // → cancelled (ยังไม่ delivered)
```

### 9.2 SKU mapping (customer รหัสสินค้า → FG)
```
GET    /customers/{id}/sku-maps
POST   /customers/{id}/sku-maps
  Body: { customerSku, finishedGoodId }
PUT    /customers/{id}/sku-maps/{customerSku}
DELETE /customers/{id}/sku-maps/{customerSku}
```

### 9.3 Email Import (นำเข้าจากอีเมล/ไฟล์)
```
GET    /email-imports?status=&customer_id=&page=&limit=
GET    /email-imports/{id}
POST   /email-imports/upload              // multipart: file, customer_id?
  Body: multipart/form-data { file, customer_id? }
  201: EmailImport (status=parsed|needs_review|failed + issues[] + order_id)

POST   /email-imports/{id}/create-order
  // needs_review → map SKU ก่อน → สร้าง CustomerOrder (status=draft)
  Body: { lines: [{ line_index, finished_good_id }] }   // แก้ mapping
```

---

## 10. Sales — Customers ✅📝

```
GET    /customers?search=&type=direct|consignment&country=&isActive=&page=&limit=
GET    /customers/{id}
POST   /customers
  Body: { code, name, nameEn?, type, chain?, gpPercent?, contactPerson, phone,
          email?, address, addressEn?, country?, isActive,
          importProfile?: { senderEmail, fileType: xlsx|csv|pdf, headerRow,
                            productColumn, quantityColumn, deliveryDateCell } }
  // importProfile เฉพาะ type=direct (ตรงกับ UI Customer.importProfile) ใน DB เก็บเป็นคอลัมน์แบน import_*
  // skuMap ไม่ส่งใน body นี้ ใช้ /customers/{id}/sku-maps (หัวข้อ 9.2) GET /customers/{id} คืน importProfile.skuMap รวมให้
PUT    /customers/{id}
DELETE /customers/{id}
```

---

## 11. Sales — Consignment Visits (ใบเข้าร้าน) ✅📝

```
GET    /consignment-visits?visit_date=&customer_id=&status=&delivery_sheet_id=&page=&limit=
GET    /consignment-visits/{id}           // + lines[]
POST   /consignment-visits
  // โดยปกติสร้างจาก delivery sheet (auto) — create manual ได้แต่ควรใช้จาก sheet
  Body: { customer_id, visit_date, driver_user_id, delivery_sheet_id? }

POST   /consignment-visits/{id}/sign
  Body: { signed_by }
  // draft → signed · บันทึก lines (previous_balance/counted/spoiled/delivered) ที่สแกน

POST   /consignment-visits/{id}/cancel    // → cancelled (ส่งไม่ได้/ใบส่งของยกเลิก)

// lines ถูกส่งตอน sign:
// Body: { signed_by, lines: [{ kind: previous_balance|counted|spoiled|delivered,
//                              finished_good_id, batch_number?, barcode?, quantity }] }
```

---

## 12. Sales — Sales Reports (ยอดขายจากร้าน) ✅📝

```
GET    /sales-reports?customer_id=&status=&period_from=&period_to=&page=&limit=
GET    /sales-reports/{id}                // + lines[]
POST   /sales-reports
  Body: { customer_id, period_from, period_to, note?,
          lines: [{ finished_good_id, reported_quantity }] }
PUT    /sales-reports/{id}
POST   /sales-reports/{id}/confirm        // pending → confirmed (confirmed_quantity ยืนยัน)
POST   /sales-reports/{id}/invoice        // confirmed → invoiced (สร้าง Invoice)
```

---

## 13. Sales — Invoices (ใบแจ้งหนี้) ✅📝

```
GET    /invoices?customer_id=&source=&status=&issued_from=&issued_to=&page=&limit=
GET    /invoices/{id}                     // + lines[]
POST   /invoices
  Body: { customer_id, source: customer_order|sales_report, source_id,
          issued_at, due_date, lines: [{ finished_good_id, quantity, unit_price }] }
PUT    /invoices/{id}
POST   /invoices/{id}/record-payment
  Body: { paid_at }
  // issued → paid
```

---

## 14. Sales — Consignment Performance (สรุปผลฝากขาย) ✅

```
GET    /sales/performance?period_from=&period_to=&consignment_route_id=
  200: { routes: [{ route, delivered, sold, spoiled, waste_pct, rank }],
         settings_applied: { waste_warn_percent, waste_danger_percent, waste_min_delivered } }
```

---

## 15. Production (FR-PRD) ✅⏳ (AI planning ⏳)

### 15.1 Production Lines (ไลน์ผลิต)
```
GET    /production-lines?status=&page=&limit=
POST   /production-lines
  Body: { code, name, capacityPerHour, compatibleFinishedGoodIds: [id] }
PUT    /production-lines/{id}
POST   /production-lines/{id}/maintenance
  // → status=maintenance · notification productionLine.maintenance
POST   /production-lines/{id}/end-maintenance
  // → status=available
```

### 15.2 Production Orders (ใบสั่งผลิต)
```
GET    /production-orders?status=&production_line_id=&delivery_date=&source=&page=&limit=
GET    /production-orders/{id}            // + rm_allocations[]
POST   /production-orders
  Body: { source: consignment_route|customer_order|manual,
          consignment_route_id?, consignment_estimate_id?, customer_order_id?,
          delivery_date, finished_good_id, planned_quantity,
          production_line_id, batch_number }
  // 1 ใบ = 1 สินค้า = 1 LOT · status=draft
POST   /production-orders/{id}/confirm
  // draft → confirmed · allocate RM (allocated += , available -=) · notification production_order.confirmed
  409: allocation เกิน quantity_available

POST   /production-orders/{id}/start
  Body: { operator_user_id }
  // confirmed → in_production · issue RM (on_hand -= allocated, allocated -= allocated)
  409: ถ้าไม่ใช่ confirmed

POST   /production-orders/{id}/qc-check
  Body: { result: passed|failed, notes? }
  // in_production · qc_status

POST   /production-orders/{id}/complete
  Body: { actual_quantity, actual_rm_used_quantity, defects_found }
  // in_production → completed · yield_rate = actual/planned · reconcile RM (deduct/credit ส่วนต่าง)
  // 409: ถ้าไม่ใช่ in_production · 400: actual_quantity < 0

POST   /production-orders/{id}/register-finished-goods
  // completed → สร้าง FinishedGoodsBatch (barcode unique, expiry, no grade) + FG on_hand +=
  // ไม่แตะ RM inventory
  200: { batch, inventory_updated: true }
  409: ถ้าไม่ใช่ completed
```

### 15.3 AI Production Planning (FLOW 4-5) ⏳ (target)
```
POST   /production-planning/run
  Body: { triggered_by: manual|scheduled|event, run_sheet_id? }
  // trigger เฉพาะหลัง run sheet completed (รับของจริงแล้ว)
  200: { products_to_make: [{ finished_good_id, planned_quantity, production_line_id, rm_allocations }],
         products_deferred: [{ finished_good_id, reason, bottleneck_raw_material_id }],
         warnings: string[] }

POST   /production-plans/{id}/approve
  Body: { approved_line_ids: [line_id] }
  // สร้าง ProductionOrder per line + allocate RM
```

---

## 16. Inventory (FR-INV) 📝⏳

```
GET    /inventory/raw-materials?status=&page=&limit=
GET    /inventory/raw-materials/{id}
  200: { on_hand, allocated, available, on_order, details: movements[] }

POST   /inventory/raw-materials/{id}/allocate
  Body: { quantity, production_order_id }
  200: { available_after }

GET    /inventory/finished-goods?status=&page=&limit=
GET    /inventory/finished-goods/{id}/batches
  200: FinishedGoodsBatch[]
GET    /inventory/finished-goods/{id}/availability
  200: { on_hand, reserved, available, expiring_batches: [...] }

GET    /production/raw-materials          // หน้าสต็อกวัตถุดิบ (แท็บถัดจาก FG) — 📝
  200: { items: [{ raw_material, on_hand, reserved, available }], movements: [...] }
```

---

## 17. System Settings (FR-SET) ✅

```
GET    /settings
  200: SystemSetting[]                    // key, group, value, defaultValue, unit, min, max

PUT    /settings                          // admin only
  Body: { values: { [key]: number } }
  // validate ranges + wasteDangerPercent > wasteWarnPercent
  // บันทึก AuditLog ต่อค่าที่เปลี่ยนจริง ( entityType=SystemSetting )
  200: SystemSetting[]
  400: ค่าเกินช่วง / cross-rule ผิด

// LINE OA settings (admin only) 📝
GET    /settings/line                     // secrets คืนแบบ masked เท่านั้น
PUT    /settings/line
  Body: { enabled, messagingChannelId, messagingChannelSecret?,   // empty = keep current
          messagingAccessToken?, loginChannelId, loginChannelSecret?,
          basicId, appBaseUrl }
POST   /settings/line/test                // push test ไปหา LINE ของ admin ที่กด (ต้อง linked แล้ว)
```

---

## 18. Audit Log (FR-AUD) 📝

```
GET    /audit-logs?from=&to=&actorUserId=&action=&entityType=&entityId=&q=&page=&limit=
  200: { items: AuditLog[] (ไม่มี changes), total }

GET    /audit-logs/{id}
  200: AuditLog (มี changes[])

GET    /audit-logs/export?...             // same filters → CSV · ตัวการ export ถูกบันทึก action=export
```

---

## 19. Notifications (FR-NTF) 📝

### 19.1 In-app (ทุก user — inbox ตัวเอง)
```
GET    /notifications?unread=true&page=&limit=20
  200: { items: [{ recipient_id, read_at,
                   notification: { event_type, title, body, link_path, created_at } }],
         total, unread_count }

GET    /notifications/unread-count
  200: { unread_count }

POST   /notifications/{recipientId}/read
POST   /notifications/read-all
```

### 19.2 LINE deliveries (admin only)
```
GET    /line-deliveries?status=&event_type=&user_id=&from=&to=&page=&limit=
GET    /line-deliveries/summary?from=&to=
  200: { sent, failed, skipped, pending }

GET    /line-deliveries/{id}              // + notification + recipient user + attempts[]
POST   /line-deliveries/{id}/resend
  // เฉพาะ failed → สร้าง NotificationDelivery ใหม่ (retry_key ใหม่)
```

### 19.3 LINE webhook (เรียกโดย LINE)
```
POST   /line/webhook                     // ตรวจ X-Line-Signature
  // follow → line_status=linked · unfollow → blocked
```

---

## 20. ภาคผนวก

### 20.1 สรุป endpoint ต่อโมดูล (นับ)
| กลุ่ม | endpoint | mock ✅ | 📝 | ⏳ |
|---|---|---|---|---|
| Auth & Users | 16 | 0 | 16 | 0 |
| Catalog (cat/family/rm/fg/bom) | 24 | 18 | 6 | 0 |
| Procurement (plan/po) | 16 | 12 | 2 | 2 |
| Suppliers (+routes) | 14 | 10 | 4 | 0 |
| Vehicles & vehicle routes | 13 | 13 | 0 | 0 |
| Run sheets | 10 | 8 | 0 | 2 |
| Delivery sheets | 13 | 10 | 3 | 0 |
| Consignment routes & estimates | 10 | 8 | 2 | 0 |
| Customer orders & import | 14 | 10 | 4 | 0 |
| Customers | 5 | 5 | 0 | 0 |
| Consignment visits | 5 | 4 | 1 | 0 |
| Sales reports | 5 | 4 | 1 | 0 |
| Invoices | 5 | 4 | 1 | 0 |
| Consignment performance | 1 | 1 | 0 | 0 |
| Production | 14 | 10 | 0 | 4 |
| Inventory | 7 | 0 | 4 | 3 |
| Settings | 5 | 2 | 3 | 0 |
| Audit log | 3 | 0 | 3 | 0 |
| Notifications | 9 | 0 | 9 | 0 |
| **รวม** | **~193** | **~119** | **~59** | **~13** |

(ตัวเลขโดยประมาณ — ใช้เป็น backlog ตอนย้าย mock → backend)

### 20.2 ความสัมพันธ์ endpoint ↔ FR
แต่ละกลุ่มข้างบนผูกกับ `FR-XXX-NN` ใน `SRS.md` — ดู section ที่เกี่ยวข้อง:
- §1 → FR-AUTH · §2 → FR-CAT · §3-4 → FR-PROC · §5-7 → FR-LOG-P/R/D + FR-DRV
- §8-14 → FR-SAL + FR-BILL · §15-16 → FR-PRD + FR-INV
- §17 → FR-SET · §18 → FR-AUD · §19 → FR-NTF

### 20.3 สิ่งที่ยังขาด/ควรเพิ่มเมื่อมี backend จริง
- **Rate limiting** — ยังไม่กำหนด (ควรเพิ่มที่ auth + import)
- **Idempotency key** สำหรับ POST ที่มี side effect (generate PO, generate run sheet, print)
- **Optimistic concurrency** — ETag / version field สำหรับ PUT ที่แก้พร้อมกันได้ (estimate, plan)
- **File upload limit/type** สำหรับ email import (size, MIME)
- **Webhook retry policy ของ LINE** — ระบุ timeout + retry ที่ client (ฝั่ง server ดู FR-NTF-09/10)
