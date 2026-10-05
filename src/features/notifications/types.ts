export type NotificationType = 'payment' | 'maintenance' | 'booking' | 'alert'

export interface AppNotification {
  id: number
  type: NotificationType
  title: string
  text: string
  createdAt: string
  read: boolean
}
