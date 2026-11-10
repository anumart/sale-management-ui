# ERD - Bangkok Flower Sale Management

Entity-relationship diagram of the logical data model. Derived from `src/features/*/types.ts` and `PROCUREMENT_SYSTEM_DESIGN.md`. Arrays nested inside a record in the mock UI (lines, stops, items) are shown as child tables. Diagrams are Mermaid: they render on GitHub and in the VS Code Markdown preview.

Notation: `PK` primary key, `FK` foreign key, `UK` unique. Crow's-foot cardinality: `||` exactly one, `o|` zero or one, `|{` one or more, `o{` zero or more.

## Conventions

- Status columns are enums (values listed in the column comment).
- Money is `decimal`, quantities `decimal`, timestamps `timestamptz`, dates `date`.
- A raw material's current stock (`on_hand_quantity`) and the plan's stock snapshot are separate: the snapshot is frozen when the plan is created.
- Not modelled: the `Property` and `AppNotification` demo entities of the UI template, and derived views (`ConsignmentWeek`, `SalesHistory`, `RmShortage`), which are computed from the tables below.

## 1. Catalog (master data)

Image: [docs/erd/1-catalog.png](docs/erd/1-catalog.png)

```mermaid
erDiagram
    CATEGORY ||--o{ CATEGORY : "parent"
    CATEGORY ||--o{ MATERIAL_FAMILY : groups
    CATEGORY ||--o{ RAW_MATERIAL : classifies
    CATEGORY ||--o{ FINISHED_GOOD : classifies
    MATERIAL_FAMILY ||--o{ RAW_MATERIAL : "variants"
    FINISHED_GOOD ||--o{ BOM_VERSION : "recipe revisions"
    BOM_VERSION ||--|{ BOM_ITEM : contains
    RAW_MATERIAL ||--o{ BOM_ITEM : "used in"

    CATEGORY {
        string id PK
        string kind "raw_material | finished_good"
        string name
        int sort_order
        string parent_category_id FK "max 2 levels, same kind"
    }
    MATERIAL_FAMILY {
        string id PK
        string code UK
        string name_th
        string name_en
        string category_id FK
        string color
        boolean is_active
    }
    RAW_MATERIAL {
        string id PK
        string sku UK
        string family_id FK "optional"
        string name_th
        string name_en
        string customer_name
        string category_id FK
        string unit "base unit"
        string grade
        string size
        string color
        string description
        string barcode
        decimal reorder_point
        decimal standard_cost
        boolean is_sellable
        decimal sell_price
        decimal on_hand_quantity
        boolean is_active
    }
    FINISHED_GOOD {
        string id PK
        string sku UK
        string name
        string category_id FK
        string unit
        decimal standard_price
        string description
        string image_url
        boolean is_active
    }
    BOM_VERSION {
        string id PK
        string finished_good_id FK
        int version "unique per finished good"
        string status "draft | active | archived, one active per product"
        date effective_from
        string note
        timestamptz created_at
    }
    BOM_ITEM {
        string bom_version_id PK, FK
        string raw_material_id PK, FK
        decimal quantity_per_unit "RM base unit per 1 finished good"
    }
```

## 2. Procurement

Image: [docs/erd/2-procurement.png](docs/erd/2-procurement.png)

