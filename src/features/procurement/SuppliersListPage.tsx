import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconEye, IconPlus, IconPower, IconTrash } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, FilterSelect, ListToolbar, StatusPill, type DataTableColumn } from '@/components/ui'
import { useListCriteria } from '@/hooks/useListCriteria'
import { countBy, matchesText } from '@/lib/criteria'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { AddSupplierModal } from './AddSupplierModal'
import { useProcurementStore } from './store'
import type { Supplier, SupplierType } from './types'
import { supplierTypeLabel } from './utils'

const pageSize = 10

interface Criteria {
  query: string
  active: 'all' | 'active' | 'inactive'
  type: SupplierType | 'all'
}

const emptyCriteria: Criteria = { query: '', active: 'all', type: 'all' }

export function SuppliersListPage() {
  const navigate = useNavigate()
  const suppliers = useProcurementStore((s) => s.suppliers)
  const supplierRoutes = useProcurementStore((s) => s.supplierRoutes)
  const toggleSupplierStatus = useProcurementStore((s) => s.toggleSupplierStatus)
  const [modalOpen, setModalOpen] = useState(false)
  const { criteria, update, clear, page, setPage } = useListCriteria(emptyCriteria)

  const needle = criteria.query.trim().toLowerCase()
  const matches = (sp: Supplier, skip?: 'active' | 'type') => {
    if (skip !== 'active' && criteria.active !== 'all' && sp.isActive !== (criteria.active === 'active')) return false
    if (skip !== 'type' && criteria.type !== 'all' && sp.supplierType !== criteria.type) return false
    return matchesText(needle, sp.name, sp.taxId, sp.contactPerson, sp.phone, sp.address)
  }
  const rows = suppliers.filter((sp) => matches(sp))
  const activeCounts = countBy(suppliers.filter((sp) => matches(sp, 'active')), (sp) => (sp.isActive ? 'active' : 'inactive'))
  const typeCounts = countBy(suppliers.filter((sp) => matches(sp, 'type')), (sp) => sp.supplierType)
  const hasCriteria = !!criteria.query || criteria.active !== 'all' || criteria.type !== 'all'

  const routeCountFor = (supplierId: string) => supplierRoutes.filter((r) => r.supplierId === supplierId).length

  const handleToggle = async (supplierId: string, name: string, isActive: boolean) => {
    const ok = await confirm({
      title: isActive ? `ปิดใช้งาน ${name}?` : `เปิดใช้งาน ${name}?`,
      message: isActive
        ? 'ซัพพลายเออร์รายนี้และจุดรับสินค้าจะไม่สามารถเลือกในแผนจัดซื้อใหม่ได้'
        : 'ซัพพลายเออร์รายนี้จะกลับมาเลือกในแผนจัดซื้อใหม่ได้',
      confirmLabel: isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน',
      tone: isActive ? 'danger' : 'primary',
    })
    if (!ok) return
    toggleSupplierStatus(supplierId)
    toast.success(`${name} เปลี่ยนเป็น${isActive ? 'ปิดใช้งาน' : 'ใช้งาน'}`)
  }

  const columns: DataTableColumn<Supplier>[] = [
    {
      key: 'name',
      label: 'ซัพพลายเออร์',
      sortValue: (s) => s.name.toLowerCase(),
      render: (s) => (
        <>
          <p className="font-medium">{s.name}</p>
          {s.taxId && <p className="text-sm text-muted">{s.supplierType === 'company' ? 'เลขผู้เสียภาษี' : 'เลขบัตร'} {s.taxId}</p>}
        </>
      ),
    },
    {
      key: 'type',
      label: 'ประเภท',
      sortValue: (s) => s.supplierType,
      render: (s) => <StatusPill tone={s.supplierType === 'company' ? 'info' : 'gray'}>{supplierTypeLabel[s.supplierType]}</StatusPill>,
    },
    { key: 'contactPerson', label: 'ผู้ติดต่อ', sortValue: (s) => s.contactPerson.toLowerCase(), render: (s) => <span className="whitespace-nowrap">{s.contactPerson}</span> },
    { key: 'phone', label: 'โทรศัพท์', sortValue: (s) => s.phone, render: (s) => <span className="whitespace-nowrap">{s.phone}</span> },
    {
      key: 'address',
      label: 'ที่อยู่',
      sortValue: (s) => s.address.toLowerCase(),
      render: (s) => (
        <span className="block max-w-xs truncate text-muted" title={s.address}>
          {s.address}
        </span>
      ),
    },
    { key: 'routes', label: 'จุดรับสินค้า', sortValue: (s) => routeCountFor(s.id), render: (s) => <span className="tabular-nums">{routeCountFor(s.id)}</span> },
    {
      key: 'status',
      label: 'สถานะ',
      sortValue: (s) => (s.isActive ? 1 : 0),
      render: (s) => <StatusPill tone={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}</StatusPill>,
    },
  ]

  return (
    <>
      <PageHeading section="จัดซื้อ" title="ซัพพลายเออร์" />
      <Card>
        <CardHeader
          title="ซัพพลายเออร์ทั้งหมด"
          subtitle="ซัพพลายเออร์แต่ละรายมีจุดรับสินค้า (สวน/คลัง) ได้ตั้งแต่ 1 จุดขึ้นไป"
          action={
            <Button iconOnly round aria-label="เพิ่มซัพพลายเออร์" title="เพิ่มซัพพลายเออร์" onClick={() => setModalOpen(true)}>
              <IconPlus />
            </Button>
          }
        />

        <ListToolbar
          searchLabel="ค้นหาซัพพลายเออร์"
          searchPlaceholder="ค้นหาชื่อ, เลขผู้เสียภาษี, ผู้ติดต่อ, โทรศัพท์, ที่อยู่"
          query={criteria.query}
          onQueryChange={(query) => update({ query })}
          filters={
            <>
              <FilterSelect
                label="ประเภท"
                value={criteria.type}
                neutralValue="all"
                onChange={(type) => update({ type })}
                options={[
                  { value: 'all', label: 'ทั้งหมด', count: (typeCounts.get('company') ?? 0) + (typeCounts.get('individual') ?? 0) },
                  { value: 'company', label: supplierTypeLabel.company, tone: 'info', count: typeCounts.get('company') ?? 0 },
                  { value: 'individual', label: supplierTypeLabel.individual, tone: 'gray', count: typeCounts.get('individual') ?? 0 },
                ]}
                className="w-full sm:w-64"
              />
              <FilterSelect
                label="สถานะ"
                value={criteria.active}
                neutralValue="all"
                onChange={(active) => update({ active })}
                options={[
                  { value: 'all', label: 'ทั้งหมด', count: (activeCounts.get('active') ?? 0) + (activeCounts.get('inactive') ?? 0) },
                  { value: 'active', label: 'ใช้งาน', tone: 'success', count: activeCounts.get('active') ?? 0 },
                  { value: 'inactive', label: 'ปิดใช้งาน', tone: 'neutral', count: activeCounts.get('inactive') ?? 0 },
                ]}
                className="w-full sm:w-64"
              />
            </>
          }
          resultText={`พบ ${rows.length} จาก ${suppliers.length} ราย`}
          hasCriteria={hasCriteria}
          onClear={clear}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(s) => s.id}
          pageSize={pageSize}
          page={page}
          onPageChange={setPage}
          paginationVariant="jump"
          emptyTitle="ไม่พบซัพพลายเออร์"
          emptyDescription={hasCriteria ? 'ลองลดเงื่อนไขหรือกด "ล้างเงื่อนไข"' : 'เพิ่มซัพพลายเออร์เพื่อเริ่มต้น'}
          renderActions={(s) => (
            <>
              <Button
                size="sm"
                variant="soft"
                iconOnly
                outlined
                aria-label="ดูซัพพลายเออร์"
                tooltip="ดูซัพพลายเออร์"
                onClick={() => navigate({ to: '/procurement/suppliers/$supplierId', params: { supplierId: s.id } })}
              >
                <IconEye />
              </Button>
              <Button
                size="sm"
                variant={s.isActive ? 'danger' : 'accent'}
                iconOnly
                outlined
                aria-label={s.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                tooltip={s.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                onClick={() => handleToggle(s.id, s.name, s.isActive)}
              >
                {s.isActive ? <IconTrash /> : <IconPower />}
              </Button>
            </>
          )}
        />
      </Card>

      <AddSupplierModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
