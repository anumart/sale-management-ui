/**
 * Mock REST endpoints. Each handler receives parsed params/body and returns the JSON body.
 * Throw MockHttpError to return an error status.
 */
import type { NewProperty, Property, PropertyQuery } from '@/features/properties/types'
import type { Paged } from '@/types/api'
import * as db from './db'

export class MockHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export interface MockRequest {
  params: Record<string, string>
  query: Record<string, unknown>
  body: unknown
}

type Handler = (req: MockRequest) => unknown

/** "METHOD /path/:param" -> handler */
export const handlers: Record<string, Handler> = {
  'GET /me': () => db.me,

  'GET /properties': ({ query }): Paged<Property> => {
    const q = query as unknown as Partial<PropertyQuery>
    const page = Number(q.page ?? 1)
    const size = Number(q.size ?? 10)
    const text = (q.q ?? '').toString().trim().toLowerCase()
    let list = db.properties.filter(
      (p) =>
        (!q.status || p.status === q.status) &&
        (!text || `${p.code} ${p.name} ${p.type} ${p.city} ${p.status}`.toLowerCase().includes(text)),
    )
    if (q.sortKey) {
      const key = q.sortKey
      const dir = q.sortDir === 'desc' ? -1 : 1
      list = [...list].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * dir)
    }
    return { items: list.slice((page - 1) * size, page * size), total: list.length }
  },

  'POST /properties': ({ body }) => {
    const input = body as NewProperty
    if (!input?.name?.trim()) throw new MockHttpError(422, 'กรุณากรอกชื่อ')
    const id = Math.max(0, ...db.properties.map((p) => p.id)) + 1
    const property: Property = {
      id,
      code: db.makeCode(id),
      name: input.name.trim(),
      type: input.type,
      city: input.city,
      price: input.price,
      bedrooms: input.bedrooms,
      description: input.description,
      status: 'available',
    }
    db.properties.unshift(property)
    return property
  },

  'POST /properties/bulk-delete': ({ body }) => {
    const ids = new Set((body as { ids: number[] }).ids)
    for (let i = db.properties.length - 1; i >= 0; i--) {
      if (ids.has(db.properties[i].id)) db.properties.splice(i, 1)
    }
    return { deleted: ids.size }
  },

  'GET /locations': ({ query }) => {
    const text = String(query.q ?? '').trim().toLowerCase()
    return db.cities.filter((c) => c.toLowerCase().includes(text)).slice(0, 8)
  },

  'GET /notifications': () => db.notifications,
  'POST /notifications/:id/read': ({ params }) => {
    const n = db.notifications.find((x) => x.id === Number(params.id))
    if (!n) throw new MockHttpError(404, 'ไม่พบการแจ้งเตือน')
    n.read = true
    return n
  },
  'POST /notifications/read-all': () => {
    db.notifications.forEach((n) => (n.read = true))
    return { ok: true }
  },
}