```mermaid
erDiagram
    SUPPLIER ||--o{ SUPPLIER_ROUTE : "pickup points"
    SUPPLIER ||--o{ SUPPLIER_RAW_MATERIAL : offers
    RAW_MATERIAL ||--o{ SUPPLIER_RAW_MATERIAL : "offered by"
    PURCHASE_PLAN ||--|{ PLAN_LINE : "products to make"
    FINISHED_GOOD ||--o{ PLAN_LINE : planned
    PURCHASE_PLAN ||--|{ PLAN_RAW_MATERIAL : "materials needed"
    RAW_MATERIAL ||--o{ PLAN_RAW_MATERIAL : required
    PURCHASE_PLAN ||--o{ PLAN_ORDER_LINE : "saved supplier orders"
    RAW_MATERIAL ||--o{ PLAN_ORDER_LINE : ordered
    SUPPLIER ||--o{ PLAN_ORDER_LINE : "ordered from"
    SUPPLIER_ROUTE ||--o{ PLAN_ORDER_LINE : "pickup point"
    SUPPLIER_ROUTE |o--o{ PURCHASE_ORDER : "collected at"
    PURCHASE_PLAN |o--o{ PURCHASE_ORDER : "generates (manual PO has none)"
    SUPPLIER ||--o{ PURCHASE_ORDER : receives
    PURCHASE_ORDER ||--|{ PURCHASE_ORDER_LINE : contains
    RAW_MATERIAL ||--o{ PURCHASE_ORDER_LINE : ordered
    CUSTOMER_ORDER }o--o| PURCHASE_PLAN : "planned in"

    SUPPLIER {
        string id PK
        string supplier_type "individual | company"
        string name "display name"
        string title "individual"
        string first_name "individual"
        string last_name "individual"
        string company_name "company"
        string branch_code "company, 00000 = head office"
        string tax_id "13 digits"
        string contact_person
        string phone
        string email
        string address
        boolean is_active
        timestamptz created_at
    }
    SUPPLIER_ROUTE {
        string id PK
        string supplier_id FK
        string route_code UK
        string route_name
        string address_line
        string subdistrict
        string district
        string province
        string postal_code
        decimal latitude
        decimal longitude
        string map_url
        string directions
        string contact_person
        string phone
        string operating_hours
        boolean is_active
        timestamptz created_at
    }
    SUPPLIER_RAW_MATERIAL {
        string supplier_id PK, FK
        string raw_material_id PK, FK
        string supplier_unit "e.g. bunch (25 stems)"
        decimal units_per_supplier_unit "RM base units in 1 supplier unit"
        decimal price_per_supplier_unit
    }
    PURCHASE_PLAN {
        string id PK
        string name
        string status "draft | ordered | archived"
        int source_month
        int source_year
        string created_by_user_id FK
        timestamptz created_at
    }
    PLAN_LINE {
        string plan_id PK, FK
        string finished_good_id PK, FK
        decimal base_quantity "sum of picks from the sources"
        decimal adjustment_pct "derived"
        decimal planned_quantity "editable"
    }
    PLAN_RAW_MATERIAL {
        string plan_id PK, FK
        string raw_material_id PK, FK
        decimal required_quantity "BOM x planned quantity"
        decimal on_hand_snapshot
        decimal net_required_quantity "max(required - snapshot, 0)"
    }
    PLAN_ORDER_LINE {
        string id PK
        string plan_id FK
        string raw_material_id FK
        string supplier_id FK
        string supplier_route_id FK "pickup point, must belong to the supplier"
        int quantity "supplier unit (e.g. bundle), whole number > 0; unique (plan, raw material, route)"
        decimal price_per_supplier_unit "defaults from supplier_raw_material, editable"
        date delivery_date "pickup date agreed on the call; one date per supplier in a plan, becomes the PO's pickup date"
        timestamptz saved_at
    }
    PURCHASE_ORDER {
        string id PK
        string po_number UK
        string plan_id FK "null = manual PO"
        string supplier_id FK
        string status "ordered | received | cancelled (never sent to the supplier)"
        decimal total_amount
        timestamptz expected_delivery_date "pickup date; run sheets collect POs due on or before the run date"
        timestamptz received_at "set when the last line is received (status becomes received)"
        timestamptz created_at
    }
    PURCHASE_ORDER_LINE {
        string id PK
        string purchase_order_id FK
        string raw_material_id FK
        string supplier_route_id FK "pickup point of this line; one PO can span several pickup points of the supplier"
        string run_sheet_id FK "null until a run sheet is generated for the line's pickup point"
        timestamptz received_at "set when the run sheet receipt covering this line is confirmed"
        decimal quantity "supplier unit; what was ordered, kept as is. 0 on a line added at receipt"
        decimal price_per_unit
        decimal total
        string received_raw_material_id FK "set at receipt; different from raw_material_id = substitute bought at the garden"
        decimal received_quantity "supplier unit; 0 = nothing received"
        decimal received_price_per_unit
        boolean added_at_receipt "line not on the PO, added by staff while checking the goods"
    }
```

