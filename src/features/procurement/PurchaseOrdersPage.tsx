import { useNavigate } from '@tanstack/react-router'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconArrowUpRight, IconCheck, IconClose, IconEye } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, DateRangePicker, FilterSelect, FilterSheet, ListToolbar, MultiSelectList, StatusPill, useFilterSheet, type CriteriaChip, type DataTableColumn } from '@/components/ui'
import { useCatalogStore } from '@/features/catalog/store'
import { useListCriteria } from '@/hooks/useListCriteria'
import { countBy, dateRangeText, inDateRange, matchesText } from '@/lib/criteria'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { planById, supplierById, useProcurementStore } from './store'
import type { PoStatus, PurchaseOrder } from './types'
import { poStatusLabel, poStatusTone } from './utils'

const statusOrder: PoStatus[] = ['draft', 'sent', 'confirmed', 'received', 'cancelled']

interface Criteria {
  query: string
  status: PoStatus | 'all'
  supplierIds: string[]
  planIds: string[]
  dueFrom: string
  dueTo: string
}

const emptyCriteria: Criteria = { query: '', status: 'all', supplierIds: [], planIds: [], dueFrom: '', dueTo: '' }

export function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const purchaseOrders = useProcurementStore((s) => s.purchaseOrders)
  const updatePurchaseOrderStatus = useProcurementStore((s) => s.updatePurchaseOrderStatus)
  const suppliers = useProcurementStore((s) => s.suppliers)
  const plans = useProcurementStore((s) => s.plans)
  const rawMaterials = useCatalogStore((s) => s.rawMaterials)
  const { criteria, update, clear: clearCriteria, page, setPage } = useListCriteria(emptyCriteria)
  const sheet = useFilterSheet()

  const handleSend = (po: PurchaseOrder, supplierName: string) => {
    if (updatePurchaseOrderStatus(po.id, 'sent')) toast.success(`ส่ง ${po.poNumber} ให้ ${supplierName} แล้ว`)
  }

  const handleConfirmBySupplier = (po: PurchaseOrder, supplierName: string) => {
    if (updatePurchaseOrderStatus(po.id, 'confirmed')) toast.success(`${supplierName} ยืนยัน ${po.poNumber} แล้ว`)
  }

  const handleCancel = async (po: PurchaseOrder, supplierName: string) => {
    const ok = await confirm({
      title: 'ยกเลิกใบสั่งซื้อ?',
      message: `${po.poNumber} ของ ${supplierName} (${formatCurrency(po.totalAmount)}) จะถูกยกเลิก ไม่สามารถย้อนกลับได้`,
      confirmLabel: 'ยกเลิกใบสั่งซื้อ',
      tone: 'danger',
    })
    if (!ok) return
    if (updatePurchaseOrderStatus(po.id, 'cancelled')) toast.success(`ยกเลิก ${po.poNumber} แล้ว`)
  }

  const needle = criteria.query.trim().toLowerCase()
  /** `skip` leaves one criterion out, so the filter sheet can show how many results each of its values would give. */
  const matches = (po: PurchaseOrder, skip?: 'status' | 'supplier' | 'plan') => {
    if (skip !== 'status' && criteria.status !== 'all' && po.status !== criteria.status) return false
    if (skip !== 'supplier' && criteria.supplierIds.length && !criteria.supplierIds.includes(po.supplierId)) return false
    if (skip !== 'plan' && criteria.planIds.length && !criteria.planIds.includes(po.planId)) return false
    if (!inDateRange(po.expectedDeliveryDate, criteria.dueFrom, criteria.dueTo)) return false
    return matchesText(
      needle,
      po.poNumber,
      supplierById(po.supplierId)?.name,
      planById(po.planId)?.name,
      ...po.lines.map((l) => rawMaterials.find((rm) => rm.id === l.rawMaterialId)?.nameTh),
    )
  }
  const rows = purchaseOrders.filter((po) => matches(po))

  const countFor = (skip: 'status' | 'supplier' | 'plan', key: 'status' | 'supplierId' | 'planId') =>
    countBy(purchaseOrders.filter((po) => matches(po, skip)), (po) => po[key])
  const statusCounts = countFor('status', 'status')
  const supplierCounts = countFor('supplier', 'supplierId')
  const planCounts = countFor('plan', 'planId')
  const statusOptions = [
    { value: 'all' as const, label: 'ทั้งหมด', count: [...statusCounts.values()].reduce((a, b) => a + b, 0) },
    ...statusOrder.map((s) => ({ value: s, label: poStatusLabel[s], tone: poStatusTone[s], count: statusCounts.get(s) ?? 0 })),
  ]

  const sheetCount = criteria.supplierIds.length + criteria.planIds.length + (criteria.dueFrom || criteria.dueTo ? 1 : 0)

  const chips: CriteriaChip[] = [
    ...criteria.supplierIds.map((id) => ({
      key: `s-${id}`,
      label: 'ซัพพลายเออร์',
      value: supplierById(id)?.name ?? id,
      onRemove: () => update({ supplierIds: criteria.supplierIds.filter((x) => x !== id) }),
    })),
    ...criteria.planIds.map((id) => ({
      key: `p-${id}`,
      label: 'แผน',
      value: planById(id)?.name ?? id,
      onRemove: () => update({ planIds: criteria.planIds.filter((x) => x !== id) }),
    })),
    ...(criteria.dueFrom || criteria.dueTo
      ? [
          {
            key: 'due',
            label: 'กำหนดส่ง',
            value: dateRangeText(criteria.dueFrom, criteria.dueTo),
            onRemove: () => update({ dueFrom: '', dueTo: '' }),
          },
        ]
      : []),
  ]
  const hasAnyCriteria = chips.length > 0 || !!criteria.query || criteria.status !== 'all'

  const columns: DataTableColumn<PurchaseOrder>[] = [
    { key: 'poNumber', label: 'เลขที่ใบสั่งซื้อ', sortValue: (po) => po.poNumber, render: (po) => <span className="font-medium">{po.poNumber}</span> },
    { key: 'plan', label: 'แผน', sortValue: (po) => (planById(po.planId)?.name ?? '').toLowerCase(), render: (po) => planById(po.planId)?.name ?? '—' },
    {
      key: 'supplier',
      label: 'ซัพพลายเออร์',
      sortValue: (po) => (supplierById(po.supplierId)?.name ?? '').toLowerCase(),
      render: (po) => supplierById(po.supplierId)?.name ?? '—',
    },
    { key: 'amount', label: 'จำนวนเงิน', sortValue: (po) => po.totalAmount, render: (po) => <span className="tabular-nums">{formatCurrency(po.totalAmount)}</span> },
    {
      key: 'status',
      label: 'สถานะ',
      sortValue: (po) => po.status,
      render: (po) => <StatusPill tone={poStatusTone[po.status]}>{poStatusLabel[po.status]}</StatusPill>,
    },
    {
      key: 'delivery',
      label: 'กำหนดส่ง',
      sortValue: (po) => po.expectedDeliveryDate,
      render: (po) => <span className="whitespace-nowrap">{formatDateTime(po.expectedDeliveryDate)}</span>,
    },
  ]

  return (
    <>
      <PageHeading section="จัดซื้อ" title="ใบสั่งซื้อ" />
      <Card>
        <CardHeader title="ใบสั่งซื้อทั้งหมด" subtitle="การเปลี่ยนสถานะเก็บไว้เฉพาะรอบการใช้งานนี้ ไม่มีการส่งจริงถึงซัพพลายเออร์" />

        <ListToolbar
          searchLabel="ค้นหาใบสั่งซื้อ"
          searchPlaceholder="ค้นหาเลขที่ใบสั่งซื้อ, ซัพพลายเออร์, วัตถุดิบ"
          query={criteria.query}
          onQueryChange={(query) => update({ query })}
          filters={
            <FilterSelect
              label="สถานะ"
              value={criteria.status}
              options={statusOptions}
              neutralValue="all"
              onChange={(status) => update({ status })}
              className="w-full sm:w-64"
            />
          }
          sheetCount={sheetCount}
          onOpenSheet={sheet.openSheet}
          chips={chips}
          resultText={`พบ ${rows.length} จาก ${purchaseOrders.length} ใบสั่งซื้อ`}
          hasCriteria={hasAnyCriteria}
          onClear={clearCriteria}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(po) => po.id}
          pageSize={10}
          page={page}
          onPageChange={setPage}
          paginationVariant="jump"
          emptyTitle="ไม่พบใบสั่งซื้อ"
          emptyDescription={hasAnyCriteria ? 'ลองลดเงื่อนไขหรือกด "ล้างเงื่อนไข"' : 'ใบสั่งซื้อที่สร้างจากแผนจัดซื้อจะแสดงที่นี่'}
          renderActions={(po) => {
            const supplier = supplierById(po.supplierId)
            return (
              <>
                <Button
                  size="sm"
                  variant="soft"
                  iconOnly
                  outlined
                  aria-label="ดู"
                  tooltip="ดู"
                  onClick={() => navigate({ to: '/procurement/purchase-orders/$poId', params: { poId: po.id } })}
                >
                  <IconEye />
                </Button>
                <Button
                  size="sm"
                  variant="accent"
                  iconOnly
                  outlined
                  aria-label="ส่งให้ซัพพลายเออร์"
                  tooltip="ส่งให้ซัพพลายเออร์"
                  disabled={po.status !== 'draft'}
                  onClick={() => handleSend(po, supplier?.name ?? 'ซัพพลายเออร์')}
                >
                  <IconArrowUpRight />
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  iconOnly
                  outlined
                  aria-label="ซัพพลายเออร์ยืนยันแล้ว"
                  tooltip="ซัพพลายเออร์ยืนยันแล้ว"
                  disabled={po.status !== 'sent'}
                  onClick={() => handleConfirmBySupplier(po, supplier?.name ?? 'ซัพพลายเออร์')}
                >
                  <IconCheck />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  iconOnly
                  outlined
                  aria-label="ยกเลิกใบสั่งซื้อ"
                  tooltip="ยกเลิกใบสั่งซื้อ"
                  disabled={!['draft', 'sent', 'confirmed'].includes(po.status)}
                  onClick={() => handleCancel(po, supplier?.name ?? 'ซัพพลายเออร์')}
                >
                  <IconClose />
                </Button>
              </>
            )
          }}
        />
      </Card>

      <FilterSheet
        open={sheet.open}
        onClose={sheet.closeSheet}
        title="ตัวกรองใบสั่งซื้อ"
        resultCount={rows.length}
        onClear={() => update({ supplierIds: [], planIds: [], dueFrom: '', dueTo: '' })}
      >
        <MultiSelectList
          label="ซัพพลายเออร์"
          options={suppliers.map((s) => ({ value: s.id, label: s.name, count: supplierCounts.get(s.id) ?? 0 }))}
          value={criteria.supplierIds}
          onChange={(supplierIds) => update({ supplierIds })}
        />
        <MultiSelectList
          label="แผนจัดซื้อ"
          options={plans.map((p) => ({ value: p.id, label: p.name, count: planCounts.get(p.id) ?? 0 }))}
          value={criteria.planIds}
          onChange={(planIds) => update({ planIds })}
        />
        <DateRangePicker label="กำหนดส่ง" from={criteria.dueFrom} to={criteria.dueTo} onChange={(dueFrom, dueTo) => update({ dueFrom, dueTo })} />
      </FilterSheet>
    </>
  )
}
