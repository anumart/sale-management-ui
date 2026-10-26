import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconChart, IconCheck, IconEye, IconMapPin, IconPlus, IconTrash } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, Select, StatusPill, TextField, type DataTableColumn } from '@/components/ui'
import { getFinishedGoods } from '@/features/catalog/store'
import { finishedGoodById } from '@/features/procurement/mockData'
import { useProductionStore } from '@/features/production/store'
import { formatDateTime } from '@/lib/format'
import { toast } from '@/stores/toastStore'
import { NewSalesReportModal } from './NewSalesReportModal'
import { NewVisitModal } from './NewVisitModal'
import { useSalesStore } from './store'
import type { ConsignmentVisit, Customer, CustomerOrder, ImportFormatProfile, Invoice, SalesReport, ShopStock } from './types'
import {
  customerTypeLabel,
  customerTypeTone,
  formatBaht,
  formatDate,
  invoiceStatusLabel,
  invoiceStatusTone,
  invoiceTotal,
  orderStage,
  orderStageLabel,
  orderStageTone,
  reportStatusLabel,
  reportStatusTone,
  shopLedger,
  visitSoldByProduct,
  visitStatusLabel,
  visitStatusTone,
  type ShopLedgerRow,
} from './utils'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-muted">{label}</p>
      <div className="text-base font-medium break-words">{children}</div>
    </div>
  )
}

const emptyProfile = (email: string): ImportFormatProfile => ({
  senderEmail: email,
  fileType: 'xlsx',
  headerRow: 1,
  productColumn: '',
  quantityColumn: '',
  deliveryDateCell: '',
  skuMap: [],
})

