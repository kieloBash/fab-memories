// components/ui/page-header.tsx

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  /** Optional right-side slot for actions (buttons, filters, etc.) */
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {/* Left: icon + text */}
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft">
            <Icon size={20} className="text-primary" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-tighter text-text-main leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] text-text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/*
        FIX: actions had no wrap behavior — on mobile, a header with both
        a title and multiple action controls (e.g. status filter + view
        toggle on the admin bookings page) could overflow horizontally
        instead of stacking. `flex-wrap` + `w-full sm:w-auto` lets the
        action controls wrap onto their own line(s) on narrow screens
        while staying a single inline row on desktop.
      */}
      {actions && (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
