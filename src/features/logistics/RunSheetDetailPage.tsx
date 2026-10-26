import { useNavigate } from '@tanstack/react-router'
import type { ComponentType, ReactNode } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import {
  IconBox,
  IconCalendar,
  IconCheck,
  IconClock,
  IconEdit,
  IconMapPin,
  IconPhone,
  IconPrinter,
  IconReceipt,
  IconTruck,
  type IconProps,
} from '@/components/icons'
import { Button, Card, StageTracker, StatusPill, Timeline, TimelineStep } from '@/components/ui'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { toast } from '@/stores/toastStore'
import { pickupPointById } from './mockData'
import { useLogisticsStore, vehicleById, vehicleRouteById } from './store'
import type { RunSheet, RunSheetStatus } from './types'
import { varianceLabel, varianceTone } from './utils'

const runSheetsParent = { label: 'ใบวิ่งรถ', to: '/logistics/run-sheets' }

const stages: { key: RunSheetStatus; label: string; icon: ComponentType<IconProps> }[] = [
  { key: 'draft', label: 'ร่าง', icon: IconEdit },
  { key: 'printed', label: 'พิมพ์แล้ว', icon: IconPrinter },
  { key: 'in_progress', label: 'กำลังดำเนินการ', icon: IconTruck },
  { key: 'completed', label: 'เสร็จแล้ว', icon: IconCheck },
]

function stageTimestamp(runSheet: RunSheet, key: RunSheetStatus) {
  if (key === 'draft') return runSheet.createdAt
  if (key === 'printed') return runSheet.printedAt
  if (key === 'in_progress') return runSheet.returnedAt
  return runSheet.completedAt
}

