import { IconBox, IconList } from '@/components/icons'
import type { Section } from '@/components/layout/SectionLayout'

export type CatalogTab = 'finished-goods' | 'raw-materials' | 'families'

/** Top-bar sub menu of the master-data screens (rendered by the `/catalog/_sections` layout route). */
export const catalogSections: Section<CatalogTab>[] = [
  { value: 'finished-goods', label: 'สินค้าสำเร็จรูป', icon: <IconBox />, path: '/catalog/finished-goods' },
  { value: 'raw-materials', label: 'วัตถุดิบ', icon: <IconList />, path: '/catalog/raw-materials' },
  { value: 'families', label: 'ตระกูลวัตถุดิบ', icon: <IconList />, path: '/catalog/families' },
]
