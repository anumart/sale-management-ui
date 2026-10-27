import { useEffect, useState } from 'react'
import { IconPlus } from '@/components/icons'
import { Button, DataTable, DeltaBadge, FilterSelect, ListToolbar, StatusPill, TextField, type DataTableColumn } from '@/components/ui'
import { getFinishedGoods, useCatalogStore } from '@/features/catalog/store'
import { toYmd } from '@/features/sales/estimates'
import { customerById } from '@/features/sales/store'
import type { CustomerOrder, OrderChannel } from '@/features/sales/types'
import { channelLabel, channelTone, formatDate, isExportCustomer } from '@/features/sales/utils'
import { matchesText } from '@/lib/criteria'
import { DateRangeField } from './DateRangeField'
import { salesChannelLabel, soldInRange, usePlannableOrders, type SalesChannel } from './demand'
import { finishedGoodById, salesHistory } from './mockData'
import { useWizardStore, type WizardDemand } from './store'
import type { FinishedGood } from './types'

const PAGE_SIZE = 10

/** Page state for a picker's table that goes back to page 1 whenever its criteria change. */
function usePager(criteria: unknown[]) {
  const [page, setPage] = useState(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPage(1), criteria)
  return { pageSize: PAGE_SIZE, page, onPageChange: setPage, paginationVariant: 'jump' as const }
}

const shortDate = (d: Date) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

/** Shared shell of the three pickers: the criteria on top, the selectable table, and the button that moves the picks into the plan. */
function PickerFooter({ count, onAdd }: { count: number; onAdd: () => void }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-sm text-muted">{count > 0 ? `เลือกไว้ ${count} รายการ` : 'ติ๊กเลือกรายการที่ต้องการ แล้วกดเพิ่มเข้าแผน'}</p>
      <Button disabled={count === 0} onClick={onAdd}>
        <IconPlus />
        เพิ่มเข้าแผน ({count})
      </Button>
    </div>
  )
}

