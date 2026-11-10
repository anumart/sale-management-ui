import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye, IconPhone } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, StatusPill, type DataTableColumn, type PillTone } from '@/components/ui'
import { formatCurrency } from '@/lib/format'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { rawMaterialById, supplierRawMaterials } from './mockData'
import { useProcurementStore } from './store'
import { SupplierOrderModal } from './SupplierOrderModal'
import type { PlanOrderLine, PlanRawMaterial, PlanStatus, PurchaseOrder, RawMaterial } from './types'
import { monthName, roundQty, thaiYear, toBaseQty } from './utils'

const statusTone: Record<PlanStatus, PillTone> = { draft: 'gray', ordered: 'success', archived: 'neutral' }
const statusLabel: Record<PlanStatus, string> = { draft: 'ร่าง', ordered: 'สั่งซื้อแล้ว', archived: 'เก็บถาวร' }

interface RawMaterialRow {
  rm: PlanRawMaterial
  material: RawMaterial | undefined
  ordered: number
  progress: number
}

interface SupplierRow {
  supplierId: string
  name: string
  phone: string
  materialCount: number
  orderedCount: number
  total: number
}

export interface PlanDetailPageProps {
  planId: string
}

export function PlanDetailPage({ planId }: PlanDetailPageProps) {
  const navigate = useNavigate()
  const plan = useProcurementStore((s) => s.plans.find((p) => p.id === planId))
  const suppliers = useProcurementStore((s) => s.suppliers)
  const createPurchaseOrders = useProcurementStore((s) => s.createPurchaseOrders)
  // `session` changes on every open so the modal restarts from what is saved; it stays mounted while it animates closed
  const [modal, setModal] = useState<{ supplierId: string; session: number; open: boolean } | null>(null)

  if (!plan) {
    return (
      <>
        <PageHeading section="จัดซื้อ" parent={{ label: 'แผนจัดซื้อ', to: '/procurement/plans' }} title="แผนจัดซื้อ" />
        <Card>
          <p className="text-muted">ไม่พบแผนจัดซื้อ</p>
        </Card>
      </>
    )
  }

  const locked = plan.status !== 'draft'
  const unitsPer = (line: PlanOrderLine) => supplierRawMaterials.find((o) => o.supplierId === line.supplierId && o.rawMaterialId === line.rawMaterialId)?.unitsPerSupplierUnit ?? 1
  const orderedBaseQty = (rawMaterialId: string) =>
    plan.orderLines.filter((l) => l.rawMaterialId === rawMaterialId).reduce((sum, l) => sum + toBaseQty(l.quantity, unitsPer(l)), 0)

  const handleCreatePurchaseOrders = async () => {
    // One PO per supplier — a supplier with several pickup points still gets a single PO; each line carries its pickup point
    const groups = new Map<string, PlanOrderLine[]>()
    for (const line of plan.orderLines) {
      groups.set(line.supplierId, [...(groups.get(line.supplierId) ?? []), line])
    }

    if (groups.size === 0) {
      toast.error('บันทึกรายการสั่งซื้อจากซัพพลายเออร์อย่างน้อย 1 รายการก่อนสร้างใบสั่งซื้อ')
      return
    }

    const ok = await confirm({
      title: 'สร้างใบสั่งซื้อ?',
      message: `ระบบจะสร้างใบสั่งซื้อ ${groups.size} ใบ (ใบละ 1 ซัพพลายเออร์ ระบุจุดรับที่แต่ละรายการ) ไม่มีการส่งให้ซัพพลายเออร์ ใบสั่งซื้อจะไปอยู่ในใบวิ่งรถตามวันรับของ และล็อกแผนนี้ไม่ให้แก้ไขอีก`,
      confirmLabel: 'สร้างใบสั่งซื้อ',
      tone: 'primary',
    })
    if (!ok) return

    const orders: PurchaseOrder[] = [...groups.values()].map((lines, i) => ({
      id: `po-${Date.now()}-${i}`,
      poNumber: `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}${i}`,
      planId: plan.id,
      supplierId: lines[0].supplierId,
      status: 'ordered',
      totalAmount: lines.reduce((sum, l) => sum + l.quantity * l.pricePerSupplierUnit, 0),
      // The pickup date is agreed per supplier on one call, so every line of the PO shares it
      expectedDeliveryDate: new Date(`${lines[0].deliveryDate}T00:00`).toISOString(),
      createdAt: new Date().toISOString(),
      lines: lines.map((l) => ({ rawMaterialId: l.rawMaterialId, supplierRouteId: l.supplierRouteId, quantity: l.quantity, pricePerUnit: l.pricePerSupplierUnit, total: l.quantity * l.pricePerSupplierUnit })),
    }))

    createPurchaseOrders(plan.id, orders)
    toast.success(`สร้างใบสั่งซื้อ ${orders.length} ใบแล้ว`)
    navigate({ to: '/procurement/purchase-orders' })
  }

  const rows: RawMaterialRow[] = plan.rawMaterials.map((rm) => {
    const material = rawMaterialById(rm.rawMaterialId)
    const ordered = orderedBaseQty(rm.rawMaterialId)
    const progress = rm.netRequiredQuantity > 0 ? Math.min(100, Math.round((ordered / rm.netRequiredQuantity) * 100)) : 100
    return { rm, material, ordered, progress }
  })

  // Every supplier that sells at least one material of the plan (inactive ones only when they already have saved lines)
  const planMaterialIds = new Set(plan.rawMaterials.map((rm) => rm.rawMaterialId))
  const supplierIds = [...new Set(supplierRawMaterials.filter((o) => planMaterialIds.has(o.rawMaterialId)).map((o) => o.supplierId))]
  const supplierRows: SupplierRow[] = supplierIds.flatMap((supplierId) => {
    const supplier = suppliers.find((s) => s.id === supplierId)
    const lines = plan.orderLines.filter((l) => l.supplierId === supplierId)
    if (!supplier || (!supplier.isActive && lines.length === 0)) return []
    return [
      {
        supplierId,
        name: supplier.name,
        phone: supplier.phone,
        materialCount: supplierRawMaterials.filter((o) => o.supplierId === supplierId && planMaterialIds.has(o.rawMaterialId)).length,
        orderedCount: lines.length,
        total: lines.reduce((sum, l) => sum + l.quantity * l.pricePerSupplierUnit, 0),
      },
    ]
  })

  const columns: DataTableColumn<RawMaterialRow>[] = [
    { key: 'name', label: 'วัตถุดิบ', sortValue: (r) => (r.material?.nameTh ?? '').toLowerCase(), render: (r) => <span className="font-medium">{r.material?.nameTh}</span> },
    {
      key: 'required',
      label: 'ต้องใช้',
      sortValue: (r) => r.rm.requiredQuantity,
      render: (r) => (
        <span className="tabular-nums">
          {roundQty(r.rm.requiredQuantity)} {r.material?.unit}
        </span>
      ),
    },
    {
      key: 'netRequired',
      label: 'ต้องซื้อสุทธิ',
      sortValue: (r) => r.rm.netRequiredQuantity,
      render: (r) => (
        <span className="tabular-nums">
          {roundQty(r.rm.netRequiredQuantity)} {r.material?.unit}
        </span>
      ),
    },
    {
      key: 'ordered',
      label: 'สั่งแล้ว',
      sortValue: (r) => r.ordered,
      render: (r) => (
        <span className="tabular-nums">
          {roundQty(r.ordered)} {r.material?.unit}
        </span>
      ),
    },
    {
      key: 'progress',
      label: 'ความคืบหน้า',
      sortValue: (r) => r.progress,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-fill">
            <div className={r.progress >= 100 ? 'h-full grad-success' : 'h-full grad-primary'} style={{ width: `${r.progress}%` }} />
          </div>
          <span className="text-sm text-muted">{r.progress}%</span>
        </div>
      ),
    },
  ]

  const supplierColumns: DataTableColumn<SupplierRow>[] = [
    {
      key: 'name',
      label: 'ซัพพลายเออร์',
      sortValue: (r) => r.name.toLowerCase(),
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-sm text-muted">{r.phone}</p>
        </div>
      ),
    },
    { key: 'materials', label: 'วัตถุดิบในแผนที่ขาย', sortValue: (r) => r.materialCount, render: (r) => <span className="tabular-nums">{r.materialCount} รายการ</span> },
    {
      key: 'ordered',
      label: 'สั่งแล้ว',
      sortValue: (r) => r.orderedCount,
      render: (r) => (r.orderedCount > 0 ? <StatusPill tone="success">{r.orderedCount} รายการ</StatusPill> : <span className="text-muted">ยังไม่สั่ง</span>),
    },
    { key: 'total', label: 'ยอดรวม', sortValue: (r) => r.total, render: (r) => <span className="tabular-nums">{formatCurrency(r.total)}</span> },
  ]

  return (
    <>
      <PageHeading section="จัดซื้อ" parent={{ label: 'แผนจัดซื้อ', to: '/procurement/plans' }} title={plan.name} subtitle={`${monthName(plan.sourceMonth)} ${thaiYear(plan.sourceYear)} · สร้างโดย ${plan.createdByName}`} />

      <Card className="mb-6">
        <CardHeader
          title="วัตถุดิบ"
          subtitle="ยอดที่ต้องใช้เทียบกับยอดที่ต้องซื้อสุทธิ (หักสต็อกคงคลังแล้ว) และความคืบหน้าการสั่งซื้อ"
          action={<StatusPill tone={statusTone[plan.status]}>{statusLabel[plan.status]}</StatusPill>}
        />

        <DataTable columns={columns} rows={rows} rowKey={(r) => r.rm.rawMaterialId} emptyTitle="ไม่มีวัตถุดิบในแผนนี้" />
      </Card>

      <Card className="mb-6">
        <CardHeader title="ซัพพลายเออร์" subtitle="โทรหาซัพพลายเออร์แล้วบันทึกว่าจะสั่งอะไร จากจุดรับไหน กี่หน่วย (กรอกเฉพาะวัตถุดิบที่สั่งรายนี้)" />

        <DataTable
          columns={supplierColumns}
          rows={supplierRows}
          rowKey={(r) => r.supplierId}
          emptyTitle="ไม่มีซัพพลายเออร์ที่ขายวัตถุดิบในแผนนี้"
          renderActions={(r) => (
            <Button
              size="sm"
              variant={locked ? 'soft' : 'accent'}
              iconOnly
              outlined
              aria-label={locked ? 'ดูรายการสั่งซื้อ' : 'บันทึกการสั่งซื้อ'}
              tooltip={locked ? 'ดูรายการสั่งซื้อ' : 'บันทึกการสั่งซื้อ'}
              onClick={() => setModal({ supplierId: r.supplierId, session: (modal?.session ?? 0) + 1, open: true })}
            >
              {locked ? <IconEye /> : <IconPhone />}
            </Button>
          )}
        />
      </Card>

      {plan.status === 'draft' && (
        <div className="flex justify-end">
          <Button onClick={handleCreatePurchaseOrders}>สร้างใบสั่งซื้อ</Button>
        </div>
      )}

      {modal && (
        <SupplierOrderModal
          key={modal.session}
          open={modal.open}
          onClose={() => setModal((m) => (m ? { ...m, open: false } : m))}
          planId={plan.id}
          supplierId={modal.supplierId}
        />
      )}
    </>
  )
}
