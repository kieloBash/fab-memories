// features/layouts/components/NotificationBell.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";

interface NotificationBellProps {
  count?: number;
}

/**
 * FIX: previously this button was fully interactive (hover/tap animations,
 * a live unread-count badge) but clicking it did nothing — no dropdown,
 * no route, no feedback. That's worse than a disabled button because it
 * *looks* functional. Until the notifications feature ships, this now
 * shows an honest "Coming soon" tooltip on click instead of silently
 * eating the interaction.
 */
export default function NotificationBell({ count = 0 }: NotificationBellProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 1800);
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        onClick={handleClick}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-transparent hover:bg-primary-soft transition-colors duration-150 cursor-pointer border-0"
        aria-label={count > 0 ? `${count} unread notifications — feature coming soon` : "Notifications — feature coming soon"}
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

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 z-50 whitespace-nowrap rounded-lg border border-border bg-white px-3 py-1.5 text-[11px] font-medium text-text-sub shadow-card-hover"
            role="status"
          >
            Notifications are coming soon
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
