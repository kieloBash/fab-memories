// features/layouts/components/SidebarLink.tsx

"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS } from "./nav-icons";

interface SidebarLinkProps {
  href: string;
  label: string;
  icon: string;
  collapsed?: boolean;
}

export default function SidebarLink({
  href,
  label,
  icon,
  collapsed = false,
}: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");
  const Icon = NAV_ICONS[icon];

  return (
    <Link href={href} className="block" title={collapsed ? label : undefined}>
      <motion.div
        whileHover={{ x: collapsed ? 0 : 3 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-150 relative",
          collapsed ? "justify-center px-0" : "justify-start",
          isActive
            ? "bg-primary-soft text-primary"
            : "text-text-sub hover:bg-primary-soft/50 hover:text-primary"
        )}
      >
        {/* Active indicator bar */}
        {isActive && (
          <motion.span
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-full"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            aria-hidden="true"
          />
        )}

        <Icon
          size={18}
          aria-hidden="true"
          className={cn(
            "shrink-0 transition-colors",
            isActive ? "text-primary" : "text-text-muted"
          )}
        />

        {!collapsed && (
          <span className="truncate tracking-tight">{label}</span>
        )}
      </motion.div>
    </Link>
  );
}
