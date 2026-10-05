import { useState } from 'react'
import { Card, CardHeader, SectionTabs, type SectionTabsVariant } from '@/components/ui'
import { procurementSections, type ProcurementTab } from '@/features/procurement/ProcurementTabs'

const procurementTabOptions = procurementSections.map(({ value, label, icon }) => ({ value, label, icon }))

const variants: { variant: SectionTabsVariant; name: string; text: string }[] = [
  { variant: 'mask', name: 'A · Mask', text: 'Orchid pill seen through a moving window — labels flip to white exactly at its edge' },
  { variant: 'hop', name: 'B · Hop', text: 'A glowing dot jumps in an arc with squash & stretch; the active label turns gradient' },
  { variant: 'aurora', name: 'C · Aurora', text: 'The active tab wears a spinning orchid → mint → indigo light ring' },
]

/** The three top-bar section switcher looks, each in a mock top bar with the procurement tabs. */
export function SectionTabsShowcase() {
  return (
    <Card className="xl:col-span-2">
      <CardHeader title="Section Tabs" subtitle="Top-bar sub menu (ProcurementTabs, LogisticsTabs, ProductionTabs) — click or use ← → keys" />
      <div className="flex flex-col gap-4">
        {variants.map((v) => (
          <Preview key={v.variant} {...v} />
        ))}
      </div>
    </Card>
  )
}

function Preview({ variant, name, text }: { variant: SectionTabsVariant; name: string; text: string }) {
  const [tab, setTab] = useState<ProcurementTab>('purchase-orders')
  return (
    <div className="rounded-[1.25rem] border border-line bg-white/40 p-4">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-semibold text-ink">{name}</span>
        <span className="text-sm text-muted">{text}</span>
      </div>
      <div className="flex min-h-16 flex-wrap items-center gap-6">
        <img src="/logo-e33f4f-v2.png" alt="" className="h-12 w-auto shrink-0 object-contain" />
        <SectionTabs aria-label={`${name} preview`} variant={variant} value={tab} onChange={setTab} options={procurementTabOptions} />
      </div>
    </div>
  )
}
