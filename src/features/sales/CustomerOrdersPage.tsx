import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEdit, IconEye, IconInbox, IconPlus } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, DateRangePicker, FilterSelect, FilterSheet, ListToolbar, Modal, MultiSelectList, Select, StatusPill, useFilterSheet, type CriteriaChip, type DataTableColumn } from '@/components/ui'
import { useProductionStore } from '@/features/production/store'
import { useListCriteria } from '@/hooks/useListCriteria'
import { countBy, dateRangeText, inDateRange, matchesText, sumCounts } from '@/lib/criteria'
import { formatDateTime } from '@/lib/format'
import { toast } from '@/stores/toastStore'
import { customerById, useSalesStore } from './store'
import { NewOrderModal } from './NewOrderModal'
import type { CustomerOrder, CustomerOrderStage, EmailImport, EmailImportStatus, OrderChannel } from './types'
import { channelLabel, channelTone, formatDate, importStatusLabel, importStatusTone, orderStage, orderStageLabel, orderStageTone } from './utils'

type StageFilter = 'all' | 'review' | 'production' | 'ready' | 'done'
const stageGroups: Exclude<StageFilter, 'all'>[] = ['review', 'production', 'ready', 'done']
const stageGroupLabel: Record<StageFilter, string> = { all: 'ทั้งหมด', review: 'รอตรวจ', production: 'ผลิต', ready: 'พร้อมส่ง', done: 'ปิดแล้ว' }
const filterStages: Record<StageFilter, CustomerOrderStage[] | null> = {
  all: null,
  review: ['needs_review', 'to_confirm'],
  production: ['awaiting_production', 'in_production'],
  ready: ['ready'],
  done: ['delivered', 'cancelled'],
}

interface Criteria {
  query: string
  group: StageFilter
  customerIds: string[]
  channels: string[]
  invoice: string[]
  receivedFrom: string
  receivedTo: string
  deliveryFrom: string
  deliveryTo: string
}

const emptyCriteria: Criteria = { query: '', group: 'all', customerIds: [], channels: [], invoice: [], receivedFrom: '', receivedTo: '', deliveryFrom: '', deliveryTo: '' }

const channelOrder: OrderChannel[] = ['email', 'phone', 'platform', 'manual']

const groupOf = (stage: CustomerOrderStage) => stageGroups.find((g) => filterStages[g]!.includes(stage))

