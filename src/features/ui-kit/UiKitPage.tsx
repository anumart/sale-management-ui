import { useState, type ReactNode } from 'react'
import {
  IconArrowUpRight,
  IconBox,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconDownload,
  IconEdit,
  IconHeart,
  IconHome,
  IconInfo,
  IconPlus,
  IconReceipt,
  IconTrash,
  IconTruck,
  IconWarning,
} from '@/components/icons'
import { Topbar } from '@/components/layout/Topbar'
import {
  Autocomplete,
  Button,
  Card,
  CardHeader,
  CardLink,
  Checkbox,
  ChipGroup,
  ConfirmDialog,
  DeltaBadge,
  Modal,
  SegmentedControl,
  Select,
  StatusPill,
  Switch,
  TextArea,
  TextField,
} from '@/components/ui'
import { StatCard } from '@/features/dashboard/components/StatCard'
import { AddPropertyModal } from '@/features/properties/components/AddPropertyModal'
import { cn } from '@/lib/cn'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { ShadcnShowcase } from './ShadcnShowcase'

/** Living style guide: every shared control in one place. */
export function UiKitPage() {
  return (
    <>
      <Topbar title="UI Kit" subtitle="Shared components from src/components/ui" />
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <SummaryCardsShowcase />
        <ButtonsShowcase />
        <ModalShowcase />
        <FormControlsShowcase />
        <FeedbackShowcase />
        <DashboardCardsShowcase />
        <ShadcnShowcase />
      </div>
    </>
  )
}

/** Summary (stat) cards: the four solid variants with their decorative graphics, plus the glass `plain` variant. */
function SummaryCardsShowcase() {
  return (
    <section className="xl:col-span-2">
      <h2 className="mb-3 text-title font-semibold text-ink">Summary Cards</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard variant="theme" label="ยอดขายวันนี้" value="฿128,400" hint="+8% จากเมื่อวาน" icon={<IconReceipt />} />
        <StatCard variant="accent" label="จัดส่งสำเร็จ" value="42" hint="จาก 48 ออเดอร์" icon={<IconTruck />} />
        <StatCard variant="primary" label="สินค้าในคลัง" value="1,256" hint="อัปเดตล่าสุด 09:30" icon={<IconBox />} />
        <StatCard variant="warning" label="รอดำเนินการ" value="17" hint="ต้องตรวจสอบ 3 รายการ" icon={<IconWarning />} />
        <StatCard variant="plain" label="ลูกค้าใหม่" value="9" hint="เดือนนี้" icon={<IconCheck />} />
      </div>
    </section>
  )
}

/** Sample dashboard card layouts — chart, list, contacts, promo and progress cards, all built from Card/DeltaBadge/StatusPill. */
function DashboardCardsShowcase() {
  return (
    <section className="xl:col-span-2">
      <h2 className="mb-3 text-title font-semibold text-ink">Dashboard Cards</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <IncomeTrackerCard className="lg:col-span-3" />
        <RecentProjectsCard className="lg:col-span-2" />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ConnectCard />
        <PromoCard />
        <ProgressCard />
      </div>
    </section>
  )
}

const incomeData = [
  { day: 'S', value: 42 },
  { day: 'M', value: 66 },
  { day: 'T', value: 100, highlight: true, amount: '฿2,567' },
  { day: 'W', value: 58 },
  { day: 'T', value: 74 },
  { day: 'F', value: 50 },
  { day: 'S', value: 38 },
]

function IncomeTrackerCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader
        title="Income Tracker"
        subtitle="Track changes in income over time and access detailed data on each project and payments received"
        action={
          <button type="button" className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-ink">
            Week <IconChevronDown className="size-3.5 text-muted" />
          </button>
        }
      />
      <div className="flex items-end gap-2 sm:gap-4">
        {incomeData.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2.5">
            <div className={cn('relative h-36 w-full', d.highlight && 'rounded-t-xl bg-fill')}>
              {d.highlight && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-lg grad-dark px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-on-dark">
                  {d.amount}
                </span>
              )}
              <span className="absolute bottom-0 left-1/2 w-px -translate-x-1/2 bg-line" style={{ height: `${d.value}%` }} />
              <span
                className={cn(
                  'absolute left-1/2 size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-white',
                  d.highlight ? 'grad-dark' : 'grad-primary',
                )}
                style={{ bottom: `${d.value}%` }}
              />
            </div>
            <span className={cn('grid size-7 place-items-center rounded-full text-xs font-medium', d.highlight ? 'grad-dark text-on-dark' : 'text-muted')}>
              {d.day}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-line pt-5">
        <DeltaBadge value={20} />
        <p className="text-sm text-muted">This week's income is higher than last week's</p>
      </div>
    </Card>
  )
}

