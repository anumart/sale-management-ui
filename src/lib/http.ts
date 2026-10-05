import axios, { AxiosError } from 'axios'
import { env } from '@/config/env'
import { mockAdapter } from '@/mocks/adapter'

/** Shared Axios instance. Feature API modules import this, never axios directly. */
export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  // In mock mode every request is answered by the in-memory API in src/mocks
  ...(env.useMock ? { adapter: mockAdapter } : {}),
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export type ApiError = { message: string; status?: number }

/** Normalise any thrown value into { message, status } for UI display */
export function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string } | undefined
    return { message: data?.message ?? error.message, status: error.response?.status }
  }
  return { message: error instanceof Error ? error.message : 'Unexpected error' }
}
