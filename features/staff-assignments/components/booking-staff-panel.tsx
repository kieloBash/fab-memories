// features/staff-assignments/components/booking-staff-panel.tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { Shield, MessageCircle, Trash2 } from "lucide-react"
import {
  useBookingStaff,
  useRemoveStaffAssignment,
  STAFF_TASK_ROLE_LABELS,
  STAFF_TASK_ROLE_ICONS,
} from "@/features/staff-assignments"
import { AssignCoordinatorDialog } from "./assign-coordinator-dialog"
import { StaffingRecommendationBanner } from "./staffing-recommendation-banner"
import { cn } from "@/lib/utils"

interface BookingStaffPanelProps {
  bookingId: string
}

/**
 * Staff coordination panel — mounted on the admin booking detail page
 * alongside BookingVendorPanel. Same visual/interaction language:
 * header with count + "Assign" button, a recommendation/compliance
 * banner, and a list of assignment cards with a remove action.
 */
export function BookingStaffPanel({ bookingId }: BookingStaffPanelProps) {
  const { data: assignments, isLoading } = useBookingStaff(bookingId)
  const { mutate: remove } = useRemoveStaffAssignment(bookingId)

  const primaryCount = assignments?.filter((a) => !a.isBackup).length ?? 0
  const backupCount  = assignments?.filter((a) => a.isBackup).length ?? 0

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <p className="text-[13px] font-semibold tracking-tight text-text-main">
            Staff scheduling
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {primaryCount} coordinator{primaryCount !== 1 ? "s" : ""}
            {backupCount > 0 && ` · ${backupCount} backup`}
          </p>
        </div>
        <AssignCoordinatorDialog
          bookingId={bookingId}
          excludeCoordinatorIds={(assignments ?? []).map((a) => a.coordinatorId)}
        />
      </div>

      {/* ── FR-37 staffing recommendation ── */}
      <div className="px-4 pt-4">
        <StaffingRecommendationBanner bookingId={bookingId} />
      </div>

      {/* ── Assigned coordinators list ── */}
      <div className="p-4 space-y-2">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-border/30 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && (!assignments || assignments.length === 0) && (
          <p className="py-3 text-center text-[12px] text-text-muted">
            No coordinators assigned yet. Use "Assign coordinator" to staff this event.
          </p>
        )}

        {assignments?.map((a) => (
          <div
            key={a.id}
            className={cn(
              "rounded-xl border p-3 space-y-1.5",
              a.isBackup
                ? "border-dashed border-border bg-background-blush/60"
                : "border-border bg-background-blush",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[13px] font-semibold text-text-main">
                    {a.coordinator.fullName}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {STAFF_TASK_ROLE_ICONS[a.taskRole]} {STAFF_TASK_ROLE_LABELS[a.taskRole]}
                  </Badge>
                  {a.isBackup && (
                    <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">
                      <Shield size={9} aria-hidden="true" /> Backup
                    </span>
                  )}
                </div>
                {a.taskNote && (
                  <p className="text-[11px] text-text-muted mt-0.5">{a.taskNote}</p>
                )}
                {a.notes && (
                  <p className="flex items-start gap-1 text-[11px] text-text-muted mt-0.5 italic">
                    <MessageCircle size={10} className="mt-0.5 shrink-0" aria-hidden="true" />
                    "{a.notes}"
                  </p>
                )}
              </div>
              <button
                onClick={() => remove(a.id)}
                className="shrink-0 text-text-muted hover:text-red-500 transition-colors p-1 -m-1"
                aria-label={`Remove ${a.coordinator.fullName}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