/** The fixed attachment layout this customer always sends — how the cron job reads its orders. */
function ImportProfileCard({ customer }: { customer: Customer }) {
  const saveImportProfile = useSalesStore((s) => s.saveImportProfile)
  const [draft, setDraft] = useState<ImportFormatProfile>(customer.importProfile ?? emptyProfile(customer.email))

  useEffect(() => setDraft(customer.importProfile ?? emptyProfile(customer.email)), [customer])

  const set = (patch: Partial<ImportFormatProfile>) => setDraft((d) => ({ ...d, ...patch }))
  const setSku = (i: number, patch: Partial<ImportFormatProfile['skuMap'][number]>) => set({ skuMap: draft.skuMap.map((m, j) => (j === i ? { ...m, ...patch } : m)) })

  const save = () => {
    if (!draft.senderEmail.trim() || !draft.productColumn.trim() || !draft.quantityColumn.trim()) {
      toast.error('ต้องกรอกอีเมลผู้ส่ง คอลัมน์สินค้า และคอลัมน์จำนวน')
      return
    }
    if (draft.skuMap.some((m) => !m.customerSku.trim() || !m.finishedGoodId)) {
      toast.error('ทุกรหัสสินค้าต้องจับคู่กับสินค้าของเรา')
      return
    }
    saveImportProfile(customer.id, { ...draft, skuMap: draft.skuMap.map((m) => ({ ...m, customerSku: m.customerSku.trim().toUpperCase() })) })
    toast.success('บันทึก format แล้ว การนำเข้าครั้งถัดไปจะใช้ค่านี้')
  }

  return (
    <Card className="mb-6">
      <CardHeader
        title="Format ไฟล์แนบในอีเมล"
        subtitle="ลูกค้าแต่ละรายส่งไฟล์รูปแบบเดิมทุกครั้ง ระบบจะจับคู่จากอีเมลผู้ส่งแล้วอ่านไฟล์ตามค่าที่ตั้งไว้นี้"
        action={
          <Button onClick={save}>
            <IconCheck />
            บันทึก Format
          </Button>
        }
      />
      <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
        <TextField label="อีเมลผู้ส่ง" required value={draft.senderEmail} onChange={(e) => set({ senderEmail: e.target.value })} />
        <Select
          label="ประเภทไฟล์"
          value={draft.fileType}
          onChange={(fileType) => set({ fileType })}
          options={[
            { value: 'xlsx' as const, label: 'ไฟล์ Excel (.xlsx)' },
            { value: 'csv' as const, label: 'ไฟล์ CSV' },
            { value: 'pdf' as const, label: 'ฟอร์ม PDF' },
          ]}
        />
        <TextField label="แถวหัวตาราง" type="number" min={1} value={draft.headerRow} onChange={(e) => set({ headerRow: Math.max(1, Number(e.target.value) || 1) })} />
        <TextField label="คอลัมน์สินค้า" required value={draft.productColumn} onChange={(e) => set({ productColumn: e.target.value })} />
        <TextField label="คอลัมน์จำนวน" required value={draft.quantityColumn} onChange={(e) => set({ quantityColumn: e.target.value })} />
        <TextField label="ช่องวันที่ส่ง" value={draft.deliveryDateCell} onChange={(e) => set({ deliveryDateCell: e.target.value })} />
      </div>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-control font-medium text-ink-2">รหัสสินค้า</p>
        <Button size="sm" variant="outline" onClick={() => set({ skuMap: [...draft.skuMap, { customerSku: '', finishedGoodId: '' }] })}>
          <IconPlus />
          เพิ่มรหัส
        </Button>
      </div>
      {draft.skuMap.length === 0 ? (
        <p className="text-sm text-muted">ยังไม่มีรหัสสินค้า รายการที่รหัสไม่ตรงจะถูกส่งไปรอตรวจ</p>
      ) : (
        <ul className="space-y-2">
          {draft.skuMap.map((m, i) => (
            <li key={i} className="flex flex-wrap items-center gap-3 rounded-[0.875rem] border border-line px-3.5 py-2.5">
              <TextField aria-label="รหัสสินค้าของลูกค้า" placeholder="รหัสของลูกค้า" value={m.customerSku} onChange={(e) => setSku(i, { customerSku: e.target.value })} containerClassName="mb-0 w-48" />
              <span className="text-muted">→</span>
              <Select
                aria-label="สินค้าของเรา"
                placeholder="สินค้าของเรา"
                value={m.finishedGoodId}
                onChange={(finishedGoodId) => setSku(i, { finishedGoodId })}
                options={getFinishedGoods(true).map((fg) => ({ value: fg.id, label: fg.name }))}
                containerClassName="mb-0 min-w-56 flex-1"
              />
              <Button size="sm" variant="danger" iconOnly outlined aria-label="ลบรหัส" title="ลบรหัส" onClick={() => set({ skuMap: draft.skuMap.filter((_, j) => j !== i) })}>
                <IconTrash />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function DirectCustomerSections({ customer }: { customer: Customer }) {
  const navigate = useNavigate()
  const orders = useSalesStore((s) => s.orders)
  const productionOrders = useProductionStore((s) => s.orders)
  const rows = orders.filter((o) => o.customerId === customer.id)

  const columns: DataTableColumn<CustomerOrder>[] = [
    { key: 'number', label: 'เลขที่', sortValue: (o) => o.orderNumber, render: (o) => <span className="font-medium">{o.orderNumber}</span> },
    { key: 'received', label: 'รับเมื่อ', sortValue: (o) => o.receivedAt, render: (o) => formatDateTime(o.receivedAt) },
    { key: 'delivery', label: 'ส่งภายใน', sortValue: (o) => o.requestedDeliveryDate, render: (o) => formatDate(o.requestedDeliveryDate) },
    {
      key: 'stage',
      label: 'สถานะ',
      sortValue: (o) => orderStage(o, productionOrders),
      render: (o) => <StatusPill tone={orderStageTone[orderStage(o, productionOrders)]}>{orderStageLabel[orderStage(o, productionOrders)]}</StatusPill>,
    },
  ]

  return (
    <>
      <ImportProfileCard customer={customer} />
      <Card className="mb-6">
        <CardHeader title="คำสั่งซื้อ" />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(o) => o.id}
          defaultSort={{ key: 'received', dir: 'desc' }}
          pageSize={5}
          emptyTitle="ยังไม่มีคำสั่งซื้อจากลูกค้ารายนี้"
          renderActions={(o) => (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="ดู" tooltip="ดู" onClick={() => navigate({ to: '/sales/orders/$orderId', params: { orderId: o.id } })}>
              <IconEye />
            </Button>
          )}
        />
      </Card>
    </>
  )
}

function ConsignmentSections({ customer }: { customer: Customer }) {
  const navigate = useNavigate()
  const shopStock = useSalesStore((s) => s.shopStock)
  const visits = useSalesStore((s) => s.visits)
  const reports = useSalesStore((s) => s.reports)
  const [visitOpen, setVisitOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const stock = shopStock.filter((s) => s.customerId === customer.id)
  const shopVisits = visits.filter((v) => v.customerId === customer.id)
  const shopReports = reports.filter((r) => r.customerId === customer.id)
  const ledger = shopLedger(customer.id, visits, stock, reports)

  const stockColumns: DataTableColumn<ShopStock>[] = [
    { key: 'fg', label: 'สินค้า', sortValue: (s) => finishedGoodById(s.finishedGoodId)?.name ?? '', render: (s) => <span className="font-medium">{finishedGoodById(s.finishedGoodId)?.name}</span> },
    { key: 'lot', label: 'LOT', sortValue: (s) => s.batchNumber, render: (s) => <span className="tabular-nums">{s.batchNumber}</span> },
    { key: 'qty', label: 'อยู่ที่ร้าน', sortValue: (s) => s.quantity, render: (s) => <span className="tabular-nums">{s.quantity} {finishedGoodById(s.finishedGoodId)?.unit}</span> },
  ]

  const ledgerColumns: DataTableColumn<ShopLedgerRow>[] = [
    { key: 'fg', label: 'สินค้า', sortValue: (r) => finishedGoodById(r.finishedGoodId)?.name ?? '', render: (r) => <span className="font-medium">{finishedGoodById(r.finishedGoodId)?.name}</span> },
    { key: 'delivered', label: 'ส่งเข้าร้าน', sortValue: (r) => r.delivered, render: (r) => <span className="tabular-nums">{r.delivered}</span> },
    { key: 'spoiled', label: 'ของเสีย', sortValue: (r) => r.spoiled, render: (r) => <span className="tabular-nums">{r.spoiled}</span> },
    { key: 'balance', label: 'อยู่ที่ร้าน', sortValue: (r) => r.balance, render: (r) => <span className="tabular-nums">{r.balance}</span> },
    { key: 'expected', label: 'ควรขายได้', sortValue: (r) => r.expectedSold, render: (r) => <span className="font-medium tabular-nums">{r.expectedSold}</span> },
    { key: 'reported', label: 'ร้านแจ้งขาย', sortValue: (r) => r.reported, render: (r) => <span className="tabular-nums">{r.reported}</span> },
    {
      key: 'gap',
      label: 'ยังไม่แจ้ง',
      sortValue: (r) => r.expectedSold - r.reported,
      render: (r) => {
        const gap = r.expectedSold - r.reported
        return gap === 0 ? <StatusPill tone="success">0</StatusPill> : <StatusPill tone={gap > 0 ? 'warning' : 'danger'}>{gap}</StatusPill>
      },
    },
  ]

  const visitColumns: DataTableColumn<ConsignmentVisit>[] = [
    { key: 'number', label: 'เลขที่', sortValue: (v) => v.visitNumber, render: (v) => <span className="font-medium">{v.visitNumber}</span> },
    { key: 'date', label: 'วันที่', sortValue: (v) => v.visitDate, render: (v) => formatDate(v.visitDate) },
    { key: 'driver', label: 'คนขับ', sortValue: (v) => v.driverName, render: (v) => v.driverName },
    { key: 'sold', label: 'ขายได้ตั้งแต่รอบก่อน', sortValue: (v) => [...visitSoldByProduct(v).values()].reduce((a, b) => a + b, 0), render: (v) => <span className="tabular-nums">{v.status === 'signed' ? [...visitSoldByProduct(v).values()].reduce((a, b) => a + b, 0) : '—'}</span> },
    { key: 'status', label: 'สถานะ', sortValue: (v) => v.status, render: (v) => <StatusPill tone={visitStatusTone[v.status]}>{visitStatusLabel[v.status]}</StatusPill> },
  ]

  const reportColumns: DataTableColumn<SalesReport>[] = [
    { key: 'number', label: 'เลขที่', sortValue: (r) => r.reportNumber, render: (r) => <span className="font-medium">{r.reportNumber}</span> },
    { key: 'period', label: 'ช่วงเวลา', sortValue: (r) => r.periodFrom, render: (r) => `${formatDate(r.periodFrom)} – ${formatDate(r.periodTo)}` },
    { key: 'units', label: 'จำนวนที่แจ้ง', sortValue: (r) => r.lines.reduce((s, l) => s + l.reportedQuantity, 0), render: (r) => <span className="tabular-nums">{r.lines.reduce((s, l) => s + l.reportedQuantity, 0)}</span> },
    { key: 'status', label: 'สถานะ', sortValue: (r) => r.status, render: (r) => <StatusPill tone={reportStatusTone[r.status]}>{reportStatusLabel[r.status]}</StatusPill> },
  ]

  return (
    <>
      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="สต็อกที่ร้าน"
            subtitle="แยกตาม LOT ณ การเข้าร้านที่ลงชื่อล่าสุด"
            action={
              <Button size="sm" onClick={() => setVisitOpen(true)}>
                <IconMapPin />
                เข้าร้านใหม่
              </Button>
            }
          />
          <DataTable columns={stockColumns} rows={stock} rowKey={(s) => s.batchNumber} defaultSort={{ key: 'lot', dir: 'asc' }} emptyTitle="ไม่มีสินค้าที่ร้านนี้" />
        </Card>
        <Card>
          <CardHeader title="บัญชีฝากขาย" subtitle="ควรขายได้ = ส่งเข้าร้าน − ของเสีย − คงเหลือที่ร้าน ราคาคิดต่อสินค้า จึงไม่ต้องแยก LOT ตอนคิดเงิน" />
          <DataTable columns={ledgerColumns} rows={ledger} rowKey={(r) => r.finishedGoodId} emptyTitle="ยังไม่มีการส่งของ" />
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader title="การเข้าร้าน" />
        <DataTable
          columns={visitColumns}
          rows={shopVisits}
          rowKey={(v) => v.id}
          defaultSort={{ key: 'date', dir: 'desc' }}
          pageSize={5}
          emptyTitle="ยังไม่มีการเข้าร้าน"
          renderActions={(v) => (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="ดู" tooltip="ดู" onClick={() => navigate({ to: '/sales/visits/$visitId', params: { visitId: v.id } })}>
              <IconEye />
            </Button>
          )}
        />
      </Card>

      <Card className="mb-6">
        <CardHeader
          title="รายงานยอดขาย"
          action={
            <Button size="sm" variant="outline" onClick={() => setReportOpen(true)}>
              <IconChart />
              บันทึกรายงาน
            </Button>
          }
        />
        <DataTable
          columns={reportColumns}
          rows={shopReports}
          rowKey={(r) => r.id}
          defaultSort={{ key: 'period', dir: 'desc' }}
          pageSize={5}
          emptyTitle="ร้านยังไม่ได้ส่งรายงาน"
          renderActions={(r) => (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="ดู" tooltip="ดู" onClick={() => navigate({ to: '/sales/reports/$reportId', params: { reportId: r.id } })}>
              <IconEye />
            </Button>
          )}
        />
      </Card>

      <NewVisitModal open={visitOpen} onClose={() => setVisitOpen(false)} customerId={customer.id} />
      <NewSalesReportModal open={reportOpen} onClose={() => setReportOpen(false)} customerId={customer.id} />
    </>
  )
}

export function CustomerDetailPage({ customerId }: { customerId: string }) {
  const navigate = useNavigate()
  const customer = useSalesStore((s) => s.customers.find((c) => c.id === customerId))
  const invoices = useSalesStore((s) => s.invoices)

  if (!customer) {
    return (
      <>
        <PageHeading section="ขาย" parent={{ label: 'ลูกค้า', to: '/sales/customers' }} title="ลูกค้า" />
        <Card>
          <p className="text-muted">ไม่พบลูกค้า</p>
        </Card>
      </>
    )
  }

  const customerInvoices = invoices.filter((i) => i.customerId === customer.id)
  const invoiceColumns: DataTableColumn<Invoice>[] = [
    { key: 'number', label: 'เลขที่', sortValue: (i) => i.invoiceNumber, render: (i) => <span className="font-medium">{i.invoiceNumber}</span> },
    { key: 'issued', label: 'ออกเมื่อ', sortValue: (i) => i.issuedAt, render: (i) => formatDate(i.issuedAt) },
    { key: 'total', label: 'ยอดรวม', sortValue: (i) => invoiceTotal(i), render: (i) => <span className="tabular-nums">{formatBaht(invoiceTotal(i))}</span> },
    { key: 'status', label: 'สถานะ', sortValue: (i) => i.status, render: (i) => <StatusPill tone={invoiceStatusTone[i.status]}>{invoiceStatusLabel[i.status]}</StatusPill> },
  ]

  return (
    <>
      <PageHeading section="ขาย" parent={{ label: 'ลูกค้า', to: '/sales/customers' }} title={customer.name} subtitle={customer.code} />

      <Card className="mb-6">
        <CardHeader title="ข้อมูลลูกค้า" action={<StatusPill tone={customerTypeTone[customer.type]}>{customerTypeLabel[customer.type]}</StatusPill>} />
        <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="ผู้ติดต่อ">{customer.contactPerson}</Field>
          <Field label="โทรศัพท์">{customer.phone}</Field>
          <Field label="อีเมล">{customer.email}</Field>
          <Field label={customer.type === 'consignment' ? 'ที่อยู่ร้าน' : 'ที่อยู่จัดส่ง'}>{customer.address}</Field>
        </div>
      </Card>

      {customer.type === 'direct' ? <DirectCustomerSections customer={customer} /> : <ConsignmentSections customer={customer} />}

      <Card>
        <CardHeader title="ใบแจ้งหนี้" />
        <DataTable
          columns={invoiceColumns}
          rows={customerInvoices}
          rowKey={(i) => i.id}
          defaultSort={{ key: 'issued', dir: 'desc' }}
          pageSize={5}
          emptyTitle="ยังไม่มีใบแจ้งหนี้"
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
