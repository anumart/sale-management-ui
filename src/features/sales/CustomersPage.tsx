import { useNavigate } from '@tanstack/react-router'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, FilterSelect, ListToolbar, StatusPill, type DataTableColumn } from '@/components/ui'
import { useListCriteria } from '@/hooks/useListCriteria'
import { countBy, matchesText, sumCounts } from '@/lib/criteria'
import { useSalesStore } from './store'
import type { Customer, CustomerType } from './types'
import { customerTypeLabel, customerTypeTone, formatBaht, invoiceTotal } from './utils'

interface Criteria {
  query: string
  type: CustomerType | 'all'
}

const emptyCriteria: Criteria = { query: '', type: 'all' }

export function CustomersPage() {
  const navigate = useNavigate()
  const customers = useSalesStore((s) => s.customers)
  const shopStock = useSalesStore((s) => s.shopStock)
  const orders = useSalesStore((s) => s.orders)
  const invoices = useSalesStore((s) => s.invoices)
  const { criteria, update, clear, page, setPage } = useListCriteria(emptyCriteria)

  const needle = criteria.query.trim().toLowerCase()
  const rows = customers.filter(
    (c) => (criteria.type === 'all' || c.type === criteria.type) && matchesText(needle, c.code, c.name, c.contactPerson, c.phone, c.email),
  )
  // Type counts ignore the type filter itself so each option shows what picking it would give.
  const typeCounts = countBy(customers.filter((c) => matchesText(needle, c.code, c.name, c.contactPerson, c.phone, c.email)), (c) => c.type)
  const hasCriteria = !!criteria.query || criteria.type !== 'all'
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
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {c.name}
            {c.country && <StatusPill tone="accent">ส่งออก · {c.country}</StatusPill>}
          </p>
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
        />

        <ListToolbar
          searchLabel="ค้นหาลูกค้า"
          searchPlaceholder="ค้นหารหัส, ชื่อ, ผู้ติดต่อ, โทรศัพท์, อีเมล"
          query={criteria.query}
          onQueryChange={(query) => update({ query })}
          filters={
            <FilterSelect
              label="ประเภท"
              value={criteria.type}
              neutralValue="all"
              onChange={(type) => update({ type })}
              options={[
                { value: 'all', label: 'ทั้งหมด', count: sumCounts(typeCounts) },
                { value: 'direct', label: customerTypeLabel.direct, tone: customerTypeTone.direct, count: typeCounts.get('direct') ?? 0 },
                { value: 'consignment', label: customerTypeLabel.consignment, tone: customerTypeTone.consignment, count: typeCounts.get('consignment') ?? 0 },
              ]}
              className="w-full sm:w-64"
            />
          }
          resultText={`พบ ${rows.length} จาก ${customers.length} ราย`}
          hasCriteria={hasCriteria}
          onClear={clear}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(c) => c.id}
          defaultSort={{ key: 'code', dir: 'asc' }}
          pageSize={10}
          page={page}
          onPageChange={setPage}
          paginationVariant="jump"
          emptyTitle="ไม่พบลูกค้า"
          emptyDescription={hasCriteria ? 'ลองลดเงื่อนไขหรือกด "ล้างเงื่อนไข"' : undefined}
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