function AssignCustomerModal({ imp, onClose }: { imp: EmailImport | null; onClose: () => void }) {
  const navigate = useNavigate()
  const customers = useSalesStore((s) => s.customers).filter((c) => c.type === 'direct')
  const createOrderFromImport = useSalesStore((s) => s.createOrderFromImport)
  const [customerId, setCustomerId] = useState('')

  const submit = () => {
    if (!imp || !customerId) return
    const orderId = createOrderFromImport(imp.id, customerId)
    onClose()
    if (orderId) {
      toast.success('สร้างคำสั่งซื้อร่างแล้ว กรอกสินค้าตามไฟล์แนบได้เลย')
      navigate({ to: '/sales/orders/$orderId', params: { orderId } })
    }
  }

  return (
    <Modal
      open={!!imp}
      onClose={onClose}
      title="กรอกคำสั่งซื้อเอง"
      description={imp ? `ไม่มี format ลูกค้าที่ตรงกับ ${imp.fromAddress} เลือกลูกค้าแล้วกรอกคำสั่งซื้อตามไฟล์ ${imp.attachmentName}` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button disabled={!customerId} onClick={submit}>
            สร้างคำสั่งซื้อร่าง
          </Button>
        </>
      }
    >
      <Select
        label="ลูกค้า"
        placeholder="เลือกลูกค้าขายขาด"
        value={customerId}
        onChange={setCustomerId}
        options={customers.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
      />
    </Modal>
  )
}

interface ImportCriteria {
  query: string
  status: EmailImportStatus | 'all'
  linked: string[]
  receivedFrom: string
  receivedTo: string
}

const emptyImportCriteria: ImportCriteria = { query: '', status: 'all', linked: [], receivedFrom: '', receivedTo: '' }
const importStatusOrder: EmailImportStatus[] = ['parsed', 'needs_review', 'failed']
const linkedLabel: Record<string, string> = { yes: 'สร้างคำสั่งซื้อแล้ว', no: 'ยังไม่มีคำสั่งซื้อ' }

function ImportInbox() {
  const navigate = useNavigate()
  const imports = useSalesStore((s) => s.imports)
  const orders = useSalesStore((s) => s.orders)
  const runEmailImport = useSalesStore((s) => s.runEmailImport)
  const [assigning, setAssigning] = useState<EmailImport | null>(null)
  const { criteria, update, clear, page, setPage } = useListCriteria(emptyImportCriteria)
  const sheet = useFilterSheet()

  const needle = criteria.query.trim().toLowerCase()
  /** `skip` leaves one criterion out so the filter UI can show how many results each of its values would give. */
  const matches = (i: EmailImport, skip?: 'status' | 'linked') => {
    if (skip !== 'status' && criteria.status !== 'all' && i.status !== criteria.status) return false
    if (skip !== 'linked' && criteria.linked.length && !criteria.linked.includes(i.orderId ? 'yes' : 'no')) return false
    if (!inDateRange(i.receivedAt, criteria.receivedFrom, criteria.receivedTo)) return false
    return matchesText(needle, i.fromAddress, i.subject, i.attachmentName, customerById(i.customerId)?.name, orders.find((o) => o.id === i.orderId)?.orderNumber)
  }
  const rows = imports.filter((i) => matches(i))
  const statusCounts = countBy(imports.filter((i) => matches(i, 'status')), (i) => i.status)
  const linkedCounts = countBy(imports.filter((i) => matches(i, 'linked')), (i) => (i.orderId ? 'yes' : 'no'))
  const statusOptions = [
    { value: 'all' as const, label: 'ทั้งหมด', count: sumCounts(statusCounts) },
    ...importStatusOrder.map((st) => ({ value: st, label: importStatusLabel[st], tone: importStatusTone[st], count: statusCounts.get(st) ?? 0 })),
  ]
  const chips: CriteriaChip[] = [
    ...criteria.linked.map((v) => ({ key: `l-${v}`, label: 'คำสั่งซื้อ', value: linkedLabel[v], onRemove: () => update({ linked: criteria.linked.filter((x) => x !== v) }) })),
    ...(criteria.receivedFrom || criteria.receivedTo
      ? [{ key: 'received', label: 'รับเมื่อ', value: dateRangeText(criteria.receivedFrom, criteria.receivedTo), onRemove: () => update({ receivedFrom: '', receivedTo: '' }) }]
      : []),
  ]
  const hasAnyCriteria = chips.length > 0 || !!criteria.query || criteria.status !== 'all'

  const run = () => {
    const imp = runEmailImport()
    if (imp.status === 'parsed') toast.success(`นำเข้า ${imp.attachmentName} แล้ว คำสั่งซื้อพร้อมให้ยืนยัน`)
    else toast.info(`นำเข้า ${imp.attachmentName} แล้ว ต้องตรวจสอบ`)
  }

  const columns: DataTableColumn<EmailImport>[] = [
    { key: 'received', label: 'รับเมื่อ', sortValue: (i) => i.receivedAt, render: (i) => formatDateTime(i.receivedAt) },
    {
      key: 'from',
      label: 'ผู้ส่ง',
      sortValue: (i) => i.fromAddress,
      render: (i) => (
        <div className="min-w-0">
          <p className="font-medium">{customerById(i.customerId)?.name ?? 'ไม่ทราบผู้ส่ง'}</p>
          <p className="text-sm text-muted">{i.fromAddress}</p>
        </div>
      ),
    },
    { key: 'file', label: 'ไฟล์แนบ', sortValue: (i) => i.attachmentName, render: (i) => <span className="text-sm">{i.attachmentName}</span> },
    { key: 'order', label: 'คำสั่งซื้อ', sortValue: (i) => orders.find((o) => o.id === i.orderId)?.orderNumber ?? '', render: (i) => orders.find((o) => o.id === i.orderId)?.orderNumber ?? '—' },
    { key: 'status', label: 'สถานะ', sortValue: (i) => i.status, render: (i) => <StatusPill tone={importStatusTone[i.status]}>{importStatusLabel[i.status]}</StatusPill> },
    { key: 'issues', label: 'ปัญหา', sortable: false, render: (i) => <span className="text-sm text-muted">{i.issues.join(' · ') || '—'}</span> },
  ]

  return (
    <Card className="mb-6">
      <CardHeader
        title="นำเข้าจากอีเมล"
        subtitle="ระบบอ่านกล่องอีเมลคำสั่งซื้อทุกเช้าเวลา 06:00 และอ่านไฟล์แนบตาม format ของลูกค้าแต่ละราย"
        action={
          <Button variant="outline" onClick={run}>
            <IconInbox />
            นำเข้าตอนนี้
          </Button>
        }
      />
      <ListToolbar
        searchLabel="ค้นหาอีเมลที่นำเข้า"
        searchPlaceholder="ค้นหาผู้ส่ง, หัวเรื่อง, ไฟล์แนบ, คำสั่งซื้อ"
        query={criteria.query}
        onQueryChange={(query) => update({ query })}
        filters={
          <FilterSelect label="สถานะ" value={criteria.status} options={statusOptions} neutralValue="all" onChange={(status) => update({ status })} className="w-full sm:w-64" />
        }
        sheetCount={criteria.linked.length + (criteria.receivedFrom || criteria.receivedTo ? 1 : 0)}
        onOpenSheet={sheet.openSheet}
        chips={chips}
        resultText={`พบ ${rows.length} จาก ${imports.length} อีเมล`}
        hasCriteria={hasAnyCriteria}
        onClear={clear}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(i) => i.id}
        defaultSort={{ key: 'received', dir: 'desc' }}
        pageSize={5}
        page={page}
        onPageChange={setPage}
        paginationVariant="jump"
        emptyTitle="ไม่พบอีเมลที่นำเข้า"
        emptyDescription={hasAnyCriteria ? 'ลองลดเงื่อนไขหรือกด "ล้างเงื่อนไข"' : 'กด "นำเข้าตอนนี้" เพื่ออ่านกล่องอีเมลคำสั่งซื้อ'}
        renderActions={(i) =>
          i.orderId ? (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="เปิดคำสั่งซื้อ" tooltip="เปิดคำสั่งซื้อ" onClick={() => navigate({ to: '/sales/orders/$orderId', params: { orderId: i.orderId! } })}>
              <IconEye />
            </Button>
          ) : (
            <Button size="sm" variant="warning" iconOnly outlined aria-label="กรอกคำสั่งซื้อเอง" tooltip="กรอกคำสั่งซื้อเอง" onClick={() => setAssigning(i)}>
              <IconEdit />
            </Button>
          )
        }
      />
      <FilterSheet
        open={sheet.open}
        onClose={sheet.closeSheet}
        title="ตัวกรองอีเมลที่นำเข้า"
        resultCount={rows.length}
        onClear={() => update({ linked: [], receivedFrom: '', receivedTo: '' })}
      >
        <MultiSelectList
          label="คำสั่งซื้อ"
          options={Object.keys(linkedLabel).map((v) => ({ value: v, label: linkedLabel[v], count: linkedCounts.get(v) ?? 0 }))}
          value={criteria.linked}
          onChange={(linked) => update({ linked })}
        />
        <DateRangePicker label="รับเมื่อ" from={criteria.receivedFrom} to={criteria.receivedTo} onChange={(receivedFrom, receivedTo) => update({ receivedFrom, receivedTo })} />
      </FilterSheet>
      <AssignCustomerModal imp={assigning} onClose={() => setAssigning(null)} />
    </Card>
  )
}

