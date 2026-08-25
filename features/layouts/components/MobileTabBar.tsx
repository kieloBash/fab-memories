// features/layouts/components/MobileTabBar.tsx

"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS } from "./nav-icons";

interface TabItem {
  href: string;
  label: string;
  icon: string;
}

interface MobileTabBarProps {
  items: TabItem[];
}

export default function MobileTabBar({ items }: MobileTabBarProps) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      aria-label="Mobile navigation"
    >
      {/* Frosted glass bar */}
      <div
        className="glass border-t border-border px-2 pb-safe"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-around h-16">
          {items.map((item) => {
            const Icon = NAV_ICONS[item.icon];
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-1 h-full relative"
                aria-current={isActive ? "page" : undefined}
              >
                {/* Active pill background */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab-active"
                    className="absolute inset-x-2 top-2 bottom-2 rounded-xl bg-primary-soft"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    aria-hidden="true"
                  />
                )}

                <motion.div
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="relative flex flex-col items-center gap-1"
                >
                  <Icon
                    size={20}
                    aria-hidden="true"
                    className={cn(
                      "transition-colors duration-150",
                      isActive ? "text-primary" : "text-text-muted"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-medium tracking-tight transition-colors duration-150",
                      isActive ? "text-primary" : "text-text-muted"
                    )}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
