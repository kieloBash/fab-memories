// features/notifications/notifications.types.ts
import type { NotificationType } from "@/app/generated/prisma/client"

export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  body: string
  link: string | null
  isRead: boolean
  createdAt: string
}
export interface NotificationsResponse { items: NotificationItem[]; unreadCount: number }
