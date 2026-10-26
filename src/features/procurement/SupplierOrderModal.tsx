import { Modal, Select, TextField } from '@/components/ui'
import { formatCurrency } from '@/lib/format'
import { rawMaterialById, suppliersFor } from './mockData'
import { supplierById, useProcurementStore } from './store'
import type { CallStatus } from './types'

const callStatusOptions: { value: CallStatus; label: string }[] = [
  { value: 'not_called', label: 'ยังไม่ได้โทร' },
  { value: 'called', label: 'โทรแล้ว รอยืนยัน' },
  { value: 'confirmed', label: 'ยืนยันแล้ว' },
]

export interface SupplierOrderModalProps {
  open: boolean
  onClose: () => void
  planId: string
  rawMaterialId: string | null
}

/** Table + modal per the review's UX note: replaces one long always-open form per supplier. */
export function SupplierOrderModal({ open, onClose, planId, rawMaterialId }: SupplierOrderModalProps) {
  const plan = useProcurementStore((s) => s.plans.find((p) => p.id === planId))
  const updateSupplierLine = useProcurementStore((s) => s.updateSupplierLine)

  const rawMaterial = rawMaterialId ? rawMaterialById(rawMaterialId) : undefined
  const planRawMaterial = rawMaterialId ? plan?.rawMaterials.find((rm) => rm.rawMaterialId === rawMaterialId) : undefined
  const offers = rawMaterialId ? suppliersFor(rawMaterialId) : []
  const locked = plan?.status !== 'draft'

  if (!rawMaterialId || !rawMaterial || !planRawMaterial) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rawMaterial.nameTh}
      description={`ต้องซื้อสุทธิ: ${planRawMaterial.netRequiredQuantity} ${rawMaterial.unit}`}
      size="lg"
    >
      <div className="overflow-x-auto">
        <table className="w-full border-separate text-base [border-spacing:0_0.5rem]">
          <thead>
            <tr className="text-left text-muted">
              <th className="pb-3 pl-3.5 font-light">ซัพพลายเออร์</th>
              <th className="pb-3 font-light">สถานะการโทร</th>
              <th className="pb-3 font-light">จำนวนที่ยืนยัน</th>
              <th className="pb-3 font-light">จำนวนสั่ง</th>
              <th className="pb-3 font-light">ราคา / หน่วย</th>
              <th className="pb-3 pr-3.5 font-light">รวม</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => {
              const supplier = supplierById(offer.supplierId)
              const line = planRawMaterial.suppliers.find((s) => s.supplierId === offer.supplierId)
              const orderedQty = line?.orderedQuantity ?? 0
              const total = orderedQty * offer.pricePerSupplierUnit
              return (
                <tr key={offer.supplierId}>
                  <td className="rounded-l-[0.875rem] border-y border-l border-line py-3 pr-3 pl-3.5">
                    <p className="font-medium">{supplier?.name}</p>
                    <p className="text-sm text-muted">{supplier?.phone}</p>
                  </td>
                  <td className="border-y border-line py-3 pr-3">
                    <Select
                      aria-label={`สถานะการโทร ${supplier?.name}`}
                      value={line?.callStatus ?? 'not_called'}
                      disabled={locked}
                      options={callStatusOptions}
                      onChange={(callStatus) => updateSupplierLine(planId, rawMaterialId, offer.supplierId, { callStatus })}
                      containerClassName="mb-0 w-44"
                    />
                  </td>
                  <td className="border-y border-line py-3 pr-3">
                    <TextField
                      type="number"
                      aria-label={`จำนวนที่ ${supplier?.name} ยืนยัน`}
                      disabled={locked}
                      value={line?.confirmedQuantity ?? ''}
                      onChange={(e) =>
                        updateSupplierLine(planId, rawMaterialId, offer.supplierId, {
                          confirmedQuantity: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      containerClassName="mb-0 w-24"
                    />
                  </td>
                  <td className="border-y border-line py-3 pr-3">
                    <TextField
                      type="number"
                      aria-label={`จำนวนสั่งจาก ${supplier?.name}`}
                      disabled={locked}
                      value={line?.orderedQuantity ?? ''}
                      onChange={(e) =>
                        updateSupplierLine(planId, rawMaterialId, offer.supplierId, {
                          orderedQuantity: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      containerClassName="mb-0 w-24"
                    />
                    <p className="mt-1 text-sm text-muted">{offer.supplierUnit}</p>
                  </td>
                  <td className="border-y border-line py-3 pr-3 whitespace-nowrap tabular-nums">{formatCurrency(offer.pricePerSupplierUnit)}</td>
                  <td className="rounded-r-[0.875rem] border-y border-r border-line py-3 pr-3.5 whitespace-nowrap tabular-nums">{formatCurrency(total)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
