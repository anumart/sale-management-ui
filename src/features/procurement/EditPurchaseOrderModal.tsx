import { useState } from 'react'
import { IconEdit, IconPlus, IconTrash } from '@/components/icons'
import { Alert, Button, DatePicker, Select, Sheet, TextField } from '@/components/ui'
import { useLogisticsStore } from '@/features/logistics/store'
import { formatCurrency } from '@/lib/format'
import { toast } from '@/stores/toastStore'
import { rawMaterialById, supplierRawMaterials } from './mockData'
import { supplierById, useProcurementStore } from './store'
import type { PurchaseOrder } from './types'
import { poRunSheetIds, roundQty, toBaseQty, ymd } from './utils'

export interface EditPurchaseOrderModalProps {
  open: boolean
  onClose: () => void
  po: PurchaseOrder
}

interface DraftLine {
  key: number
  rawMaterialId: string
  /** Pickup point (supplier route) this line is collected from */
  routeId: string
  quantity: string
  pricePerUnit: string
}

/**
 * Edits a PO that is still `ordered`: pickup date and lines. Allowed until the run sheet's receipt is confirmed — staff change
 * the PO after calling the supplier again. Mount it with a fresh `key` so the draft starts from the saved PO.
 */
export function EditPurchaseOrderModal({ open, onClose, po }: EditPurchaseOrderModalProps) {
  const updatePurchaseOrder = useProcurementStore((s) => s.updatePurchaseOrder)
  const runSheets = useLogisticsStore((s) => s.runSheets)
  const supplierRoutes = useProcurementStore((s) => s.supplierRoutes)
  const sheets = poRunSheetIds(po).flatMap((id) => runSheets.find((rs) => rs.id === id) ?? [])
  const supplier = supplierById(po.supplierId)

  const [deliveryDate, setDeliveryDate] = useState(ymd(po.expectedDeliveryDate))
  const [lines, setLines] = useState<DraftLine[]>(() =>
    po.lines
      .filter((l) => !l.addedAtReceipt)
      .map((l, i) => ({
        key: i,
        rawMaterialId: l.rawMaterialId,
        routeId: l.supplierRouteId,
        quantity: String(l.quantity),
        pricePerUnit: String(l.pricePerUnit),
      })),
  )
  const [nextKey, setNextKey] = useState(po.lines.length)
  const [submitted, setSubmitted] = useState(false)

  const offers = supplierRawMaterials.filter((o) => o.supplierId === po.supplierId)
  // Active pickup points of the supplier, plus any the PO already uses
  const routeOptions = supplierRoutes
    .filter((r) => r.supplierId === po.supplierId && (r.isActive || po.lines.some((l) => l.supplierRouteId === r.id)))
    .map((r) => ({ value: r.id, label: r.routeName }))
  const offerFor = (rawMaterialId: string) => offers.find((o) => o.rawMaterialId === rawMaterialId)
  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.pricePerUnit) || 0), 0)

  const patchLine = (key: number, patch: Partial<DraftLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const addLine = () => {
    setLines((ls) => [
      ...ls,
      {
        key: nextKey,
        rawMaterialId: '',
        routeId: routeOptions.length === 1 ? routeOptions[0].value : '',
        quantity: '',
        pricePerUnit: '',
      },
    ])
    setNextKey(nextKey + 1)
  }

  const linesError =
    lines.length === 0
      ? 'ต้องมีอย่างน้อย 1 รายการ ถ้าไม่ต้องการใบสั่งซื้อนี้ให้ยกเลิกใบสั่งซื้อ'
      : lines.some((l) => !l.rawMaterialId || !l.routeId || !(Number(l.quantity) > 0) || l.pricePerUnit === '' || !(Number(l.pricePerUnit) >= 0))
        ? 'เลือกวัตถุดิบ จุดรับ และกรอกจำนวน (มากกว่า 0) กับราคาให้ครบทุกรายการ'
        : new Set(lines.map((l) => `${l.rawMaterialId}|${l.routeId}`)).size < lines.length
          ? 'มีวัตถุดิบซ้ำในจุดรับเดียวกัน รวมเป็นรายการเดียว'
          : undefined
  const dateError = deliveryDate ? undefined : 'เลือกวันรับของ'

  const handleSave = () => {
    setSubmitted(true)
    if (linesError || dateError) return
    const saved = updatePurchaseOrder(po.id, {
      expectedDeliveryDate: new Date(`${deliveryDate}T00:00`).toISOString(),
      lines: lines.map((l) => ({
        rawMaterialId: l.rawMaterialId,
        supplierRouteId: l.routeId,
        quantity: Number(l.quantity),
        pricePerUnit: Number(l.pricePerUnit),
        total: Number(l.quantity) * Number(l.pricePerUnit),
      })),
    })
    if (saved) toast.success(`แก้ไข ${po.poNumber} แล้ว`)
    else toast.error('แก้ไขไม่ได้ ใบสั่งซื้อนี้ไม่ได้อยู่ในสถานะสั่งแล้ว')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-fg [&>svg]:size-5">
            <IconEdit />
          </span>
          แก้ไข {po.poNumber}
        </span>
      }
      description={`${supplier?.name ?? 'ซัพพลายเออร์'} · แก้ไขได้จนกว่าจะตรวจรับของ`}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave}>บันทึก</Button>
        </>
      }
    >
      {sheets.length > 0 && (
        <Alert tone="info" title={`ใบสั่งซื้อนี้อยู่ใน ${sheets.map((s) => s.runSheetNumber).join(', ')} แล้ว`} className="mb-4">
          ใบวิ่งรถในระบบจะแสดงข้อมูลที่แก้ไข แต่
          {sheets.every((s) => s.status === 'draft') ? '' : 'ฉบับที่พิมพ์ไปแล้วจะไม่ตรง ควรพิมพ์ใหม่หรือแจ้งคนขับ'}
        </Alert>
      )}

      <DatePicker label="วันรับของ" required value={deliveryDate} onChange={setDeliveryDate} error={submitted ? dateError : undefined} />

      <div className="mt-2">
        <p className="mb-2 text-control font-semibold">รายการวัตถุดิบ</p>
        <ul className="space-y-3">
          {lines.map((l) => {
            const offer = offerFor(l.rawMaterialId)
            return (
              <li key={l.key} className="rounded-xl border border-line p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    aria-label="วัตถุดิบ"
                    placeholder="เลือกวัตถุดิบ"
                    value={l.rawMaterialId}
                    options={offers.map((o) => ({
                      value: o.rawMaterialId,
                      label: rawMaterialById(o.rawMaterialId)?.nameTh ?? o.rawMaterialId,
                    }))}
                    onChange={(id) =>
                      patchLine(l.key, {
                        rawMaterialId: id,
                        pricePerUnit: String(offerFor(id)?.pricePerSupplierUnit ?? l.pricePerUnit),
                      })
                    }
                    containerClassName="mb-0"
                  />
                  <Select aria-label="จุดรับ" placeholder="เลือกจุดรับ" value={l.routeId} options={routeOptions} onChange={(id) => patchLine(l.key, { routeId: id })} containerClassName="mb-0" />
                </div>
                <div className="mt-3 grid items-start gap-3 sm:grid-cols-[7rem_8rem_auto]">
                  <div>
                    <TextField
                      type="number"
                      min={0}
                      aria-label="จำนวน"
                      placeholder="จำนวน"
                      hint={offer?.supplierUnit}
                      value={l.quantity}
                      onChange={(e) => patchLine(l.key, { quantity: e.target.value })}
                      containerClassName="mb-0"
                    />
                    {offer && Number(l.quantity) > 0 && (
                      <p className="mt-1 text-sm text-muted">
                        = {roundQty(toBaseQty(Number(l.quantity), offer.unitsPerSupplierUnit))} {rawMaterialById(l.rawMaterialId)?.unit}
                      </p>
                    )}
                  </div>
                  <div>
                    <TextField
                      type="number"
                      min={0}
                      aria-label="ราคาต่อหน่วย"
                      placeholder="ราคา/หน่วย"
                      hint={offer ? `/ ${offer.supplierUnit}` : undefined}
                      value={l.pricePerUnit}
                      onChange={(e) => patchLine(l.key, { pricePerUnit: e.target.value })}
                      containerClassName="mb-0"
                    />
                    {offer && offer.unitsPerSupplierUnit > 0 && Number(l.pricePerUnit) > 0 && (
                      <p className="mt-1 text-sm text-muted">
                        {formatCurrency(Number(l.pricePerUnit) / offer.unitsPerSupplierUnit)} / {rawMaterialById(l.rawMaterialId)?.unit}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="danger" iconOnly outlined aria-label="ลบรายการ" tooltip="ลบรายการ" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                    <IconTrash />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
        <Button variant="outline" className="mt-3 w-full" disabled={offers.length === 0} onClick={addLine}>
          <IconPlus />
          เพิ่มรายการ
        </Button>
        {submitted && linesError && <p className="mt-2 text-sm text-danger-fg">{linesError}</p>}
        <p className="mt-4 text-right text-control">
          รวมทั้งสิ้น <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
        </p>
      </div>
    </Sheet>
  )
}
