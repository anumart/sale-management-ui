import { useMemo, useState } from 'react'
import { PageHeading } from '@/components/layout/PageHeading'
import { IconBox, IconCart, IconMoneyBag, IconTruck, IconWarning } from '@/components/icons'
import { Alert, Card, CardHeader, DataTable, SegmentedControl, Select, StatusPill, Tooltip, type DataTableColumn, type PillTone } from '@/components/ui'
import { StatCard } from '@/features/dashboard/components/StatCard'
import { getFinishedGoods } from '@/features/catalog/store'
import { finishedGoodById } from '@/features/procurement/mockData'
import { cn } from '@/lib/cn'
import { formatCurrency, formatNumber } from '@/lib/format'
import {
  buildWeekCells,
  formatPct,
  groupBy,
  isoWeek,
  MIN_DELIVERED_FOR_RATE,
  missingReports,
  sellThrough,
  totalsOf,
  WASTE_DANGER,
  WASTE_WARN,
  wasteRate,
  type Totals,
} from './consignmentReport'
import { weekStartOf } from './mockData'
import { useSalesStore } from './store'
import { formatDate } from './utils'

type Range = '4' | '8' | '12'
type GroupMode = 'chain' | 'branch'

interface Row extends Totals {
  id: string
  name: string
  /** Chain name (branch rows) or number of branches (chain rows) */
  detail: string
}

