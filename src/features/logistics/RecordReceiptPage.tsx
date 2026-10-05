import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconTruck } from '@/components/icons'
import { Button, Card, CardHeader, StatusPill, TextArea, TextField } from '@/components/ui'
import { formatDateTime } from '@/lib/format'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { pickupPointById } from './mockData'
import { useLogisticsStore, vehicleById, vehicleRouteById } from './store'
import { varianceLabel, varianceTone } from './utils'

export interface RecordReceiptPageProps {
  runSheetId: string
}

interface StopDraft {
  receivedNotes: string
  quantities: Record<string, string>
}

export function RecordReceiptPage({ runSheetId }: RecordReceiptPageProps) {
  const navigate = useNavigate()
  const runSheet = useLogisticsStore((s) => s.runSheets.find((rs) => rs.id === runSheetId))
  const startReceipt = useLogisticsStore((s) => s.startReceipt)
  const saveReceiptDraft = useLogisticsStore((s) => s.saveReceiptDraft)
  const recordReceipt = useLogisticsStore((s) => s.recordReceipt)

  const [drafts, setDrafts] = useState<Record<string, StopDraft>>(() => {
    const initial: Record<string, StopDraft> = {}
    for (const stop of runSheet?.stops ?? []) {
      initial[stop.id] = {
        receivedNotes: stop.receivedNotes,
        quantities: Object.fromEntries(stop.lineItems.map((li) => [li.id, li.actualReceivedQuantity !== null ? String(li.actualReceivedQuantity) : ''])),
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
  const stops = [...runSheet.stops].sort((a, b) => a.sequence - b.sequence)

  const setQuantity = (stopId: string, lineItemId: string, value: string) =>
    setDrafts((d) => ({ ...d, [stopId]: { ...d[stopId], quantities: { ...d[stopId].quantities, [lineItemId]: value } } }))

  const setNotes = (stopId: string, value: string) => setDrafts((d) => ({ ...d, [stopId]: { ...d[stopId], receivedNotes: value } }))

  const allLineItems = stops.flatMap((s) => s.lineItems)
  const totalOrdered = allLineItems.reduce((sum, li) => sum + li.orderedQuantity * li.pricePerUnit, 0)
  const totalReceived = stops.reduce((sum, stop) => {
    const draft = drafts[stop.id]
    return (
      sum +
      stop.lineItems.reduce((s2, li) => {
        const qty = Number(draft?.quantities[li.id] ?? 0)
        return s2 + (Number.isFinite(qty) ? qty : 0) * li.pricePerUnit
      }, 0)
    )
  }, 0)
  const variancePct = totalOrdered > 0 ? Math.round(((totalReceived - totalOrdered) / totalOrdered) * 100) : 0

  const handleConfirm = async () => {
    for (const stop of stops) {
      for (const li of stop.lineItems) {
        const raw = drafts[stop.id]?.quantities[li.id]
        if (raw === undefined || raw === '' || Number(raw) < 0 || Number.isNaN(Number(raw))) {
          toast.error('กรอกจำนวนที่รับจริงให้ครบทุกรายการก่อนยืนยัน')
          return
        }
      }
    }

    const ok = await confirm({
      title: 'บันทึกรับของ?',
      message: `ระบบจะปิด ${runSheet.runSheetNumber} และบันทึกจำนวนที่รับจริงของทั้ง ${stops.length} จุดจอด ไม่สามารถย้อนกลับได้`,
      confirmLabel: 'บันทึกรับของ',
      tone: 'primary',
    })
    if (!ok) return

    recordReceipt(
      runSheet.id,
      stops.map((stop) => ({
        stopId: stop.id,
        receivedNotes: drafts[stop.id]?.receivedNotes ?? '',
        lineItems: stop.lineItems.map((li) => ({ id: li.id, actualReceivedQuantity: Number(drafts[stop.id]?.quantities[li.id] ?? 0) })),
      })),
    )
    toast.success(`บันทึกรับของแล้ว ส่วนต่าง ${variancePct > 0 ? '+' : ''}${variancePct}%`)
    navigate({ to: '/logistics/run-sheets/$runSheetId', params: { runSheetId: runSheet.id } })
  }

  const handleSaveDraft = () => {
    saveReceiptDraft(
      runSheet.id,
      stops.map((stop) => ({
        stopId: stop.id,
        receivedNotes: drafts[stop.id]?.receivedNotes ?? '',
        lineItems: stop.lineItems.map((li) => {
          const raw = drafts[stop.id]?.quantities[li.id]
          const qty = raw === undefined || raw === '' || Number.isNaN(Number(raw)) ? null : Number(raw)
          return { id: li.id, actualReceivedQuantity: qty }
        }),
      })),
    )
    toast.success('บันทึกร่างแล้ว')
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
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-separate text-base [border-spacing:0_0.5rem]">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="py-2 pr-3 pl-3.5 font-light">เลขที่ใบสั่งซื้อ</th>
                      <th className="py-2 pr-3 font-light">วัตถุดิบ</th>
                      <th className="py-2 pr-3 font-light">สั่ง</th>
                      <th className="py-2 pr-3 font-light">รับจริง</th>
                      <th className="py-2 pr-3.5 font-light">ส่วนต่าง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stop.lineItems.map((li) => {
                      const raw = draft?.quantities[li.id] ?? ''
                      const actual = raw === '' ? null : Number(raw)
                      return (
                        <tr key={li.id}>
                          <td className="rounded-l-[0.875rem] border-y border-l border-line py-3 pr-3 pl-3.5">{li.poNumber}</td>
                          <td className="border-y border-line py-3 pr-3">{li.rawMaterialName}</td>
                          <td className="border-y border-line py-3 pr-3 tabular-nums whitespace-nowrap">
                            {li.orderedQuantity.toLocaleString()} {li.unit}
                          </td>
                          <td className="border-y border-line py-3 pr-3">
                            <TextField
                              type="number"
                              min={0}
                              aria-label={`จำนวน ${li.rawMaterialName} ที่รับจริง`}
                              value={raw}
                              onChange={(e) => setQuantity(stop.id, li.id, e.target.value)}
                              containerClassName="mb-0 w-28"
                            />
                          </td>
                          <td className="rounded-r-[0.875rem] border-y border-r border-line py-3 pr-3.5">
                            <StatusPill tone={varianceTone(li.orderedQuantity, actual)}>{varianceLabel(li.orderedQuantity, actual)}</StatusPill>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <TextArea
                label="หมายเหตุ (ไม่บังคับ)"
                placeholder="เช่น ดอกไม้เสียหายระหว่างขนขึ้นรถ ซัพพลายเออร์มีของน้อยกว่าที่แจ้ง..."
                value={draft?.receivedNotes ?? ''}
                onChange={(e) => setNotes(stop.id, e.target.value)}
                containerClassName="mt-4"
              />
            </Card>
          )
        })}

        <Card>
          <CardHeader title="สรุป" subtitle="ตรวจสอบก่อนยืนยัน การยืนยันจะปิดใบวิ่งรถ" />
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
              <Button variant="outline" onClick={handleSaveDraft}>
                บันทึกร่าง
              </Button>
              <Button onClick={handleConfirm}>ยืนยันและปิดใบวิ่งรถ</Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
