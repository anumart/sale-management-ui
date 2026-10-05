import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, SegmentedControl, StatusPill, type DataTableColumn } from '@/components/ui'
import { useSalesStore } from './store'
import type { Customer, CustomerType } from './types'
import { customerTypeLabel, customerTypeTone, formatBaht, invoiceTotal } from './utils'

export function CustomersPage() {
  const navigate = useNavigate()
  const customers = useSalesStore((s) => s.customers)
  const shopStock = useSalesStore((s) => s.shopStock)
  const orders = useSalesStore((s) => s.orders)
  const invoices = useSalesStore((s) => s.invoices)
  const [type, setType] = useState<CustomerType | 'all'>('all')

  const rows = customers.filter((c) => type === 'all' || c.type === type)
  const atShop = (c: Customer) => shopStock.filter((s) => s.customerId === c.id).reduce((sum, s) => sum + s.quantity, 0)
  const openOrders = (c: Customer) => orders.filter((o) => o.customerId === c.id && (o.status === 'draft' || o.status === 'confirmed')).length
  const unpaid = (c: Customer) => invoices.filter((i) => i.customerId === c.id && i.status === 'issued').reduce((sum, i) => sum + invoiceTotal(i), 0)

  const columns: DataTableColumn<Customer>[] = [
    { key: 'code', label: 'รหัส', sortValue: (c) => c.code, render: (c) => <span className="font-medium">{c.code}</span> },
    {
      key: 'name',
      label: 'ลูกค้า',
      sortValue: (c) => c.name.toLowerCase(),
      render: (c) => (
        <div>
          <p className="font-medium">{c.name}</p>
          <p className="text-sm text-muted">{c.contactPerson}</p>
        </div>
      ),
    },
    { key: 'type', label: 'ประเภท', sortValue: (c) => c.type, render: (c) => <StatusPill tone={customerTypeTone[c.type]}>{customerTypeLabel[c.type]}</StatusPill> },
    { key: 'phone', label: 'โทรศัพท์', sortValue: (c) => c.phone, render: (c) => c.phone },
    {
      key: 'activity',
      label: 'คำสั่งซื้อค้าง / สินค้าที่ร้าน',
      sortValue: (c) => (c.type === 'direct' ? openOrders(c) : atShop(c)),
      render: (c) => <span className="tabular-nums">{c.type === 'direct' ? `${openOrders(c)} คำสั่งซื้อ` : `${atShop(c)} ชิ้นที่ร้าน`}</span>,
    },
    { key: 'unpaid', label: 'ค้างชำระ', sortValue: (c) => unpaid(c), render: (c) => <span className="tabular-nums">{unpaid(c) ? formatBaht(unpaid(c)) : '—'}</span> },
  ]

  return (
    <>
      <PageHeading section="ขาย" title="ลูกค้า" subtitle="ลูกค้าขายขาดสั่งซื้อทางอีเมล ส่วนร้านฝากขายวางสินค้าของเราและจ่ายตามยอดที่ขายได้" />
      <Card>
        <CardHeader
          title="ลูกค้าทั้งหมด"
          action={
            <SegmentedControl
              variant="mask"
              aria-label="กรองตามประเภท"
              value={type}
              onChange={setType}
              options={[
                { value: 'all', label: 'ทั้งหมด' },
                { value: 'direct', label: 'ขายขาด' },
                { value: 'consignment', label: 'ฝากขาย' },
              ]}
            />
          }
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(c) => c.id}
          defaultSort={{ key: 'code', dir: 'asc' }}
          emptyTitle="ไม่มีลูกค้าในมุมมองนี้"
          renderActions={(c) => (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="ดู" tooltip="ดู" onClick={() => navigate({ to: '/sales/customers/$customerId', params: { customerId: c.id } })}>
              <IconEye />
            </Button>
          )}
        />
      </Card>
    </>
  )
}
