import { Link, useNavigate } from '@tanstack/react-router'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconCheck, IconReceipt } from '@/components/icons'
import { Alert, Button, Card, CardHeader, StatusPill, TextArea, TextField } from '@/components/ui'
import { finishedGoodById } from '@/features/procurement/mockData'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { productPrices } from './mockData'
import { useCustomer, useSalesStore } from './store'
import { formatBaht, formatDate, reconcileReport, reportStatusLabel, reportStatusTone } from './utils'

const cellFirst = 'rounded-l-[0.875rem] border-y border-l border-line px-3.5 py-3'
const cell = 'border-y border-line px-3.5 py-3 tabular-nums'
const cellLast = 'rounded-r-[0.875rem] border-y border-r border-line px-3.5 py-3 tabular-nums'

export function SalesReportDetailPage({ reportId }: { reportId: string }) {
  const navigate = useNavigate()
  const report = useSalesStore((s) => s.reports.find((r) => r.id === reportId))
  const visits = useSalesStore((s) => s.visits)
  const tolerancePct = useSalesStore((s) => s.tolerancePct)
  const customer = useCustomer(report?.customerId)
  const { setConfirmedQty, setReportNote, confirmReport, issueReportInvoice } = useSalesStore.getState()

  if (!report) {
    return (
      <>
        <PageHeading section="ขาย" parent={{ label: 'ยอดขายจากร้าน', to: '/sales/reports' }} title="รายงาน" />
        <Card>
          <p className="text-muted">ไม่พบรายงานยอดขาย</p>
        </Card>
      </>
    )
  }

  const pending = report.status === 'pending'
  const rows = reconcileReport(report, visits, tolerancePct)
  const mismatches = rows.filter((r) => !r.withinTolerance)
  const billQty = (fgId: string) => {
    const line = report.lines.find((l) => l.finishedGoodId === fgId)
    return line ? (line.confirmedQuantity ?? line.reportedQuantity) : 0
  }
  const total = rows.reduce((sum, r) => sum + billQty(r.finishedGoodId) * (productPrices[r.finishedGoodId] ?? 0), 0)

  const handleConfirm = async () => {
    if (mismatches.length > 0 && !report.note.trim()) {
      toast.error('มีสินค้าที่ส่วนต่างเกินเกณฑ์ กรุณาบันทึกหมายเหตุว่าตกลงกันอย่างไรก่อน')
      return
    }
    const ok = await confirm({
      title: 'ยืนยันยอดขายนี้?',
      message: `ร้านจะถูกเรียกเก็บ ${formatBaht(total)} ตามจำนวนที่ยืนยัน`,
      confirmLabel: 'ยืนยันยอดขาย',
      tone: 'primary',
    })
    if (!ok) return
    confirmReport(report.id)
    toast.success(`ยืนยัน ${report.reportNumber} แล้ว`)
  }

  const handleInvoice = () => {
    const invoiceId = issueReportInvoice(report.id)
    if (!invoiceId) {
      toast.error('ไม่มีรายการให้ออกใบแจ้งหนี้')
      return
    }
    toast.success('ออกใบแจ้งหนี้แล้ว')
    navigate({ to: '/sales/invoices/$invoiceId', params: { invoiceId } })
  }

  return (
    <>
      <PageHeading section="ขาย" parent={{ label: 'ยอดขายจากร้าน', to: '/sales/reports' }} title={report.reportNumber} subtitle={customer?.name} />

      <Card className="mb-6">
        <CardHeader title="รายงาน" action={<StatusPill tone={reportStatusTone[report.status]}>{reportStatusLabel[report.status]}</StatusPill>} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-muted">ร้าน</p>
            <Link to="/sales/customers/$customerId" params={{ customerId: report.customerId }} className="font-medium text-primary-fg hover:underline">
              {customer?.name}
            </Link>
          </div>
          <div>
            <p className="text-sm text-muted">ช่วงเวลา</p>
            <p className="font-medium">
              {formatDate(report.periodFrom)} – {formatDate(report.periodTo)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">รับเมื่อ</p>
            <p className="font-medium">{formatDate(report.receivedAt)}</p>
          </div>
          <div>
            <p className="text-sm text-muted">ใบแจ้งหนี้</p>
            {report.invoiceId ? (
              <Link to="/sales/invoices/$invoiceId" params={{ invoiceId: report.invoiceId }} className="font-medium text-primary-fg hover:underline">
                ดูใบแจ้งหนี้
              </Link>
            ) : (
              <p className="font-medium">—</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader title="กระทบยอด" subtitle={`ยอดที่ควรขายได้ = จำนวนที่หายไปจากชั้นระหว่างการเข้าร้านที่ลงชื่อแล้วในช่วงนี้ เกณฑ์ ±${tolerancePct}% (ค่าชั่วคราว)`} />
        {mismatches.length > 0 && pending && (
          <Alert tone="danger" title={`มี ${mismatches.length} สินค้าที่ส่วนต่างเกินเกณฑ์`} className="mb-4">
            สอบถามร้าน กำหนดจำนวนที่จะคิดเงิน และบันทึกสิ่งที่ตกลงกัน
          </Alert>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-separate text-base [border-spacing:0_0.5rem]">
            <thead>
              <tr className="text-left text-sm text-muted">
                <th className="px-3.5 pb-1 font-semibold">สินค้า</th>
                <th className="px-3.5 pb-1 font-semibold">ควรขายได้</th>
                <th className="px-3.5 pb-1 font-semibold">ร้านแจ้ง</th>
                <th className="px-3.5 pb-1 font-semibold">ส่วนต่าง</th>
                <th className="px-3.5 pb-1 font-semibold">จำนวนคิดเงิน</th>
                <th className="px-3.5 pb-1 font-semibold">ราคาต่อหน่วย</th>
                <th className="px-3.5 pb-1 font-semibold">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.finishedGoodId} className={!r.withinTolerance ? 'bg-danger-bg' : undefined}>
                  <td className={cellFirst}>
                    <span className="font-medium">{finishedGoodById(r.finishedGoodId)?.name}</span>
                  </td>
                  <td className={cell}>{r.expected}</td>
                  <td className={cell}>{r.reported}</td>
                  <td className={cell}>
                    <StatusPill tone={r.withinTolerance ? 'success' : 'danger'}>
                      {r.diff > 0 ? '+' : ''}
                      {r.diff} ({Math.round(r.diffPct)}%)
                    </StatusPill>
                  </td>
                  <td className={cell}>
                    {pending && report.lines.some((l) => l.finishedGoodId === r.finishedGoodId) ? (
                      <TextField
                        type="number"
                        min={0}
                        aria-label={`จำนวนคิดเงิน ${finishedGoodById(r.finishedGoodId)?.name}`}
                        value={billQty(r.finishedGoodId)}
                        onChange={(e) => setConfirmedQty(report.id, r.finishedGoodId, Number(e.target.value) || 0)}
                        containerClassName="mb-0 w-24"
                      />
                    ) : (
                      billQty(r.finishedGoodId)
                    )}
                  </td>
                  <td className={cell}>{formatBaht(productPrices[r.finishedGoodId] ?? 0)}</td>
                  <td className={cellLast}>{formatBaht(billQty(r.finishedGoodId) * (productPrices[r.finishedGoodId] ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-right text-title font-semibold tabular-nums">รวม {formatBaht(total)}</p>
      </Card>

      <Card>
        <CardHeader
          title="สรุปยอด"
          action={
            pending ? (
              <Button onClick={handleConfirm}>
                <IconCheck />
                ยืนยันยอดขาย
              </Button>
            ) : report.status === 'confirmed' ? (
              <Button onClick={handleInvoice}>
                <IconReceipt />
                ออกใบแจ้งหนี้
              </Button>
            ) : undefined
          }
        />
        <TextArea
          label="หมายเหตุ"
          placeholder="เช่น ร้านนับใหม่แล้ว ทานตะวัน 1 ช่อเสียหายที่ร้าน คิดเงินตามที่ร้านแจ้ง"
          value={report.note}
          onChange={(e) => setReportNote(report.id, e.target.value)}
          disabled={!pending}
          containerClassName="mb-0"
        />
      </Card>
    </>
  )
}