A plan order line exists only for what was actually ordered: a raw material left at quantity 0 for a supplier has no row. Saving a supplier replaces all of that supplier's lines in the plan. Progress of a raw material is the sum of `quantity x supplier_raw_material.units_per_supplier_unit` over its lines (ordering more than `net_required_quantity` is allowed). `purchase_order` rows are generated by grouping the lines on `supplier_id` only — **one PO per supplier**; each `purchase_order_line` keeps its own `supplier_route_id` (pickup point).

A PO is created `ordered` and is **not sent** to the supplier (the date was agreed on the phone). The logistics run sheet collects the POs of its route that are due on or before the run date (`purchase_order_line.run_sheet_id`, per pickup point); a PO stays editable and cancellable until a run sheet receipt covering one of its lines is confirmed. Confirming sets `received_at` and fills the `received_*` fields on that sheet's lines, and the PO becomes `received` once all its lines are received (received quantity defaults to the ordered quantity).

Demand sources of a plan (`sales_history`, `customer_orders`, `finished_goods`) are not tables: each plan line keeps its quantity as the sum of picks, and orders pulled in are linked through `customer_order.purchase_plan_id`.

## 3. Sales

Image: [docs/erd/3-sales.png](docs/erd/3-sales.png)

```mermaid
erDiagram
    CUSTOMER ||--o{ CUSTOMER_SKU_MAP : "email import mapping"
    FINISHED_GOOD ||--o{ CUSTOMER_SKU_MAP : maps
    CUSTOMER |o--o{ EMAIL_IMPORT : sends
    EMAIL_IMPORT |o--o| CUSTOMER_ORDER : creates
    CUSTOMER ||--o{ CUSTOMER_ORDER : places
    CUSTOMER_ORDER ||--|{ CUSTOMER_ORDER_LINE : contains
    FINISHED_GOOD |o--o{ CUSTOMER_ORDER_LINE : ordered
    CUSTOMER_ORDER |o--o| INVOICE : "billed by"
    CUSTOMER ||--o{ SHOP_STOCK : "holds (consignment)"
    FINISHED_GOOD ||--o{ SHOP_STOCK : stocked
    FINISHED_GOODS_BATCH ||--o{ SHOP_STOCK : "from batch"
    CUSTOMER ||--o{ CONSIGNMENT_VISIT : visited
    CONSIGNMENT_VISIT ||--o{ CONSIGNMENT_VISIT_LINE : records
    FINISHED_GOOD ||--o{ CONSIGNMENT_VISIT_LINE : counted
    CUSTOMER ||--o{ SALES_REPORT : reports
    SALES_REPORT ||--|{ SALES_REPORT_LINE : contains
    FINISHED_GOOD ||--o{ SALES_REPORT_LINE : sold
    SALES_REPORT |o--o| INVOICE : "billed by"
    CUSTOMER ||--o{ INVOICE : billed
    INVOICE ||--|{ INVOICE_LINE : contains
    FINISHED_GOOD ||--o{ INVOICE_LINE : charged
    CONSIGNMENT_ROUTE ||--|{ CONSIGNMENT_ROUTE_STOP : stops
    CUSTOMER ||--o{ CONSIGNMENT_ROUTE_STOP : "visited on"
    CONSIGNMENT_ROUTE ||--o{ CONSIGNMENT_ESTIMATE : "per delivery date"
    CONSIGNMENT_ESTIMATE ||--|{ CONSIGNMENT_ESTIMATE_LINE : contains
    CUSTOMER ||--o{ CONSIGNMENT_ESTIMATE_LINE : "for shop"
    FINISHED_GOOD ||--o{ CONSIGNMENT_ESTIMATE_LINE : estimated

    CUSTOMER {
        string id PK
        string code UK
        string name
        string name_en
        string type "direct | consignment"
        string chain
        decimal gp_percent "consignment"
        string contact_person
        string phone
        string email
        string address
        string address_en
        string country "export customers"
        boolean is_active
        string import_sender_email "email import profile"
        string import_file_type "xlsx | csv | pdf"
        int import_header_row
        string import_product_column
        string import_quantity_column
        string import_delivery_date_cell
    }
    CUSTOMER_SKU_MAP {
        string customer_id PK, FK
        string customer_sku PK
        string finished_good_id FK
    }
    EMAIL_IMPORT {
        string id PK
        timestamptz received_at
        string from_address
        string subject
        string attachment_name
        string customer_id FK
        string status "parsed | needs_review | failed"
        string order_id FK
        string issues "list of parse issues"
    }
    CUSTOMER_ORDER {
        string id PK
        string order_number UK
        string customer_id FK
        string import_id FK
        timestamptz received_at
        date requested_delivery_date
        string channel "email | phone | platform | manual"
        string platform_name
        string platform_order_ref
        string status "draft | confirmed | delivered | cancelled"
        string purchase_plan_id FK
        string delivery_sheet_id FK
        string invoice_id FK
        timestamptz confirmed_at
        timestamptz delivered_at
    }
    CUSTOMER_ORDER_LINE {
        string id PK
        string order_id FK
        string customer_sku
        string finished_good_id FK "null until mapped"
        decimal quantity
    }
    SHOP_STOCK {
        string customer_id PK, FK
        string batch_number PK
        string finished_good_id FK
        string barcode
        decimal quantity
    }
    CONSIGNMENT_VISIT {
        string id PK
        string visit_number UK
        string customer_id FK
        date visit_date
        string driver_name
        string delivery_sheet_id FK
        string status "draft | signed | cancelled"
        string signed_by
        timestamptz signed_at
    }
    CONSIGNMENT_VISIT_LINE {
        string id PK
        string visit_id FK
        string kind "previous_balance | counted | spoiled | delivered"
        string finished_good_id FK
        string batch_number
        string barcode
        decimal quantity
    }
    SALES_REPORT {
        string id PK
        string report_number UK
        string customer_id FK
        timestamptz received_at
        date period_from
        date period_to
        string status "pending | confirmed | invoiced"
        string note
        string invoice_id FK
    }
    SALES_REPORT_LINE {
        string sales_report_id PK, FK
        string finished_good_id PK, FK
        decimal reported_quantity
        decimal confirmed_quantity
    }
    INVOICE {
        string id PK
        string invoice_number UK
        string customer_id FK
        string source "customer_order | sales_report"
        string source_id "polymorphic, no FK"
        timestamptz issued_at
        date due_date
        string status "issued | paid"
        timestamptz paid_at
    }
    INVOICE_LINE {
        string invoice_id PK, FK
        string finished_good_id PK, FK
        decimal quantity
        decimal unit_price
    }
    CONSIGNMENT_ROUTE {
        string id PK
        string code UK
        string name
        int_array days_of_week "1..7, Monday = 1"
        boolean is_active
    }
    CONSIGNMENT_ROUTE_STOP {
        string id PK
        string route_id FK
        int sequence
        string customer_id FK
    }
    CONSIGNMENT_ESTIMATE {
        string id PK
        string estimate_number UK
        date delivery_date
        string consignment_route_id FK
        string status "draft | confirmed | cancelled"
        timestamptz confirmed_at
    }
    CONSIGNMENT_ESTIMATE_LINE {
        string estimate_id PK, FK
        string customer_id PK, FK
        string finished_good_id PK, FK
        decimal suggested_quantity
        decimal estimated_quantity
    }
```

