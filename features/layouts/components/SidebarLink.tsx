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
  /**
   * When true, only marks active on exact pathname match.
   * Use for index/dashboard routes that are also a prefix of all child routes
   * (e.g. /staff/admin matches /staff/admin/bookings via startsWith).
   */
  exact?: boolean;
  /**
   * Prefix for the Framer Motion layoutId so desktop sidebar and
   * mobile drawer don't share the same animated element and cause flicker.
   */
  layoutIdPrefix?: string;
}

export default function SidebarLink({
  href,
  label,
  icon,
  collapsed = false,
  exact = false,
  layoutIdPrefix = "sidebar",
}: SidebarLinkProps) {
  const pathname = usePathname();
  const Icon = NAV_ICONS[icon];

  // Exact match for index/dashboard routes; prefix match for everything else.
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

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
        {/* Active left bar — scoped layoutId prevents desktop/mobile clash */}
        {isActive && (
          <motion.span
            layoutId={`${layoutIdPrefix}-active`}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-full"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            aria-hidden="true"
          />
        )}

        {Icon && (
          <Icon
            size={18}
            aria-hidden="true"
            className={cn(
              "shrink-0 transition-colors",
              isActive ? "text-primary" : "text-text-muted"
            )}
          />
        )}

        {!collapsed && (
          <span className="truncate tracking-tight">{label}</span>
        )}
      </motion.div>
    </Link>
  );
}
