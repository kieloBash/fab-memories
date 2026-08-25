// features/layouts/components/NotificationBell.tsx

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";

interface NotificationBellProps {
  count?: number;
}

export default function NotificationBell({ count = 0 }: NotificationBellProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-transparent hover:bg-primary-soft transition-colors duration-150 cursor-pointer border-0"
      aria-label={count > 0 ? `${count} unread notifications` : "Notifications"}
    >
      <Bell size={18} className="text-text-sub" aria-hidden="true" />

      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key="badge"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[10px] font-semibold flex items-center justify-center leading-none"
            aria-hidden="true"
          >
            {count > 9 ? "9+" : count}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
