import { useState, type ReactNode } from 'react'
import { IconCalendar, IconSearch, IconSettings, IconTruck, IconUser } from '@/components/icons'
import {
  Accordion,
  Alert,
  AvatarGroup,
  Breadcrumb,
  Button,
  Card,
  CardHeader,
  InitialsAvatar,
  InputOTP,
  Kbd,
  Popover,
  Progress,
  RadioGroup,
  Separator,
  Sheet,
  Skeleton,
  Slider,
  Switch,
  Tabs,
  TextField,
  Toggle,
  ToggleGroup,
  Tooltip,
} from '@/components/ui'
import { toast } from '@/stores/toastStore'

/**
 * Components modelled on shadcn/ui (ui.shadcn.com) and restyled with our tokens:
 * indigo `primary` for interaction, intent colors for status, glass surfaces, soft radii.
 */
export function ShadcnShowcase() {
  return (
    <section className="xl:col-span-2">
      <div className="mb-3">
        <h2 className="text-title font-semibold text-ink">shadcn-style Components</h2>
        <p className="mt-1 text-control text-muted">Patterns from ui.shadcn.com in the Orchid Mint palette</p>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <TabsDemo />
        <AccordionDemo />
        <AlertDemo />
        <RadioGroupDemo />
        <ProgressSliderDemo />
        <OverlayDemo />
        <ToggleDemo />
        <InputOTPDemo />
        <NavigationDemo />
        <AvatarDemo />
        <SkeletonDemo />
      </div>
    </section>
  )
}

/** Small label above each example block. */
function Label({ children }: { children: ReactNode }) {
  return <p className="mb-2.5 text-sm font-medium text-muted">{children}</p>
}

function TabsDemo() {
  const [tab, setTab] = useState<'account' | 'password'>('account')
  const [lineTab, setLineTab] = useState<'overview' | 'orders' | 'invoices'>('overview')
  return (
    <Card>
      <CardHeader title="Tabs" subtitle="Pill and underline variants" />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          {
            value: 'account',
            label: 'Account',
            content: (
              <div className="flex flex-col gap-4">
                <TextField label="Name" defaultValue="Nan Thanawat" />
                <TextField label="Username" prefix="@" defaultValue="nan.flowers" />
                <Button className="self-start" onClick={() => toast.success('Account saved')}>
                  Save changes
                </Button>
              </div>
            ),
          },
          {
            value: 'password',
            label: 'Password',
            content: (
              <div className="flex flex-col gap-4">
                <TextField label="Current password" type="password" />
                <TextField label="New password" type="password" />
                <Button className="self-start" onClick={() => toast.success('Password updated')}>
                  Save password
                </Button>
              </div>
            ),
          },
        ]}
      />
      <Separator className="my-6" />
      <Tabs
        variant="line"
        value={lineTab}
        onChange={setLineTab}
        items={[
          { value: 'overview', label: 'Overview', content: <p className="text-body text-muted">42 active plans this week.</p> },
          { value: 'orders', label: 'Orders', content: <p className="text-body text-muted">18 purchase orders awaiting delivery.</p> },
          { value: 'invoices', label: 'Invoices', content: <p className="text-body text-muted">3 supplier invoices due by Friday.</p> },
        ]}
      />
    </Card>
  )
}

function AccordionDemo() {
  return (
    <Card>
      <CardHeader title="Accordion" subtitle="One section open at a time" />
      <Accordion
        defaultValue={['cutoff']}
        items={[
          {
            value: 'cutoff',
            title: 'What time is the daily order cut-off?',
            content: 'Orders placed before 14:00 are sourced at the next morning market run and delivered the same day.',
          },
          {
            value: 'quality',
            title: 'How is flower quality checked?',
            content: 'Every receipt is inspected on arrival. Rejected stems are recorded on the run sheet and credited to the supplier account.',
          },
          {
            value: 'routes',
            title: 'Can I change a delivery route?',
            content: 'Yes. Edit the route under Logistics → Vehicle Routes before the run sheet is generated.',
          },
        ]}
      />
    </Card>
  )
}