export function CustomerOrdersPage() {
  const navigate = useNavigate()
  const orders = useSalesStore((s) => s.orders)
  const productionOrders = useProductionStore((s) => s.orders)
  const customers = useSalesStore((s) => s.customers)
  const { criteria, update, clear, page, setPage } = useListCriteria(emptyCriteria)
  const sheet = useFilterSheet()
  const [keying, setKeying] = useState(false)

  const withStage = orders.map((o) => ({ order: o, stage: orderStage(o, productionOrders) }))
  type Row = (typeof withStage)[number]

  const needle = criteria.query.trim().toLowerCase()
  /** `skip` leaves one criterion out so the filter UI can show how many results each of its values would give. */
  const matches = (r: Row, skip?: 'group' | 'customer' | 'invoice' | 'channel') => {
    if (skip !== 'group' && criteria.group !== 'all' && !filterStages[criteria.group]!.includes(r.stage)) return false
    if (skip !== 'customer' && criteria.customerIds.length && !criteria.customerIds.includes(r.order.customerId)) return false
    if (skip !== 'channel' && criteria.channels.length && !criteria.channels.includes(r.order.channel)) return false
    if (skip !== 'invoice' && criteria.invoice.length && !criteria.invoice.includes(r.order.invoiceId ? 'issued' : 'none')) return false
    if (!inDateRange(r.order.receivedAt, criteria.receivedFrom, criteria.receivedTo)) return false
    if (!inDateRange(r.order.requestedDeliveryDate, criteria.deliveryFrom, criteria.deliveryTo)) return false
    const customer = customerById(r.order.customerId)
    return matchesText(needle, r.order.orderNumber, customer?.name, customer?.code, r.order.platformOrderRef, r.order.platformName)
  }
  const rows = withStage.filter((r) => matches(r))

  const groupCounts = countBy(withStage.filter((r) => matches(r, 'group')), (r) => groupOf(r.stage))
  const customerCounts = countBy(withStage.filter((r) => matches(r, 'customer')), (r) => r.order.customerId)
  const channelCounts = countBy(withStage.filter((r) => matches(r, 'channel')), (r) => r.order.channel)
  const invoiceCounts = countBy(withStage.filter((r) => matches(r, 'invoice')), (r) => (r.order.invoiceId ? 'issued' : 'none'))
  const groupOptions = [
    { value: 'all' as StageFilter, label: stageGroupLabel.all, count: sumCounts(groupCounts) },
    ...stageGroups.map((g) => ({ value: g as StageFilter, label: stageGroupLabel[g], count: groupCounts.get(g) ?? 0 })),
  ]
  const invoiceLabel: Record<string, string> = { issued: 'ออกใบแจ้งหนี้แล้ว', none: 'ยังไม่ออกใบแจ้งหนี้' }

  const chips: CriteriaChip[] = [
    ...criteria.customerIds.map((id) => ({
      key: `c-${id}`,
      label: 'ลูกค้า',
      value: customerById(id)?.name ?? id,
      onRemove: () => update({ customerIds: criteria.customerIds.filter((x) => x !== id) }),
    })),
    ...criteria.channels.map((v) => ({ key: `ch-${v}`, label: 'ช่องทาง', value: channelLabel[v as OrderChannel], onRemove: () => update({ channels: criteria.channels.filter((x) => x !== v) }) })),
    ...criteria.invoice.map((v) => ({ key: `i-${v}`, label: 'ใบแจ้งหนี้', value: invoiceLabel[v], onRemove: () => update({ invoice: criteria.invoice.filter((x) => x !== v) }) })),
    ...(criteria.receivedFrom || criteria.receivedTo
      ? [{ key: 'received', label: 'รับเมื่อ', value: dateRangeText(criteria.receivedFrom, criteria.receivedTo), onRemove: () => update({ receivedFrom: '', receivedTo: '' }) }]
      : []),
    ...(criteria.deliveryFrom || criteria.deliveryTo
      ? [{ key: 'delivery', label: 'ส่งภายใน', value: dateRangeText(criteria.deliveryFrom, criteria.deliveryTo), onRemove: () => update({ deliveryFrom: '', deliveryTo: '' }) }]
      : []),
  ]
  const hasAnyCriteria = chips.length > 0 || !!criteria.query || criteria.group !== 'all'
  const sheetCount =
    criteria.customerIds.length + criteria.channels.length + criteria.invoice.length + (criteria.receivedFrom || criteria.receivedTo ? 1 : 0) + (criteria.deliveryFrom || criteria.deliveryTo ? 1 : 0)
  const reviewCount = withStage.filter((r) => r.stage === 'needs_review' || r.stage === 'to_confirm').length

  const columns: DataTableColumn<{ order: CustomerOrder; stage: CustomerOrderStage }>[] = [
    { key: 'number', label: 'เลขที่', sortValue: (r) => r.order.orderNumber, render: (r) => <span className="font-medium">{r.order.orderNumber}</span> },
    { key: 'customer', label: 'ลูกค้า', sortValue: (r) => customerById(r.order.customerId)?.name ?? '', render: (r) => customerById(r.order.customerId)?.name },
    { key: 'channel', label: 'ช่องทาง', sortValue: (r) => r.order.channel, render: (r) => (
      <div>
        <StatusPill tone={channelTone[r.order.channel]}>{channelLabel[r.order.channel]}</StatusPill>
        {r.order.platformOrderRef && <p className="mt-1 text-sm text-muted">{r.order.platformName} {r.order.platformOrderRef}</p>}
      </div>
    ) },
    { key: 'received', label: 'รับเมื่อ', sortValue: (r) => r.order.receivedAt, render: (r) => formatDateTime(r.order.receivedAt) },
    { key: 'delivery', label: 'ส่งภายใน', sortValue: (r) => r.order.requestedDeliveryDate, render: (r) => formatDate(r.order.requestedDeliveryDate) },
    { key: 'items', label: 'รายการ', sortValue: (r) => r.order.lines.length, render: (r) => <span className="tabular-nums">{r.order.lines.length}</span> },
    { key: 'stage', label: 'สถานะ', sortValue: (r) => r.stage, render: (r) => <StatusPill tone={orderStageTone[r.stage]}>{orderStageLabel[r.stage]}</StatusPill> },
    { key: 'invoice', label: 'ใบแจ้งหนี้', sortValue: (r) => (r.order.invoiceId ? 1 : 0), render: (r) => (r.order.invoiceId ? <StatusPill tone="success">ออกแล้ว</StatusPill> : '—') },
  ]

  return (
    <>
      <PageHeading section="ขาย" title="คำสั่งซื้อ" subtitle="คำสั่งซื้อจากอีเมล โทรศัพท์ หรือ platform ส่งออก — ยืนยัน ผลิตให้ลูกค้ารายนั้น ส่งของ และออกใบแจ้งหนี้" />

      <ImportInbox />

      <Card>
        <CardHeader
          title="คำสั่งซื้อทั้งหมด"
          subtitle={reviewCount > 0 ? `มี ${reviewCount} คำสั่งซื้อรอพนักงานตรวจและยืนยัน` : 'ไม่มีคำสั่งซื้อรอตรวจ'}
          action={
            <Button variant="outline" onClick={() => setKeying(true)}>
              <IconPlus />
              คีย์คำสั่งซื้อ
            </Button>
          }
        />

        <ListToolbar
          searchLabel="ค้นหาคำสั่งซื้อ"
          searchPlaceholder="ค้นหาเลขที่คำสั่งซื้อ, ชื่อหรือรหัสลูกค้า, เลขจาก platform"
          query={criteria.query}
          onQueryChange={(query) => update({ query })}
          filters={
            <FilterSelect label="สถานะ" value={criteria.group} options={groupOptions} neutralValue="all" onChange={(group) => update({ group })} className="w-full sm:w-64" />
          }
          sheetCount={sheetCount}
          onOpenSheet={sheet.openSheet}
          chips={chips}
          resultText={`พบ ${rows.length} จาก ${orders.length} คำสั่งซื้อ`}
          hasCriteria={hasAnyCriteria}
          onClear={clear}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.order.id}
          defaultSort={{ key: 'received', dir: 'desc' }}
          pageSize={10}
          page={page}
          onPageChange={setPage}
          paginationVariant="jump"
          emptyTitle="ไม่พบคำสั่งซื้อ"
          emptyDescription={hasAnyCriteria ? 'ลองลดเงื่อนไขหรือกด "ล้างเงื่อนไข"' : 'กดนำเข้าจากอีเมลเพื่อดึงคำสั่งซื้อของวันนี้'}
          renderActions={(r) => (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="ดู" tooltip="ดู" onClick={() => navigate({ to: '/sales/orders/$orderId', params: { orderId: r.order.id } })}>
              <IconEye />
            </Button>
          )}
        />
      </Card>

      <FilterSheet
        open={sheet.open}
        onClose={sheet.closeSheet}
        title="ตัวกรองคำสั่งซื้อ"
        resultCount={rows.length}
        onClear={() => update({ customerIds: [], channels: [], invoice: [], receivedFrom: '', receivedTo: '', deliveryFrom: '', deliveryTo: '' })}
      >
        <MultiSelectList
          label="ลูกค้า"
          options={customers.filter((c) => c.type === 'direct').map((c) => ({ value: c.id, label: c.name, count: customerCounts.get(c.id) ?? 0 }))}
          value={criteria.customerIds}
          onChange={(customerIds) => update({ customerIds })}
        />
        <MultiSelectList
          label="ช่องทาง"
          options={channelOrder.map((v) => ({ value: v, label: channelLabel[v], count: channelCounts.get(v) ?? 0 }))}
          value={criteria.channels}
          onChange={(channels) => update({ channels })}
        />
        <MultiSelectList
          label="ใบแจ้งหนี้"
          options={['issued', 'none'].map((v) => ({ value: v, label: invoiceLabel[v], count: invoiceCounts.get(v) ?? 0 }))}
          value={criteria.invoice}
          onChange={(invoice) => update({ invoice })}
        />
        <DateRangePicker label="รับเมื่อ" from={criteria.receivedFrom} to={criteria.receivedTo} onChange={(receivedFrom, receivedTo) => update({ receivedFrom, receivedTo })} />
        <DateRangePicker label="ส่งภายใน" from={criteria.deliveryFrom} to={criteria.deliveryTo} onChange={(deliveryFrom, deliveryTo) => update({ deliveryFrom, deliveryTo })} />
      </FilterSheet>
      <NewOrderModal open={keying} onClose={() => setKeying(false)} />
    </>
  )
}
