import { createFileRoute } from '@tanstack/react-router'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { salesSections } from '@/features/sales/SalesTabs'

/** Pathless layout for the tabbed sales pages: keeps the top bar + section tabs mounted across tab switches. */
export const Route = createFileRoute('/sales/_sections')({
  component: () => <SectionLayout aria-label="เมนูย่อยขาย" sections={salesSections} />,
})
