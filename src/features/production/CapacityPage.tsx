import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { Alert, Button, Card, CardHeader, DataTable, Select, Sheet, StatusPill, type DataTableColumn } from '@/components/ui'
import { IconClose } from '@/components/icons'
import { controlClass } from '@/components/ui/FormField'
import { cn } from '@/lib/cn'
import { useCatalogStore } from '@/features/catalog/store'
import { rawMaterialById } from '@/features/procurement/mockData'
import type { FinishedGood } from '@/features/procurement/types'
import { availableFromStock, activeRecipes, enumerateCombos, leftoverAfter, maxProducible, type Combo, type Plan } from './capacity'
import { useProductionStore } from './store'
import { roundQty } from './utils'

const baht = (n: number) => `฿${n.toLocaleString('th-TH')}`

function useCapacity() {
  const rmStock = useProductionStore((s) => s.rmStock)
  const allFinishedGoods = useCatalogStore((s) => s.finishedGoods)
  const bomVersions = useCatalogStore((s) => s.bomVersions)
  const finishedGoods = useMemo(() => allFinishedGoods.filter((fg) => fg.isActive), [allFinishedGoods])

  // bomVersions is a dependency so the numbers follow recipe edits
  const { available, recipes, perProduct, combos } = useMemo(() => {
    const available = availableFromStock(rmStock)
    const recipes = activeRecipes()
    const perProduct = Object.fromEntries(finishedGoods.map((fg) => [fg.id, maxProducible(fg.id, available, recipes)]))
    const price = new Map(finishedGoods.map((fg) => [fg.id, fg.standardPrice]))
    const combos = enumerateCombos(
      finishedGoods.map((fg) => fg.id),
      available,
      (id) => price.get(id) ?? 0,
    )
    return { available, recipes, perProduct, combos }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rmStock, finishedGoods, bomVersions])

  const nameOf = (id: string) => finishedGoods.find((fg) => fg.id === id)?.name ?? id
  return { finishedGoods, available, recipes, perProduct, combos, nameOf }
}

