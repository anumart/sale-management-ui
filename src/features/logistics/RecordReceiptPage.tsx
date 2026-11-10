import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconPlus, IconTrash, IconTruck } from '@/components/icons'
import { Button, Card, CardHeader, Select, StatusPill, TextArea, TextField } from '@/components/ui'
import { useCatalogStore } from '@/features/catalog/store'
import { supplierRawMaterials } from '@/features/procurement/mockData'
import { useProcurementStore } from '@/features/procurement/store'
import { formatDateTime } from '@/lib/format'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { pickupPointById } from './mockData'
import { useLogisticsStore, vehicleById, vehicleRouteById, type ReceiptLineInput } from './store'
import { activeStops, stopLines, supplierUnitFor } from './stopLines'
import { varianceLabel, varianceTone } from './utils'

export interface RecordReceiptPageProps {
  runSheetId: string
}

/** One row of the receipt form: an ordered PO line (lineIndex set) or a line staff added while checking (lineIndex null). */
interface DraftLine {
  key: string
  poId: string
  lineIndex: number | null
  supplierId: string
  /** Material that was ordered ('' on an added line) */
  orderedRawMaterialId: string
  orderedQuantity: number
  orderedPrice: number
  /** Material actually received — starts as the ordered one */
  rawMaterialId: string
  qty: string
  price: string
}

interface StopDraft {
  receivedNotes: string
  lines: DraftLine[]
}

let addedSeq = 0

const toInputs = (lines: DraftLine[], strict: boolean): ReceiptLineInput[] =>
  lines.map((l) => {
    const qty = l.qty === '' || Number.isNaN(Number(l.qty)) ? null : Number(l.qty)
    const price = l.price === '' || Number.isNaN(Number(l.price)) ? null : Number(l.price)
    return { poId: l.poId, lineIndex: l.lineIndex, rawMaterialId: l.rawMaterialId, quantity: strict ? (qty ?? 0) : qty, pricePerUnit: strict ? (price ?? 0) : price }
  })

