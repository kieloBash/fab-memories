// features/layouts/components/UserAvatar.tsx

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  role?: string;
  size?: "sm" | "md";
  showRole?: boolean;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function UserAvatar({
  name,
  role,
  size = "md",
  showRole = false,
}: UserAvatarProps) {
  const initials = getInitials(name);
  const avatarSize = size === "sm" ? "w-8 h-8 text-[11px]" : "w-9 h-9 text-[13px]";

  return (
    <div className="flex items-center gap-2.5">
      <motion.div
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={cn(
          "rounded-full flex items-center justify-center font-semibold text-white shrink-0 cursor-default select-none",
          avatarSize
        )}
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%)",
        }}
        aria-label={`${name} avatar`}
      >
        {initials}
      </motion.div>

      {showRole && (
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-medium text-text-main truncate tracking-tight">
            {name}
          </span>
          {role && (
            <span className="text-[11px] text-text-muted truncate">{role}</span>
          )}
        </div>
      )}
    </div>
  );
}