/** "How many ways can we mix production" — shared by the capacity page and the sales estimate. */
export function CombosCard({ className, onUse, plansOpenInDrawer }: { className?: string; onUse?: (c: Combo) => void; /** Clicking a row opens a drawer listing that plan's finished goods */ plansOpenInDrawer?: boolean }) {
  const { combos, nameOf, finishedGoods } = useCapacity()
  const [selected, setSelected] = useState<Combo | null>(null)
  const comboColumns: DataTableColumn<Combo & { key: string }>[] = [
    {
      key: 'plan',
      label: 'แบบการผลิต',
      sortable: false,
      render: (c) => (
        <span className="text-sm">
          {Object.entries(c.plan)
            .map(([id, q]) => `${nameOf(id)} × ${q}`)
            .join(' + ')}
        </span>
      ),
    },
    { key: 'units', label: 'รวม (ชิ้น)', sortValue: (c) => c.totalUnits, render: (c) => <span className="tabular-nums">{c.totalUnits}</span> },
    { key: 'value', label: 'มูลค่าขายตามราคามาตรฐาน', sortValue: (c) => c.totalValue, render: (c) => <span className="tabular-nums">{baht(c.totalValue)}</span> },
  ]

  const toRows = (list: Combo[]) => list.map((c, i) => ({ ...c, key: `${i}-${JSON.stringify(c.plan)}` }))
  const rows = toRows(
    [...new Map([...combos.byUnits, ...combos.byValue].map((c) => [JSON.stringify(c.plan), c])).values()].sort((a, b) => b.totalUnits - a.totalUnits || b.totalValue - a.totalValue),
  )

  return (
    <Card className={className}>
      <CardHeader
        title="ผลิตผสมกันได้กี่แบบ"
        subtitle="วัตถุดิบบางตัวใช้ร่วมกันหลายสินค้า แบบการผลิตที่นับคือแบบที่ผลิตเพิ่มอีกชิ้นเดียวไม่ได้แล้ว"
        action={<StatusPill tone="info">{combos.truncated ? `${combos.count.toLocaleString('th-TH')}+ แบบ` : `${combos.count.toLocaleString('th-TH')} แบบ`}</StatusPill>}
      />
      {combos.truncated && (
        <Alert tone="info" title="คำนวณถึงจำนวนสูงสุดที่รองรับแล้ว" className="mb-4">
          ตัวเลขจำนวนแบบเป็นค่าต่ำสุด ตารางด้านล่างยังเป็นแบบที่ดีที่สุดเท่าที่คำนวณได้
        </Alert>
      )}
      <DataTable
        columns={comboColumns}
        rows={rows}
        rowKey={(c) => c.key}
        defaultSort={{ key: 'units', dir: 'desc' }}
        emptyTitle="วัตถุดิบไม่พอผลิตสินค้าใดเลย"
        pageSize={10}
        paginationVariant="jump"
        onRowClick={plansOpenInDrawer ? setSelected : undefined}
        renderActions={
          onUse
            ? (c) => (
                <Button size="sm" variant="soft" outlined onClick={() => onUse(c)}>
                  ใช้แบบนี้
                </Button>
              )
            : undefined
        }
      />
      <p className="mt-3 text-sm text-muted">แสดงแบบที่ได้จำนวนชิ้นรวมมากที่สุดและมูลค่ารวมสูงสุด</p>
          <Sheet
        open={plansOpenInDrawer === true && selected !== null}
        onClose={() => setSelected(null)}
        title="รายการสินค้าสำเร็จรูปของแผนนี้"
        description={selected ? `รวม ${selected.totalUnits} ชิ้น · มูลค่า ${baht(selected.totalValue)}` : undefined}
        footer={<Button onClick={() => setSelected(null)}>ปิด</Button>}
      >
        {selected && (
          <ul className="space-y-2">
            {Object.entries(selected.plan).map(([id, q]) => {
              const fg = finishedGoods.find((f) => f.id === id)
              return (
                <li key={id} className="flex items-center justify-between gap-3 rounded-[0.875rem] border border-line px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium">{nameOf(id)}</p>
                    <p className="text-sm text-muted">ราคามาตรฐาน {baht(fg?.standardPrice ?? 0)} / {fg?.unit}</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="font-semibold">
                      {q} {fg?.unit}
                    </p>
                    <p className="text-sm text-muted">{baht(q * (fg?.standardPrice ?? 0))}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Sheet>
</Card>
  )
}

/** The calculator itself — used as a page and inside a drawer on the sales estimate. */
export function CapacityPanel() {
  const { finishedGoods, available, recipes, perProduct } = useCapacity()
  // One row per product in the plan being tried; "ใช้แบบนี้" fills them from a plan, staff add or remove the rest
  const [rows, setRows] = useState<{ fgId: string; qty: string }[]>([])

  const plan: Plan = Object.fromEntries(rows.map((r) => [r.fgId, Number(r.qty)] as const).filter(([, q]) => q > 0))
  const left = leftoverAfter(plan, available, recipes)
  const short = Object.entries(left).filter(([, q]) => q < 0)
  const used = Object.keys(plan).length > 0
  const unitOf = (rmId: string) => rawMaterialById(rmId)?.unit ?? ''

  const productColumns: DataTableColumn<FinishedGood>[] = [
    { key: 'name', label: 'สินค้า', sortValue: (fg) => fg.name, render: (fg) => <span className="font-medium">{fg.name}</span> },
    {
      key: 'max',
      label: 'ผลิตได้สูงสุด',
      sortValue: (fg) => perProduct[fg.id].max,
      render: (fg) => (
        <span className="tabular-nums font-medium">
          {perProduct[fg.id].max} {fg.unit}
        </span>
      ),
    },
    {
      key: 'limit',
      label: 'วัตถุดิบที่จำกัด',
      sortValue: (fg) => perProduct[fg.id].limitingRawMaterialId ?? '',
      render: (fg) => {
        const { max, limitingRawMaterialId } = perProduct[fg.id]
        if (!limitingRawMaterialId) return <StatusPill tone="gray">ยังไม่มีสูตรที่ใช้งาน</StatusPill>
        return <StatusPill tone={max === 0 ? 'danger' : 'warning'}>{rawMaterialById(limitingRawMaterialId)?.nameTh}</StatusPill>
      },
    },
  ]

  const useCombo = (c: Combo) => setRows(Object.entries(c.plan).map(([fgId, q]) => ({ fgId, qty: String(q) })))
  const addable = finishedGoods.filter((fg) => !rows.some((r) => r.fgId === fg.id))

  return (
    <>
      <Card className="mb-6">
        <CardHeader title="ผลิตได้สูงสุดต่อสินค้า" subtitle="คิดทีละสินค้า โดยใช้วัตถุดิบทั้งหมดที่พร้อมใช้กับสินค้านั้นอย่างเดียว" />
        <DataTable columns={productColumns} rows={finishedGoods} rowKey={(fg) => fg.id} defaultSort={{ key: 'max', dir: 'desc' }} emptyTitle="ยังไม่มีสินค้าสำเร็จรูป" />
      </Card>

      <CombosCard onUse={useCombo} className="mb-6" />

      <Card>
        <CardHeader title="ลองกำหนดจำนวนเอง" subtitle="ใส่จำนวนที่อยากผลิต แล้วดูวัตถุดิบที่ใช้ เหลือ หรือขาด" />
        {rows.length === 0 ? (
          <p className="mb-4 rounded-[0.875rem] border border-dashed border-line px-4 py-4 text-sm text-muted">ยังไม่มีสินค้าในแผน เลือก "ใช้แบบนี้" จากตารางผลิตผสมด้านบน หรือเพิ่มสินค้าเองด้านล่าง</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {rows.map((r) => {
              const fg = finishedGoods.find((f) => f.id === r.fgId)
              return (
                <li key={r.fgId} className="flex flex-wrap items-center gap-3 rounded-[0.875rem] border border-line px-3.5 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{fg?.name ?? r.fgId}</span>
                    <span className="text-sm text-muted"> · ผลิตได้สูงสุด {perProduct[r.fgId]?.max ?? 0} {fg?.unit}</span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    aria-label={`จำนวน ${fg?.name}`}
                    value={r.qty}
                    onChange={(e) => setRows((prev) => prev.map((x) => (x.fgId === r.fgId ? { ...x, qty: e.target.value } : x)))}
                    className={cn(controlClass(), 'h-9 w-28 px-3 text-right tabular-nums')}
                  />
                  <Button size="sm" variant="soft" iconOnly outlined aria-label={`เอา ${fg?.name} ออก`} tooltip="เอาสินค้าออก" onClick={() => setRows((prev) => prev.filter((x) => x.fgId !== r.fgId))}>
                    <IconClose />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
        {addable.length > 0 && (
          <Select
            aria-label="เพิ่มสินค้า"
            placeholder="+ เพิ่มสินค้า"
            value=""
            onChange={(id) => id && setRows((prev) => [...prev, { fgId: id, qty: '' }])}
            options={addable.map((fg) => ({ value: fg.id, label: fg.name }))}
            className="mb-5"
          />
        )}

        {used && (
          <ul className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {Object.keys(available).map((rmId) => {
              const remaining = roundQty(left[rmId] ?? 0)
              const usedQty = roundQty((available[rmId] ?? 0) - remaining)
              if (usedQty === 0) return null
              return (
                <li key={rmId} className="flex items-center justify-between gap-3 rounded-[0.875rem] border border-line px-3.5 py-2.5">
                  <span className="font-medium">{rawMaterialById(rmId)?.nameTh}</span>
                  <span className="text-sm tabular-nums">
                    ใช้ {usedQty} / {roundQty(available[rmId])} {unitOf(rmId)}{' '}
                    {remaining < 0 ? <StatusPill tone="danger">ขาด {-remaining}</StatusPill> : <StatusPill tone="success">เหลือ {remaining}</StatusPill>}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        {short.length > 0 && (
          <Alert tone="danger" title="วัตถุดิบไม่พอ" className="mb-5" action={<Link to="/procurement/plans/new/step-1" className="text-sm font-medium text-primary-fg hover:underline">วางแผนจัดซื้อ</Link>}>
            ลดจำนวนลง หรือจัดซื้อวัตถุดิบเพิ่มก่อน
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="soft" outlined disabled={rows.length === 0} onClick={() => setRows([])}>
            ล้างค่า
          </Button>
          <Link to="/production/planning">
            <Button>ไปสร้างใบสั่งผลิต</Button>
          </Link>
        </div>
      </Card>
    </>
  )
}

export function CapacityPage() {
  return (
    <>
      <PageHeading section="ผลิต" title="คำนวณกำลังผลิต" subtitle="คำนวณจากวัตถุดิบที่พร้อมใช้ (คงคลังหักที่จองแล้ว) และสูตรที่ใช้งานอยู่ ว่าผลิตสินค้าอะไรได้กี่ชิ้น และผสมกันได้กี่แบบ" />
      <CapacityPanel />
    </>
  )
}