export function RecordReceiptPage({ runSheetId }: RecordReceiptPageProps) {
  const navigate = useNavigate()
  const runSheet = useLogisticsStore((s) => s.runSheets.find((rs) => rs.id === runSheetId))
  const startReceipt = useLogisticsStore((s) => s.startReceipt)
  const saveStopReceipt = useLogisticsStore((s) => s.saveStopReceipt)
  const recordReceipt = useLogisticsStore((s) => s.recordReceipt)
  const purchaseOrders = useProcurementStore((s) => s.purchaseOrders)
  const rawMaterials = useCatalogStore((s) => s.rawMaterials)
  const [submitted, setSubmitted] = useState(false)
  /** Stops edited since they were last saved — they count as not checked until saved again */
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [stopSubmitted, setStopSubmitted] = useState<Set<string>>(new Set())

  // Received values start from what was ordered (or from a saved draft), so staff only touch what differs
  const [drafts, setDrafts] = useState<Record<string, StopDraft>>(() => {
    const initial: Record<string, StopDraft> = {}
    for (const stop of runSheet?.stops ?? []) {
      initial[stop.id] = {
        receivedNotes: stop.receivedNotes,
        lines: stopLines(stop, purchaseOrders).map((l) => ({
          key: l.key,
          poId: l.poId,
          lineIndex: l.addedAtReceipt ? null : l.lineIndex,
          supplierId: l.supplierId,
          orderedRawMaterialId: l.orderedRawMaterialId,
          orderedQuantity: l.orderedQuantity,
          orderedPrice: l.pricePerUnit,
          rawMaterialId: l.receivedRawMaterialId,
          qty: String(l.actualReceivedQuantity ?? l.orderedQuantity),
          price: String(l.receivedPricePerUnit ?? l.pricePerUnit),
        })),
      }
    }
    return initial
  })

  if (!runSheet) {
    return (
      <>
        <PageHeading section="ขนส่ง" parent={{ label: 'ใบวิ่งรถ', to: '/logistics/run-sheets' }} title="บันทึกรับของ" />
        <Card>
          <p className="text-muted">ไม่พบใบวิ่งรถ</p>
        </Card>
      </>
    )
  }

  if (runSheet.status === 'draft') {
    return (
      <>
        <PageHeading section="ขนส่ง" parent={{ label: 'ใบวิ่งรถ', to: '/logistics/run-sheets' }} title="บันทึกรับของ" subtitle={runSheet.runSheetNumber} />
        <Card>
          <p className="mb-4 text-muted">ต้องพิมพ์ใบวิ่งรถก่อนจึงจะบันทึกรับของได้</p>
          <Button variant="outline" onClick={() => navigate({ to: '/logistics/run-sheets/$runSheetId', params: { runSheetId } })}>
            กลับไปที่ใบวิ่งรถ
          </Button>
        </Card>
      </>
    )
  }

  if (runSheet.status === 'printed') {
    return (
      <>
        <PageHeading section="ขนส่ง" parent={{ label: 'ใบวิ่งรถ', to: '/logistics/run-sheets' }} title="บันทึกรับของ" subtitle={runSheet.runSheetNumber} />
        <Card>
          <p className="mb-4 text-muted">ใบวิ่งรถนี้ยังอยู่ระหว่างไปรับของ ยืนยันว่าคนขับกลับมาแล้วเพื่อเริ่มบันทึกรับของ</p>
          <div className="flex gap-2">
            <Button onClick={() => startReceipt(runSheet.id)}>
              <IconTruck />
              คนขับกลับมาแล้ว — เริ่มบันทึกรับของ
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: '/logistics/run-sheets/$runSheetId', params: { runSheetId } })}>
              กลับไปที่ใบวิ่งรถ
            </Button>
          </div>
        </Card>
      </>
    )
  }

  if (runSheet.status === 'completed') {
    return (
      <>
        <PageHeading section="ขนส่ง" parent={{ label: 'ใบวิ่งรถ', to: '/logistics/run-sheets' }} title="บันทึกรับของ" subtitle={runSheet.runSheetNumber} />
        <Card>
          <p className="mb-4 text-muted">บันทึกรับของของใบวิ่งรถนี้ยืนยันไปแล้ว</p>
          <Button variant="outline" onClick={() => navigate({ to: '/logistics/run-sheets/$runSheetId', params: { runSheetId } })}>
            ดูใบวิ่งรถ
          </Button>
        </Card>
      </>
    )
  }

  const vehicle = vehicleById(runSheet.vehicleId)
  const route = vehicleRouteById(runSheet.vehicleRouteId)
  const stops = activeStops(runSheet.stops, purchaseOrders)
  /** Only what this PO's supplier sells; the ordered material stays selectable even if the offer was removed since. */
  const materialOptionsFor = (l: DraftLine) => {
    const ids = new Set(supplierRawMaterials.filter((o) => o.supplierId === l.supplierId).map((o) => o.rawMaterialId))
    if (l.orderedRawMaterialId) ids.add(l.orderedRawMaterialId)
    if (l.rawMaterialId) ids.add(l.rawMaterialId)
    return rawMaterials.filter((rm) => ids.has(rm.id)).map((rm) => ({ value: rm.id, label: rm.nameTh }))
  }
  const materialName = (id: string) => rawMaterials.find((rm) => rm.id === id)?.nameTh ?? id

  const markDirty = (stopId: string) => setDirty((s) => new Set(s).add(stopId))

  const patchLine = (stopId: string, key: string, patch: Partial<DraftLine>) => {
    markDirty(stopId)
    setDrafts((d) => ({ ...d, [stopId]: { ...d[stopId], lines: d[stopId].lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) } }))
  }

  /** Picking another material = the driver bought a substitute; its price starts from the supplier's catalogue price when there is one. */
  const changeMaterial = (stopId: string, line: DraftLine, rawMaterialId: string) => {
    const offer = supplierRawMaterials.find((o) => o.supplierId === line.supplierId && o.rawMaterialId === rawMaterialId)
    patchLine(stopId, line.key, { rawMaterialId, price: rawMaterialId === line.orderedRawMaterialId ? String(line.orderedPrice) : String(offer?.pricePerSupplierUnit ?? '') })
  }

  const addLine = (stopId: string) => {
    const stop = stops.find((s) => s.id === stopId)
    const po = purchaseOrders.find((p) => p.id === stop?.purchaseOrderIds.find((id) => purchaseOrders.find((x) => x.id === id)?.status === 'ordered'))
    if (!po) return
    const line: DraftLine = {
      key: `added-${++addedSeq}`,
      poId: po.id,
      lineIndex: null,
      supplierId: po.supplierId,
      orderedRawMaterialId: '',
      orderedQuantity: 0,
      orderedPrice: 0,
      rawMaterialId: '',
      qty: '',
      price: '',
    }
    markDirty(stopId)
    setDrafts((d) => ({ ...d, [stopId]: { ...d[stopId], lines: [...d[stopId].lines, line] } }))
  }

  const removeLine = (stopId: string, key: string) => {
    markDirty(stopId)
    setDrafts((d) => ({ ...d, [stopId]: { ...d[stopId], lines: d[stopId].lines.filter((l) => l.key !== key) } }))
  }
  const setNotes = (stopId: string, value: string) => {
    markDirty(stopId)
    setDrafts((d) => ({ ...d, [stopId]: { ...d[stopId], receivedNotes: value } }))
  }

  const lineErrors = (l: DraftLine) => ({
    material: !l.rawMaterialId ? 'เลือกวัตถุดิบ' : undefined,
    qty: l.qty === '' || Number.isNaN(Number(l.qty)) || Number(l.qty) < 0 ? 'กรอกจำนวน' : undefined,
    price: l.price === '' || Number.isNaN(Number(l.price)) || Number(l.price) < 0 ? 'กรอกราคา' : undefined,
  })
  const allLines = stops.flatMap((s) => drafts[s.id]?.lines ?? [])
  const hasErrors = allLines.some((l) => Object.values(lineErrors(l)).some(Boolean))

  const totalOrdered = allLines.reduce((sum, l) => sum + l.orderedQuantity * l.orderedPrice, 0)
  const totalReceived = allLines.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.price) || 0), 0)
  const variancePct = totalOrdered > 0 ? Math.round(((totalReceived - totalOrdered) / totalOrdered) * 100) : 0

  const stopInput = (stopId: string) => ({ stopId, receivedNotes: drafts[stopId]?.receivedNotes ?? '', lines: toInputs(drafts[stopId]?.lines ?? [], true) })
  const stopHasErrors = (stopId: string) => (drafts[stopId]?.lines ?? []).some((l) => Object.values(lineErrors(l)).some(Boolean))
  const isChecked = (stop: { id: string; checkedAt: string | null }) => stop.checkedAt !== null && !dirty.has(stop.id)
  const uncheckedCount = stops.filter((s) => !isChecked(s)).length

  const handleSaveStop = (stopId: string, label: string) => {
    setStopSubmitted((s) => new Set(s).add(stopId))
    if (stopHasErrors(stopId)) {
      toast.error('กรอกวัตถุดิบ จำนวน และราคาที่รับจริงให้ครบทุกรายการของจุดนี้ก่อนบันทึก')
      return
    }
    saveStopReceipt(runSheet.id, stopInput(stopId))
    setDirty((s) => {
      const next = new Set(s)
      next.delete(stopId)
      return next
    })
    toast.success(`บันทึก ${label} แล้ว`)
  }

  const handleConfirm = async () => {
    setSubmitted(true)
    if (uncheckedCount > 0) {
      toast.error(`ยังตรวจไม่ครบ เหลืออีก ${uncheckedCount} จุดจอด กด "บันทึกจุดนี้" ที่แต่ละจุดก่อนยืนยัน`)
      return
    }
    if (hasErrors) {
      toast.error('กรอกวัตถุดิบ จำนวน และราคาที่รับจริงให้ครบทุกรายการก่อนยืนยัน')
      return
    }

    const ok = await confirm({
      title: 'บันทึกรับของ?',
      message: `ระบบจะปิด ${runSheet.runSheetNumber} และบันทึกรับของทั้ง ${stops.length} จุดจอด รายการของใบสั่งซื้อในใบวิ่งรถนี้จะถูกบันทึกเป็นรับแล้ว (ใบสั่งซื้อที่รับครบทุกรายการจะเป็น "รับของแล้ว") ไม่สามารถย้อนกลับได้`,
      confirmLabel: 'บันทึกรับของ',
      tone: 'primary',
    })
    if (!ok) return

    recordReceipt(runSheet.id, stops.map((s) => stopInput(s.id)))
    toast.success(`บันทึกรับของแล้ว ส่วนต่าง ${variancePct > 0 ? '+' : ''}${variancePct}%`)
    navigate({ to: '/logistics/run-sheets/$runSheetId', params: { runSheetId: runSheet.id } })
  }

  return (
    <>
      <PageHeading
        section="ขนส่ง"
        parent={{ label: 'ใบวิ่งรถ', to: '/logistics/run-sheets' }}
        title="บันทึกรับของ"
        subtitle={`${runSheet.runSheetNumber} · ${vehicle?.code} · ${route?.routeName} · ${formatDateTime(runSheet.runDate)}`}
      />

      <div className="flex flex-col gap-5">
        {stops.length === 0 && (
          <Card>
            <p className="text-muted">ไม่เหลือใบสั่งซื้อในใบวิ่งรถนี้ (ถูกยกเลิกทั้งหมด)</p>
          </Card>
        )}
        {stops.map((stop) => {
          const point = pickupPointById(stop.pickupPointId)
          const draft = drafts[stop.id]
          return (
            <Card key={stop.id}>
              <div className="mb-4 flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-fg">
                  {stop.sequence}
                </span>
                <div className="min-w-0">
                  <p className="font-medium">
                    {point?.supplierName} — {point?.routeName}
                  </p>
                  <p className="text-sm text-muted">
                    {point?.location} · {point?.contactPerson} · {point?.phone}
                  </p>
                </div>
                <div className="ml-auto">
                  <StatusPill tone={isChecked(stop) ? 'success' : 'warning'}>{isChecked(stop) ? 'ตรวจแล้ว' : dirty.has(stop.id) ? 'แก้ไขแล้ว ยังไม่บันทึก' : 'ยังไม่ตรวจ'}</StatusPill>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[56rem] border-separate text-base [border-spacing:0_0.5rem]">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="py-2 pr-3 pl-3.5 font-light">เลขที่ใบสั่งซื้อ</th>
                      <th className="py-2 pr-3 font-light">สั่ง</th>
                      <th className="py-2 pr-3 font-light">วัตถุดิบที่รับ</th>
                      <th className="py-2 pr-3 font-light">รับจริง</th>
                      <th className="py-2 pr-3 font-light">ราคา / หน่วย</th>
                      <th className="py-2 pr-3 font-light">ส่วนต่าง</th>
                      <th className="w-10 py-2 pr-3.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {draft?.lines.map((l) => {
                      const added = l.lineIndex === null
                      const errors: Partial<ReturnType<typeof lineErrors>> = submitted || stopSubmitted.has(stop.id) ? lineErrors(l) : {}
                      const actual = l.qty === '' ? null : Number(l.qty)
                      const substituted = !added && l.rawMaterialId !== l.orderedRawMaterialId
                      const unit = l.rawMaterialId ? supplierUnitFor(l.supplierId, l.rawMaterialId) : ''
                      const po = purchaseOrders.find((p) => p.id === l.poId)
                      const cell = 'border-y border-line py-3 pr-3 align-top'
                      return (
                        <tr key={l.key}>
                          <td className="rounded-l-[0.875rem] border-y border-l border-line py-3 pr-3 pl-3.5 align-top">{po?.poNumber}</td>
                          <td className={`${cell} tabular-nums whitespace-nowrap`}>
                            {added ? (
                              <span className="text-muted">—</span>
                            ) : (
                              <>
                                <p>{materialName(l.orderedRawMaterialId)}</p>
                                <p className="text-sm text-muted">
                                  {l.orderedQuantity.toLocaleString()} {supplierUnitFor(l.supplierId, l.orderedRawMaterialId)}
                                </p>
                              </>
                            )}
                          </td>
                          <td className={cell}>
                            <Select
                              aria-label="วัตถุดิบที่รับ"
                              placeholder="เลือกวัตถุดิบ"
                              value={l.rawMaterialId}
                              options={materialOptionsFor(l)}
                              onChange={(id) => changeMaterial(stop.id, l, id)}
                              error={errors.material}
                              containerClassName="mb-0 w-56"
                            />
                            {substituted && <p className="mt-1 text-sm text-warning-fg">แทน {materialName(l.orderedRawMaterialId)}</p>}
                          </td>
                          <td className={cell}>
                            <TextField
                              type="number"
                              min={0}
                              aria-label={`จำนวน ${materialName(l.rawMaterialId)} ที่รับจริง`}
                              value={l.qty}
                              onChange={(e) => patchLine(stop.id, l.key, { qty: e.target.value })}
                              error={errors.qty}
                              containerClassName="mb-0 w-28"
                            />
                            {unit && <p className="mt-1 text-sm text-muted">{unit}</p>}
                          </td>
                          <td className={cell}>
                            <TextField
                              type="number"
                              min={0}
                              aria-label={`ราคาต่อหน่วย ${materialName(l.rawMaterialId)}`}
                              value={l.price}
                              onChange={(e) => patchLine(stop.id, l.key, { price: e.target.value })}
                              error={errors.price}
                              containerClassName="mb-0 w-28"
                            />
                          </td>
                          <td className={cell}>
                            {added ? <StatusPill tone="info">เพิ่มตอนรับ</StatusPill> : <StatusPill tone={varianceTone(l.orderedQuantity, actual)}>{varianceLabel(l.orderedQuantity, actual)}</StatusPill>}
                          </td>
                          <td className="rounded-r-[0.875rem] border-y border-r border-line py-3 pr-3.5 align-top">
                            {added && (
                              <Button size="sm" variant="danger" iconOnly outlined aria-label="ลบรายการ" tooltip="ลบรายการ" onClick={() => removeLine(stop.id, l.key)}>
                                <IconTrash />
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <Button variant="outline" size="sm" className="mt-1" onClick={() => addLine(stop.id)}>
                <IconPlus />
                เพิ่มรายการที่ไม่ได้อยู่ในใบสั่งซื้อ
              </Button>

              <TextArea
                label="หมายเหตุ (ไม่บังคับ)"
                placeholder="เช่น ดอกไม้เสียหายระหว่างขนขึ้นรถ ซัพพลายเออร์มีของน้อยกว่าที่แจ้ง..."
                value={draft?.receivedNotes ?? ''}
                onChange={(e) => setNotes(stop.id, e.target.value)}
                containerClassName="mt-4"
              />

              <div className="mt-4 flex justify-end">
                <Button variant={isChecked(stop) ? 'outline' : 'primary'} onClick={() => handleSaveStop(stop.id, point?.supplierName ?? 'จุดจอด')}>
                  {isChecked(stop) ? 'บันทึกจุดนี้อีกครั้ง' : 'บันทึกจุดนี้'}
                </Button>
              </div>
            </Card>
          )
        })}

        <Card>
          <CardHeader title="สรุป" subtitle={uncheckedCount > 0 ? `ยังตรวจไม่ครบ เหลืออีก ${uncheckedCount} จุดจอด บันทึกแต่ละจุดก่อนจึงจะยืนยันได้` : "ตรวจครบทุกจุดแล้ว การยืนยันจะปิดใบวิ่งรถและบันทึกรายการทั้งหมดเป็นรับแล้ว"} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted">ยอดสั่งรวม</p>
              <p className="text-title font-semibold tabular-nums">฿{totalOrdered.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted">ยอดรับรวม</p>
              <p className="text-title font-semibold tabular-nums">฿{Math.round(totalReceived).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted">ส่วนต่าง</p>
              <p className="text-title font-semibold tabular-nums">
                {variancePct > 0 ? '+' : ''}
                {variancePct}%
              </p>
            </div>
            <div className="flex items-end justify-start gap-2 sm:justify-end">
              <Button onClick={handleConfirm} disabled={stops.length === 0 || uncheckedCount > 0}>
                ยืนยันและปิดใบวิ่งรถ
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
