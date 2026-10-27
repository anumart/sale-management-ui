import { useNavigate } from '@tanstack/react-router'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconTrash } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, SegmentedControl, StatusPill, StepProgress, TextField, Timeline, TimelineStep, type DataTableColumn } from '@/components/ui'
import { planSourceLabel, useWizardPlanLines } from './demand'
import { computeRequiredQuantities, finishedGoodById, rawMaterialById } from './mockData'
import { HistoryPicker, OrdersPicker, ProductPicker } from './PlanSourcePickers'
import { useWizardStore, wizardSteps, type WizardLine } from './store'
import type { PlanSource } from './types'
import { roundQty } from './utils'

const sourceHint: Record<PlanSource, string> = {
  sales_history: 'ดูยอดขายย้อนหลังตามช่วงวันที่ เลือกสินค้าที่ต้องการแล้วเพิ่มเข้าแผน',
  customer_orders: 'เลือกคำสั่งซื้อที่ยืนยันแล้วและรอวางแผนจัดซื้อ ระบบเพิ่มสินค้าและจำนวนของทุกรายการในใบให้',
  finished_goods: 'ค้นหาสินค้าสำเร็จรูปจากแคตตาล็อกเอง ระบุจำนวนที่ต้องการแล้วเพิ่มเข้าแผน',
}

export function NewPlanStep1Page() {
  const navigate = useNavigate()
  const { sourceTab, lines, setSourceTab, setQuantity, removeLine } = useWizardStore()
  const { planLines } = useWizardPlanLines()

  const planReady = lines.length > 0 && lines.every((l) => l.quantity > 0)
  const rmRows = [...computeRequiredQuantities(planLines).entries()].map(([rawMaterialId, quantity]) => ({ rawMaterialId, quantity }))

  const lineColumns: DataTableColumn<WizardLine>[] = [
    { key: 'name', label: 'สินค้า', render: (l) => <span className="font-medium">{finishedGoodById(l.finishedGoodId)?.name}</span> },
    {
      key: 'origins',
      label: 'ที่มา',
      render: (l) => (
        <div className="flex flex-wrap gap-1.5">
          {l.origins.map((o) => (
            <StatusPill key={o.key} tone={o.kind === 'customer_orders' ? 'info' : o.kind === 'sales_history' ? 'accent' : 'neutral'}>
              {o.label} · {o.quantity}
            </StatusPill>
          ))}
        </div>
      ),
    },
    {
      key: 'quantity',
      label: 'จำนวนที่วางแผน',
      render: (l) => (
        <div className="flex items-center gap-2">
          <TextField
            type="number"
            min={0}
            aria-label={`จำนวนที่วางแผนของ ${finishedGoodById(l.finishedGoodId)?.name}`}
            value={l.quantity}
            onChange={(e) => setQuantity(l.finishedGoodId, Math.max(0, Number(e.target.value)))}
            className="w-28"
            containerClassName="mb-0"
          />
          <span className="text-muted">{finishedGoodById(l.finishedGoodId)?.unit}</span>
        </div>
      ),
    },
  ]

  const rmColumns: DataTableColumn<(typeof rmRows)[number]>[] = [
    { key: 'name', label: 'วัตถุดิบ', render: (r) => rawMaterialById(r.rawMaterialId)?.nameTh },
    { key: 'qty', label: 'จำนวนที่ต้องใช้', cellClassName: 'tabular-nums', render: (r) => `${roundQty(r.quantity)} ${rawMaterialById(r.rawMaterialId)?.unit ?? ''}` },
  ]

  return (
    <>
      <PageHeading section="จัดซื้อ" parent={{ label: 'แผนจัดซื้อ', to: '/procurement/plans' }} title="สร้างแผนจัดซื้อ" subtitle="เลือกที่มาของข้อมูล วางแผนจำนวนสินค้า แล้วดูวัตถุดิบที่ต้องใช้" />

      <StepProgress steps={wizardSteps} current={0} />

      <Timeline className="mb-6">
        <TimelineStep number={1} done={lines.length > 0} markerClassName="top-6 xl:top-7">
          <Card>
            <CardHeader
              title="ที่มาของข้อมูล"
              subtitle={sourceHint[sourceTab]}
              action={
                <SegmentedControl
                  variant="mask"
                  aria-label="ที่มาของข้อมูล"
                  value={sourceTab}
                  onChange={setSourceTab}
                  options={(['sales_history', 'customer_orders', 'finished_goods'] as const).map((s) => ({ value: s, label: planSourceLabel[s] }))}
                />
              }
            />
            {sourceTab === 'sales_history' && <HistoryPicker />}
            {sourceTab === 'customer_orders' && <OrdersPicker />}
            {sourceTab === 'finished_goods' && <ProductPicker />}
          </Card>
        </TimelineStep>

        <TimelineStep number={2} done={planReady} markerClassName="top-6 xl:top-7">
          <Card>
            <CardHeader title="แผนการจัดซื้อ" subtitle="จำนวนตั้งต้นมาจากรายการที่เลือกด้านบน แก้ไขได้ตลอด หรือลบสินค้าออกจากแผน" />
            {lines.length === 0 ? (
              <p className="py-4 text-muted">ยังไม่มีสินค้าในแผน เลือกจากที่มาของข้อมูลด้านบนแล้วกด "เพิ่มเข้าแผน"</p>
            ) : (
              <DataTable
                columns={lineColumns}
                rows={lines}
                rowKey={(l) => l.finishedGoodId}
                sortable={false}
                pageSize={10}
                paginationVariant="jump"
                emptyTitle="ไม่มีสินค้า"
                renderActions={(l) => (
                  <Button size="sm" variant="danger" iconOnly outlined aria-label="ลบออกจากแผน" tooltip="ลบออกจากแผน" onClick={() => removeLine(l.finishedGoodId)}>
                    <IconTrash />
                  </Button>
                )}
              />
            )}
          </Card>
        </TimelineStep>

        <TimelineStep number={3} markerClassName="top-6 xl:top-7">
          <Card>
            <CardHeader title="ประมาณการวัตถุดิบที่ต้องใช้" subtitle="คำนวณจากสูตรการผลิต (BOM) ของสินค้าในแผน" />
            {rmRows.length === 0 ? (
              <p className="py-4 text-muted">เพิ่มสินค้าในแผนอย่างน้อย 1 รายการเพื่อดูวัตถุดิบที่ต้องใช้</p>
            ) : (
              <DataTable columns={rmColumns} rows={rmRows} rowKey={(r) => r.rawMaterialId} sortable={false} pageSize={10} paginationVariant="jump" emptyTitle="ไม่มีวัตถุดิบ" />
            )}
          </Card>
        </TimelineStep>
      </Timeline>

      <div className="flex justify-end">
        <Button disabled={!planReady} onClick={() => navigate({ to: '/procurement/plans/new/step-2' })}>
          ถัดไป: ตรวจสอบและสร้าง
        </Button>
      </div>
    </>
  )
}
