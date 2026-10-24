import { Link } from '@tanstack/react-router'
import { useRef, useState, type FormEvent } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconCheck, IconPlus, IconTrash } from '@/components/icons'
import { Alert, Button, Card, CardHeader, SegmentedControl, StatusPill, TextField } from '@/components/ui'
import { finishedGoodById } from '@/features/procurement/mockData'
import { useProductionStore } from '@/features/production/store'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { useCustomer, useSalesStore, type ScanMode } from './store'
import type { ConsignmentVisit, ShopStockLine } from './types'
import { formatDate, visitSoldByProduct, visitStatusLabel, visitStatusTone } from './utils'

const modeLabel: Record<ScanMode, string> = { counted: 'ของยังดี', spoiled: 'ของเสีย', delivered: 'LOT ใหม่' }
const modeHint: Record<ScanMode, string> = {
  counted: 'สแกนสินค้าที่ยังดีบนชั้น ซึ่งจะวางที่ร้านต่อ',
  spoiled: 'สแกนของเสียที่นำกลับ บริษัทรับผิดชอบเอง',
  delivered: 'สแกน LOT ใหม่ที่นำขึ้นชั้นวันนี้',
}

const qtyOf = (lines: ShopStockLine[], batchNumber: string) => lines.find((l) => l.batchNumber === batchNumber)?.quantity ?? 0

