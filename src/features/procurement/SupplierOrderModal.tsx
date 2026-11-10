import { useState } from 'react'
import { IconPlus, IconTrash } from '@/components/icons'
import { Alert, Button, DatePicker, Select, Sheet, TextField } from '@/components/ui'
import { formatCurrency } from '@/lib/format'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/cn'
import { rawMaterialById, supplierRawMaterials } from './mockData'
import { supplierById, useProcurementStore } from './store'
import type { PlanOrderLine } from './types'
import { roundQty, suggestedSupplierQty, toBaseQty, ymd } from './utils'

interface DraftRow {
  key: string
  rawMaterialId: string
  routeId: string
  qty: string
  price: string
}

interface RowErrors {
  route?: string
  qty?: string
  price?: string
}

export interface SupplierOrderModalProps {
  open: boolean
  onClose: () => void
  planId: string
  supplierId: string
}

const tomorrow = () => ymd(new Date(Date.now() + 86_400_000).toISOString())

let rowSeq = 0
const nextKey = () => `row-${++rowSeq}`

/** A row only counts as an order when its quantity is above 0 — empty/0 means "not ordering this one". */
const isOrdered = (row: DraftRow) => Number(row.qty) > 0

/**
 * One phone call = one supplier: every raw material of the plan that this supplier sells, with pickup point,
 * quantity and price. Edits stay in this drawer until the footer Save writes them to the plan.
 * Mount it with a fresh `key` each time it is opened so the draft starts from what is saved.
 */
