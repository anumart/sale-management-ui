import { Link } from '@tanstack/react-router'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconCheck, IconPrinter } from '@/components/icons'
import { Button, Card, CardHeader, StatusPill } from '@/components/ui'
import { finishedGoodById } from '@/features/procurement/mockData'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { useCustomer, useSalesStore } from './store'
import { formatBaht, formatDate, invoiceStatusLabel, invoiceStatusTone, invoiceTotal } from './utils'

export function InvoiceDetailPage({ invoiceId }: { invoiceId: string }) {
  const invoice = useSalesStore((s) => s.invoices.find((i) => i.id === invoiceId))
  const orders = useSalesStore((s) => s.orders)
  const reports = useSalesStore((s) => s.reports)
  const markInvoicePaid = useSalesStore((s) => s.markInvoicePaid)
  const customer = useCustomer(invoice?.customerId)

  if (!invoice) {
    return (
      <>
        <PageHeading section="ขาย" parent={{ label: 'ใบแจ้งหนี้', to: '/sales/invoices' }} title="ใบแจ้งหนี้" />
        <Card>
          <p className="text-muted">ไม่พบใบแจ้งหนี้</p>
        </Card>
      </>
    )
  }

  const order = invoice.source === 'customer_order' ? orders.find((o) => o.id === invoice.sourceId) : undefined
  const report = invoice.source === 'sales_report' ? reports.find((r) => r.id === invoice.sourceId) : undefined

  const handlePaid = async () => {
    const ok = await confirm({ title: 'ยืนยันว่าชำระแล้ว?', message: `${invoice.invoiceNumber} — ${formatBaht(invoiceTotal(invoice))}`, confirmLabel: 'ชำระแล้ว', tone: 'primary' })
    if (!ok) return
    markInvoicePaid(invoice.id)
    toast.success(`บันทึก ${invoice.invoiceNumber} ว่าชำระแล้ว`)
  }

  return (
    <>
      <div className="print:hidden">
        <PageHeading section="ขาย" parent={{ label: 'ใบแจ้งหนี้', to: '/sales/invoices' }} title={invoice.invoiceNumber} subtitle={customer?.name} />
      </div>

      <Card className="print:shadow-none">
        <CardHeader
          title={`ใบแจ้งหนี้ ${invoice.invoiceNumber}`}
          subtitle="Bangkok Flower"
          action={
            <div className="flex items-center gap-2 print:hidden">
              <StatusPill tone={invoiceStatusTone[invoice.status]}>{invoiceStatusLabel[invoice.status]}</StatusPill>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <IconPrinter />
                พิมพ์
              </Button>
              {invoice.status === 'issued' && (
                <Button size="sm" onClick={handlePaid}>
                  <IconCheck />
                  ชำระแล้ว
                </Button>
              )}
            </div>
          }
        />

        <div className="mb-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted">เรียกเก็บจาก</p>
            <p className="font-medium">{customer?.name}</p>
            <p className="text-sm text-ink-2">{customer?.address}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted">ออกเมื่อ</p>
              <p className="font-medium">{formatDate(invoice.issuedAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted">ครบกำหนด</p>
              <p className="font-medium">{formatDate(invoice.dueDate)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-muted">อ้างอิง</p>
              {order && (
                <Link to="/sales/orders/$orderId" params={{ orderId: order.id }} className="font-medium text-primary-fg hover:underline">
                  คำสั่งซื้อ {order.orderNumber}
                </Link>
              )}
              {report && (
                <Link to="/sales/reports/$reportId" params={{ reportId: report.id }} className="font-medium text-primary-fg hover:underline">
                  รายงานยอดขาย {report.reportNumber} ({formatDate(report.periodFrom)} – {formatDate(report.periodTo)})
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-separate text-base [border-spacing:0_0.5rem]">
            <thead>
              <tr className="text-left text-sm text-muted">
                <th className="px-3.5 pb-1 font-semibold">สินค้า</th>
                <th className="px-3.5 pb-1 text-right font-semibold">จำนวน</th>
                <th className="px-3.5 pb-1 text-right font-semibold">ราคาต่อหน่วย</th>
                <th className="px-3.5 pb-1 text-right font-semibold">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l) => {
                const fg = finishedGoodById(l.finishedGoodId)
                return (
                  <tr key={l.finishedGoodId}>
                    <td className="rounded-l-[0.875rem] border-y border-l border-line px-3.5 py-3 font-medium">{fg?.name}</td>
                    <td className="border-y border-line px-3.5 py-3 text-right tabular-nums">
                      {l.quantity} {fg?.unit}
                    </td>
                    <td className="border-y border-line px-3.5 py-3 text-right tabular-nums">{formatBaht(l.unitPrice)}</td>
                    <td className="rounded-r-[0.875rem] border-y border-r border-line px-3.5 py-3 text-right tabular-nums">{formatBaht(l.quantity * l.unitPrice)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <div className="text-right">
            <p className="text-sm text-muted">ยอดรวม</p>
            <p className="text-display font-semibold tabular-nums">{formatBaht(invoiceTotal(invoice))}</p>
            {invoice.paidAt && <p className="text-sm text-success-fg">ชำระเมื่อ {formatDate(invoice.paidAt)}</p>}
          </div>
        </div>
      </Card>
    </>
  )
}