function ScanCard({ visit }: { visit: ConsignmentVisit }) {
  const scanVisit = useSalesStore((s) => s.scanVisit)
  const batches = useProductionStore((s) => s.batches)
  const [mode, setMode] = useState<ScanMode>(visit.previousBalance.length ? 'counted' : 'delivered')
  const [code, setCode] = useState('')
  const [qty, setQty] = useState('1')
  const [last, setLast] = useState<{ ok: boolean; message: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const freeLots = batches.filter((b) => b.status === 'available' && !b.reservedForOrderId && b.remainingQuantity > 0)
  const suggestions = mode === 'delivered' ? freeLots.map((b) => ({ code: b.barcode, label: `${finishedGoodById(b.finishedGoodId)?.name} · ${b.batchNumber} · เหลือ ${b.remainingQuantity}` })) : visit.previousBalance.map((l) => ({ code: l.barcode, label: `${finishedGoodById(l.finishedGoodId)?.name} · ${l.batchNumber}` }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const res = scanVisit(visit.id, mode, code, Number(qty))
    setLast(res)
    if (res.ok) {
      setCode('')
      setQty('1')
    }
    inputRef.current?.focus()
  }

  return (
    <Card className="mb-6">
      <CardHeader title="สแกน" subtitle={modeHint[mode]} />
      <SegmentedControl
        aria-label="กำลังสแกนอะไร"
        variant="light"
        value={mode}
        onChange={(m) => {
          setMode(m)
          setLast(null)
        }}
        options={(['counted', 'spoiled', 'delivered'] as ScanMode[]).map((m) => ({ value: m, label: modeLabel[m] }))}
        className="mb-4 w-full [&>button]:flex-1"
      />
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <TextField
          ref={inputRef}
          label="บาร์โค้ดหรือเลข LOT"
          placeholder="FG-2026-0101-A"
          autoComplete="off"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          containerClassName="mb-0 min-w-0 flex-[2_1_14rem]"
        />
        <TextField label="จำนวน" type="number" min={1} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} containerClassName="mb-0 w-24 flex-[0_0_6rem]" />
        <Button type="submit" className="flex-[1_0_auto]">
          <IconPlus />
          เพิ่ม
        </Button>
      </form>
      {last && (
        <p role="status" className={cn('mt-3 text-sm font-medium', last.ok ? 'text-success-fg' : 'text-danger-fg')}>
          {last.message}
        </p>
      )}
      {suggestions.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-muted">{mode === 'delivered' ? 'LOT ที่พร้อมส่ง (แตะเพื่อกรอก ใช้แทนเครื่องสแกน)' : 'LOT ของร้านนี้ (แตะเพื่อกรอก)'}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => {
                  setCode(s.code)
                  inputRef.current?.focus()
                }}
                className="rounded-full border border-field-edge bg-field px-3 py-1.5 text-sm text-ink-2 transition-colors hover:border-primary hover:text-primary-fg"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function QtyInput({ value, onChange, label, disabled }: { value: number; onChange: (n: number) => void; label: string; disabled: boolean }) {
  return disabled ? (
    <span className="tabular-nums">{value}</span>
  ) : (
    <TextField type="number" min={0} inputMode="numeric" aria-label={label} value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} containerClassName="mb-0 w-20" />
  )
}

export function VisitDetailPage({ visitId }: { visitId: string }) {
  const visit = useSalesStore((s) => s.visits.find((v) => v.id === visitId))
  const customer = useCustomer(visit?.customerId)
  const setVisitLineQty = useSalesStore((s) => s.setVisitLineQty)
  const signVisit = useSalesStore((s) => s.signVisit)
  const [signedBy, setSignedBy] = useState('')

  if (!visit) {
    return (
      <>
        <PageHeading section="ขาย" parent={{ label: 'เข้าร้าน', to: '/sales/visits' }} title="ใบเข้าร้าน" />
        <Card>
          <p className="text-muted">ไม่พบใบเข้าร้าน</p>
        </Card>
      </>
    )
  }

  const draft = visit.status === 'draft'
  const sold = visitSoldByProduct(visit)
  const untouched = visit.previousBalance.filter((l) => qtyOf(visit.counted, l.batchNumber) + qtyOf(visit.spoiled, l.batchNumber) === 0)

  /** Setting a count by hand: a LOT that isn't on the scanned list yet is added through the scan action. */
  const setQty = (mode: 'counted' | 'spoiled', line: ShopStockLine, qty: number) => {
    const current = qtyOf(visit[mode], line.batchNumber)
    const other = qtyOf(visit[mode === 'counted' ? 'spoiled' : 'counted'], line.batchNumber)
    const next = Math.min(qty, line.quantity - other)
    if (next > current) useSalesStore.getState().scanVisit(visit.id, mode, line.batchNumber, next - current)
    else setVisitLineQty(visit.id, mode, line.batchNumber, next)
  }

  const after = new Map<string, number>()
  visit.counted.concat(visit.delivered).forEach((l) => after.set(l.finishedGoodId, (after.get(l.finishedGoodId) ?? 0) + l.quantity))
  const products = [...new Set([...after.keys(), ...sold.keys()])]

  const handleSign = async () => {
    if (!signedBy.trim()) {
      toast.error('กรอกชื่อพนักงานร้านที่ลงชื่อ')
      return
    }
    const ok = await confirm({
      title: 'ให้ร้านลงชื่อรับรองใบนี้?',
      message: untouched.length
        ? `มี ${untouched.length} LOT ที่ยังไม่ได้สแกน ซึ่งจะนับเป็นขายแล้ว ยอดคงเหลือของร้านจะถูกแทนด้วยยอดในใบนี้`
        : 'ยอดคงเหลือของร้านจะถูกแทนด้วยยอดในใบนี้ และ LOT ใหม่จะถูกตัดออกจากคลังของเรา',
      confirmLabel: 'ลงชื่อและปิด',
      tone: 'primary',
    })
    if (!ok) return
    const res = signVisit(visit.id, signedBy)
    if (res.ok) toast.success(res.message)
    else toast.error(res.message)
  }

  return (
    <>
      <PageHeading section="ขาย" parent={{ label: 'เข้าร้าน', to: '/sales/visits' }} title={visit.visitNumber} subtitle={customer?.name} />

      <Card className="mb-6">
        <CardHeader title="ใบเข้าร้าน" action={<StatusPill tone={visitStatusTone[visit.status]}>{visitStatusLabel[visit.status]}</StatusPill>} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-muted">ร้าน</p>
            <Link to="/sales/customers/$customerId" params={{ customerId: visit.customerId }} className="font-medium text-primary-fg hover:underline">
              {customer?.name}
            </Link>
          </div>
          <div>
            <p className="text-sm text-muted">วันที่</p>
            <p className="font-medium">{formatDate(visit.visitDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted">คนขับ</p>
            <p className="font-medium">{visit.driverName}</p>
          </div>
          <div>
            <p className="text-sm text-muted">ลงชื่อ</p>
            <p className="font-medium">{visit.signedAt ? `${visit.signedBy} · ${formatDateTime(visit.signedAt)}` : '—'}</p>
          </div>
        </div>
      </Card>

      {draft && <ScanCard visit={visit} />}

      <Card className="mb-6">
        <CardHeader title="ตรวจยอดคงเหลือครั้งก่อน" subtitle="ของยังดีวางที่ร้านต่อ ของเสียนำกลับ ส่วนที่หายไปนับเป็นขายแล้ว" />
        {visit.previousBalance.length === 0 ? (
          <p className="text-sm text-muted">เข้าร้านครั้งแรก ยังไม่มีสินค้าที่ร้าน</p>
        ) : (
          <ul className="space-y-2">
            {visit.previousBalance.map((l) => {
              const counted = qtyOf(visit.counted, l.batchNumber)
              const spoiled = qtyOf(visit.spoiled, l.batchNumber)
              const gone = l.quantity - counted - spoiled
              return (
                <li key={l.batchNumber} className="grid grid-cols-2 items-center gap-3 rounded-[0.875rem] border border-line px-3.5 py-3 sm:grid-cols-[1fr_repeat(4,6.5rem)]">
                  <div className="col-span-2 sm:col-span-1">
                    <p className="font-medium">{finishedGoodById(l.finishedGoodId)?.name}</p>
                    <p className="text-sm text-muted">LOT {l.batchNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">คงเหลือครั้งก่อน</p>
                    <p className="tabular-nums">{l.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">ของยังดี</p>
                    <QtyInput label={`ของยังดี ${l.batchNumber}`} value={counted} onChange={(n) => setQty('counted', l, n)} disabled={!draft} />
                  </div>
                  <div>
                    <p className="text-sm text-muted">ของเสีย</p>
                    <QtyInput label={`ของเสีย ${l.batchNumber}`} value={spoiled} onChange={(n) => setQty('spoiled', l, n)} disabled={!draft} />
                  </div>
                  <div>
                    <p className="text-sm text-muted">ขายแล้ว</p>
                    <p className="font-medium tabular-nums">{gone}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {draft && untouched.length > 0 && (
          <Alert tone="warning" title={`ยังไม่ได้สแกน ${untouched.length} LOT`} className="mt-4">
            ถ้าหมดจริงจะนับเป็นขายแล้ว ถ้ายังอยู่ให้สแกนเป็นของยังดีหรือของเสีย
          </Alert>
        )}
      </Card>

      <Card className="mb-6">
        <CardHeader title="LOT ใหม่เข้าร้าน" subtitle="ตัดออกจากคลังของเราเมื่อร้านลงชื่อ" />
        {visit.delivered.length === 0 ? (
          <p className="text-sm text-muted">ยังไม่ได้สแกนเข้า</p>
        ) : (
          <ul className="space-y-2">
            {visit.delivered.map((l) => (
              <li key={l.batchNumber} className="flex flex-wrap items-center justify-between gap-3 rounded-[0.875rem] border border-line px-3.5 py-3">
                <div>
                  <p className="font-medium">{finishedGoodById(l.finishedGoodId)?.name}</p>
                  <p className="text-sm text-muted">LOT {l.batchNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  <QtyInput
                    label={`จำนวน ${l.batchNumber}`}
                    value={l.quantity}
                    disabled={!draft}
                    onChange={(n) => {
                      if (n > l.quantity) {
                        const res = useSalesStore.getState().scanVisit(visit.id, 'delivered', l.batchNumber, n - l.quantity)
                        if (!res.ok) toast.error(res.message)
                      } else setVisitLineQty(visit.id, 'delivered', l.batchNumber, n)
                    }}
                  />
                  {draft && (
                    <Button size="sm" variant="danger" iconOnly outlined aria-label="ลบ" title="ลบ" onClick={() => setVisitLineQty(visit.id, 'delivered', l.batchNumber, 0)}>
                      <IconTrash />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mb-6">
        <CardHeader title="สรุป" subtitle="แยกตามสินค้า เพราะร้านแจ้งยอดขายโดยไม่ระบุ LOT" />
        {products.length === 0 ? (
          <p className="text-sm text-muted">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate text-base [border-spacing:0_0.5rem]">
              <thead>
                <tr className="text-left text-sm text-muted">
                  <th className="px-3.5 pb-1 font-semibold">สินค้า</th>
                  <th className="px-3.5 pb-1 font-semibold">ขายได้ตั้งแต่รอบก่อน</th>
                  <th className="px-3.5 pb-1 font-semibold">คงเหลือที่ร้านหลังรอบนี้</th>
                </tr>
              </thead>
              <tbody>
                {products.map((fg) => (
                  <tr key={fg}>
                    <td className="rounded-l-[0.875rem] border-y border-l border-line px-3.5 py-3 font-medium">{finishedGoodById(fg)?.name}</td>
                    <td className="border-y border-line px-3.5 py-3 tabular-nums">{sold.get(fg) ?? 0}</td>
                    <td className="rounded-r-[0.875rem] border-y border-r border-line px-3.5 py-3 tabular-nums">{after.get(fg) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {draft && (
        <Card>
          <CardHeader title="ร้านลงชื่อรับรอง" subtitle="ร้านรับรองยอดคงเหลือบนชั้นวาง" />
          <div className="flex flex-wrap items-end gap-3">
            <TextField label="ผู้ลงชื่อ (พนักงานร้าน)" placeholder="เช่น คุณเอก" value={signedBy} onChange={(e) => setSignedBy(e.target.value)} containerClassName="mb-0 min-w-0 flex-[1_1_16rem]" />
            <Button onClick={handleSign} className="flex-[0_0_auto]">
              <IconCheck />
              ลงชื่อและปิด
            </Button>
          </div>
        </Card>
      )}
    </>
  )
}