export function SupplierOrderModal({ open, onClose, planId, supplierId }: SupplierOrderModalProps) {
  const plan = useProcurementStore((s) => s.plans.find((p) => p.id === planId))
  const supplierRoutes = useProcurementStore((s) => s.supplierRoutes)
  const saveSupplierOrder = useProcurementStore((s) => s.saveSupplierOrder)
  const supplier = supplierById(supplierId)

  const planMaterials = plan?.rawMaterials ?? []
  const offers = supplierRawMaterials.filter((o) => o.supplierId === supplierId && planMaterials.some((rm) => rm.rawMaterialId === o.rawMaterialId))
  const savedLines = (plan?.orderLines ?? []).filter((l) => l.supplierId === supplierId)
  const activeRoutes = supplierRoutes.filter((r) => r.supplierId === supplierId && r.isActive)
  // A saved line may point at a route that was deactivated since — keep it selectable so the line still shows
  const routeOptions = supplierRoutes
    .filter((r) => r.supplierId === supplierId && (r.isActive || savedLines.some((l) => l.supplierRouteId === r.id)))
    .map((r) => ({ value: r.id, label: r.routeName }))
  const locked = plan?.status !== 'draft'

  const [rows, setRows] = useState<DraftRow[]>(() =>
    offers.flatMap((offer) => {
      const saved = savedLines.filter((l) => l.rawMaterialId === offer.rawMaterialId)
      if (saved.length > 0) return saved.map((l) => ({ key: nextKey(), rawMaterialId: l.rawMaterialId, routeId: l.supplierRouteId, qty: String(l.quantity), price: String(l.pricePerSupplierUnit) }))
      return [{ key: nextKey(), rawMaterialId: offer.rawMaterialId, routeId: activeRoutes.length === 1 ? activeRoutes[0].id : '', qty: '', price: String(offer.pricePerSupplierUnit) }]
    }),
  )
  const [submitted, setSubmitted] = useState(false)
  // One pickup date per phone call; it is copied to every PO raised from this supplier's lines
  const [deliveryDate, setDeliveryDate] = useState(savedLines[0]?.deliveryDate ?? tomorrow())

  const offerFor = (rawMaterialId: string) => offers.find((o) => o.rawMaterialId === rawMaterialId)
  const patchRow = (key: string, patch: Partial<DraftRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const addRowFor = (rawMaterialId: string) => {
    const offer = offerFor(rawMaterialId)
    const row: DraftRow = { key: nextKey(), rawMaterialId, routeId: '', qty: '', price: String(offer?.pricePerSupplierUnit ?? '') }
    setRows((rs) => {
      const lastIndex = rs.map((r) => r.rawMaterialId).lastIndexOf(rawMaterialId)
      return [...rs.slice(0, lastIndex + 1), row, ...rs.slice(lastIndex + 1)]
    })
  }

  const rowErrors = (row: DraftRow): RowErrors => {
    if (!isOrdered(row)) return {}
    const errors: RowErrors = {}
    if (!Number.isInteger(Number(row.qty))) errors.qty = 'ต้องเป็นจำนวนเต็ม'
    if (!row.routeId) errors.route = 'เลือกจุดรับ'
    else if (rows.some((o) => o.key !== row.key && isOrdered(o) && o.rawMaterialId === row.rawMaterialId && o.routeId === row.routeId)) errors.route = 'จุดรับซ้ำกับแถวอื่น'
    if (row.price === '' || !(Number(row.price) >= 0)) errors.price = 'กรอกราคา'
    return errors
  }
  const dateMissing = rows.some(isOrdered) && !deliveryDate
  const hasErrors = dateMissing || rows.some((r) => Object.keys(rowErrors(r)).length > 0)

  const orderedRows = rows.filter(isOrdered)
  const draftSignature = `${orderedRows.length > 0 ? deliveryDate : ''}#${orderedRows.map((r) => `${r.rawMaterialId}|${r.routeId}|${Number(r.qty)}|${Number(r.price)}`).sort().join(';')}`
  const savedSignature = `${savedLines[0]?.deliveryDate ?? ''}#${savedLines.map((l) => `${l.rawMaterialId}|${l.supplierRouteId}|${l.quantity}|${l.pricePerSupplierUnit}`).sort().join(';')}`
  const dirty = draftSignature !== savedSignature
  const total = orderedRows.reduce((sum, r) => sum + Number(r.qty) * (Number(r.price) || 0), 0)

  const handleClose = async () => {
    if (dirty && !locked) {
      const ok = await confirm({ title: 'ทิ้งการแก้ไขที่ยังไม่บันทึก?', message: 'ข้อมูลที่กรอกในหน้านี้ยังไม่ถูกบันทึกลงแผน', confirmLabel: 'ทิ้งการแก้ไข', tone: 'danger' })
      if (!ok) return
    }
    onClose()
  }

  const handleSave = () => {
    setSubmitted(true)
    if (hasErrors) return
    const now = new Date().toISOString()
    const lines: PlanOrderLine[] = orderedRows.map((r, i) => ({
      id: `ol-${Date.now()}-${i}`,
      rawMaterialId: r.rawMaterialId,
      supplierId,
      supplierRouteId: r.routeId,
      quantity: Number(r.qty),
      pricePerSupplierUnit: Number(r.price),
      deliveryDate,
      savedAt: now,
    }))
    saveSupplierOrder(planId, supplierId, lines)
    toast.success(lines.length > 0 ? `บันทึกรายการสั่งซื้อจาก ${supplier?.name} แล้ว (${lines.length} รายการ)` : `บันทึกแล้ว ไม่สั่งอะไรจาก ${supplier?.name}`)
    onClose()
  }

  if (!plan || !supplier) return null

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      className="max-w-6xl"
      title={supplier.name}
      description={`${supplier.phone} · กรอกเฉพาะวัตถุดิบที่จะสั่งจากรายนี้ ปล่อยจำนวนเป็น 0 หรือว่างไว้ถ้าไม่สั่ง`}
      footer={
        <>
          <p className="mr-auto self-center text-control text-muted">
            สั่ง {orderedRows.length} รายการ · รวม <span className="font-semibold text-ink tabular-nums">{formatCurrency(total)}</span>
          </p>
          <Button variant="outline" onClick={handleClose}>
            {locked ? 'ปิด' : 'ยกเลิก'}
          </Button>
          {!locked && (
            <Button onClick={handleSave} disabled={!dirty}>
              บันทึก
            </Button>
          )}
        </>
      }
    >
      {locked && (
        <Alert tone="info" title="แผนนี้สร้างใบสั่งซื้อแล้ว แก้ไขรายการไม่ได้" className="mb-4" />
      )}
      {!locked && routeOptions.length === 0 && (
        <Alert tone="warning" title="ซัพพลายเออร์รายนี้ยังไม่มีจุดรับ" className="mb-4">
          เพิ่มจุดรับที่หน้าซัพพลายเออร์ก่อน จึงจะบันทึกรายการสั่งซื้อได้
        </Alert>
      )}

      <div className="mb-4 max-w-xs">
        {locked ? (
          <>
            <p className="text-sm text-muted">วันรับของ</p>
            <p className="text-control font-medium">{savedLines[0]?.deliveryDate ?? '—'}</p>
          </>
        ) : (
          <DatePicker
            label="วันรับของ"
            required
            value={deliveryDate}
            onChange={setDeliveryDate}
            hint="วันที่ตกลงกับซัพพลายเออร์ ใช้เป็นกำหนดรับของของใบสั่งซื้อและจัดเข้าใบวิ่งรถ"
            error={submitted && dateMissing ? 'เลือกวันรับของ' : undefined}
            containerClassName="mb-0"
          />
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] border-separate text-base [border-spacing:0_0.5rem]">
          <thead>
            <tr className="text-left text-muted">
              <th className="pb-2 pl-3.5 font-light">วัตถุดิบ</th>
              <th className="pb-2 font-light">จุดรับ</th>
              <th className="pb-2 font-light">จำนวนที่สั่ง</th>
              <th className="pb-2 font-light">ราคา / หน่วย</th>
              <th className="pb-2 font-light">รวม</th>
              <th className="w-10 pb-2 pr-3.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const offer = offerFor(row.rawMaterialId)
              const material = rawMaterialById(row.rawMaterialId)
              const planRm = planMaterials.find((rm) => rm.rawMaterialId === row.rawMaterialId)
              if (!offer || !planRm) return null
              const isFirstOfMaterial = rows.findIndex((r) => r.rawMaterialId === row.rawMaterialId) === index
              const errors = submitted ? rowErrors(row) : {}
              const qty = Number(row.qty) || 0
              const rowTotal = qty * (Number(row.price) || 0)
              const net = planRm.netRequiredQuantity
              const suggested = suggestedSupplierQty(net, offer.unitsPerSupplierUnit)
              // Base units ordered for this material across this draft and other suppliers' saved lines
              const orderedElsewhere = (plan.orderLines ?? [])
                .filter((l) => l.rawMaterialId === row.rawMaterialId && l.supplierId !== supplierId)
                .reduce((sum, l) => sum + toBaseQty(l.quantity, supplierRawMaterials.find((o) => o.supplierId === l.supplierId && o.rawMaterialId === l.rawMaterialId)?.unitsPerSupplierUnit ?? 1), 0)
              const orderedHere = rows.filter((r) => r.rawMaterialId === row.rawMaterialId && isOrdered(r)).reduce((sum, r) => sum + toBaseQty(Number(r.qty), offer.unitsPerSupplierUnit), 0)
              const over = roundQty(orderedElsewhere + orderedHere - net)
              const materialDimmed = net === 0 && !rows.some((r) => r.rawMaterialId === row.rawMaterialId && isOrdered(r))
              const cell = 'border-y border-line py-3 pr-3 align-top'
              return (
                <tr key={row.key} className={cn(materialDimmed && 'opacity-60')}>
                  <td className="rounded-l-[0.875rem] border-y border-l border-line py-3 pr-3 pl-3.5 align-top">
                    {isFirstOfMaterial ? (
                      <>
                        <p className="font-medium">{material?.nameTh}</p>
                        <p className="text-sm text-muted">
                          ต้องซื้อ {roundQty(net)} {material?.unit}
                          {orderedElsewhere > 0 && ` · สั่งรายอื่นแล้ว ${roundQty(orderedElsewhere)}`}
                        </p>
                        {suggested > 0 && (
                          <p className="text-sm text-muted">
                            แนะนำ {suggested} {offer.supplierUnit}
                          </p>
                        )}
                        {over > 0 && orderedHere > 0 && <p className="mt-1 text-sm text-warning-fg">สั่งรวมเกินแผน {over} {material?.unit}</p>}
                        {!locked && (
                          <button type="button" onClick={() => addRowFor(row.rawMaterialId)} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary-fg hover:underline [&>svg]:size-3.5">
                            <IconPlus />
                            อีกจุดรับ
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="pl-3 text-sm text-muted">↳ {material?.nameTh} (อีกจุดรับ)</p>
                    )}
                  </td>
                  <td className={cell}>
                    <Select
                      aria-label={`จุดรับของ ${material?.nameTh}`}
                      placeholder="เลือกจุดรับ"
                      value={row.routeId}
                      disabled={locked}
                      options={routeOptions}
                      onChange={(routeId) => patchRow(row.key, { routeId })}
                      error={errors.route}
                      containerClassName="mb-0 w-56"
                    />
                  </td>
                  <td className={cell}>
                    <TextField
                      type="number"
                      min={0}
                      step={1}
                      aria-label={`จำนวนที่สั่ง ${material?.nameTh}`}
                      placeholder="0"
                      disabled={locked}
                      value={row.qty}
                      onChange={(e) => patchRow(row.key, { qty: e.target.value })}
                      error={errors.qty}
                      containerClassName="mb-0 w-24"
                    />
                    <p className="mt-1 text-sm text-muted">{offer.supplierUnit}</p>
                    {qty > 0 && (
                      <p className="text-sm text-muted">
                        = {roundQty(toBaseQty(qty, offer.unitsPerSupplierUnit))} {material?.unit}
                      </p>
                    )}
                  </td>
                  <td className={cell}>
                    <TextField
                      type="number"
                      min={0}
                      aria-label={`ราคาต่อหน่วย ${material?.nameTh}`}
                      disabled={locked}
                      value={row.price}
                      onChange={(e) => patchRow(row.key, { price: e.target.value })}
                      error={errors.price}
                      containerClassName="mb-0 w-28"
                    />
                    {offer.unitsPerSupplierUnit > 0 && Number(row.price) > 0 && (
                      <p className="mt-1 text-sm text-muted">
                        {formatCurrency(Number(row.price) / offer.unitsPerSupplierUnit)} / {material?.unit}
                      </p>
                    )}
                  </td>
                  <td className={cn(cell, 'whitespace-nowrap tabular-nums')}>{formatCurrency(rowTotal)}</td>
                  <td className="rounded-r-[0.875rem] border-y border-r border-line py-3 pr-3.5 align-top">
                    {!isFirstOfMaterial && !locked && (
                      <Button size="sm" variant="danger" iconOnly outlined aria-label="ลบแถว" tooltip="ลบแถว" onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}>
                        <IconTrash />
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-6 text-center text-muted">ซัพพลายเออร์รายนี้ไม่ได้ขายวัตถุดิบใดในแผนนี้</p>}
      </div>
    </Sheet>
  )
}
