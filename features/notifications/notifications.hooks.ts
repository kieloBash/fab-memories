// features/notifications/notifications.hooks.ts
"use client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { notificationKeys } from "./notifications.constants"
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "./notifications.api"

/** Polls every 30s — same pattern as the Module 8 dashboard — so the bell's unread count stays fresh without a websocket. */
export function useNotifications() {
  return useQuery({ queryKey: notificationKeys.list, queryFn: fetchNotifications, refetchInterval: 30_000 })
}
export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => markNotificationRead(id), onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.list }) })
}
export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: () => markAllNotificationsRead(), onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.list }) })
}
