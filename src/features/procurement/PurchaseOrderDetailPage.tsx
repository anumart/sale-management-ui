import { useState, type ComponentType, type ReactNode } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import {
  IconBox,
  IconCalendar,
  IconCheck,
  IconClock,
  IconClose,
  IconEdit,
  IconFactory,
  IconMapPin,
  IconPhone,
  IconReceipt,
  IconTruck,
  type IconProps,
} from '@/components/icons'
import { Button, Card, CardHeader, StageTracker, StatusPill } from '@/components/ui'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { useLogisticsStore } from '@/features/logistics/store'
import { EditPurchaseOrderModal } from './EditPurchaseOrderModal'
import { rawMaterialById, supplierRawMaterials } from './mockData'
import { planById, supplierById, useProcurementStore } from './store'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { isPoEditable, poRunSheetIds, poStatusLabel, poStatusTone } from './utils'
import type { PoStatus } from './types'

export interface PurchaseOrderDetailPageProps {
  poId: string
}

const stages: { key: PoStatus; label: string; icon: ComponentType<IconProps> }[] = [
  { key: 'ordered', label: 'สั่งแล้ว รอรับ', icon: IconTruck },
  { key: 'received', label: 'รับของแล้ว', icon: IconCheck },
]

/** Ordered → Received, with the current stage pulsing. Not shown when cancelled. */
function PoStepper({ status }: { status: PoStatus }) {
  const currentIndex = stages.findIndex((s) => s.key === status)
  return (
    <Card className="mb-6">
      <StageTracker stages={stages} current={currentIndex} />
    </Card>
  )
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-[0.85rem] bg-fill text-dark [&>svg]:size-[1.15rem]">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-base font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  )
}