function AlertDemo() {
  return (
    <Card>
      <CardHeader title="Alert" subtitle="Inline callouts by intent" />
      <div className="flex flex-col gap-3">
        <Alert title="Heads up!" tone="primary">
          You can add suppliers to a plan from the procurement page.
        </Alert>
        <Alert title="Order delivered" tone="success">
          PO-2026-0418 was received in full.
        </Alert>
        <Alert title="Low stock" tone="warning" action={<Button size="sm" variant="outline">Reorder</Button>}>
          Red roses are below the safety level.
        </Alert>
        <Alert title="Payment failed" tone="danger">
          The card ending in 4242 was declined.
        </Alert>
      </div>
    </Card>
  )
}

function RadioGroupDemo() {
  const [plan, setPlan] = useState('standard')
  const [notify, setNotify] = useState('mentions')
  return (
    <Card>
      <CardHeader title="Radio Group" subtitle="List and card variants" />
      <Label>Delivery speed</Label>
      <RadioGroup
        variant="card"
        aria-label="Delivery speed"
        value={plan}
        onChange={setPlan}
        options={[
          { value: 'standard', label: 'Standard', description: 'Next-morning run · free' },
          { value: 'express', label: 'Express', description: 'Same-day before 18:00 · ฿150' },
          { value: 'scheduled', label: 'Scheduled', description: 'Pick a date and time slot' },
        ]}
      />
      <Separator className="my-5" />
      <Label>Notify me about…</Label>
      <RadioGroup
        aria-label="Notifications"
        value={notify}
        onChange={setNotify}
        options={[
          { value: 'all', label: 'All new orders' },
          { value: 'mentions', label: 'Direct messages and mentions' },
          { value: 'none', label: 'Nothing' },
          { value: 'sms', label: 'SMS (coming soon)', disabled: true },
        ]}
      />
    </Card>
  )
}

function ProgressSliderDemo() {
  const [budget, setBudget] = useState(60)
  const [margin, setMargin] = useState(25)
  return (
    <Card>
      <CardHeader title="Progress & Slider" subtitle="Bars use the intent gradients" />
      <div className="flex flex-col gap-4">
        {(
          [
            ['Plans sent', 82, 'primary'],
            ['Delivered', 64, 'success'],
            ['Pending QC', 38, 'warning'],
            ['Monthly target', 91, 'theme'],
          ] as const
        ).map(([label, v, tone]) => (
          <div key={label}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-ink-2">{label}</span>
              <span className="font-medium text-ink">{v}%</span>
            </div>
            <Progress value={v} tone={tone} aria-label={label} />
          </div>
        ))}
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col gap-5">
        <div>
          <div className="mb-3 flex justify-between text-sm">
            <span className="font-medium text-ink-2">Weekly budget</span>
            <span className="text-muted">฿{(budget * 1000).toLocaleString()}</span>
          </div>
          <Slider aria-label="Weekly budget" value={budget} onChange={setBudget} />
        </div>
        <div>
          <div className="mb-3 flex justify-between text-sm">
            <span className="font-medium text-ink-2">Target margin</span>
            <span className="text-muted">{margin}%</span>
          </div>
          <Slider aria-label="Target margin" value={margin} onChange={setMargin} max={50} />
        </div>
      </div>
    </Card>
  )
}

