// components/ui/stat-card.tsx

import type { LucideIcon } from "lucide-react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  /** Optional sub-label shown under the value */
  description?: string
  /** Optional trend indicator */
  trend?: {
    direction: "up" | "down" | "neutral"
    label: string
  }
  /** Accent the icon container with the brand gradient */
  accent?: boolean
  className?: string
}

const TREND_CONFIG = {
  up: {
    icon: TrendingUp,
    className: "text-emerald-600",
  },
  down: {
    icon: TrendingDown,
    className: "text-red-500",
  },
  neutral: {
    icon: Minus,
    className: "text-text-muted",
  },
}

export function StatCard({
  label,
  value,
  icon: Icon,
  description,
  trend,
  accent = false,
  className,
}: StatCardProps) {
  const TrendIcon = trend ? TREND_CONFIG[trend.direction].icon : null

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-white p-5 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-card-hover hover:border-border-strong",
        className
      )}
    >
      {/* Subtle gradient blush on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(135deg, rgba(245,100,169,0.03) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      {/* Top row: label + icon */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-text-muted">
          {label}
        </p>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
            accent
              ? "bg-gradient-to-br from-primary to-primary-deep text-white shadow-primary-sm"
              : "bg-primary-soft text-primary"
          )}
        >
          <Icon size={17} aria-hidden="true" />
        </div>
      </div>

      {/* Value */}
      <div className="flex items-end justify-between gap-2">
        <p className="text-[28px] font-bold tracking-tightest text-text-main leading-none">
          {value}
        </p>

        {trend && TrendIcon && (
          <div
            className={cn(
              "flex items-center gap-1 text-[12px] font-medium mb-0.5",
              TREND_CONFIG[trend.direction].className
            )}
          >
            <TrendIcon size={13} aria-hidden="true" />
            <span>{trend.label}</span>
          </div>
        )}
      </div>

      {/* Optional description */}
      {description && (
        <p className="text-[12px] text-text-muted leading-relaxed -mt-1">
          {description}
        </p>
      )}
    </div>
  )
}
