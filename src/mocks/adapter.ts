import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { handlers, MockHttpError, type MockRequest } from './handlers'

const LATENCY_MS = 350

/** Match "/notifications/5/read" against "/notifications/:id/read" */
function matchRoute(method: string, path: string) {
  for (const [key, handler] of Object.entries(handlers)) {
    const [m, pattern] = key.split(' ')
    if (m !== method) continue
    const names: string[] = []
    const regex = new RegExp(
      '^' + pattern.replace(/:(\w+)/g, (_, name: string) => (names.push(name), '([^/]+)')) + '$',
    )
    const hit = path.match(regex)
    if (hit) {
      const params = Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(hit[i + 1])]))
      return { handler, params }
    }
  }
  return null
}

/** Axios adapter that answers requests from the in-memory mock API */
export const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  await new Promise((r) => setTimeout(r, LATENCY_MS))
  const method = (config.method ?? 'get').toUpperCase()
  const path = (config.url ?? '').split('?')[0].replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '')
  const route = matchRoute(method, path)

  const respond = (status: number, data: unknown): AxiosResponse => ({
    data,
    status,
    statusText: String(status),
    headers: {},
    config,
  })

  if (!route) {
    const res = respond(404, { message: `Mock route not found: ${method} ${path}` })
    throw new AxiosError(res.data.message, 'ERR_BAD_REQUEST', config, null, res)
  }

  const req: MockRequest = {
    params: route.params,
    query: (config.params ?? {}) as Record<string, unknown>,
    body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
  }

  try {
    // structuredClone so callers never mutate the mock "database" by reference
    return respond(200, structuredClone(route.handler(req)))
  } catch (e) {
    const status = e instanceof MockHttpError ? e.status : 500
    const res = respond(status, { message: e instanceof Error ? e.message : 'Mock error' })
    throw new AxiosError(res.data.message, String(status), config, null, res)
  }
}