function OverlayDemo() {
  const [sheet, setSheet] = useState<'left' | 'right' | null>(null)
  return (
    <Card>
      <CardHeader title="Tooltip, Popover & Sheet" subtitle="Floating layers" />
      <Label>Tooltip</Label>
      <div className="flex flex-wrap gap-3">
        {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
          <Tooltip key={side} side={side} content={`Tooltip on ${side}`}>
            <Button variant="outline" size="sm">
              {side[0].toUpperCase() + side.slice(1)}
            </Button>
          </Tooltip>
        ))}
      </div>

      <Separator className="my-5" />
      <Label>Popover</Label>
      <Popover
        trigger={(p) => (
          <Button variant="outline" size="sm" {...p}>
            <IconSettings /> Dimensions
          </Button>
        )}
      >
        {(close) => (
          <div className="flex flex-col gap-3">
            <div>
              <p className="font-medium text-ink">Bouquet size</p>
              <p className="text-sm text-muted">Set the default wrap dimensions.</p>
            </div>
            <TextField label="Width (cm)" type="number" defaultValue={30} />
            <TextField label="Height (cm)" type="number" defaultValue={45} />
            <Button
              size="sm"
              onClick={() => {
                close()
                toast.success('Dimensions saved')
              }}
            >
              Apply
            </Button>
          </div>
        )}
      </Popover>

      <Separator className="my-5" />
      <Label>Sheet</Label>
      <div className="flex gap-3">
        <Button variant="soft" size="sm" onClick={() => setSheet('left')}>
          Open left
        </Button>
        <Button variant="soft" size="sm" onClick={() => setSheet('right')}>
          Open right
        </Button>
      </div>

      <Sheet
        open={sheet !== null}
        side={sheet ?? 'right'}
        onClose={() => setSheet(null)}
        title="Edit supplier"
        description="Make changes to the supplier profile. Save when you're done."
        footer={
          <>
            <Button variant="outline" onClick={() => setSheet(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setSheet(null)
                toast.success('Supplier updated')
              }}
            >
              Save changes
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField label="Name" defaultValue="Chatuchak Flower Co." />
          <TextField label="Contact" defaultValue="Nan Thanawat" />
          <TextField label="Phone" defaultValue="081 234 5678" />
          <Switch label="Preferred supplier" defaultChecked />
        </div>
      </Sheet>
    </Card>
  )
}

function ToggleDemo() {
  const [bold, setBold] = useState(true)
  const [styles, setStyles] = useState<string[]>(['italic'])
  const [align, setAlign] = useState<string[]>(['left'])
  const [view, setView] = useState<string[]>(['truck'])
  return (
    <Card>
      <CardHeader title="Toggle & Toggle Group" subtitle="Pressed state uses primary-soft" />
      <div className="flex flex-col gap-5">
        <div>
          <Label>Toggle</Label>
          <div className="flex gap-2">
            <Toggle pressed={bold} onPressedChange={setBold} aria-label="Bold">
              <span className="font-bold">B</span>
            </Toggle>
            <Toggle pressed={bold} onPressedChange={setBold} outline aria-label="Bold (outline)">
              <span className="font-bold">B</span> Bold
            </Toggle>
          </div>
        </div>
        <div>
          <Label>Multiple</Label>
          <ToggleGroup
            aria-label="Text style"
            value={styles}
            onChange={setStyles}
            options={[
              { value: 'bold', label: <span className="font-bold">B</span>, 'aria-label': 'Bold' },
              { value: 'italic', label: <span className="italic">I</span>, 'aria-label': 'Italic' },
              { value: 'underline', label: <span className="underline">U</span>, 'aria-label': 'Underline' },
            ]}
          />
        </div>
        <div>
          <Label>Single, outline</Label>
          <ToggleGroup
            single
            outline
            aria-label="Alignment"
            value={align}
            onChange={setAlign}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ]}
          />
        </div>
        <div>
          <Label>With icons</Label>
          <ToggleGroup
            single
            aria-label="Filter"
            value={view}
            onChange={setView}
            options={[
              { value: 'truck', label: <IconTruck />, 'aria-label': 'Deliveries' },
              { value: 'calendar', label: <IconCalendar />, 'aria-label': 'Schedule' },
              { value: 'user', label: <IconUser />, 'aria-label': 'Customers' },
            ]}
          />
        </div>
      </div>
    </Card>
  )
}

