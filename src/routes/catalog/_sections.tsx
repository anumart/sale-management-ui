import { createFileRoute } from '@tanstack/react-router'
import { SectionLayout } from '@/components/layout/SectionLayout'
import { catalogSections } from '@/features/catalog/CatalogTabs'

/** Pathless layout for the tabbed master-data pages: keeps the top bar + section tabs mounted across tab switches. */
export const Route = createFileRoute('/catalog/_sections')({
  component: () => <SectionLayout aria-label="เมนูย่อยข้อมูลหลัก" sections={catalogSections} />,
})
