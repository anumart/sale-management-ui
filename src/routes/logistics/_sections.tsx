import { createFileRoute } from '@tanstack/react-router'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { logisticsSections } from '@/features/logistics/LogisticsTabs'

/** Pathless layout for the tabbed logistics pages: keeps the top bar + section tabs mounted across tab switches. */
export const Route = createFileRoute('/logistics/_sections')({
  component: () => <SectionLayout aria-label="เมนูย่อยขนส่ง" sections={logisticsSections} />,
})
