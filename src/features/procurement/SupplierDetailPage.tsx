import { useState } from 'react'
import type { ReactNode } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconBox, IconCalendar, IconFactory, IconMapPin, IconPhone, IconPlus, IconPower, IconTrash } from '@/components/icons'
import { Button, Card, CardHeader, DataTable, StatusPill, type DataTableColumn } from '@/components/ui'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { AddSupplierRouteModal } from './AddSupplierRouteModal'
import { useProcurementStore } from './store'
import { rawMaterialById, supplierRawMaterials } from './mockData'
import type { SupplierRawMaterial, SupplierRoute } from './types'
import { routeMapUrl, supplierTypeLabel } from './utils'

export interface SupplierDetailPageProps {
  supplierId: string
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-[0.85rem] bg-fill text-dark [&>svg]:size-[1.15rem]">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-base font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  )
}

export function SupplierDetailPage({ supplierId }: SupplierDetailPageProps) {
  const supplier = useProcurementStore((s) => s.suppliers.find((sup) => sup.id === supplierId))
  const allSupplierRoutes = useProcurementStore((s) => s.supplierRoutes)
  const routes = allSupplierRoutes.filter((r) => r.supplierId === supplierId)
  const toggleSupplierStatus = useProcurementStore((s) => s.toggleSupplierStatus)
  const toggleSupplierRouteStatus = useProcurementStore((s) => s.toggleSupplierRouteStatus)
  const [modalOpen, setModalOpen] = useState(false)

  if (!supplier) {
    return (
      <>
        <PageHeading section="จัดซื้อ" parent={{ label: 'ซัพพลายเออร์', to: '/procurement/suppliers' }} title="ซัพพลายเออร์" />
        <Card>
          <p className="text-muted">ไม่พบซัพพลายเออร์</p>
        </Card>
      </>
    )
  }

  const handleToggleSupplier = async () => {
    const ok = await confirm({
      title: supplier.isActive ? `ปิดใช้งาน ${supplier.name}?` : `เปิดใช้งาน ${supplier.name}?`,
      message: supplier.isActive
        ? 'ซัพพลายเออร์รายนี้และจุดรับสินค้าจะไม่สามารถเลือกในแผนจัดซื้อใหม่ได้'
        : 'ซัพพลายเออร์รายนี้จะกลับมาเลือกในแผนจัดซื้อใหม่ได้',
      confirmLabel: supplier.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน',
      tone: supplier.isActive ? 'danger' : 'primary',
    })
    if (!ok) return
    toggleSupplierStatus(supplier.id)
    toast.success(`${supplier.name} เปลี่ยนเป็น${supplier.isActive ? 'ปิดใช้งาน' : 'ใช้งาน'}`)
  }

  const handleToggleRoute = async (routeId: string, routeName: string, isActive: boolean) => {
    const ok = await confirm({
      title: isActive ? `ปิดใช้งาน ${routeName}?` : `เปิดใช้งาน ${routeName}?`,
      message: isActive
        ? 'จุดรับสินค้านี้จะไม่สามารถเพิ่มเป็นจุดจอดในเส้นทางรถใหม่ได้'
        : 'จุดรับสินค้านี้จะกลับมาใช้เป็นจุดจอดของเส้นทางรถได้',
      confirmLabel: isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน',
      tone: isActive ? 'danger' : 'primary',
    })
    if (!ok) return
    toggleSupplierRouteStatus(routeId)
    toast.success(`${routeName} เปลี่ยนเป็น${isActive ? 'ปิดใช้งาน' : 'ใช้งาน'}`)
  }

  const offerColumns: DataTableColumn<SupplierRawMaterial>[] = [
    {
      key: 'name',
      label: 'วัตถุดิบ',
      sortValue: (o) => rawMaterialById(o.rawMaterialId)?.nameTh.toLowerCase() ?? '',
      render: (o) => <span className="font-medium">{rawMaterialById(o.rawMaterialId)?.nameTh ?? o.rawMaterialId}</span>,
    },
    { key: 'unit', label: 'หน่วยที่ขาย', sortValue: (o) => o.supplierUnit, render: (o) => <span className="whitespace-nowrap">{o.supplierUnit}</span> },
    {
      key: 'conversion',
      label: 'เทียบเป็นหน่วยฐาน',
      sortValue: (o) => o.unitsPerSupplierUnit,
      render: (o) => (
        <span className="whitespace-nowrap tabular-nums">
          {o.unitsPerSupplierUnit.toLocaleString()} {rawMaterialById(o.rawMaterialId)?.unit}
        </span>
      ),
    },
    {
      key: 'price',
      label: 'ราคา / หน่วยที่ขาย',
      sortValue: (o) => o.pricePerSupplierUnit,
      render: (o) => <span className="whitespace-nowrap tabular-nums">{o.pricePerSupplierUnit.toLocaleString()} ฿</span>,
    },
  ]

  const columns: DataTableColumn<SupplierRoute>[] = [
    {
      key: 'route',
      label: 'จุดรับสินค้า',
      sortValue: (r) => r.routeName.toLowerCase(),
      render: (r) => (
        <>
          <p className="font-medium">{r.routeName}</p>
          <p className="text-sm text-muted">{r.routeCode}</p>
          {r.operatingHours && <p className="mt-1 text-sm text-muted">{r.operatingHours}</p>}
        </>
      ),
    },
    { key: 'province', label: 'จังหวัด', sortValue: (r) => r.province.toLowerCase(), render: (r) => <span className="whitespace-nowrap">{r.province}</span> },
    {
      key: 'address',
      label: 'ที่อยู่',
      sortValue: (r) => r.address.toLowerCase(),
      render: (r) => {
        const mapUrl = routeMapUrl(r)
        return (
          <div className="max-w-xs">
            <p className="text-muted">{r.address}</p>
            {r.directions && <p className="mt-1 text-sm text-muted">{r.directions}</p>}
            {r.latitude != null && r.longitude != null && (
              <p className="mt-1 text-sm text-muted tabular-nums">
                {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
              </p>
            )}
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-medium text-primary-fg hover:underline">
                เปิดแผนที่
              </a>
            )}
          </div>
        )
      },
    },
    {
      key: 'contact',
      label: 'ผู้ติดต่อ',
      sortValue: (r) => r.contactPerson.toLowerCase(),
      render: (r) => (
        <span className="whitespace-nowrap">
          <p>{r.contactPerson}</p>
          <p className="text-sm text-muted">{r.phone}</p>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'สถานะ',
      sortValue: (r) => (r.isActive ? 1 : 0),
      render: (r) => <StatusPill tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}</StatusPill>,
    },
  ]

  const activeRouteCount = routes.filter((r) => r.isActive).length
  const offers = supplierRawMaterials.filter((o) => o.supplierId === supplierId)
  const materialVariety = offers.length
  const memberSince = new Date(supplier.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <>
      <PageHeading
        section="จัดซื้อ"
        parent={{ label: 'ซัพพลายเออร์', to: '/procurement/suppliers' }}
        title={supplier.name}
        subtitle={`จุดรับสินค้า ${routes.length} จุด · ใช้งาน ${activeRouteCount} จุด`}
      />

      <div className="mb-6 grid overflow-hidden rounded-card glass shadow-card lg:grid-cols-[1.1fr_1.4fr]">
        <div className="flex flex-col gap-5 border-b border-line p-6 lg:border-r lg:border-b-0 xl:p-7">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-[1.1rem] bg-primary-soft text-primary-fg [&>svg]:size-6">
                <IconFactory />
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{supplier.name}</p>
                <p className="truncate text-sm text-muted">
                  {supplierTypeLabel[supplier.supplierType]}
                  {supplier.supplierType === 'company' && ` · ${supplier.branchCode === '00000' ? 'สำนักงานใหญ่' : `สาขา ${supplier.branchCode}`}`}
                  {supplier.taxId && ` · ${supplier.taxId}`}
                </p>
              </div>
            </div>
            <StatusPill tone={supplier.isActive ? 'success' : 'neutral'}>{supplier.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}</StatusPill>
          </div>
          <div className="flex items-start gap-2 text-control [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:translate-y-0.5 [&>svg]:text-muted">
            <IconMapPin />
            <span className="text-muted">{supplier.address}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-dashed border-line pt-4">
            <div className="min-w-0">
              <p className="text-xs text-muted">{supplier.supplierType === 'company' ? 'ผู้ติดต่อ' : 'เจ้าของ'}</p>
              <p className="truncate text-control font-medium">{supplier.contactPerson}</p>
            </div>
            <a
              href={`tel:${supplier.phone}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-soft-hover [&>svg]:size-3.5"
            >
              <IconPhone />
              {supplier.phone}
            </a>
          </div>
          {supplier.email && <p className="-mt-3 text-sm text-muted">{supplier.email}</p>}
          <Button variant="outline" size="sm" className="self-start" onClick={handleToggleSupplier}>
            {supplier.isActive ? <IconTrash /> : <IconPower />}
            {supplier.isActive ? 'ปิดใช้งานซัพพลายเออร์' : 'เปิดใช้งานซัพพลายเออร์'}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5 p-6 xl:p-7">
          <Stat icon={<IconMapPin />} label="จุดรับสินค้า" value={routes.length} />
          <Stat icon={<IconPower />} label="จุดที่ใช้งาน" value={activeRouteCount} />
          <Stat icon={<IconBox />} label="วัตถุดิบ" value={materialVariety} />
          <Stat icon={<IconCalendar />} label="เริ่มเมื่อ" value={memberSince} />
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader title="วัตถุดิบที่ซัพพลายเออร์ขาย" subtitle="ราคาและหน่วยขายผูกกับซัพพลายเออร์ ใช้ร่วมกันทุกสวน/จุดรับสินค้า" />
        <DataTable
          columns={offerColumns}
          rows={offers}
          rowKey={(o) => o.rawMaterialId}
          emptyTitle="ยังไม่มีวัตถุดิบ"
          emptyDescription="ซัพพลายเออร์รายนี้ยังไม่มีวัตถุดิบที่ขาย"
        />
      </Card>

      <Card>
        <CardHeader
          title="จุดรับสินค้า"
          subtitle="สวน / คลังที่ไปรับสินค้าของซัพพลายเออร์รายนี้ได้"
          action={
            <Button onClick={() => setModalOpen(true)}>
              <IconPlus />
              เพิ่มจุดรับสินค้า
            </Button>
          }
        />

        <DataTable
          columns={columns}
          rows={routes}
          rowKey={(r) => r.id}
          rowClassName={() => 'hover:bg-hover align-top'}
          emptyTitle="ยังไม่มีจุดรับสินค้า"
          emptyDescription="เพิ่มจุดรับสินค้าเพื่อบันทึกว่าไปรับสินค้าของซัพพลายเออร์รายนี้ได้ที่ไหน"
          renderActions={(r) => (
            <Button
              size="sm"
              variant={r.isActive ? 'danger' : 'accent'}
              iconOnly
              outlined
              aria-label={r.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
              tooltip={r.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
              onClick={() => handleToggleRoute(r.id, r.routeName, r.isActive)}
            >
              {r.isActive ? <IconTrash /> : <IconPower />}
            </Button>
          )}
        />
      </Card>

      <AddSupplierRouteModal open={modalOpen} onClose={() => setModalOpen(false)} supplierId={supplier.id} />
    </>
  )
}
