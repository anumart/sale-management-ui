import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, SegmentedControl, StatusPill, type DataTableColumn } from '@/components/ui'
import { customerById, useSalesStore } from './store'
import type { Invoice, InvoiceStatus } from './types'
import { formatBaht, formatDate, invoiceStatusLabel, invoiceStatusTone, invoiceTotal } from './utils'

export function InvoicesPage() {
  const navigate = useNavigate()
  const invoices = useSalesStore((s) => s.invoices)
  const orders = useSalesStore((s) => s.orders)
  const reports = useSalesStore((s) => s.reports)
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all')

  const rows = invoices.filter((i) => status === 'all' || i.status === status)
  const outstanding = invoices.filter((i) => i.status === 'issued').reduce((sum, i) => sum + invoiceTotal(i), 0)
  const sourceNumber = (i: Invoice) =>
    i.source === 'customer_order' ? orders.find((o) => o.id === i.sourceId)?.orderNumber : reports.find((r) => r.id === i.sourceId)?.reportNumber

  const columns: DataTableColumn<Invoice>[] = [
    { key: 'number', label: 'เลขที่', sortValue: (i) => i.invoiceNumber, render: (i) => <span className="font-medium">{i.invoiceNumber}</span> },
    { key: 'customer', label: 'ลูกค้า', sortValue: (i) => customerById(i.customerId)?.name ?? '', render: (i) => customerById(i.customerId)?.name },
    {
      key: 'source',
      label: 'อ้างอิง',
      sortValue: (i) => sourceNumber(i) ?? '',
      render: (i) => (
        <div>
          <p>{sourceNumber(i)}</p>
          <p className="text-sm text-muted">{i.source === 'customer_order' ? 'คำสั่งซื้อ' : 'รายงานยอดขายของร้าน'}</p>
        </div>
      ),
    },
    { key: 'issued', label: 'ออกเมื่อ', sortValue: (i) => i.issuedAt, render: (i) => formatDate(i.issuedAt) },
    { key: 'due', label: 'ครบกำหนด', sortValue: (i) => i.dueDate, render: (i) => formatDate(i.dueDate) },
    { key: 'total', label: 'ยอดรวม', sortValue: (i) => invoiceTotal(i), render: (i) => <span className="tabular-nums">{formatBaht(invoiceTotal(i))}</span> },
    { key: 'status', label: 'สถานะ', sortValue: (i) => i.status, render: (i) => <StatusPill tone={invoiceStatusTone[i.status]}>{invoiceStatusLabel[i.status]}</StatusPill> },
  ]

  return (
    <>
      <PageHeading section="ขาย" title="ใบแจ้งหนี้" subtitle="ขายขาดคิดเงินจากคำสั่งซื้อ ส่วนร้านฝากขายคิดเงินหลังยืนยันรายงานยอดขายแล้ว" />
      <Card>
        <CardHeader
          title="ใบแจ้งหนี้ทั้งหมด"
          subtitle={`ค้างชำระ ${formatBaht(outstanding)}`}
          action={
            <SegmentedControl
              variant="mask"
              aria-label="กรองตามสถานะ"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'ทั้งหมด' },
                { value: 'issued', label: 'รอชำระ' },
                { value: 'paid', label: 'ชำระแล้ว' },
              ]}
            />
          }
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(i) => i.id}
          defaultSort={{ key: 'issued', dir: 'desc' }}
          pageSize={10}
          emptyTitle="ไม่มีใบแจ้งหนี้ในมุมมองนี้"
          renderActions={(i) => (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="ดู" tooltip="ดู" onClick={() => navigate({ to: '/sales/invoices/$invoiceId', params: { invoiceId: i.id } })}>
              <IconEye />
            </Button>
          )}
        />
      </Card>
    </>
  )
}