function InputOTPDemo() {
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('12')
  const complete = code.replace(/\s/g, '').length === 6
  return (
    <Card>
      <CardHeader title="Input OTP" subtitle="Type, paste or use arrow keys" />
      <Label>Verification code</Label>
      <InputOTP aria-label="Verification code" value={code} onChange={setCode} separatorAfter={3} />
      <p className="mt-2.5 text-sm text-muted">{complete ? `Entered: ${code}` : 'Enter the 6-digit code sent to your phone.'}</p>
      <Button className="mt-4" disabled={!complete} onClick={() => toast.success('Verified')}>
        Verify
      </Button>
      <Separator className="my-5" />
      <Label>Invalid state</Label>
      <InputOTP aria-label="PIN" length={4} value={pin} onChange={setPin} invalid />
      <p className="mt-2.5 text-sm text-danger-fg">Incorrect PIN. 2 attempts left.</p>
    </Card>
  )
}

function NavigationDemo() {
  return (
    <Card>
      <CardHeader title="Breadcrumb, Separator & Kbd" subtitle="Navigation helpers" />
      <Label>Breadcrumb</Label>
      <Breadcrumb items={[{ label: 'Home', href: '#' }, { label: 'Procurement', href: '#' }, { label: 'Plans', href: '#' }, { label: 'PL-2026-0093' }]} />

      <Separator className="my-5" />
      <Label>Separator</Label>
      <div>
        <p className="font-medium text-ink">Bangkok Flower</p>
        <p className="text-sm text-muted">Sale management system</p>
      </div>
      <Separator className="my-3" />
      <div className="flex h-5 items-center gap-3 text-sm text-ink-2">
        <span>Orders</span>
        <Separator orientation="vertical" />
        <span>Suppliers</span>
        <Separator orientation="vertical" />
        <span>Reports</span>
      </div>

      <Separator className="my-5" />
      <Label>Kbd</Label>
      <div className="flex flex-col gap-3">
        <div className="flex h-12 items-center gap-2.5 rounded-control border border-line-strong bg-surface px-4 text-placeholder">
          <IconSearch className="size-5" />
          <span className="flex-1">Search…</span>
          <span className="flex gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </div>
        <p className="text-sm text-muted">
          Press <Kbd>Esc</Kbd> to close any dialog.
        </p>
      </div>
    </Card>
  )
}

const team = [
  { name: 'Nan Thanawat', role: 'Owner', email: 'nan@bkkflower.co' },
  { name: 'Somchai Kittisak', role: 'Driver', email: 'somchai@bkkflower.co' },
  { name: 'Ploy Siriwan', role: 'Buyer', email: 'ploy@bkkflower.co' },
]

function AvatarDemo() {
  return (
    <Card>
      <CardHeader title="Avatar" subtitle="Initials fallback and stacked group" />
      <Label>Group</Label>
      <AvatarGroup names={['Nan Thanawat', 'Somchai Kittisak', 'Ploy Siriwan', 'Arun Chai', 'Mali Boon', 'Kanya Dee']} />
      <Separator className="my-5" />
      <Label>Team members</Label>
      <div className="flex flex-col gap-4">
        {team.map((m, i) => (
          <div key={m.email} className="flex items-center gap-3">
            <InitialsAvatar name={m.name} tint={['grad-primary', 'grad-accent', 'grad-theme'][i]} src={i === 0 ? '/missing-avatar.png' : undefined} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{m.name}</p>
              <p className="truncate text-sm text-muted">{m.email}</p>
            </div>
            <span className="text-sm text-ink-2">{m.role}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function SkeletonDemo() {
  return (
    <Card>
      <CardHeader title="Skeleton" subtitle="Loading placeholders" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="mt-5 h-32 w-full rounded-control" />
      <div className="mt-4 flex flex-col gap-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-5/6" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </Card>
  )
}
