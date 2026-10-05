import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http'
import type { User } from './types'

export const authApi = {
  me: () => http.get<User>('/me').then((r) => r.data),
}

export const authKeys = { me: ['me'] as const }

export const useMe = () => useQuery({ queryKey: authKeys.me, queryFn: authApi.me, staleTime: Infinity })
