// features/notifications/notifications.api.ts
"use client"
import api from "@/lib/axios"
import { notificationRoutes } from "./notifications.constants"
import type { NotificationsResponse } from "./notifications.types"

export async function fetchNotifications(): Promise<NotificationsResponse> {
  const { data } = await api.get<NotificationsResponse>(notificationRoutes.list)
  return data
}
export async function markNotificationRead(id: string): Promise<void> { await api.patch(notificationRoutes.one(id), { isRead: true }) }
export async function markAllNotificationsRead(): Promise<void> { await api.post(notificationRoutes.markAllRead) }