const projects: { icon: ReactNode; tint: string; name: string; paid: boolean; rate: string; tags: string[]; desc: string; meta: string }[] = [
  {
    icon: <IconBox />,
    tint: 'grad-primary text-on-primary',
    name: 'Chatuchak Sourcing Run',
    paid: true,
    rate: '฿450/order',
    tags: ['Wholesale', 'Weekly'],
    desc: 'Recurring bulk sourcing from the Chatuchak flower market with quality inspection on receipt.',
    meta: 'Bangkok · 2h ago',
  },
  { icon: <IconTruck />, tint: 'grad-accent text-on-accent', name: 'Run Sheet Automation', paid: false, rate: '฿0/order', tags: [], desc: '', meta: 'Logistics · 5h ago' },
  { icon: <IconReceipt />, tint: 'grad-dark text-on-dark', name: 'Supplier Invoice Sync', paid: true, rate: '฿120/order', tags: [], desc: '', meta: 'Procurement · 1d ago' },
]

function RecentProjectsCard({ className }: { className?: string }) {
  const [openIdx, setOpenIdx] = useState(0)
  return (
    <Card className={className}>
      <CardHeader title="Recent Projects" action={<CardLink href="#">See all Projects</CardLink>} />
      <div className="flex flex-col">
        {projects.map((p, i) => {
          const open = openIdx === i
          return (
            <div key={p.name} className={cn('py-3.5', i > 0 && 'border-t border-line')}>
              <button type="button" className="flex w-full items-center gap-3.5 text-left" onClick={() => setOpenIdx(open ? -1 : i)}>
                <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl [&>svg]:size-5', p.tint)}>{p.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{p.name}</span>
                    <StatusPill tone={p.paid ? 'success' : 'neutral'}>{p.paid ? 'Paid' : 'Not Paid'}</StatusPill>
                  </span>
                  <span className="block text-sm text-muted">{p.rate}</span>
                </span>
                <IconChevronDown className={cn('size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
              </button>
              {open && p.desc && (
                <div className="mt-3 pl-[3.375rem]">
                  {p.tags.length > 0 && (
                    <div className="mb-2 flex gap-2">
                      {p.tags.map((t) => (
                        <span key={t} className="rounded-md bg-fill px-2.5 py-1 text-xs text-muted">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted">{p.desc}</p>
                  <p className="mt-2 text-xs text-muted">{p.meta}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

const contacts = [
  { name: 'Nan Thanawat', role: 'Supplier · Chatuchak', tag: 'Preferred', color: 'grad-primary' },
  { name: 'Somchai K.', role: 'Driver · Route 2', tag: 'New', color: 'grad-accent' },
]

function ConnectCard() {
  return (
    <Card>
      <CardHeader title="Let's Connect" action={<CardLink href="#">See all</CardLink>} />
      <div className="flex flex-col gap-4">
        {contacts.map((c) => (
          <div key={c.name} className="flex items-center gap-3">
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white', c.color)}>
              {c.name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate font-medium">{c.name}</span>
                <StatusPill tone={c.tag === 'Preferred' ? 'info' : 'warning'}>{c.tag}</StatusPill>
              </span>
              <span className="block text-sm text-muted">{c.role}</span>
            </span>
            <button type="button" aria-label={`Add ${c.name}`} className="grid size-8 shrink-0 place-items-center rounded-full bg-fill hover:bg-line">
              <IconPlus className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}

function PromoCard() {
  return (
    <article className="stat-deco stat-deco-dots min-w-0 rounded-card grad-dark p-6 text-on-dark shadow-card xl:p-7">
      <h3 className="text-title font-semibold">Unlock Premium Reports</h3>
      <p className="mt-2 text-sm text-on-dark/80">Get access to exclusive analytics and expand your procurement insights</p>
      <Button variant="accent" className="mt-5">
        Upgrade now <IconArrowUpRight />
      </Button>
    </article>
  )
}

const progressGroups = [
  { label: 'Plans Sent', value: 64, lit: 14, color: 'bg-line' },
  { label: 'Orders Placed', value: 42, lit: 9, color: 'grad-primary' },
  { label: 'Delivered', value: 30, lit: 6, color: 'grad-success' },
]

function ProgressCard() {
  return (
    <Card>
      <CardHeader
        title="Order Progress"
        action={
          <button type="button" className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-ink">
            <IconCalendar className="size-3.5 text-muted" /> Sep 2026
          </button>
        }
      />
      <div className="grid grid-cols-3 gap-4">
        {progressGroups.map((g, gi) => (
          <div key={g.label} className={cn('min-w-0', gi > 0 && 'border-l border-line pl-4')}>
            <p className="text-xs text-muted">{g.label}</p>
            <p className="mt-1 text-display font-medium tracking-tight">{g.value}</p>
            <div className="mt-3 flex h-8 items-end gap-[3px]">
              {Array.from({ length: 20 }).map((_, i) => (
                <span key={i} className={cn('w-[3px] flex-1 rounded-full', i < g.lit ? g.color : 'bg-fill')} style={{ height: i < g.lit ? '100%' : '55%' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-24 shrink-0 text-sm text-muted">{label}</span>
      {children}
    </div>
  )
}

function ButtonsShowcase() {
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('daily')
  return (
    <Card>
      <CardHeader title="Buttons" subtitle="Variants, sizes and states" />
      <div className="flex flex-col gap-5">
        <Row label="Variants">
          <Button>Primary</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="dark">Dark</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </Row>
        <Row label="Sizes">
          <Button size="sm">Small</Button>
          <Button>Medium</Button>
          <Button size="lg">Large</Button>
        </Row>
        <Row label="With icon">
          <Button>
            <IconPlus /> Add New
          </Button>
          <Button variant="outline">
            <IconDownload /> Export
          </Button>
          <Button variant="dark">
            Invite Friend <IconArrowUpRight />
          </Button>
        </Row>
        <Row label="Icon only">
          <Button iconOnly aria-label="Add">
            <IconPlus />
          </Button>
          <Button iconOnly variant="accent" aria-label="Favorite">
            <IconHeart />
          </Button>
          <Button iconOnly variant="outline" aria-label="Edit">
            <IconEdit />
          </Button>
          <Button iconOnly variant="soft" aria-label="Download">
            <IconDownload />
          </Button>
          <Button iconOnly variant="danger" aria-label="Delete">
            <IconTrash />
          </Button>
          <Button iconOnly round aria-label="Add (round)">
            <IconPlus />
          </Button>
        </Row>
        <Row label="States">
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true)
              setTimeout(() => {
                setLoading(false)
                toast.success('Loaded successfully')
              }, 1500)
            }}
          >
            {loading ? 'Loading…' : 'Click to load'}
          </Button>
          <Button disabled>Disabled</Button>
          <Button variant="outline" disabled>
            Disabled
          </Button>
        </Row>
        <Row label="Group">
          <SegmentedControl
            variant="aurora"
            aria-label="Period"
            value={period}
            onChange={setPeriod}
            options={['daily', 'weekly', 'monthly', 'yearly'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))}
          />
        </Row>
      </div>
    </Card>
  )
}

type DemoModal = 'info' | 'confirm' | 'form' | 'success' | null

function ModalShowcase() {
  const [open, setOpen] = useState<DemoModal>(null)
  const close = () => setOpen(null)

  const tiles: { id: Exclude<DemoModal, null>; title: string; text: string; icon: ReactNode; tint: string }[] = [
    { id: 'info', title: 'Information', text: 'Simple message with actions', icon: <IconInfo />, tint: 'bg-primary-soft text-primary-fg' },
    { id: 'confirm', title: 'Confirm Delete', text: '<ConfirmDialog /> component', icon: <IconWarning />, tint: 'bg-danger-bg text-danger-fg' },
    { id: 'form', title: 'Form Modal', text: 'Quick add property in a modal', icon: <IconHome />, tint: 'bg-accent-soft text-accent-dark' },
    { id: 'success', title: 'Success', text: 'Centered result feedback', icon: <IconCheck />, tint: 'bg-success-bg text-success-fg' },
  ]

  const imperativeConfirm = async () => {
    const ok = await confirm({ title: 'Archive this report?', message: 'You can restore it later.', tone: 'primary', confirmLabel: 'Archive' })
    toast.info(ok ? 'Archived' : 'Cancelled')
  }

  return (
    <Card>
      <CardHeader title="Modal & Confirm Box" subtitle="Click a tile to open a modal" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tiles.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setOpen(t.id)}
            className="flex items-center gap-4 rounded-[1.25rem] border border-field-edge bg-field p-4 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-card"
          >
            <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl [&>svg]:size-6', t.tint)}>{t.icon}</span>
            <span>
              <span className="block font-medium">{t.title}</span>
              <span className="block text-sm text-muted">{t.text}</span>
            </span>
          </button>
        ))}
      </div>
      <Button variant="ghost" className="mt-4" onClick={imperativeConfirm}>
        Try imperative confirm()
      </Button>

      <Modal
        open={open === 'info'}
        onClose={close}
        icon={<IconInfo />}
        title="New report available"
        description="Your monthly sales report for September 2024 is ready. You can download it or view it directly in the dashboard."
        footer={
          <>
            <Button variant="outline" onClick={close}>
              Later
            </Button>
            <Button
              onClick={() => {
                close()
                toast.success('Report opened')
              }}
            >
              View Report
            </Button>
          </>
        }
      />
      <ConfirmDialog
        open={open === 'confirm'}
        title="Delete this property?"
        message='"123 Maple Avenue Springfield" will be permanently removed. This action cannot be undone.'
        confirmLabel="Yes, Delete"
        onCancel={close}
        onConfirm={() => {
          close()
          toast.success('Property deleted')
        }}
      />
      <AddPropertyModal open={open === 'form'} onClose={close} />
      <Modal
        open={open === 'success'}
        onClose={close}
        centered
        size="sm"
        tone="success"
        icon={<IconCheck />}
        title="Payment received!"
        description="$30,000 for 123 Maple Avenue Springfield has been received successfully."
        footer={<Button onClick={close}>Done</Button>}
      />
    </Card>
  )
}

const COUNTRIES = ['Thailand', 'Japan', 'Singapore', 'Vietnam', 'Malaysia', 'Indonesia', 'Philippines', 'South Korea', 'Taiwan', 'Australia']

function FormControlsShowcase() {
  const [country, setCountry] = useState('')
  const [chip, setChip] = useState('m')
  const [tab, setTab] = useState('all')
  const options = COUNTRIES.filter((c) => c.toLowerCase().includes(country.toLowerCase()))
  return (
    <Card>
      <CardHeader title="Form Controls" subtitle="TextField, Select, Autocomplete, Checkbox, Switch…" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField label="Textbox" placeholder="Type something" hint="Helper text below the field" />
        <TextField label="With prefix" prefix="$" type="number" placeholder="0.00" />
        <TextField label="Invalid" required defaultValue="abc" error="This value is not valid" />
        <TextField label="Disabled" disabled defaultValue="Read only" />
        <Select
          label="Select"
          placeholder="Choose one"
          options={[
            { value: 'house', label: 'House' },
            { value: 'villa', label: 'Villa' },
          ]}
        />
        <Autocomplete
          label="Autocomplete"
          placeholder="Search country…"
          inputValue={country}
          onInputChange={setCountry}
          options={options}
          getOptionLabel={(c) => c}
          onSelect={(c) => toast.info(`Selected ${c}`)}
        />
        <TextArea label="Text area" placeholder="Longer text…" containerClassName="sm:col-span-2" />
        <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
          <Checkbox label="Checkbox" defaultChecked />
          <Checkbox label="Indeterminate" indeterminate />
          <Switch label="Switch" defaultChecked />
        </div>
        <div className="sm:col-span-2">
          <ChipGroup
            label="Chip group"
            value={chip}
            onChange={setChip}
            options={['xs', 's', 'm', 'l', 'xl'].map((v) => ({ value: v, label: v.toUpperCase() }))}
          />
        </div>
        <div className="sm:col-span-2">
          <SegmentedControl
            aria-label="Segmented"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'all', label: 'All' },
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
        </div>
      </div>
    </Card>
  )
}

function FeedbackShowcase() {
  return (
    <Card>
      <CardHeader title="Badges & Feedback" subtitle="Status pills, deltas and toasts" />
      <div className="flex flex-col gap-5">
        <Row label="Status">
          <StatusPill tone="success">Available</StatusPill>
          <StatusPill tone="warning">Pending</StatusPill>
          <StatusPill tone="info">Sold</StatusPill>
          <StatusPill tone="danger">Rejected</StatusPill>
          <StatusPill tone="neutral">Draft</StatusPill>
        </Row>
        <Row label="Delta">
          <DeltaBadge value={20} />
          <DeltaBadge value={-10} />
        </Row>
        <Row label="Toast">
          <Button variant="outline" size="sm" onClick={() => toast.success('Saved successfully')}>
            Success
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.error('Something went wrong')}>
            Error
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info('Heads up!')}>
            Info
          </Button>
        </Row>
      </div>
    </Card>
  )
}
