import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEdit, IconEye, IconInbox } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, Modal, SegmentedControl, Select, StatusPill, type DataTableColumn } from '@/components/ui'
import { useProductionStore } from '@/features/production/store'
import { formatDateTime } from '@/lib/format'
import { toast } from '@/stores/toastStore'
import { customerById, useSalesStore } from './store'
import type { CustomerOrder, CustomerOrderStage, EmailImport } from './types'
import { formatDate, importStatusLabel, importStatusTone, orderStage, orderStageLabel, orderStageTone } from './utils'

type StageFilter = 'all' | 'review' | 'production' | 'ready' | 'done'
const filterStages: Record<StageFilter, CustomerOrderStage[] | null> = {
  all: null,
  review: ['needs_review', 'to_confirm'],
  production: ['awaiting_production', 'in_production'],
  ready: ['ready'],
  done: ['delivered', 'cancelled'],
}

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
        onChange={(e) => setCustomerId(e.target.value)}
        options={customers.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
      />
    </Modal>
  )
}

function ImportInbox() {
  const navigate = useNavigate()
  const imports = useSalesStore((s) => s.imports)
  const orders = useSalesStore((s) => s.orders)
  const runEmailImport = useSalesStore((s) => s.runEmailImport)
  const [assigning, setAssigning] = useState<EmailImport | null>(null)

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
      <DataTable
        columns={columns}
        rows={imports}
        rowKey={(i) => i.id}
        defaultSort={{ key: 'received', dir: 'desc' }}
        pageSize={5}
        emptyTitle="ยังไม่มีอีเมลที่นำเข้า"
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
      <AssignCustomerModal imp={assigning} onClose={() => setAssigning(null)} />
    </Card>
  )
}

export function CustomerOrdersPage() {
  const navigate = useNavigate()
  const orders = useSalesStore((s) => s.orders)
  const productionOrders = useProductionStore((s) => s.orders)
  const [filter, setFilter] = useState<StageFilter>('all')

  const withStage = orders.map((o) => ({ order: o, stage: orderStage(o, productionOrders) }))
  const rows = withStage.filter((r) => !filterStages[filter] || filterStages[filter]!.includes(r.stage))
  const reviewCount = withStage.filter((r) => r.stage === 'needs_review' || r.stage === 'to_confirm').length

  const columns: DataTableColumn<{ order: CustomerOrder; stage: CustomerOrderStage }>[] = [
    { key: 'number', label: 'เลขที่', sortValue: (r) => r.order.orderNumber, render: (r) => <span className="font-medium">{r.order.orderNumber}</span> },
    { key: 'customer', label: 'ลูกค้า', sortValue: (r) => customerById(r.order.customerId)?.name ?? '', render: (r) => customerById(r.order.customerId)?.name },
    { key: 'received', label: 'รับเมื่อ', sortValue: (r) => r.order.receivedAt, render: (r) => formatDateTime(r.order.receivedAt) },
    { key: 'delivery', label: 'ส่งภายใน', sortValue: (r) => r.order.requestedDeliveryDate, render: (r) => formatDate(r.order.requestedDeliveryDate) },
    { key: 'items', label: 'รายการ', sortValue: (r) => r.order.lines.length, render: (r) => <span className="tabular-nums">{r.order.lines.length}</span> },
    { key: 'stage', label: 'สถานะ', sortValue: (r) => r.stage, render: (r) => <StatusPill tone={orderStageTone[r.stage]}>{orderStageLabel[r.stage]}</StatusPill> },
    { key: 'invoice', label: 'ใบแจ้งหนี้', sortValue: (r) => (r.order.invoiceId ? 1 : 0), render: (r) => (r.order.invoiceId ? <StatusPill tone="success">ออกแล้ว</StatusPill> : '—') },
  ]

  return (
    <>
      <PageHeading section="ขาย" title="คำสั่งซื้อ" subtitle="โจทย์ 1 — รับคำสั่งซื้อทางอีเมล ยืนยัน ผลิตให้ลูกค้ารายนั้น ส่งของ และออกใบแจ้งหนี้" />

      <ImportInbox />

      <Card>
        <CardHeader
          title="คำสั่งซื้อทั้งหมด"
          subtitle={reviewCount > 0 ? `มี ${reviewCount} คำสั่งซื้อรอพนักงานตรวจและยืนยัน` : 'ไม่มีคำสั่งซื้อรอตรวจ'}
          action={
            <SegmentedControl
              variant="mask"
              aria-label="กรองตามสถานะ"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'ทั้งหมด' },
                { value: 'review', label: 'รอตรวจ' },
                { value: 'production', label: 'ผลิต' },
                { value: 'ready', label: 'พร้อมส่ง' },
                { value: 'done', label: 'ปิดแล้ว' },
              ]}
            />
          }
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.order.id}
          defaultSort={{ key: 'received', dir: 'desc' }}
          pageSize={10}
          emptyTitle="ไม่มีคำสั่งซื้อในมุมมองนี้"
          emptyDescription="กดนำเข้าจากอีเมลเพื่อดึงคำสั่งซื้อของวันนี้"
          renderActions={(r) => (
            <Button size="sm" variant="soft" iconOnly outlined aria-label="ดู" tooltip="ดู" onClick={() => navigate({ to: '/sales/orders/$orderId', params: { orderId: r.order.id } })}>
              <IconEye />
            </Button>
          )}
        />
      </Card>
    </>
  )
}