const wasteTone = (rate: number | null): PillTone => (rate === null ? 'gray' : rate >= WASTE_DANGER ? 'danger' : rate >= WASTE_WARN ? 'warning' : 'success')
const shortDate = (date: string) => new Date(`${date}T00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

/**
 * Weekly consignment performance by chain / branch / product — the system's version of the customer's Power BI
 * "Sales Weekly" report. Every figure comes from signed visits and confirmed sales reports, so delivered is never
 * blank and a shop that hasn't reported shows up as missing instead of as a sales drop.
 */
export function ConsignmentPerformancePage() {
  const customers = useSalesStore((s) => s.customers)
  const history = useSalesStore((s) => s.consignmentWeeks)
  const visits = useSalesStore((s) => s.visits)
  const reports = useSalesStore((s) => s.reports)
  const [range, setRange] = useState<Range>('8')
  const [chain, setChain] = useState('')
  const [product, setProduct] = useState('')
  const [mode, setMode] = useState<GroupMode>('chain')

  const chains = useMemo(() => [...new Set(customers.filter((c) => c.type === 'consignment' && c.chain).map((c) => c.chain!))].sort(), [customers])

  const data = useMemo(() => {
    const byId = new Map(customers.map((c) => [c.id, c]))
    const count = Number(range)
    // Complete weeks only: a half-finished current week would read as a drop
    const weeks = Array.from({ length: count }, (_, i) => weekStartOf(new Date(), i - count))
    const inRange = new Set(weeks)
    const cells = buildWeekCells(history, visits, reports).filter(
      (c) => inRange.has(c.weekStart) && (!chain || byId.get(c.customerId)?.chain === chain) && (!product || c.finishedGoodId === product),
    )
    const missing = missingReports(cells)
    const branchRows: Row[] = [...groupBy(cells, (c) => c.customerId)].map(([id, rows]) => ({
      id,
      name: byId.get(id)?.name ?? id,
      detail: byId.get(id)?.chain ?? '-',
      ...totalsOf(rows, byId),
    }))
    const chainRows: Row[] = [...groupBy(cells, (c) => byId.get(c.customerId)?.chain ?? '-')].map(([name, rows]) => ({
      id: name,
      name,
      detail: `${new Set(rows.map((r) => r.customerId)).size} สาขา`,
      ...totalsOf(rows, byId),
    }))
    const rangeEnd = new Date(`${weekStartOf(new Date())}T00:00`)
    rangeEnd.setDate(rangeEnd.getDate() - 1)
    return {
      weeks,
      rangeEnd: rangeEnd.toISOString(),
      totals: totalsOf(cells, byId),
      branches: new Set(cells.map((c) => c.customerId)).size,
      missing,
      trend: weeks.map((w) => ({
        weekStart: w,
        ...totalsOf(
          cells.filter((c) => c.weekStart === w),
          byId,
        ),
        missing: missing.filter((m) => m.weekStart === w).length,
      })),
      branchRows,
      chainRows,
      products: [...groupBy(cells, (c) => c.finishedGoodId)].map(([id, rows]) => ({ id, ...totalsOf(rows, byId) })).sort((a, b) => b.net - a.net),
      watch: branchRows
        .filter((r) => r.delivered >= MIN_DELIVERED_FOR_RATE)
        .sort((a, b) => (wasteRate(b) ?? 0) - (wasteRate(a) ?? 0))
        .slice(0, 5),
      customerName: (id: string) => byId.get(id)?.name ?? id,
    }
  }, [customers, history, visits, reports, range, chain, product])

  const { totals } = data
  const columns: DataTableColumn<Row>[] = [
    { key: 'name', label: mode === 'chain' ? 'เครือห้าง' : 'สาขา', sortValue: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'detail', label: mode === 'chain' ? 'จำนวนสาขา' : 'เครือ', sortValue: (r) => r.detail, render: (r) => r.detail },
    { key: 'delivered', label: 'ส่ง', sortValue: (r) => r.delivered, render: (r) => formatNumber(r.delivered), headerClassName: 'text-right', cellClassName: 'text-right' },
    { key: 'sold', label: 'ขาย', sortValue: (r) => r.sold, render: (r) => formatNumber(r.sold), headerClassName: 'text-right', cellClassName: 'text-right' },
    { key: 'spoiled', label: 'เสีย', sortValue: (r) => r.spoiled, render: (r) => formatNumber(r.spoiled), headerClassName: 'text-right', cellClassName: 'text-right' },
    { key: 'through', label: 'ขายออก', sortValue: (r) => sellThrough(r) ?? -1, render: (r) => formatPct(sellThrough(r)), headerClassName: 'text-right', cellClassName: 'text-right' },
    {
      key: 'waste',
      label: 'ของเสีย',
      sortValue: (r) => wasteRate(r) ?? -1,
      render: (r) => <StatusPill tone={wasteTone(wasteRate(r))}>{formatPct(wasteRate(r))}</StatusPill>,
      headerClassName: 'text-right',
      cellClassName: 'text-right',
    },
    { key: 'net', label: 'ยอดหลังหัก GP', sortValue: (r) => r.net, render: (r) => formatCurrency(r.net), headerClassName: 'text-right', cellClassName: 'text-right' },
  ]

  return (
    <>
      <PageHeading section="ขาย" title="สรุปผลฝากขาย" subtitle="ส่ง ขาย และของเสียของร้านฝากขายรายสัปดาห์ จากใบเข้าร้านที่ลงชื่อแล้วและรายงานยอดขายที่ยืนยันแล้ว" />
      <div className="flex flex-col gap-4">
        <Card className="flex flex-wrap items-end gap-4">
          <div>
            <p className="mb-2 text-control font-medium">ช่วงเวลา</p>
            <SegmentedControl
              variant="mask"
              aria-label="ช่วงเวลา"
              value={range}
              onChange={setRange}
              options={[
                { value: '4', label: '4 สัปดาห์' },
                { value: '8', label: '8 สัปดาห์' },
                { value: '12', label: '12 สัปดาห์' },
              ]}
            />
          </div>
          <Select
            label="เครือห้าง"
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            placeholder="ทุกเครือ"
            options={chains.map((c) => ({ value: c, label: c }))}
            containerClassName="mb-0 w-48"
          />
          <Select
            label="สินค้า"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="ทุกสินค้า"
            options={getFinishedGoods(true).map((f) => ({ value: f.id, label: f.name }))}
            containerClassName="mb-0 w-56"
          />
          <p className="ml-auto text-sm text-muted">
            {formatDate(`${data.weeks[0]}T00:00`)} – {formatDate(data.rangeEnd)} · ไม่รวมสัปดาห์นี้ที่ยังไม่จบ
          </p>
        </Card>

        {data.missing.length > 0 && (
          <Alert tone="warning" title={`ยอดขายยังไม่ครบ: ${data.missing.length} ร้าน·สัปดาห์ ยังไม่มีรายงานยอดขายที่ยืนยันแล้ว`}>
            {[...groupBy(data.missing, (m) => m.customerId)]
              .map(([id, rows]) => `${data.customerName(id)} (${rows.map((r) => `W${isoWeek(r.weekStart)}`).join(', ')})`)
              .join(' · ')}
            {' — '}อัตราขายออกคิดเฉพาะสัปดาห์ที่มีรายงาน ยอดขายจะเพิ่มขึ้นเมื่อร้านส่งรายงาน
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard variant="theme" icon={<IconMoneyBag />} label="ยอดขายหลังหัก GP" value={formatCurrency(totals.net)} hint={`ราคาขายหน้าร้าน ${formatCurrency(totals.gross)}`} />
          <StatCard variant="accent" icon={<IconCart />} label="ขายได้" value={`${formatNumber(totals.sold)} ชิ้น`} hint={`ขายออก ${formatPct(sellThrough(totals))} ของที่ส่ง`} />
          <StatCard variant="primary" icon={<IconTruck />} label="ส่งเข้าร้าน" value={`${formatNumber(totals.delivered)} ชิ้น`} hint={`${formatNumber(data.branches)} สาขา`} />
          <StatCard variant="warning" icon={<IconBox />} label="ของเสีย" value={`${formatNumber(totals.spoiled)} ชิ้น`} hint={`${formatPct(wasteRate(totals))} ของที่ส่ง`} />
        </div>

        <Card>
          <CardHeader title="แนวโน้มรายสัปดาห์" subtitle="ชี้ที่สัปดาห์เพื่อดูตัวเลข" action={<Legend />} />
          <TrendChart trend={data.trend} />
        </Card>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="สินค้าตามยอดขาย" subtitle="ยอดหลังหัก GP และสัดส่วนของยอดทั้งหมด" />
            {data.products.length === 0 ? (
              <p className="text-sm text-muted">ไม่มีข้อมูลในช่วงนี้</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {data.products.map((p) => {
                  const share = totals.net ? (p.net / totals.net) * 100 : 0
                  return (
                    <li key={p.id}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="truncate font-medium">{finishedGoodById(p.id)?.name ?? p.id}</span>
                        <span className="shrink-0 text-sm text-muted">
                          {formatCurrency(p.net)} · <span className="font-medium text-ink">{formatPct(share)}</span>
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-fill">
                        <div className="h-full rounded-full grad-theme" style={{ width: `${share}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        ขาย {formatNumber(p.sold)} · ขายออก {formatPct(sellThrough(p))} · ของเสีย {formatPct(wasteRate(p))}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="สาขาที่ของเสียสูง" subtitle={`ของเสีย ÷ ของที่ส่ง · เฉพาะสาขาที่ส่งตั้งแต่ ${MIN_DELIVERED_FOR_RATE} ชิ้นขึ้นไป`} />
            {data.watch.length === 0 ? (
              <p className="text-sm text-muted">ไม่มีสาขาที่ส่งถึง {MIN_DELIVERED_FOR_RATE} ชิ้นในช่วงนี้</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {data.watch.map((r) => {
                  const rate = wasteRate(r)
                  const tone = wasteTone(rate)
                  return (
                    <li
                      key={r.id}
                      className={cn(
                        'flex items-center gap-3 rounded-control border px-4 py-3',
                        tone === 'danger' ? 'border-danger/40 bg-danger-bg' : tone === 'warning' ? 'border-warning/40 bg-warning-bg' : 'border-line bg-surface',
                      )}
                    >
                      {tone !== 'success' && <IconWarning className={cn('size-5 shrink-0', tone === 'danger' ? 'text-danger-fg' : 'text-warning-fg')} />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.name}</span>
                        <span className="block text-sm text-ink-2">
                          {r.detail} · ส่ง {formatNumber(r.delivered)} เสีย {formatNumber(r.spoiled)}
                        </span>
                      </span>
                      <span className="shrink-0 text-lg font-semibold">{formatPct(rate)}</span>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted">
              เกิน {WASTE_WARN}% เป็นสีส้ม เกิน {WASTE_DANGER}% เป็นสีแดง
            </p>
          </Card>
        </div>

        <Card>
          <CardHeader
            title={mode === 'chain' ? 'ผลตามเครือห้าง' : 'ผลตามสาขา'}
            subtitle="ขายออก = ขาย ÷ ส่ง (เฉพาะสัปดาห์ที่มีรายงาน) · ของเสีย = เสีย ÷ ส่ง"
            action={
              <SegmentedControl
                variant="mask"
                aria-label="จัดกลุ่มตาม"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'chain', label: 'เครือห้าง' },
                  { value: 'branch', label: 'สาขา' },
                ]}
              />
            }
          />
          <DataTable
            key={mode}
            columns={columns}
            rows={mode === 'chain' ? data.chainRows : data.branchRows}
            rowKey={(r) => r.id}
            defaultSort={{ key: 'net', dir: 'desc' }}
            pageSize={10}
            emptyTitle="ไม่มีข้อมูลในช่วงนี้"
          />
        </Card>
      </div>
    </>
  )
}

const series = [
  { key: 'delivered', label: 'ส่ง', bar: 'bg-primary' },
  { key: 'sold', label: 'ขาย', bar: 'bg-accent' },
  { key: 'spoiled', label: 'เสีย', bar: 'bg-danger' },
] as const

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-ink-2">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className={cn('size-2.5 rounded-full', s.bar)} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

/** Grouped bars per week (delivered / sold / spoiled). Weeks with a missing sales report get a warning mark. */
function TrendChart({ trend }: { trend: (Totals & { weekStart: string; missing: number })[] }) {
  const max = Math.max(1, ...trend.map((w) => w.delivered))
  const step = 10 ** Math.floor(Math.log10(max))
  const top = Math.ceil(max / step) * step
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => Math.round(top * f))

  return (
    <div className="flex gap-3">
      <div className="flex h-56 flex-col justify-between pb-0 text-right text-xs text-muted tabular-nums">
        {ticks.map((t) => (
          <span key={t} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
            {formatNumber(t)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative h-56 border-b border-line">
          {ticks.slice(0, -1).map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${(t / top) * 100}%` }} />
          ))}
          <div className="relative flex h-full items-end gap-1 sm:gap-2">
            {trend.map((w, i) => (
              <Tooltip
                key={w.weekStart}
                align={i < 2 ? 'start' : i >= trend.length - 2 ? 'end' : 'center'}
                className="h-full flex-1"
                content={
                  <>
                    <span className="block font-semibold">
                      W{isoWeek(w.weekStart)} · {shortDate(w.weekStart)}
                    </span>
                    <span className="block">
                      ส่ง {formatNumber(w.delivered)} · ขาย {formatNumber(w.sold)} · เสีย {formatNumber(w.spoiled)}
                    </span>
                    <span className="block">หลังหัก GP {formatCurrency(w.net)}</span>
                    {w.missing > 0 && <span className="block text-warning">ยังไม่มีรายงานยอดขาย {w.missing} ร้าน</span>}
                  </>
                }
              >
                <span tabIndex={0} className="flex h-full w-full items-end justify-center gap-0.5 rounded-md outline-none hover:bg-hover focus-visible:bg-hover sm:gap-1">
                  {series.map((s) => (
                    <span key={s.key} className={cn('w-full max-w-4 rounded-t-sm', s.bar)} style={{ height: `${(w[s.key] / top) * 100}%` }} />
                  ))}
                </span>
              </Tooltip>
            ))}
          </div>
        </div>
        <div className="mt-2 flex gap-1 sm:gap-2">
          {trend.map((w) => (
            <span key={w.weekStart} className="flex flex-1 flex-col items-center text-xs text-muted">
              <span className={cn('flex items-center gap-0.5 font-medium', w.missing ? 'text-warning-fg' : 'text-ink-2')}>
                {w.missing > 0 && <IconWarning className="size-3" />}W{isoWeek(w.weekStart)}
              </span>
              <span className="hidden sm:block">{shortDate(w.weekStart)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
