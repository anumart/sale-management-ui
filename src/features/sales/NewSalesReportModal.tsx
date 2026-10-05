import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { IconChart } from '@/components/icons'
import { Button, Modal, Select, TextField } from '@/components/ui'
import { finishedGoods } from '@/features/procurement/mockData'
import { toast } from '@/stores/toastStore'
import { useSalesStore } from './store'
import { fromDateInput, toDateInput } from './utils'

export interface NewSalesReportModalProps {
  open: boolean
  onClose: () => void
  customerId?: string
}

/** Keys in the sales figures a consignment shop sends — totals per product, the shop doesn't track LOTs. */
export function NewSalesReportModal({ open, onClose, customerId: presetCustomerId }: NewSalesReportModalProps) {
  const navigate = useNavigate()
  const customers = useSalesStore((s) => s.customers)
  const reports = useSalesStore((s) => s.reports)
  const addSalesReport = useSalesStore((s) => s.addSalesReport)
  const [customerId, setCustomerId] = useState(presetCustomerId ?? '')
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState(toDateInput(new Date().toISOString()))
  const [qty, setQty] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setCustomerId(presetCustomerId ?? '')
    setQty({})
  }, [open, presetCustomerId])

  // Default the period to start where this shop's last report ended
  useEffect(() => {
    if (!customerId) return
    const last = reports.filter((r) => r.customerId === customerId).sort((a, b) => b.periodTo.localeCompare(a.periodTo))[0]
    setPeriodFrom(toDateInput(last?.periodTo ?? new Date(Date.now() - 7 * 86_400_000).toISOString()))
  }, [customerId, reports])

  const submit = () => {
    const lines = finishedGoods
      .map((fg) => ({ finishedGoodId: fg.id, reportedQuantity: Number(qty[fg.id] ?? 0), confirmedQuantity: null }))
      .filter((l) => l.reportedQuantity > 0)
    if (!customerId || !periodFrom || !periodTo) {
      toast.error('เลือกร้านและช่วงเวลา')
      return
    }
    if (periodTo < periodFrom) {
      toast.error('วันสิ้นสุดอยู่ก่อนวันเริ่มต้น')
      return
    }
    if (lines.length === 0) {
      toast.error('กรอกสินค้าที่ขายได้อย่างน้อย 1 รายการ')
      return
    }
    const id = addSalesReport({ customerId, periodFrom: fromDateInput(periodFrom).toISOString(), periodTo: fromDateInput(periodTo, '23:59:59').toISOString(), lines })
    onClose()
    toast.success('บันทึกรายงานแล้ว ตรวจเทียบกับการเข้าร้านได้เลย')
    navigate({ to: '/sales/reports/$reportId', params: { reportId: id } })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<IconChart />}
      title="บันทึกรายงานยอดขาย"
      description="กรอกยอดที่ร้านแจ้งว่าขายได้ ระบบจะเทียบกับการเข้าร้านก่อนคิดเงิน"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={submit}>บันทึกรายงาน</Button>
        </>
      }
    >
      <Select
        label="ร้าน"
        required
        placeholder="เลือกร้านฝากขาย"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        options={customers.filter((c) => c.type === 'consignment').map((c) => ({ value: c.id, label: c.name }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="ตั้งแต่" type="date" required value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
        <TextField label="ถึง" type="date" required value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
      </div>
      <p className="mb-2 text-control font-medium text-ink-2">จำนวนที่ขายได้</p>
      <div className="grid gap-x-4 sm:grid-cols-2">
        {finishedGoods.map((fg) => (
          <TextField
            key={fg.id}
            label={fg.name}
            type="number"
            min={0}
            placeholder="0"
            value={qty[fg.id] ?? ''}
            onChange={(e) => setQty((prev) => ({ ...prev, [fg.id]: e.target.value }))}
          />
        ))}
      </div>
    </Modal>
  )
}
