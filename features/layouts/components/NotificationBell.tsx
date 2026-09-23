// features/layouts/components/NotificationBell.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/features/notifications";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  /** Deprecated — the bell now fetches its own live unread count. Kept so existing callers need no change. */
  count?: number;
}

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

/** A real notification bell: live unread count, a dropdown of the latest 20, mark-one/mark-all read. */
export default function NotificationBell(_props: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { data, isLoading } = useNotifications()
  const { mutate: markOne } = useMarkNotificationRead()
  const { mutate: markAll, isPending: isMarkingAll } = useMarkAllNotificationsRead()

  const unread = data?.unreadCount ?? 0

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-transparent hover:bg-primary-soft transition-colors duration-150 cursor-pointer border-0"
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
        aria-expanded={open}
      >
        <Bell size={18} className="text-text-sub" aria-hidden="true" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[10px] font-semibold flex items-center justify-center leading-none"
              aria-hidden="true"
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute right-0 top-11 z-50 w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-white shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <p className="text-[12px] font-semibold text-text-main">Notifications</p>
                {unread > 0 && (
                  <button
                    onClick={() => markAll()}
                    disabled={isMarkingAll}
                    className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    <CheckCheck size={12} aria-hidden="true" /> Mark all read
                  </button>
                )}
              </div>

              {isLoading && (
                <div className="flex items-center gap-2 px-4 py-6 text-[12px] text-text-muted">
                  <Loader2 size={13} className="animate-spin" aria-hidden="true" /> Loading…
                </div>
              )}
              {!isLoading && (data?.items.length ?? 0) === 0 && (
                <p className="px-4 py-6 text-center text-[12px] text-text-muted">No notifications yet.</p>
              )}
              {data?.items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markOne(n.id)
                    setOpen(false)
                    if (n.link) router.push(n.link)
                  }}
                  className={cn(
                    "block w-full border-b border-border px-4 py-2.5 text-left last:border-0 hover:bg-background-blush transition-colors",
                    !n.isRead && "bg-primary-soft/30",
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-text-main">{n.title}</p>
                      <p className="mt-0.5 text-[11px] text-text-sub line-clamp-2">{n.body}</p>
                      <p className="mt-0.5 text-[10px] text-text-muted">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
