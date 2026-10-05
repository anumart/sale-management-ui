import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/http'
import type { AppNotification } from './types'

export const notificationsApi = {
  list: () => http.get<AppNotification[]>('/notifications').then((r) => r.data),
  markRead: (id: number) => http.post<AppNotification>(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => http.post('/notifications/read-all').then((r) => r.data),
}

export const notificationKeys = { all: ['notifications'] as const }

export const useNotifications = () =>
  useQuery({ queryKey: notificationKeys.all, queryFn: notificationsApi.list, refetchInterval: 60_000 })

/** Optimistic update: the item turns "read" immediately, rolls back on error */
export const useMarkNotificationRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notificationKeys.all })
      const previous = qc.getQueryData<AppNotification[]>(notificationKeys.all)
      qc.setQueryData<AppNotification[]>(notificationKeys.all, (list) =>
        list?.map((n) => (n.id === id ? { ...n, read: true } : n)),
      )
      return { previous }
    },
    onError: (_err, _id, ctx) => qc.setQueryData(notificationKeys.all, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onMutate: () =>
      qc.setQueryData<AppNotification[]>(notificationKeys.all, (list) => list?.map((n) => ({ ...n, read: true }))),
    onSettled: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}
