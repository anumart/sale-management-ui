import type { SortDir } from '@/types/api'

export const PROPERTY_TYPES = ['House', 'Villa', 'Apartment', 'Condo'] as const
export type PropertyType = (typeof PROPERTY_TYPES)[number]

export const PROPERTY_STATUSES = ['available', 'pending', 'sold'] as const
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number]

export interface Property {
  id: number
  code: string
  name: string
  type: PropertyType
  city: string
  price: number
  bedrooms: number
  status: PropertyStatus
  description?: string
}

export type PropertySortKey = 'id' | 'code' | 'name' | 'status' | 'type' | 'price'

export interface PropertyQuery {
  page: number
  size: number
  q?: string
  status?: PropertyStatus
  sortKey?: PropertySortKey
  sortDir?: SortDir
}

export interface NewProperty {
  name: string
  type: PropertyType
  city: string
  price: number
  bedrooms: number
  description?: string
  acceptBooking: boolean
  publish: boolean
}
