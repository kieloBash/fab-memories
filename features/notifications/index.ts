// features/notifications/index.ts — client-safe barrel
export { notificationKeys, notificationRoutes } from "./notifications.constants"
export type { NotificationItem, NotificationsResponse } from "./notifications.types"
export { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "./notifications.api"
export { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "./notifications.hooks"
