// features/staff-assignments/components/staffing-recommendation-banner.tsx
"use client"

import { Users, CheckCircle2, AlertTriangle } from "lucide-react"
import { useStaffingCompliance } from "@/features/staff-assignments"
import { cn } from "@/lib/utils"

interface StaffingRecommendationBannerProps {
  bookingId: string
}

/**
 * FR-37 — shows the recommended coordinator headcount for this booking's
 * guest count, and whether the current (non-backup) assignment count
 * meets that recommendation. Purely informational — never blocks
 * assignment, same non-blocking philosophy as the vendor coverage gate.
 */
export function StaffingRecommendationBanner({ bookingId }: StaffingRecommendationBannerProps) {
  const { data: compliance, isLoading } = useStaffingCompliance(bookingId)

  if (isLoading || !compliance) {
    return <div className="h-16 rounded-lg bg-border/30 animate-pulse" />
  }

  const { guestCount, assignedCount, recommendation, isCompliant } = compliance

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3",
        isCompliant
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50",
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
        <Users size={14} className={isCompliant ? "text-emerald-600" : "text-amber-600"} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={cn(
            "text-[12px] font-semibold",
            isCompliant ? "text-emerald-700" : "text-amber-700",
          )}>
            {isCompliant ? "Staffing on track" : "Below recommended staffing"}
          </p>
          {isCompliant
            ? <CheckCircle2 size={12} className="text-emerald-500" aria-hidden="true" />
            : <AlertTriangle size={12} className="text-amber-500" aria-hidden="true" />}
        </div>
        <p className={cn(
          "text-[11px] mt-0.5",
          isCompliant ? "text-emerald-600" : "text-amber-600",
        )}>
          {guestCount} guests ({recommendation.label}) → recommended {recommendation.min}–{recommendation.max} coordinators.
          {" "}Currently assigned: <strong>{assignedCount}</strong>.
        </p>
      </div>
    </div>
  )
}