export function HistoryPicker() {
  const addDemand = useWizardStore((s) => s.addDemand)
  const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
  const [range, setRange] = useState({ start: lastMonth, end: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0) })
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [channel, setChannel] = useState<SalesChannel | 'all'>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const categories = useCatalogStore((s) => s.categories).filter((c) => c.kind === 'finished_good').sort((a, b) => a.sortOrder - b.sortOrder)

  const needle = query.trim().toLowerCase()
  /** A parent category covers its children too. */
  const inCategory = (fg: FinishedGood, id: string) => id === 'all' || fg.categoryId === id || categories.find((c) => c.id === fg.categoryId)?.parentCategoryId === id
  const all = getFinishedGoods(true).filter((fg) => matchesText(needle, fg.name, fg.sku))
  const rows = all.filter((fg) => inCategory(fg, category))
  const pager = usePager([query, category, channel, range])
  const sold = (fg: FinishedGood) => soldInRange(fg.id, range.start, range.end, channel)
  const trend = (id: string) => salesHistory.find((s) => s.finishedGoodId === id)?.trendPct ?? 0

  const columns: DataTableColumn<FinishedGood>[] = [
    { key: 'name', label: 'สินค้า', sortValue: (fg) => fg.name, render: (fg) => <span className="font-medium">{fg.name}</span> },
    { key: 'sold', label: 'ยอดขายในช่วงที่เลือก', sortValue: sold, render: (fg) => <span className="tabular-nums">{sold(fg)} {fg.unit}</span> },
    { key: 'category', label: 'หมวดหมู่', sortValue: (fg) => categories.find((c) => c.id === fg.categoryId)?.name ?? '', render: (fg) => categories.find((c) => c.id === fg.categoryId)?.name ?? '—' },
    { key: 'trend', label: 'แนวโน้ม', sortValue: (fg) => trend(fg.id), render: (fg) => <DeltaBadge value={trend(fg.id)} /> },
  ]

  const add = () => {
    const key = `history:${toYmd(range.start)}~${toYmd(range.end)}:${channel}`
    const label = `ขาย ${shortDate(range.start)} – ${shortDate(range.end)}${channel === 'all' ? '' : ` (${salesChannelLabel[channel]})`}`
    const items: WizardDemand[] = rows
      .filter((fg) => selected.has(fg.id))
      .map((fg) => ({ finishedGoodId: fg.id, quantity: sold(fg), origin: { key, kind: 'sales_history', label } }))
    addDemand(items)
    setSelected(new Set())
  }

  return (
    <>
      <ListToolbar
        searchLabel="ค้นหาสินค้า"
        searchPlaceholder="ค้นหาชื่อหรือรหัสสินค้า"
        query={query}
        onQueryChange={setQuery}
        filters={
          <>
            <DateRangeField label="" startDate={range.start} endDate={range.end} onChange={(start, end) => setRange({ start, end })} containerClassName="w-full sm:w-72" />
            <FilterSelect
              label="หมวดหมู่"
              value={category}
              neutralValue="all"
              onChange={setCategory}
              options={[
                { value: 'all', label: 'ทั้งหมด', count: all.length },
                ...categories.map((c) => ({ value: c.id, label: c.parentCategoryId ? `– ${c.name}` : c.name, count: all.filter((fg) => inCategory(fg, c.id)).length })),
              ]}
              className="w-full sm:w-72"
            />
            <FilterSelect
              label="ช่องทางขาย"
              value={channel}
              neutralValue="all"
              onChange={setChannel}
              options={[{ value: 'all' as const, label: 'ทั้งหมด' }, ...(['consignment', 'direct', 'export'] as const).map((c) => ({ value: c, label: salesChannelLabel[c] }))]}
              className="w-full sm:w-72"
            />
          </>
        }
        resultText={`พบ ${rows.length} สินค้า`}
        hasCriteria={!!query || category !== 'all' || channel !== 'all'}
        onClear={() => {
          setQuery('')
          setCategory('all')
          setChannel('all')
        }}
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(fg) => fg.id}
        selected={selected}
        onSelectedChange={setSelected}
        {...pager}
        rowSelectLabel={(fg) => `เลือก ${fg.name}`}
        emptyTitle="ไม่พบสินค้า"
      />
      <PickerFooter count={selected.size} onAdd={add} />
    </>
  )
}