export function PurchaseOrderDetailPage({ poId }: PurchaseOrderDetailPageProps) {
  const po = useProcurementStore((s) => s.purchaseOrders.find((p) => p.id === poId))
  const updatePurchaseOrderStatus = useProcurementStore((s) => s.updatePurchaseOrderStatus)
  const allRunSheets = useLogisticsStore((s) => s.runSheets)
  const supplierRoutes = useProcurementStore((s) => s.supplierRoutes)
  const [editing, setEditing] = useState(false)

  if (!po) {
    return (
      <>
        <PageHeading section="จัดซื้อ" parent={{ label: 'ใบสั่งซื้อ', to: '/procurement/purchase-orders' }} title="ใบสั่งซื้อ" />
        <Card>
          <p className="text-muted">ไม่พบใบสั่งซื้อ</p>
        </Card>
      </>
    )
  }

  const supplier = supplierById(po.supplierId)
  const plan = planById(po.planId)
  const sheets = poRunSheetIds(po).flatMap((id) => allRunSheets.find((rs) => rs.id === id) ?? [])
  // Pickup points this PO is collected from (one per distinct route on its lines)
  const routes = [...new Set(po.lines.map((l) => l.supplierRouteId))].flatMap((id) => supplierRoutes.find((r) => r.id === id) ?? [])
  const routeName = (id: string) => supplierRoutes.find((r) => r.id === id)?.routeName ?? '—'
  const supplierName = supplier?.name ?? 'ซัพพลายเออร์'
  const isCancelled = po.status === 'cancelled'

  const handleCancel = async () => {
    const ok = await confirm({
      title: 'ยกเลิกใบสั่งซื้อ?',
      message: `${po.poNumber} ของ ${supplierName} (${formatCurrency(po.totalAmount)}) จะถูกยกเลิก ไม่สามารถย้อนกลับได้`,
      confirmLabel: 'ยกเลิกใบสั่งซื้อ',
      tone: 'danger',
    })
    if (!ok) return
    if (updatePurchaseOrderStatus(po.id, 'cancelled')) toast.success(`ยกเลิก ${po.poNumber} แล้ว`)
  }

  const canChange = isPoEditable(po)
  const receiving = sheets.some((s) => s.status === 'in_progress')
  const isReceived = po.lines.some((l) => l.receivedAt)

  return (
    <>
      <PageHeading section="จัดซื้อ" parent={{ label: 'ใบสั่งซื้อ', to: '/procurement/purchase-orders' }} title={po.poNumber} subtitle={`สร้างเมื่อ ${formatDateTime(po.createdAt)}`} />

      {isCancelled ? (
        <Card className="mb-6 border-danger/25 bg-danger-bg/70">
          <div className="flex items-center gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-danger/10 text-danger-fg [&>svg]:size-5">
              <IconClose />
            </span>
            <div>
              <p className="font-semibold text-ink">ใบสั่งซื้อนี้ถูกยกเลิกแล้ว</p>
              <p className="text-sm text-muted">ไม่สามารถดำเนินการใดๆ กับ {po.poNumber} ได้อีก</p>
            </div>
          </div>
        </Card>
      ) : (
        <PoStepper status={po.status} />
      )}

      <div className="mb-6 grid overflow-hidden rounded-card glass shadow-card lg:grid-cols-[1.1fr_1.4fr]">
        <div className="flex flex-col gap-5 border-b border-line p-6 lg:border-r lg:border-b-0 xl:p-7">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-[1.1rem] bg-primary-soft text-primary-fg [&>svg]:size-6">
              <IconFactory />
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{supplierName}</p>
              <p className="truncate text-sm text-muted">{plan?.name ?? 'ไม่ได้ผูกกับแผน'}</p>
            </div>
          </div>
          {(routes.length > 0 || supplier?.address) && (
            <div className="space-y-1.5">
              {(routes.length > 0 ? routes.map((r) => `${r.routeName} · ${r.address}`) : [supplier?.address ?? '']).map((text) => (
                <div key={text} className="flex items-start gap-2 text-control [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:translate-y-0.5 [&>svg]:text-muted">
                  <IconMapPin />
                  <span className="text-muted">{text}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-dashed border-line pt-4">
            <div className="min-w-0">
              <p className="text-xs text-muted">ผู้ติดต่อ</p>
              <p className="truncate text-control font-medium">{supplier?.contactPerson ?? '—'}</p>
            </div>
            {supplier?.phone && (
              <a
                href={`tel:${supplier.phone}`}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-soft-hover [&>svg]:size-3.5"
              >
                <IconPhone />
                {supplier.phone}
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5 p-6 xl:p-7">
          <Stat icon={<IconReceipt />} label="ยอดรวม" value={formatCurrency(po.totalAmount)} />
          <Stat icon={<IconCalendar />} label="วันรับของ" value={formatDateTime(po.expectedDeliveryDate)} />
          <Stat icon={<IconTruck />} label="ใบวิ่งรถ" value={sheets.length > 0 ? sheets.map((s) => s.runSheetNumber).join(', ') : 'ยังไม่จัดรถ'} />
          <Stat icon={<IconBox />} label="รายการ" value={`วัตถุดิบ ${po.lines.length} รายการ`} />
          {po.receivedAt && <Stat icon={<IconClock />} label="รับของเมื่อ" value={formatDateTime(po.receivedAt)} />}
        </div>
      </div>

      <Card className={canChange ? 'mb-6' : ''}>
        <CardHeader title="รายการสั่งซื้อ" action={<StatusPill tone={poStatusTone[po.status]}>{poStatusLabel[po.status]}</StatusPill>} />
        <div className="overflow-x-auto">
          <table className="w-full border-separate text-base [border-spacing:0_0.5rem]">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-2 pr-3 pl-3.5 font-light">วัตถุดิบ</th>
                <th className="py-2 pr-3 font-light">จุดรับ</th>
                <th className="py-2 pr-3 font-light">จำนวน</th>
                <th className="py-2 pr-3 font-light">ราคา / หน่วย</th>
                <th className={`py-2 font-light ${isReceived ? 'pr-3' : 'pr-3.5'}`}>รวม</th>
                {isReceived && <th className="py-2 pr-3.5 font-light">รับจริง</th>}
              </tr>
            </thead>
            <tbody>
              {po.lines.map((line, index) => {
                const material = rawMaterialById(line.rawMaterialId)
                const unit = supplierRawMaterials.find((o) => o.supplierId === po.supplierId && o.rawMaterialId === line.rawMaterialId)?.supplierUnit ?? material?.unit
                const receivedMaterial = rawMaterialById(line.receivedRawMaterialId ?? line.rawMaterialId)
                const receivedUnit = supplierRawMaterials.find((o) => o.supplierId === po.supplierId && o.rawMaterialId === (line.receivedRawMaterialId ?? line.rawMaterialId))?.supplierUnit ?? receivedMaterial?.unit
                return (
                  <tr key={`${line.rawMaterialId}-${index}`}>
                    <td className="rounded-l-[0.875rem] border-y border-l border-line py-3 pr-3 pl-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-fg [&>svg]:size-4">
                          <IconBox />
                        </span>
                        <span className="font-medium">{material?.nameTh ?? '—'}</span>
                        {line.addedAtReceipt && <StatusPill tone="info">เพิ่มตอนรับ</StatusPill>}
                      </div>
                    </td>
                    <td className="border-y border-line py-3 pr-3">{routeName(line.supplierRouteId)}</td>
                    <td className="border-y border-line py-3 pr-3 tabular-nums">
                      {line.addedAtReceipt ? '—' : `${line.quantity} ${unit}`}
                    </td>
                    <td className="border-y border-line py-3 pr-3 tabular-nums">{formatCurrency(line.pricePerUnit)}</td>
                    <td className={`border-y border-line py-3 font-medium tabular-nums ${isReceived ? 'pr-3' : 'rounded-r-[0.875rem] border-r pr-3.5'}`}>{formatCurrency(line.total)}</td>
                    {isReceived && (
                      <td className="rounded-r-[0.875rem] border-y border-r border-line py-3 pr-3.5 tabular-nums">
                        {line.receivedQuantity ?? 0} {receivedUnit}
                        {line.receivedRawMaterialId && line.receivedRawMaterialId !== line.rawMaterialId && !line.addedAtReceipt && (
                          <span className="block text-sm text-warning-fg">แทนด้วย {receivedMaterial?.nameTh}</span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {canChange && (
        <div className="sticky bottom-5 z-10 flex flex-wrap items-center justify-between gap-4 rounded-[1.25rem] grad-dark px-6 py-4 text-on-dark shadow-pop">
          <div>
            <p className="text-xs text-ink-2">{po.lines.length} รายการ · {supplierName}</p>
            <p className="text-display font-semibold tabular-nums">{formatCurrency(po.totalAmount)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="danger" onClick={handleCancel}>
              <IconClose />
              ยกเลิกใบสั่งซื้อ
            </Button>
            <Button onClick={() => setEditing(true)} disabled={receiving} tooltip={receiving ? 'กำลังตรวจรับ แก้ไขที่หน้ารับของ' : undefined}>
              <IconEdit />
              แก้ไข
            </Button>
          </div>
        </div>
      )}

      {editing && <EditPurchaseOrderModal key={po.id} open po={po} onClose={() => setEditing(false)} />}
    </>
  )
}
