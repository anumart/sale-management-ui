import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconUsers } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, StatusPill, type DataTableColumn, type PillTone } from '@/components/ui'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { rawMaterialById, suppliersFor } from './mockData'
import { useProcurementStore } from './store'
import { SupplierOrderModal } from './SupplierOrderModal'
import type { PlanRawMaterial, PlanStatus, PurchaseOrder, RawMaterial } from './types'
import { monthName, roundQty, thaiYear } from './utils'

const statusTone: Record<PlanStatus, PillTone> = { draft: 'gray', ordered: 'success', archived: 'neutral' }
const statusLabel: Record<PlanStatus, string> = { draft: 'ร่าง', ordered: 'สั่งซื้อแล้ว', archived: 'เก็บถาวร' }

interface RawMaterialRow {
  rm: PlanRawMaterial
  material: RawMaterial | undefined
  ordered: number
  progress: number
}

export interface PlanDetailPageProps {
  planId: string
}

export function PlanDetailPage({ planId }: PlanDetailPageProps) {
  const navigate = useNavigate()
  const plan = useProcurementStore((s) => s.plans.find((p) => p.id === planId))
  const createPurchaseOrders = useProcurementStore((s) => s.createPurchaseOrders)
  const [activeRawMaterialId, setActiveRawMaterialId] = useState<string | null>(null)

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

  const orderedBaseQty = (rawMaterialId: string) => {
    const rm = plan.rawMaterials.find((r) => r.rawMaterialId === rawMaterialId)
    if (!rm) return 0
    return rm.suppliers.reduce((sum, s) => {
      if (!s.orderedQuantity) return sum
      const offer = suppliersFor(rawMaterialId).find((o) => o.supplierId === s.supplierId)
      return sum + s.orderedQuantity * (offer?.unitsPerSupplierUnit ?? 1)
    }, 0)
  }

  const handleCreatePurchaseOrders = async () => {
    const bySupplier = new Map<string, { rawMaterialId: string; quantity: number; pricePerUnit: number }[]>()
    for (const rm of plan.rawMaterials) {
      for (const line of rm.suppliers) {
        if (!line.orderedQuantity) continue
        const offer = suppliersFor(rm.rawMaterialId).find((o) => o.supplierId === line.supplierId)
        if (!offer) continue
        const list = bySupplier.get(line.supplierId) ?? []
        list.push({ rawMaterialId: rm.rawMaterialId, quantity: line.orderedQuantity, pricePerUnit: offer.pricePerSupplierUnit })
        bySupplier.set(line.supplierId, list)
      }
    }

    if (bySupplier.size === 0) {
      toast.error('กรอกจำนวนสั่งซื้ออย่างน้อย 1 รายการก่อนสร้างใบสั่งซื้อ')
      return
    }

    const ok = await confirm({
      title: 'สร้างใบสั่งซื้อ?',
      message: `ระบบจะสร้างใบสั่งซื้อ ${bySupplier.size} ใบ และล็อกแผนนี้ไม่ให้แก้ไขอีก`,
      confirmLabel: 'สร้างใบสั่งซื้อ',
      tone: 'primary',
    })
    if (!ok) return

    const orders: PurchaseOrder[] = [...bySupplier.entries()].map(([supplierId, lines], i) => ({
      id: `po-${Date.now()}-${i}`,
      poNumber: `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}${i}`,
      planId: plan.id,
      supplierId,
      status: 'draft',
      totalAmount: lines.reduce((sum, l) => sum + l.quantity * l.pricePerUnit, 0),
      expectedDeliveryDate: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
      lines: lines.map((l) => ({ rawMaterialId: l.rawMaterialId, quantity: l.quantity, pricePerUnit: l.pricePerUnit, total: l.quantity * l.pricePerUnit })),
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

  return (
    <>
      <PageHeading section="จัดซื้อ" parent={{ label: 'แผนจัดซื้อ', to: '/procurement/plans' }} title={plan.name} subtitle={`${monthName(plan.sourceMonth)} ${thaiYear(plan.sourceYear)} · สร้างโดย ${plan.createdByName}`} />

      <Card className="mb-6">
        <CardHeader
          title="วัตถุดิบ"
          subtitle="ยอดที่ต้องใช้เทียบกับยอดที่ต้องซื้อสุทธิ (หักสต็อกคงคลังแล้ว) กดปุ่มท้ายแถวเพื่อจัดการซัพพลายเออร์"
          action={<StatusPill tone={statusTone[plan.status]}>{statusLabel[plan.status]}</StatusPill>}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.rm.rawMaterialId}
          emptyTitle="ไม่มีวัตถุดิบในแผนนี้"
          renderActions={(r) => (
            <Button
              size="sm"
              variant="soft"
              iconOnly
              outlined
              aria-label="จัดการซัพพลายเออร์"
              tooltip="จัดการซัพพลายเออร์"
              onClick={() => setActiveRawMaterialId(r.rm.rawMaterialId)}
            >
              <IconUsers />
            </Button>
          )}
        />
      </Card>

      {plan.status === 'draft' && (
        <div className="flex justify-end">
          <Button onClick={handleCreatePurchaseOrders}>สร้างใบสั่งซื้อ</Button>
        </div>
      )}

      <SupplierOrderModal
        open={activeRawMaterialId !== null}
        onClose={() => setActiveRawMaterialId(null)}
        planId={plan.id}
        rawMaterialId={activeRawMaterialId}
      />
    </>
  )
}