export function OrdersPicker() {
  const addDemand = useWizardStore((s) => s.addDemand)
  const lines = useWizardStore((s) => s.lines)
  const plannable = usePlannableOrders()
  const [query, setQuery] = useState('')
  const [channel, setChannel] = useState<OrderChannel | 'all'>('all')
  const [customerType, setCustomerType] = useState<'domestic' | 'export' | 'all'>('all')
  const [platform, setPlatform] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const addedKeys = new Set(lines.flatMap((l) => l.origins.map((o) => o.key)))
  const candidates = plannable.filter((o) => !addedKeys.has(o.id))
  const needle = query.trim().toLowerCase()
  const pager = usePager([query, channel, customerType, platform])
  const typeOf = (o: CustomerOrder) => (isExportCustomer(customerById(o.customerId)) ? 'export' : 'domestic')
  /** `skip` leaves one criterion out so a filter can show how many results each of its values would give. */
  const matches = (o: CustomerOrder, skip?: 'channel' | 'type' | 'platform') =>
    (skip === 'channel' || channel === 'all' || o.channel === channel) &&
    (skip === 'type' || customerType === 'all' || typeOf(o) === customerType) &&
    (skip === 'platform' || platform === 'all' || o.platformName === platform) &&
    matchesText(needle, o.orderNumber, customerById(o.customerId)?.name, o.platformOrderRef)
  const rows = candidates.filter((o) => matches(o))
  const channels = (['email', 'phone', 'platform', 'manual'] as const).map((c) => ({ value: c, label: channelLabel[c], tone: channelTone[c], count: candidates.filter((o) => matches(o, 'channel') && o.channel === c).length }))
  const platformNames = [...new Set(candidates.map((o) => o.platformName).filter((n): n is string => !!n))].sort()

  const columns: DataTableColumn<CustomerOrder>[] = [
    { key: 'number', label: 'เลขที่', sortValue: (o) => o.orderNumber, render: (o) => <span className="font-medium">{o.orderNumber}</span> },
    { key: 'customer', label: 'ลูกค้า', sortValue: (o) => customerById(o.customerId)?.name ?? '', render: (o) => customerById(o.customerId)?.name },
    { key: 'channel', label: 'ช่องทาง', sortValue: (o) => o.channel, render: (o) => <StatusPill tone={channelTone[o.channel]}>{channelLabel[o.channel]}</StatusPill> },
    { key: 'due', label: 'ต้องส่ง', sortValue: (o) => o.requestedDeliveryDate, render: (o) => formatDate(o.requestedDeliveryDate) },
    { key: 'lines', label: 'สินค้า', render: (o) => <span className="text-sm text-ink-2">{o.lines.map((l) => `${finishedGoodById(l.finishedGoodId ?? '')?.name ?? l.customerSku} × ${l.quantity}`).join(', ')}</span> },
  ]

  const add = () => {
    const items = rows.filter((o) => selected.has(o.id)).flatMap((o) => o.lines.flatMap((l) => (l.finishedGoodId ? [{ finishedGoodId: l.finishedGoodId, quantity: l.quantity, origin: { key: o.id, kind: 'customer_orders' as const, label: o.orderNumber } }] : [])))
    addDemand(items)
    setSelected(new Set())
  }

  return (
    <>
      <ListToolbar
        searchLabel="ค้นหาคำสั่งซื้อ"
        searchPlaceholder="ค้นหาเลขที่, ลูกค้า, เลขอ้างอิง platform"
        query={query}
        onQueryChange={setQuery}
        filters={
          <>
            <FilterSelect
              label="ช่องทาง"
              value={channel}
              neutralValue="all"
              onChange={setChannel}
              options={[{ value: 'all' as const, label: 'ทั้งหมด', count: candidates.filter((o) => matches(o, 'channel')).length }, ...channels]}
              className="w-full sm:w-72"
            />
            <FilterSelect
              label="ประเภทลูกค้า"
              value={customerType}
              neutralValue="all"
              onChange={setCustomerType}
              options={[
                { value: 'all' as const, label: 'ทั้งหมด', count: candidates.filter((o) => matches(o, 'type')).length },
                { value: 'domestic' as const, label: 'ในประเทศ', count: candidates.filter((o) => matches(o, 'type') && typeOf(o) === 'domestic').length },
                { value: 'export' as const, label: 'ส่งออก', count: candidates.filter((o) => matches(o, 'type') && typeOf(o) === 'export').length },
              ]}
              className="w-full sm:w-72"
            />
            <FilterSelect
              label="Platform"
              value={platform}
              neutralValue="all"
              onChange={setPlatform}
              options={[{ value: 'all', label: 'ทั้งหมด', count: candidates.filter((o) => matches(o, 'platform')).length }, ...platformNames.map((n) => ({ value: n, label: n, count: candidates.filter((o) => matches(o, 'platform') && o.platformName === n).length }))]}
              className="w-full sm:w-72"
            />
          </>
        }
        resultText={`พบ ${rows.length} จาก ${candidates.length} ใบ`}
        hasCriteria={!!query || channel !== 'all' || customerType !== 'all' || platform !== 'all'}
        onClear={() => {
          setQuery('')
          setChannel('all')
          setCustomerType('all')
          setPlatform('all')
        }}
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(o) => o.id}
        selected={selected}
        onSelectedChange={setSelected}
        {...pager}
        rowSelectLabel={(o) => `เลือก ${o.orderNumber}`}
        emptyTitle="ไม่มีคำสั่งซื้อที่รอวางแผนจัดซื้อ"
        emptyDescription="แสดงเฉพาะคำสั่งซื้อที่ยืนยันแล้ว ยังไม่สั่งผลิต และยังไม่อยู่ในแผนอื่น"
      />
      <PickerFooter count={selected.size} onAdd={add} />
    </>
  )
}

