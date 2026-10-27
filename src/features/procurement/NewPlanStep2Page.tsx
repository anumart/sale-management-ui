import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { Button, Card, CardHeader, StepProgress, TextField } from '@/components/ui'
import { toast } from '@/stores/toastStore'
import { useSalesStore } from '@/features/sales/store'
import { planSourceLabel, useWizardPlanLines } from './demand'
import { buildPlanRawMaterials, finishedGoodById, rawMaterialById, suppliersFor } from './mockData'
import { useProcurementStore, useWizardStore, wizardSteps } from './store'
import type { PurchasePlan } from './types'
import { roundQty } from './utils'

export function NewPlanStep2Page() {
  const navigate = useNavigate()
  const { lines, planName, setPlanName, reset } = useWizardStore()
  const addPlan = useProcurementStore((s) => s.addPlan)
  const linkOrdersToPlan = useSalesStore((s) => s.linkOrdersToPlan)
  const { planLines, sources, orderIds } = useWizardPlanLines()

  const today = new Date()
  const sourceMonth = today.getMonth() + 1
  const sourceYear = today.getFullYear()
  const suggestedName = `แผนจัดซื้อ - ${today.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}`

  useEffect(() => {
    if (lines.length === 0) navigate({ to: '/procurement/plans/new/step-1' })
  }, [lines.length, navigate])

  const rawMaterials = buildPlanRawMaterials(planLines)

  const createPlan = () => {
    const plan: PurchasePlan = {
      id: `plan-${Date.now()}`,
      name: planName.trim() || suggestedName,
      status: 'draft',
      sourceMonth,
      sourceYear,
      createdByName: 'คุณ',
      createdAt: new Date().toISOString(),
      source: sources[0],
      sources,
      customerOrderIds: orderIds.length > 0 ? orderIds : undefined,
      lines: planLines,
      rawMaterials,
    }
    addPlan(plan)
    if (orderIds.length > 0) linkOrdersToPlan(orderIds, plan.id)
    toast.success('สร้างแผนจัดซื้อแล้ว')
    reset()
    navigate({ to: '/procurement/plans/$planId', params: { planId: plan.id } })
  }

  return (
    <>
      <PageHeading section="จัดซื้อ" parent={{ label: 'แผนจัดซื้อ', to: '/procurement/plans' }} title="สร้างแผนจัดซื้อ" subtitle="ตรวจสอบสินค้าและวัตถุดิบ แล้วสร้างแผนจัดซื้อ" />

      <StepProgress steps={wizardSteps} current={1} />

      <Card className="mb-6">
        <CardHeader title="รายละเอียดแผน" />
        <TextField
          label="ชื่อแผน"
          placeholder={suggestedName}
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          hint="แต่ละแผนใช้ได้ครั้งเดียวต่อรอบการจัดซื้อ และนำกลับมาใช้ซ้ำไม่ได้"
        />
      </Card>

      <Card className="mb-6">
        <CardHeader
          title="สินค้าที่จะผลิต"
          subtitle={`ที่มา: ${sources.map((s) => planSourceLabel[s]).join(', ')}`}
        />
        <div className="overflow-x-auto">
          <table className="w-full border-separate text-base [border-spacing:0_0.5rem]">
            <thead>
              <tr className="text-left text-muted">
                <th className="px-3.5 pb-4 font-light">สินค้า</th>
                <th className="px-3.5 pb-4 font-light">จำนวนที่วางแผน</th>
              </tr>
            </thead>
            <tbody>
              {planLines.map((line) => {
                const fg = finishedGoodById(line.finishedGoodId)
                return (
                  <tr key={line.finishedGoodId} className="hover:bg-hover">
                    <td className="rounded-l-[0.875rem] border-y border-l border-line px-3.5 py-4">{fg?.name}</td>
                    <td className="rounded-r-[0.875rem] border-y border-r border-line px-3.5 py-4 tabular-nums">
                      {line.plannedQuantity} {fg?.unit}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader title="สรุปวัตถุดิบ" subtitle="ยอดต้องซื้อสุทธิหักสต็อกคงคลังปัจจุบันแล้ว" />
        <div className="overflow-x-auto">
          <table className="w-full border-separate text-base [border-spacing:0_0.5rem]">
            <thead>
              <tr className="text-left text-muted">
                <th className="px-3.5 pb-4 font-light">วัตถุดิบ</th>
                <th className="px-3.5 pb-4 font-light">ต้องใช้</th>
                <th className="px-3.5 pb-4 font-light">คงคลัง</th>
                <th className="px-3.5 pb-4 font-light">ต้องซื้อสุทธิ</th>
                <th className="px-3.5 pb-4 font-light">ซัพพลายเออร์ที่มี</th>
              </tr>
            </thead>
            <tbody>
              {rawMaterials.map((rm) => {
                const material = rawMaterialById(rm.rawMaterialId)
                return (
                  <tr key={rm.rawMaterialId} className="hover:bg-hover">
                    <td className="rounded-l-[0.875rem] border-y border-l border-line px-3.5 py-4">{material?.nameTh}</td>
                    <td className="border-y border-line px-3.5 py-4 tabular-nums">
                      {roundQty(rm.requiredQuantity)} {material?.unit}
                    </td>
                    <td className="border-y border-line px-3.5 py-4 tabular-nums">
                      {roundQty(rm.onHandQuantitySnapshot)} {material?.unit}
                    </td>
                    <td className="border-y border-line px-3.5 py-4 font-medium tabular-nums">
                      {roundQty(rm.netRequiredQuantity)} {material?.unit}
                    </td>
                    <td className="rounded-r-[0.875rem] border-y border-r border-line px-3.5 py-4">{suppliersFor(rm.rawMaterialId).length}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate({ to: '/procurement/plans/new/step-1' })}>
          ย้อนกลับ
        </Button>
        <Button onClick={createPlan}>สร้างแผนจัดซื้อ</Button>
      </div>
    </>
  )
}
