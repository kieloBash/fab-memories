// features/notifications/notifications.constants.ts
export const notificationKeys = { list: ["notifications"] as const }
export const notificationRoutes = { list: "/notifications", one: (id: string) => `/notifications/${id}`, markAllRead: "/notifications/mark-all-read" } as const