/** Draft → Printed → In Progress → Completed, with the current stage pulsing. */
function RunSheetStepper({ runSheet }: { runSheet: RunSheet }) {
  const currentIndex = stages.findIndex((s) => s.key === runSheet.status)
  return (
    <Card className="mb-6">
      <StageTracker
        current={currentIndex}
        stages={stages.map((s) => {
          const timestamp = stageTimestamp(runSheet, s.key)
          return { label: s.label, icon: s.icon, caption: timestamp ? formatDateTime(timestamp) : '—' }
        })}
      />
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

export interface RunSheetDetailPageProps {
  runSheetId: string
}

export function RunSheetDetailPage({ runSheetId }: RunSheetDetailPageProps) {
  const navigate = useNavigate()
  const runSheet = useLogisticsStore((s) => s.runSheets.find((rs) => rs.id === runSheetId))
  const printRunSheet = useLogisticsStore((s) => s.printRunSheet)
  const startReceipt = useLogisticsStore((s) => s.startReceipt)

  if (!runSheet) {
    return (
      <>
        <PageHeading section="ขนส่ง" parent={runSheetsParent} title="ใบวิ่งรถ" />
        <Card>
          <p className="text-muted">ไม่พบใบวิ่งรถ</p>
        </Card>
      </>
    )
  }

  const vehicle = vehicleById(runSheet.vehicleId)
  const route = vehicleRouteById(runSheet.vehicleRouteId)
  const stops = [...runSheet.stops].sort((a, b) => a.sequence - b.sequence)
  const showReceipt = runSheet.status === 'completed'

  const allLineItems = stops.flatMap((s) => s.lineItems)
  const poCount = new Set(allLineItems.map((li) => li.poNumber)).size

  const orderedTotal = stops.reduce((sum, s) => sum + s.lineItems.reduce((s2, li) => s2 + li.orderedQuantity * li.pricePerUnit, 0), 0)
  const receivedTotal = stops.reduce(
    (sum, s) => sum + s.lineItems.reduce((s2, li) => s2 + (li.actualReceivedQuantity ?? 0) * li.pricePerUnit, 0),
    0,
  )

  const handlePrint = () => {
    printRunSheet(runSheet.id)
    toast.success('พิมพ์ใบวิ่งรถแล้ว')
  }

  const handleStartReceipt = () => {
    startReceipt(runSheet.id)
    toast.success(`เริ่มบันทึกรับของของ ${runSheet.runSheetNumber}`)
    navigate({ to: '/logistics/run-sheets/$runSheetId/record-receipt', params: { runSheetId: runSheet.id } })
  }

  return (
    <>
      <PageHeading section="ขนส่ง" parent={runSheetsParent} title={runSheet.runSheetNumber} />

      <RunSheetStepper runSheet={runSheet} />

      <div className="mb-6 grid overflow-hidden rounded-card glass shadow-card lg:grid-cols-[1.1fr_1.4fr]">
        <div className="flex flex-col gap-5 border-b border-line p-6 lg:border-r lg:border-b-0 xl:p-7">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-[1.1rem] bg-primary-soft text-primary-fg [&>svg]:size-6">
              <IconTruck />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold">{vehicle?.code ?? '—'}</p>
              <p className="text-sm text-muted">
                {vehicle?.licensePlate} · บรรทุก {vehicle?.capacityKg.toLocaleString()} กก.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-control [&>svg]:size-4 [&>svg]:text-muted">
            <IconMapPin />
            {route?.routeName} · {stops.length} จุดจอด
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-dashed border-line pt-4">
            <div className="min-w-0">
              <p className="text-xs text-muted">คนขับ</p>
              <p className="truncate text-control font-medium">{vehicle?.driverName ?? '—'}</p>
            </div>
            {vehicle && (
              <a
                href={`tel:${vehicle.driverPhone}`}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-soft-hover [&>svg]:size-3.5"
              >
                <IconPhone />
                {vehicle.driverPhone}
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5 p-6 xl:p-7">
          <Stat icon={<IconCalendar />} label="วันที่วิ่ง" value={formatDateTime(runSheet.runDate)} />
          <Stat icon={<IconClock />} label="พิมพ์เมื่อ" value={runSheet.printedAt ? formatDateTime(runSheet.printedAt) : '—'} />
          <Stat
            icon={<IconBox />}
            label="รายการ"
            value={`${allLineItems.length} รายการ จาก ${poCount} ใบสั่งซื้อ`}
          />
          <Stat icon={<IconReceipt />} label={showReceipt ? 'ยอดรับรวม' : 'ยอดสั่งรวม'} value={formatCurrency(showReceipt ? receivedTotal : orderedTotal)} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-title font-semibold">จุดรับของ</h2>
        <StatusPill tone="neutral">{showReceipt ? 'จำนวนที่สั่งเทียบกับที่รับจริง' : 'เรียงตามลำดับจุดจอดสำหรับคนขับ'}</StatusPill>
      </div>

      <Timeline>
        {stops.map((stop) => {
          const point = pickupPointById(stop.pickupPointId)
          const stopTotal = stop.lineItems.reduce((sum, li) => sum + li.orderedQuantity * li.pricePerUnit, 0)
          return (
            <TimelineStep key={stop.id} number={stop.sequence}>

              <div className="rounded-[1.35rem] glass p-5 shadow-card transition-[box-shadow,transform] duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-pop">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{point?.supplierName}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {point?.location} · {point?.contactPerson} · {point?.phone}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-fill px-2.5 py-1 text-sm text-muted">{point?.routeName}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-separate text-sm [border-spacing:0_0.375rem]">
                    <thead>
                      <tr className="text-left text-muted">
                        <th className="py-1.5 pr-3 pl-3.5 font-light">เลขที่ใบสั่งซื้อ</th>
                        <th className="py-1.5 pr-3 font-light">วัตถุดิบ</th>
                        <th className="py-1.5 pr-3 font-light">สั่ง</th>
                        {showReceipt ? (
                          <>
                            <th className="py-1.5 pr-3 font-light">รับจริง</th>
                            <th className="py-1.5 pr-3.5 font-light">ส่วนต่าง</th>
                          </>
                        ) : (
                          <th className="py-1.5 pr-3.5 font-light">รวม</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {stop.lineItems.map((li) => (
                        <tr key={li.id}>
                          <td className="rounded-l-[0.875rem] border-y border-l border-line py-1.5 pr-3 pl-3.5">{li.poNumber}</td>
                          <td className="border-y border-line py-1.5 pr-3">{li.rawMaterialName}</td>
                          <td className="border-y border-line py-1.5 pr-3 tabular-nums whitespace-nowrap">
                            {li.orderedQuantity.toLocaleString()} {li.unit}
                          </td>
                          {showReceipt ? (
                            <>
                              <td className="border-y border-line py-1.5 pr-3 tabular-nums whitespace-nowrap">
                                {li.actualReceivedQuantity?.toLocaleString() ?? '—'} {li.unit}
                              </td>
                              <td className="rounded-r-[0.875rem] border-y border-r border-line py-1.5 pr-3.5">
                                <StatusPill tone={varianceTone(li.orderedQuantity, li.actualReceivedQuantity)}>
                                  {varianceLabel(li.orderedQuantity, li.actualReceivedQuantity)}
                                </StatusPill>
                              </td>
                            </>
                          ) : (
                            <td className="rounded-r-[0.875rem] border-y border-r border-line py-1.5 pr-3.5 tabular-nums">{formatCurrency(li.orderedQuantity * li.pricePerUnit)}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!showReceipt && <p className="mt-1.5 text-right text-sm text-muted">รวมจุดนี้: {formatCurrency(stopTotal)}</p>}
                  {showReceipt && stop.receivedNotes && <p className="mt-2 text-sm text-muted">หมายเหตุ: {stop.receivedNotes}</p>}
                </div>
              </div>
            </TimelineStep>
          )
        })}
      </Timeline>

      <div className="sticky bottom-5 z-10 mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.25rem] grad-dark px-6 py-4 text-on-dark shadow-pop">
        <div>
          <p className="text-xs text-ink-2">
            {showReceipt ? `จากยอดสั่ง ${formatCurrency(orderedTotal)}` : `${stops.length} จุดจอด · ${allLineItems.length} รายการ`}
          </p>
          <p className="text-display font-semibold tabular-nums">{formatCurrency(showReceipt ? receivedTotal : orderedTotal)}</p>
        </div>

        {runSheet.status === 'draft' && (
          <Button onClick={handlePrint}>
            <IconPrinter />
            พิมพ์แล้ว
          </Button>
        )}
        {runSheet.status === 'printed' && (
          <Button onClick={handleStartReceipt}>
            <IconTruck />
            คนขับกลับมาแล้ว — เริ่มบันทึกรับของ
          </Button>
        )}
        {runSheet.status === 'in_progress' && (
          <Button onClick={() => navigate({ to: '/logistics/run-sheets/$runSheetId/record-receipt', params: { runSheetId: runSheet.id } })}>
            บันทึกรับของต่อ
          </Button>
        )}
      </div>
    </>
  )
}
