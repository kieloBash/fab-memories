// features/layouts/components/SidebarShell.tsx

"use client";

import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Menu, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import MobileTabBar from "./MobileTabBar";
import NotificationBell from "./NotificationBell";
import SidebarLink from "./SidebarLink";
import UserAvatar from "./UserAvatar";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface SidebarShellProps {
  navItems: NavItem[];
  children: React.ReactNode;
  userName: string;
  userRole: string;
  notificationCount?: number;
}

export default function SidebarShell({
  navItems,
  children,
  userName,
  userRole,
  notificationCount = 0,
}: SidebarShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Desktop Sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="hidden md:flex flex-col fixed top-0 left-0 h-full z-40 bg-white border-r border-border overflow-hidden"
        aria-label="Sidebar navigation"
      >
        {/* Logo row */}
        <div
          className={cn(
            "h-[52px] flex items-center border-b border-border shrink-0 px-4",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <Sparkles size={15} className="text-primary shrink-0" aria-hidden="true" />
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[13px] font-semibold tracking-tight gradient-text whitespace-nowrap"
              >
                Fab Memories
              </motion.span>
            </Link>
          )}

          {collapsed && (
            <Sparkles size={17} className="text-primary" aria-hidden="true" />
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {navItems.map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* User footer */}
        <div className={cn(
          "border-t border-border p-3 shrink-0",
          collapsed ? "flex justify-center" : ""
        )}>
          <UserAvatar
            name={userName}
            role={userRole}
            size="sm"
            showRole={!collapsed}
          />
          {!collapsed && (
            <LogoutButton />
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute top-[62px] -right-3 w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center text-text-muted hover:text-primary hover:border-border-strong transition-colors shadow-sm cursor-pointer z-10"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight size={12} aria-hidden="true" />
          ) : (
            <ChevronLeft size={12} aria-hidden="true" />
          )}
        </button>
      </motion.aside>

      {/* ── Mobile Drawer Overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="fixed top-0 left-0 h-full w-[260px] bg-white border-r border-border z-50 md:hidden flex flex-col"
              aria-label="Mobile sidebar navigation"
            >
              <div className="h-[52px] flex items-center justify-between border-b border-border px-4 shrink-0">
                <Link href="/" className="flex items-center gap-2">
                  <Sparkles size={15} className="text-primary" aria-hidden="true" />
                  <span className="text-[13px] font-semibold tracking-tight gradient-text">
                    Fab Memories
                  </span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-soft transition-colors cursor-pointer border-0 bg-transparent"
                  aria-label="Close menu"
                >
                  <X size={16} className="text-text-sub" aria-hidden="true" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
                {navItems.map((item) => (
                  <SidebarLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    collapsed={false}
                  />
                ))}
              </nav>

              <div className="border-t border-border p-3 shrink-0">
                <UserAvatar name={userName} role={userRole} size="sm" showRole />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content area ── */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          "md:ml-[240px]",
          collapsed && "md:ml-[68px]"
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass border-b border-border h-[52px] flex items-center justify-between px-4 shrink-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-primary-soft transition-colors cursor-pointer border-0 bg-transparent"
            aria-label="Open menu"
          >
            <Menu size={18} className="text-text-sub" aria-hidden="true" />
          </button>

          {/* Mobile logo */}
          <Link href="/" className="md:hidden flex items-center gap-1.5">
            <Sparkles size={14} className="text-primary" aria-hidden="true" />
            <span className="text-[13px] font-semibold tracking-tight gradient-text">
              Fab Memories
            </span>
          </Link>

          <div className="hidden md:block" />

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <NotificationBell count={notificationCount} />
            <UserAvatar name={userName} size="sm" />
          </div>
        </header>

        {/* Page content */}
        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex-1 p-4 md:p-6 pb-24 md:pb-6"
        >
          {children}
        </motion.main>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <MobileTabBar items={navItems} />
    </div>
  );
}
