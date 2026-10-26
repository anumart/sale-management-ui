import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { IconInbox, IconPlus, IconTrash } from '@/components/icons'
import { Button, DatePicker, Modal, SegmentedControl, Select, TextField } from '@/components/ui'
import { getFinishedGoods } from '@/features/catalog/store'
import { toast } from '@/stores/toastStore'
import { ymdFromToday } from './estimates'
import { useSalesStore, type CreateOrderInput } from './store'
import { channelLabel, EXPORT_DROP_POINT, fromDateInput } from './utils'

type KeyedChannel = CreateOrderInput['channel']

interface Line {
  key: number
  finishedGoodId: string
  quantity: string
}

const blankLine = (key: number): Line => ({ key, finishedGoodId: '', quantity: '' })

/**
 * Keys in an order that did not arrive as an email file: a phone call, an export-platform order, or one staff typed.
 * Staff already know what it says, so it is created confirmed and goes straight into production planning.
 */
export function NewOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const customers = useSalesStore((s) => s.customers)
  const createOrder = useSalesStore((s) => s.createOrder)

  const [channel, setChannel] = useState<KeyedChannel>('phone')
  const [customerId, setCustomerId] = useState('')
  const [platformName, setPlatformName] = useState('')
  const [platformOrderRef, setPlatformOrderRef] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(ymdFromToday(1))
  const [lines, setLines] = useState<Line[]>([blankLine(1)])
  const [error, setError] = useState('')

  const buyers = customers.filter((c) => c.type === 'direct' && c.isActive)
  const customer = customers.find((c) => c.id === customerId)
  const products = getFinishedGoods(true)

  const reset = () => {
    setChannel('phone')
    setCustomerId('')
    setPlatformName('')
    setPlatformOrderRef('')
    setDeliveryDate(ymdFromToday(1))
    setLines([blankLine(1)])
    setError('')
  }
  const close = () => {
    reset()
    onClose()
  }
  const patchLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const submit = () => {
    const res = createOrder({
      customerId,
      channel,
      platformName,
      platformOrderRef,
      requestedDeliveryDate: fromDateInput(deliveryDate, '12:00').toISOString(),
      lines: lines.filter((l) => l.finishedGoodId || l.quantity).map((l) => ({ finishedGoodId: l.finishedGoodId, quantity: Number(l.quantity) })),
    })
    if (!res.ok) {
      setError(res.message)
      return
    }
    toast.success('สร้างคำสั่งซื้อแล้ว ยืนยันเรียบร้อย พร้อมสั่งผลิต')
    reset()
    onClose()
    navigate({ to: '/sales/orders/$orderId', params: { orderId: res.id } })
  }

  return (
    <Modal
      open={open}
      onClose={close}
      icon={<IconInbox />}
      size="lg"
      title="คีย์คำสั่งซื้อ"
      description="สำหรับคำสั่งซื้อที่ไม่ได้มาทางอีเมล เช่น ลูกค้าโทรสั่ง หรือคำสั่งซื้อส่งออกจาก platform"
      footer={
        <>
          <Button variant="outline" onClick={close}>
            ยกเลิก
          </Button>
          <Button onClick={submit}>สร้างคำสั่งซื้อ</Button>
        </>
      }
    >
      <div className="mb-4">
        <p className="mb-2 text-control font-medium text-ink-2">ช่องทาง</p>
        <SegmentedControl
          aria-label="ช่องทางคำสั่งซื้อ"
          variant="light"
          value={channel}
          onChange={(c) => {
            setChannel(c)
            setError('')
          }}
          options={(['phone', 'platform', 'manual'] as const).map((c) => ({ value: c, label: channelLabel[c] }))}
        />
      </div>

      <Select
        label="ลูกค้า"
        required
        placeholder="เลือกลูกค้า (รวมผู้ซื้อต่างประเทศ)"
        value={customerId}
        onChange={setCustomerId}
        options={buyers.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
      />
      {customer?.country && <p className="-mt-2 mb-4 text-sm text-muted">ส่งออก · รถเราส่งที่ {EXPORT_DROP_POINT}</p>}

      {channel === 'platform' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="ชื่อ platform" required placeholder="เช่น FloraTrade" value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
          <TextField label="เลขคำสั่งซื้อของ platform" required placeholder="เช่น FT-88231" value={platformOrderRef} onChange={(e) => setPlatformOrderRef(e.target.value)} hint="ใช้กันคีย์ซ้ำ" />
        </div>
      )}

      <DatePicker label="ต้องส่ง" required value={deliveryDate} onChange={(d) => d && setDeliveryDate(d)} containerClassName="sm:max-w-xs" />

      <div className="mt-2">
        <p className="mb-2 text-control font-medium text-ink-2">สินค้า</p>
        <div className="flex flex-col gap-2">
          {lines.map((l) => (
            <div key={l.key} className="flex items-end gap-3">
              <Select
                aria-label="สินค้า"
                containerClassName="mb-0 min-w-0 flex-1"
                placeholder="เลือกสินค้า..."
                value={l.finishedGoodId}
                onChange={(v) => patchLine(l.key, { finishedGoodId: v })}
                options={products.map((fg) => ({ value: fg.id, label: fg.name }))}
              />
              <TextField
                aria-label="จำนวน"
                type="number"
                min={1}
                placeholder="จำนวน"
                value={l.quantity}
                onChange={(e) => patchLine(l.key, { quantity: e.target.value })}
                containerClassName="w-28"
              />
              <Button variant="outline" iconOnly aria-label="ลบรายการ" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                <IconTrash />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setLines((ls) => [...ls, blankLine((ls.at(-1)?.key ?? 0) + 1)])}>
          <IconPlus />
          เพิ่มรายการ
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-danger-fg">{error}</p>}
    </Modal>
  )
}
