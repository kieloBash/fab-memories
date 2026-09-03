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
  /** Exact match — set true for index/dashboard routes */
  exact?: boolean;
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
    <div className="min-h-screen bg-background-blush flex">

      {/* ── Desktop Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="hidden md:flex flex-col fixed top-0 left-0 h-full z-40 bg-white border-r border-border overflow-hidden shrink-0"
        aria-label="Sidebar navigation"
      >
        {/* Logo */}
        <div
          className={cn(
            "h-[52px] flex items-center border-b border-border shrink-0 px-4",
            collapsed ? "justify-center" : "justify-start gap-2"
          )}
        >
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <Sparkles size={15} className="text-primary shrink-0" aria-hidden="true" />
            {!collapsed && (
              <motion.span
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[13px] font-semibold tracking-tight gradient-text whitespace-nowrap"
              >
                Fab Memories
              </motion.span>
            )}
          </Link>
        </div>

        {/* Role chip */}
        {!collapsed && (
          <div className="px-4 pt-4 pb-1">
            <span className="inline-block text-[10px] font-semibold tracking-[0.1em] uppercase text-primary bg-primary-soft px-2.5 py-1 rounded-pill">
              {userRole}
            </span>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
              exact={item.exact}
              layoutIdPrefix="desktop"
            />
          ))}
        </nav>

        {/*
          FIX: the logout button used to be wrapped in `{!collapsed && ...}`,
          which meant it vanished entirely when the sidebar was collapsed —
          the only way to sign out was to re-expand the sidebar first.
          Now the collapsed state renders an icon-only logout button
          stacked below the avatar instead of dropping it.
        */}
        <div
          className={cn(
            "border-t border-border p-3 shrink-0",
            collapsed ? "flex flex-col items-center gap-2" : "flex items-center justify-between gap-2",
          )}
        >
          <UserAvatar
            name={userName}
            role={userRole}
            size="sm"
            showRole={!collapsed}
          />
          <LogoutButton variant={collapsed ? "icon" : "full"} />
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

      {/* ── Mobile Drawer ── */}
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
              {/* Drawer header */}
              <div className="h-[52px] flex items-center justify-between border-b border-border px-4 shrink-0">
                <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
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

              {/* Role chip */}
              <div className="px-4 pt-4 pb-1">
                <span className="inline-block text-[10px] font-semibold tracking-[0.1em] uppercase text-primary bg-primary-soft px-2.5 py-1 rounded-pill">
                  {userRole}
                </span>
              </div>

              {/* Nav items — separate layoutIdPrefix so no conflict with desktop */}
              <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                {navItems.map((item) => (
                  <SidebarLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    collapsed={false}
                    exact={item.exact}
                    layoutIdPrefix="drawer"
                  />
                ))}
              </nav>

              {/* Drawer footer — avatar + logout */}
              <div className="border-t border-border p-3 shrink-0 flex items-center justify-between gap-2">
                <UserAvatar name={userName} role={userRole} size="sm" showRole />
                <LogoutButton />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Content area ── */}
      <motion.div
        initial={false}
        animate={{ marginLeft: collapsed ? 68 : 240 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="hidden md:flex flex-col flex-1 min-h-screen"
      >
        {/* Desktop top bar */}
        <header className="sticky top-0 z-30 glass border-b border-border h-[52px] flex items-center justify-between px-6 shrink-0">
          <div />
          <div className="flex items-center gap-2">
            <NotificationBell count={notificationCount} />
            <UserAvatar name={userName} size="sm" />
          </div>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex-1 p-6"
        >
          {children}
        </motion.main>
      </motion.div>

      {/* ── Mobile content area ── */}
      <div className="flex md:hidden flex-col flex-1 min-h-screen">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 glass border-b border-border h-[52px] flex items-center justify-between px-4 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-primary-soft transition-colors cursor-pointer border-0 bg-transparent"
            aria-label="Open menu"
          >
            <Menu size={18} className="text-text-sub" aria-hidden="true" />
          </button>

          <Link href="/" className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-primary" aria-hidden="true" />
            <span className="text-[13px] font-semibold tracking-tight gradient-text">
              Fab Memories
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <NotificationBell count={notificationCount} />
          </div>
        </header>

        <main className="flex-1 p-4 pb-24">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <MobileTabBar items={navItems} />
    </div>
  );
}
