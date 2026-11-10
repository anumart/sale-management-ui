# System diagrams - Bangkok Flower Sale Management

Process view of the system: Data Flow Diagrams (DFD, Gane-Sarson style mapped onto Mermaid) and UML state and sequence diagrams. Derived from `PROCUREMENT_SYSTEM_DESIGN.md` (user flows) and `src/features/*`. Data stores (`D1`…) are groups of tables from `ERD.md`.

Notation in the DFD diagrams: rectangle = external entity, rounded box = process, cylinder = data store, arrow = data flow (labelled with the data).

## 1. DFD level 0 - context diagram

Image: [docs/dfd/1-context.png](docs/dfd/1-context.png)

```mermaid
flowchart LR
    CUST[Direct / export customer]
    SHOP[Consignment shop]
    PLAT[Sales platform]
    SUP[Supplier]
    DRV[Driver]
    STAFF[Staff: sales, procurement, production, logistics]
    LINE[LINE / Email]

    SYS(("0<br/>Bangkok Flower<br/>Sale Management"))

    CUST -- "order (email, phone)" --> SYS
    PLAT -- "platform order" --> SYS
    SYS -- "delivery, invoice" --> CUST
    SHOP -- "sales report" --> SYS
    SYS -- "stock top-up delivery, invoice" --> SHOP
    SYS -- "purchase order" --> SUP
    SUP -- "price list, confirmation, goods" --> SYS
    SYS -- "run sheet, delivery sheet" --> DRV
    DRV -- "received quantities, proof of delivery, shop count" --> SYS
    STAFF -- "planning decisions, master data" --> SYS
    SYS -- "plans, alerts, reports" --> STAFF
    LINE -- "order emails" --> SYS
    SYS -- "notifications" --> LINE
```

## 2. DFD level 1 - main processes

Image: [docs/dfd/2-level1.png](docs/dfd/2-level1.png)

```mermaid
flowchart TB
    CUST[Customer / platform]
    SHOP[Consignment shop]
    SUP[Supplier]
    DRV[Driver]
    STAFF[Staff]

    P1(1 Order intake)
    P2(2 Purchase planning)
    P3(3 Purchase orders)
    P4(4 Pickup and receiving)
    P5(5 Production)
    P6(6 Delivery and consignment)
    P7(7 Billing)

    D1[(D1 Catalog: products, BOM, raw materials)]
    D2[(D2 Customers and orders)]
    D3[(D3 Purchase plans and POs)]
    D4[(D4 Suppliers and pickup points)]
    D5[(D5 Production orders and batches)]
    D6[(D6 Run sheets and delivery sheets)]
    D7[(D7 Consignment: visits, estimates, shop stock)]
    D8[(D8 Invoices and sales reports)]

    CUST -- "order" --> P1
    P1 -- "order, mapped lines" --> D2
    D1 -- "SKU mapping" --> P1

    STAFF -- "sources, quantities" --> P2
    D2 -- "confirmed orders" --> P2
    D1 -- "BOM, stock" --> P2
    D8 -- "sales history" --> P2
    P2 -- "plan, raw material needs" --> D3

    D3 -- "plan quotes" --> P3
    D4 -- "supplier offers, prices" --> P3
    SUP -- "price, confirmation" --> P3
    P3 -- "PO" --> SUP
    P3 -- "PO status" --> D3

    D3 -- "open POs" --> P4
    D4 -- "pickup points" --> P4
    P4 -- "run sheet" --> DRV
    DRV -- "received quantities" --> P4
    SUP -- "goods" --> P4
    P4 -- "stock in" --> D1
    P4 -- "run sheet status" --> D6

    D2 -- "orders to make" --> P5
    D7 -- "estimates" --> P5
    D1 -- "BOM, raw material stock" --> P5
    STAFF -- "approve, start, QC" --> P5
    P5 -- "production order, batch" --> D5
    P5 -- "raw material used" --> D1

    D5 -- "available batches" --> P6
    D2 -- "orders to deliver" --> P6
    D7 -- "route, estimate" --> P6
    P6 -- "delivery sheet" --> DRV
    DRV -- "delivery result, shop count" --> P6
    SHOP -- "stock count" --> P6
    P6 -- "visit, shop stock, sheet" --> D7
    P6 -- "sheet status" --> D6
    P6 -- "delivered goods" --> CUST

    SHOP -- "sales report" --> P7
    D2 -- "delivered orders" --> P7
    D7 -- "weekly sold" --> P7
    P7 -- "invoice" --> D8
    P7 -- "invoice" --> CUST
    P7 -- "invoice" --> SHOP
```

## 3. DFD level 2 - purchase planning (process 2)

Image: [docs/dfd/3-level2-planning.png](docs/dfd/3-level2-planning.png)