## 4. Production and finished goods

Image: [docs/erd/4-production.png](docs/erd/4-production.png)

```mermaid
erDiagram
    PRODUCTION_LINE ||--o{ PRODUCTION_LINE_PRODUCT : "can make"
    FINISHED_GOOD ||--o{ PRODUCTION_LINE_PRODUCT : "made on"
    PRODUCTION_LINE ||--o{ PRODUCTION_ORDER : runs
    FINISHED_GOOD ||--o{ PRODUCTION_ORDER : produces
    CUSTOMER_ORDER |o--o{ PRODUCTION_ORDER : "source"
    CONSIGNMENT_ROUTE |o--o{ PRODUCTION_ORDER : "source"
    CONSIGNMENT_ESTIMATE |o--o{ PRODUCTION_ORDER : "source"
    CUSTOMER |o--o{ PRODUCTION_ORDER : "for"
    PRODUCTION_ORDER ||--o{ PRODUCTION_ORDER_RM : "uses"
    RAW_MATERIAL ||--o{ PRODUCTION_ORDER_RM : consumed
    PRODUCTION_ORDER ||--o{ FINISHED_GOODS_BATCH : yields
    FINISHED_GOOD ||--o{ FINISHED_GOODS_BATCH : "batches of"
    CUSTOMER_ORDER |o--o{ FINISHED_GOODS_BATCH : "reserved for"

    PRODUCTION_LINE {
        string id PK
        string code UK
        string name
        decimal capacity_per_hour
        string status "available | in_use | maintenance"
    }
    PRODUCTION_LINE_PRODUCT {
        string production_line_id PK, FK
        string finished_good_id PK, FK
    }
    PRODUCTION_ORDER {
        string id PK
        string order_number UK
        string source "customer_order | consignment_route | manual"
        string customer_order_id FK
        string customer_id FK
        string consignment_route_id FK
        string consignment_estimate_id FK
        date delivery_date
        string finished_good_id FK
        decimal planned_quantity
        decimal actual_quantity
        string production_line_id FK
        string batch_number UK
        string status "draft | confirmed | in_production | completed"
        string qc_status "pending | passed | failed"
        decimal yield_rate
        int defects_found
        string operator_name
        timestamptz created_at
        timestamptz start_date
        timestamptz end_date
    }
    PRODUCTION_ORDER_RM {
        string production_order_id PK, FK
        string raw_material_id PK, FK
        string kind PK "allocated | actual"
        decimal quantity
    }
    FINISHED_GOODS_BATCH {
        string id PK
        string batch_number UK
        string finished_good_id FK
        string production_order_id FK
        decimal quantity
        decimal remaining_quantity
        string reserved_for_order_id FK
        decimal yield_rate
        date expiration_date
        string barcode UK
        string status "available | reserved | depleted | expired"
        timestamptz created_at
    }
```

