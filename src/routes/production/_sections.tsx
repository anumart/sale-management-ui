import { createFileRoute } from '@tanstack/react-router'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { productionSections } from '@/features/production/ProductionTabs'

/** Pathless layout for the tabbed production pages: keeps the top bar + section tabs mounted across tab switches. */
export const Route = createFileRoute('/production/_sections')({
  component: () => <SectionLayout aria-label="เมนูย่อยผลิต" sections={productionSections} />,
})