```mermaid
flowchart TB
    STAFF[Procurement staff]
    SUP[Supplier]

    P21(2.1 Pick demand from sources)
    P22(2.2 Review plan quantities)
    P23(2.3 Estimate raw materials)
    P24(2.4 Collect supplier quotes)
    P25(2.5 Create purchase orders)

    D1[(D1 Catalog and BOM)]
    D2[(D2 Customer orders)]
    D3[(D3 Plans and POs)]
    D4[(D4 Suppliers)]
    D8[(D8 Sales history)]

    STAFF -- "criteria, picks" --> P21
    D8 -- "sold per product (date, category, channel)" --> P21
    D2 -- "confirmed orders (channel, customer type, platform)" --> P21
    D1 -- "product list (manual pick)" --> P21
    P21 -- "demand lines with origin" --> P22
    STAFF -- "edit or remove quantity" --> P22
    P22 -- "planned quantities" --> P23
    D1 -- "BOM, on-hand stock" --> P23
    P23 -- "required and net required" --> D3
    D3 -- "net required per material" --> P24
    D4 -- "offers per material" --> P24
    P24 -- "call request" --> SUP
    SUP -- "confirmed quantity" --> P24
    P24 -- "ordered quantity per supplier" --> D3
    D3 -- "ordered quantities" --> P25
    P25 -- "PO per supplier" --> D3
    STAFF -- "manual PO (no plan)" --> P25
```

## 4. DFD level 2 - delivery and consignment (process 6)

Image: [docs/dfd/4-level2-delivery.png](docs/dfd/4-level2-delivery.png)

```mermaid
flowchart TB
    DRV[Driver]
    SHOP[Consignment shop]
    CUST[Direct customer]
    STAFF[Logistics staff]

    P61(6.1 Estimate shop top-up)
    P62(6.2 Build delivery sheet)
    P63(6.3 Deliver and count at shop)
    P64(6.4 Record returns)

    D2[(D2 Orders)]
    D5[(D5 Batches)]
    D6[(D6 Delivery sheets)]
    D7[(D7 Consignment)]

    D7 -- "route, shop stock, sold history" --> P61
    P61 -- "suggested quantity" --> STAFF
    STAFF -- "confirmed estimate" --> P61
    P61 -- "estimate" --> D7

    D7 -- "confirmed estimate" --> P62
    D2 -- "direct orders for the day" --> P62
    D5 -- "available batches" --> P62
    P62 -- "sheet, load lines, stops" --> D6
    P62 -- "sheet" --> DRV

    DRV -- "arrive" --> P63
    SHOP -- "stock count, spoiled, signature" --> P63
    P63 -- "visit, delivered lines" --> D7
    P63 -- "delivered goods" --> CUST
    P63 -- "order delivered" --> D2

    DRV -- "goods brought back" --> P64
    P64 -- "returned quantity" --> D6
    P64 -- "stock returned" --> D5
```

## 5. UML state machines

### 5.1 Purchase order

Image: [docs/dfd/5-state-po.png](docs/dfd/5-state-po.png) — ⚠ stale (shows the old draft → sent → confirmed lifecycle); regenerate from the diagram below.

```mermaid
stateDiagram-v2
    [*] --> ordered : from plan or manual (not sent to the supplier)
    ordered --> received : run sheet receipt confirmed
    ordered --> cancelled : cancel
    received --> [*]
    cancelled --> [*]
```

### 5.2 Customer order (stage shown in the UI)

Image: [docs/dfd/6-state-order.png](docs/dfd/6-state-order.png)

```mermaid
stateDiagram-v2
    [*] --> needs_review : email import has unmapped lines
    [*] --> to_confirm : draft
    needs_review --> to_confirm : map SKUs
    to_confirm --> awaiting_production : confirm
    awaiting_production --> in_production : production order started
    in_production --> ready : batch ready
    ready --> delivered : delivery done
    to_confirm --> cancelled : cancel
    awaiting_production --> cancelled : cancel
    delivered --> [*]
    cancelled --> [*]
```

### 5.3 Production order

Image: [docs/dfd/7-state-production.png](docs/dfd/7-state-production.png)

```mermaid
stateDiagram-v2
    [*] --> draft : create (RM allocated)
    draft --> confirmed : approve
    confirmed --> in_production : start (line in use)
    in_production --> completed : finish, QC, batch created
    completed --> [*]
```

### 5.4 Delivery sheet and run sheet

Image: [docs/dfd/8-state-sheets.png](docs/dfd/8-state-sheets.png)

```mermaid
stateDiagram-v2
    state "Delivery sheet" as DS {
        [*] --> ds_draft
        ds_draft --> ds_printed : print
        ds_draft --> ds_cancelled : cancel
        ds_printed --> ds_cancelled : cancel
        ds_printed --> ds_completed : all stops done, return recorded
    }
    state "Run sheet" as RS {
        [*] --> rs_draft
        rs_draft --> rs_printed : print
        rs_printed --> rs_in_progress : driver leaves
        rs_in_progress --> rs_completed : receipt recorded
    }
```

## 6. UML sequence - order to cash

Image: [docs/dfd/9-sequence.png](docs/dfd/9-sequence.png)

```mermaid
sequenceDiagram
    actor C as Customer
    participant S as Sales
    participant P as Procurement
    actor SUP as Supplier
    actor D as Driver
    participant M as Production
    participant L as Logistics
    participant B as Billing

    C->>S: order (email / phone / platform)
    S->>S: map SKUs, confirm order
    S->>P: order awaiting production
    P->>P: pick demand, estimate raw materials
    P->>SUP: call for quote
    SUP-->>P: confirmed quantity
    P->>SUP: purchase order
    SUP-->>P: confirms
    P->>L: open POs
    L->>D: run sheet
    D->>SUP: pick up goods
    D-->>L: received quantities
    L->>P: stock in, PO received
    S->>M: create production order
    M->>M: allocate RM, produce, QC, batch
    M-->>L: batch available
    L->>D: delivery sheet
    D->>C: deliver
    D-->>L: delivery result
    L->>S: order delivered
    S->>B: delivered order
    B-->>C: invoice
```