export function ProductPicker() {
  const addDemand = useWizardStore((s) => s.addDemand)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [qty, setQty] = useState<Record<string, string>>({})
  const categories = useCatalogStore((s) => s.categories).filter((c) => c.kind === 'finished_good').sort((a, b) => a.sortOrder - b.sortOrder)

  const needle = query.trim().toLowerCase()
  /** A parent category covers its children too. */
  const inCategory = (fg: FinishedGood) => category === 'all' || fg.categoryId === category || categories.find((c) => c.id === fg.categoryId)?.parentCategoryId === category
  const matches = (fg: FinishedGood, skipCategory = false) => (skipCategory || inCategory(fg)) && matchesText(needle, fg.name, fg.sku)
  const pager = usePager([query, category])
  const all = getFinishedGoods(true)
  const rows = all.filter((fg) => matches(fg))
  const categoryCount = (id: string) => all.filter((fg) => matches(fg, true) && (fg.categoryId === id || categories.find((c) => c.id === fg.categoryId)?.parentCategoryId === id)).length
  const quantityOf = (id: string) => Number(qty[id] ?? 1)
  const valid = [...selected].filter((id) => quantityOf(id) > 0)

  const columns: DataTableColumn<FinishedGood>[] = [
    { key: 'name', label: 'สินค้า', sortValue: (fg) => fg.name, render: (fg) => <span className="font-medium">{fg.name}</span> },
    { key: 'category', label: 'หมวดหมู่', sortValue: (fg) => categories.find((c) => c.id === fg.categoryId)?.name ?? '', render: (fg) => categories.find((c) => c.id === fg.categoryId)?.name ?? '—' },
    { key: 'sku', label: 'รหัส', sortValue: (fg) => fg.sku, render: (fg) => <span className="text-muted">{fg.sku}</span> },
    {
      key: 'qty',
      label: 'จำนวนที่จะวางแผน',
      render: (fg) => (
        <div className="flex items-center gap-2">
          <TextField type="number" min={1} aria-label={`จำนวนของ ${fg.name}`} value={qty[fg.id] ?? '1'} onChange={(e) => setQty((q) => ({ ...q, [fg.id]: e.target.value }))} className="w-24" containerClassName="mb-0" />
          <span className="text-muted">{fg.unit}</span>
        </div>
      ),
    },
  ]

  const add = () => {
    addDemand(valid.map((id) => ({ finishedGoodId: id, quantity: quantityOf(id), origin: { key: 'manual', kind: 'finished_goods', label: 'เลือกเอง' } })))
    setSelected(new Set())
  }

  return (
    <>
      <ListToolbar
        searchLabel="ค้นหาสินค้า"
        searchPlaceholder="ค้นหาชื่อหรือรหัสสินค้า"
        query={query}
        onQueryChange={setQuery}
        filters={
          <FilterSelect
            label="หมวดหมู่"
            value={category}
            neutralValue="all"
            onChange={setCategory}
            options={[{ value: 'all', label: 'ทั้งหมด', count: all.filter((fg) => matches(fg, true)).length }, ...categories.map((c) => ({ value: c.id, label: c.parentCategoryId ? `– ${c.name}` : c.name, count: categoryCount(c.id) }))]}
            className="w-full sm:w-72"
          />
        }
        resultText={`พบ ${rows.length} สินค้า`}
        hasCriteria={!!query || category !== 'all'}
        onClear={() => {
          setQuery('')
          setCategory('all')
        }}
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(fg) => fg.id}
        selected={selected}
        onSelectedChange={setSelected}
        {...pager}
        rowSelectLabel={(fg) => `เลือก ${fg.name}`}
        emptyTitle="ไม่พบสินค้า"
      />
      <PickerFooter count={valid.length} onAdd={add} />
    </>
  )
}