Raw material stock for allocation is `raw_material.on_hand_quantity` minus the `allocated` rows of open production orders.

## 5. Logistics

Image: [docs/erd/5-logistics.png](docs/erd/5-logistics.png)

```mermaid
erDiagram
    VEHICLE_ROUTE ||--|{ VEHICLE_ROUTE_STOP : stops
    SUPPLIER_ROUTE ||--o{ VEHICLE_ROUTE_STOP : "pickup point"
    VEHICLE ||--o{ RUN_SHEET : drives
    VEHICLE_ROUTE ||--o{ RUN_SHEET : follows
    RUN_SHEET ||--|{ RUN_SHEET_STOP : stops
    SUPPLIER_ROUTE ||--o{ RUN_SHEET_STOP : "pickup point"
    RUN_SHEET_STOP ||--o{ RUN_SHEET_RECEIPT_LINE : receives
    PURCHASE_ORDER_LINE ||--o{ RUN_SHEET_RECEIPT_LINE : "picked up as"
    VEHICLE ||--o{ DELIVERY_SHEET : drives
    CONSIGNMENT_ROUTE |o--o{ DELIVERY_SHEET : follows
    CONSIGNMENT_ESTIMATE |o--o| DELIVERY_SHEET : "loads from"
    DELIVERY_SHEET ||--o{ DELIVERY_LOAD_LINE : loads
    FINISHED_GOOD ||--o{ DELIVERY_LOAD_LINE : loaded
    DELIVERY_SHEET ||--|{ DELIVERY_STOP : stops
    CUSTOMER ||--o{ DELIVERY_STOP : "delivered to"
    CUSTOMER_ORDER |o--o| DELIVERY_STOP : "direct delivery"
    CONSIGNMENT_VISIT |o--o| DELIVERY_STOP : "consignment visit"

    VEHICLE {
        string id PK
        string code UK
        string license_plate UK
        string vehicle_type
        string driver_name "optional"
        string driver_phone "optional"
        decimal capacity_kg
        boolean is_active
    }
    VEHICLE_ROUTE {
        string id PK
        string route_name
        string route_description
        string run_days "1..7 comma separated, Monday = 1"
        boolean is_active
    }
    VEHICLE_ROUTE_STOP {
        string id PK
        string vehicle_route_id FK
        int sequence
        string supplier_route_id FK
    }
    RUN_SHEET {
        string id PK
        string run_sheet_number UK
        string vehicle_id FK
        string vehicle_route_id FK
        date run_date
        string status "draft | printed | in_progress | completed"
        timestamptz created_at
        timestamptz printed_at
        timestamptz returned_at
        timestamptz completed_at
    }
    RUN_SHEET_STOP {
        string id PK
        string run_sheet_id FK
        int sequence
        string supplier_route_id FK
        string received_notes
        datetime checked_at "null until the stop is saved as checked"
    }
    RUN_SHEET_RECEIPT_LINE {
        string id PK
        string run_sheet_stop_id FK
        string purchase_order_line_id FK
        decimal actual_received_quantity "null until received"
    }
    DELIVERY_SHEET {
        string id PK
        string sheet_number UK
        string sheet_type "consignment_route | direct"
        date delivery_date
        string vehicle_id FK
        string driver_name
        string consignment_route_id FK
        string consignment_estimate_id FK
        string status "draft | printed | cancelled (completed is derived)"
        string cancel_reason
        timestamptz created_at
        timestamptz printed_at
        timestamptz cancelled_at
        timestamptz return_recorded_at
    }
    DELIVERY_LOAD_LINE {
        string delivery_sheet_id PK, FK
        string finished_good_id PK, FK
        decimal loaded_quantity
        decimal returned_quantity "null until return recorded"
    }
    DELIVERY_STOP {
        string id PK
        string delivery_sheet_id FK
        int sequence
        string customer_id FK
        string customer_order_id FK
        string visit_id FK
        string fail_reason
    }
```

