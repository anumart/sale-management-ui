import { useState } from 'react'
import { IconPlus, IconReceipt, IconTrash } from '@/components/icons'
import { Button, DatePicker, Select, Sheet, TextField } from '@/components/ui'
import { formatCurrency } from '@/lib/format'
import { toast } from '@/stores/toastStore'
import { rawMaterialById, supplierRawMaterials } from './mockData'
import { useProcurementStore } from './store'
import type { PurchaseOrder } from './types'
import { roundQty, toBaseQty } from './utils'

export interface AddPurchaseOrderModalProps {
  open: boolean
  onClose: () => void
}

interface DraftLine {
  key: number
  rawMaterialId: string
  /** Pickup point (supplier route) this line is collected from */
  routeId: string
  quantity: string
  pricePerUnit: string
}

const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const defaultDeliveryDate = () => toYmd(new Date(Date.now() + 7 * 86_400_000))

/** Raises a PO by hand for one supplier, without going through a purchase plan. */
export function AddPurchaseOrderModal({ open, onClose }: AddPurchaseOrderModalProps) {
  const suppliers = useProcurementStore((s) => s.suppliers)
  const addPurchaseOrder = useProcurementStore((s) => s.addPurchaseOrder)
  const supplierRoutes = useProcurementStore((s) => s.supplierRoutes)
  const [supplierId, setSupplierId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate)
  const [lines, setLines] = useState<DraftLine[]>([])
  const [nextKey, setNextKey] = useState(1)
  const [errors, setErrors] = useState<{
    supplier?: string
    date?: string
    lines?: string
  }>({})

  const activeRoutes = supplierRoutes.filter((r) => r.supplierId === supplierId && r.isActive)
  const routeOptions = activeRoutes.map((r) => ({
    value: r.id,
    label: r.routeName,
  }))
  const offers = supplierRawMaterials.filter((o) => o.supplierId === supplierId)
  const offerFor = (rawMaterialId: string) => offers.find((o) => o.rawMaterialId === rawMaterialId)
  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.pricePerUnit) || 0), 0)

  const handleClose = () => {
    setSupplierId('')
    setDeliveryDate(defaultDeliveryDate())
    setLines([])
    setErrors({})
    onClose()
  }

  const patchLine = (key: number, patch: Partial<DraftLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const addLine = () => {
    setLines((ls) => [
      ...ls,
      {
        key: nextKey,
        rawMaterialId: '',
        routeId: activeRoutes.length === 1 ? activeRoutes[0].id : '',
        quantity: '',
        pricePerUnit: '',
      },
    ])
    setNextKey(nextKey + 1)
  }
  const pickMaterial = (key: number, rawMaterialId: string) =>
    patchLine(key, {
      rawMaterialId,
      pricePerUnit: String(offerFor(rawMaterialId)?.pricePerSupplierUnit ?? ''),
    })

  const handleSave = () => {
    const next: typeof errors = {}
    if (!supplierId) next.supplier = 'กรุณาเลือกซัพพลายเออร์'
    if (!deliveryDate) next.date = 'กรุณาเลือกวันรับของ'
    if (lines.length === 0) next.lines = 'เพิ่มรายการอย่างน้อย 1 รายการ'
    else if (lines.some((l) => !l.rawMaterialId || !l.routeId || !(Number(l.quantity) > 0) || !(Number(l.pricePerUnit) >= 0) || l.pricePerUnit === ''))
      next.lines = 'เลือกวัตถุดิบ จุดรับ และกรอกจำนวน (มากกว่า 0) กับราคาให้ครบทุกรายการ'
    else if (new Set(lines.map((l) => `${l.rawMaterialId}|${l.routeId}`)).size < lines.length) next.lines = 'มีวัตถุดิบซ้ำในจุดรับเดียวกัน รวมเป็นรายการเดียว'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    const now = Date.now()
    const order: PurchaseOrder = {
      id: `po-${now}`,
      poNumber: `PO-${new Date().getFullYear()}-${String(now).slice(-4)}M`,
      supplierId,
      status: 'ordered',
      totalAmount: total,
      expectedDeliveryDate: new Date(`${deliveryDate}T00:00`).toISOString(),
      createdAt: new Date(now).toISOString(),
      lines: lines.map((l) => ({
        rawMaterialId: l.rawMaterialId,
        supplierRouteId: l.routeId,
        quantity: Number(l.quantity),
        pricePerUnit: Number(l.pricePerUnit),
        total: Number(l.quantity) * Number(l.pricePerUnit),
      })),
    }
    addPurchaseOrder(order)
    toast.success(`สร้างใบสั่งซื้อ ${order.poNumber} แล้ว`)
    handleClose()
  }

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-fg [&>svg]:size-5">
            <IconReceipt />
          </span>
          สร้างใบสั่งซื้อ
        </span>
      }
      description="สั่งซื้อวัตถุดิบจากซัพพลายเออร์โดยตรง ไม่ผูกกับแผนจัดซื้อ"
      className="max-w-6xl"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave}>สร้างใบสั่งซื้อ</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="ซัพพลายเออร์"
          required
          placeholder="เลือกซัพพลายเออร์"
          value={supplierId}
          options={suppliers.filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }))}
          onChange={(id) => {
            setSupplierId(id)
            setLines([])
          }}
          error={errors.supplier}
        />
        <DatePicker label="วันรับของ" required value={deliveryDate} onChange={setDeliveryDate} error={errors.date} />
      </div>

      <div className="mt-2">
        <p className="mb-2 text-control font-semibold">รายการวัตถุดิบ</p>
        {!supplierId ? (
          <p className="py-3 text-muted">เลือกซัพพลายเออร์ก่อน แล้วจึงเพิ่มรายการวัตถุดิบที่ซัพพลายเออร์รายนี้ขาย ใบสั่งซื้อ 1 ใบต่อซัพพลายเออร์ แต่ละรายการระบุจุดรับของตัวเอง</p>
        ) : offers.length === 0 ? (
          <p className="py-3 text-muted">ซัพพลายเออร์รายนี้ยังไม่มีวัตถุดิบที่ขายในระบบ</p>
        ) : lines.length === 0 ? (
          <p className="py-3 text-muted">ยังไม่มีรายการ กด "เพิ่มรายการ"</p>
        ) : (
          <ul className="space-y-3">
            {lines.map((l) => {
              const offer = offerFor(l.rawMaterialId)
              return (
                <li key={l.key} className="grid items-start gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_9rem_10rem_auto]">
                  <Select
                    aria-label="วัตถุดิบ"
                    placeholder="เลือกวัตถุดิบ"
                    value={l.rawMaterialId}
                    options={offers.map((o) => ({
                      value: o.rawMaterialId,
                      label: rawMaterialById(o.rawMaterialId)?.nameTh ?? o.rawMaterialId,
                    }))}
                    onChange={(id) => pickMaterial(l.key, id)}
                    containerClassName="mb-0"
                  />
                  <Select aria-label="จุดรับ" placeholder="เลือกจุดรับ" value={l.routeId} options={routeOptions} onChange={(id) => patchLine(l.key, { routeId: id })} containerClassName="mb-0" />
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
                </li>
              )
            })}
          </ul>
        )}
        <Button variant="outline" className="mt-3 w-full" disabled={!supplierId || offers.length === 0} onClick={addLine}>
          <IconPlus />
          เพิ่มรายการ
        </Button>
        {errors.lines && <p className="mt-2 text-sm text-danger-fg">{errors.lines}</p>}
        {lines.length > 0 && (
          <p className="mt-4 text-right text-control">
            รวมทั้งสิ้น <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
          </p>
        )}
      </div>
    </Sheet>
  )
}
