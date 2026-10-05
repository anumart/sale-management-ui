import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http'
import type { Paged } from '@/types/api'
import type { NewProperty, Property, PropertyQuery } from './types'

/* ---------- HTTP calls ---------- */

export const propertiesApi = {
  list: (query: PropertyQuery) => http.get<Paged<Property>>('/properties', { params: query }).then((r) => r.data),
  create: (input: NewProperty) => http.post<Property>('/properties', input).then((r) => r.data),
  bulkDelete: (ids: number[]) => http.post<{ deleted: number }>('/properties/bulk-delete', { ids }).then((r) => r.data),
  locations: (q: string) => http.get<string[]>('/locations', { params: { q } }).then((r) => r.data),
}

/* ---------- Query keys & hooks ---------- */

export const propertyKeys = {
  all: ['properties'] as const,
  list: (query: PropertyQuery) => [...propertyKeys.all, 'list', query] as const,
  locations: (q: string) => ['locations', q] as const,
}

export const useProperties = (query: PropertyQuery) =>
  useQuery({
    queryKey: propertyKeys.list(query),
    queryFn: () => propertiesApi.list(query),
    placeholderData: keepPreviousData, // no flicker when paging / filtering
  })

export const useCreateProperty = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: propertiesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: propertyKeys.all }),
  })
}

export const useDeleteProperties = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: propertiesApi.bulkDelete,
    onSuccess: () => qc.invalidateQueries({ queryKey: propertyKeys.all }),
  })
}

/** Location suggestions for the autocomplete; pass an already-debounced query */
export const useLocations = (q: string) =>
  useQuery({
    queryKey: propertyKeys.locations(q),
    queryFn: () => propertiesApi.locations(q),
    staleTime: 5 * 60_000,
  })