The mock UI keeps pickup points (`PickupPoint`) and receipt lines in a separate dataset joined by a display-only PO number. In this model a pickup point is a `supplier_route` and a receipt line points at a `purchase_order_line`, which is the target design in the spec (Phase C).

## 6. Users and cross-cutting

Image: [docs/erd/6-users.png](docs/erd/6-users.png)

```mermaid
erDiagram
    APP_USER ||--o{ USER_SESSION : "signs in"
    APP_USER ||--o{ PURCHASE_PLAN : creates
    APP_USER |o--o{ AUDIT_LOG : acts

    APP_USER {
        string id PK
        string first_name
        string last_name
        string phone UK "login"
        string email "optional"
        string role "admin | driver | ..."
        string password_hash
        string status "active | inactive | locked"
        int failed_login_count
        timestamptz locked_until
        boolean must_change_password
        timestamptz last_login_at
        string line_user_id "optional"
        string line_display_name
        string line_picture_url
        timestamptz created_at
    }
    USER_SESSION {
        string id PK
        string user_id FK
        string refresh_token_hash UK
        timestamptz expires_at
        timestamptz revoked_at
        timestamptz created_at
    }
    AUDIT_LOG {
        string id PK
        timestamptz occurred_at
        string actor_user_id FK "optional"
        string actor_name "snapshot"
        string actor_role "snapshot"
        string action
        string entity_type
        string entity_id
        string entity_label
        string summary
        json changes "[{field,label,from,to}]"
        string ip_address
        string user_agent
        string request_id
    }
    SYSTEM_SETTING {
        string key PK
        string group
        decimal value
        decimal default_value
        string unit
        decimal min_value
        decimal max_value
    }
    LINE_SETTING {
        string id PK "single row"
        boolean enabled
        string messaging_channel_id
        string messaging_channel_secret "encrypted"
        string messaging_access_token "encrypted"
        string login_channel_id
        string login_channel_secret "encrypted"
        string basic_id
        string app_base_url
    }
```

`audit_log` references any entity by `entity_type` + `entity_id` (no FK), as described in the design document, and is append-only. The table is named `app_user` because `user` is a reserved word in PostgreSQL. `system_setting` and `line_setting` follow API.md sections 17 and 19. User-ownership columns (`created_by_name`, `signed_by`, `operator_name`, `driver_name`) are free text in the mock UI and would become `..._user_id` FKs to `app_user`; only `purchase_plan` is drawn that way above.
