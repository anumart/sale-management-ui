import { createFileRoute } from '@tanstack/react-router'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { procurementSections } from '@/features/procurement/ProcurementTabs'

/** Pathless layout for the tabbed procurement pages: keeps the top bar + section tabs mounted across tab switches. */
export const Route = createFileRoute('/procurement/_sections')({
  component: () => <SectionLayout aria-label="เมนูย่อยจัดซื้อ" sections={procurementSections} />,
})
