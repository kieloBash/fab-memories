// features/staff-assignments/components/assign-coordinator-dialog.tsx
"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  STAFF_TASK_ROLE_ICONS,
  STAFF_TASK_ROLE_LABELS,
  useAssignStaff,
  useCoordinatorConflictCheck,
  useCoordinatorRoster,
} from "@/features/staff-assignments"
import { cn } from "@/lib/utils"
import { AlertTriangle, CheckCircle2, Plus, Shield } from "lucide-react"
import { useState } from "react"
import { StaffTaskRole } from "../staff-assignments.schema"

interface AssignCoordinatorDialogProps {
  bookingId: string
  /** Coordinator IDs already assigned to this booking — excluded from the picker */
  excludeCoordinatorIds: string[]
}

const TASK_ROLES = Object.keys(STAFF_TASK_ROLE_LABELS) as StaffTaskRole[]

export function AssignCoordinatorDialog({
  bookingId,
  excludeCoordinatorIds,
}: AssignCoordinatorDialogProps) {
  const [open, setOpen] = useState(false)
  const [coordinatorId, setCoordinatorId] = useState("")
  const [taskRole, setTaskRole] = useState<StaffTaskRole>("LEAD_COORDINATOR")
  const [taskNote, setTaskNote] = useState("")
  const [isBackup, setIsBackup] = useState(false)
  const [notes, setNotes] = useState("")

  const { data: roster } = useCoordinatorRoster()
  const { data: conflict, isFetching: checkingConflict } =
    useCoordinatorConflictCheck(bookingId, coordinatorId || null)
  const { mutate: assign, isPending } = useAssignStaff(bookingId)

  const availableCoordinators = (roster ?? []).filter(
    (c) => c.isActive && !excludeCoordinatorIds.includes(c.id),
  )

  const resetForm = () => {
    setCoordinatorId("")
    setTaskRole("LEAD_COORDINATOR")
    setTaskNote("")
    setIsBackup(false)
    setNotes("")
  }

  const handleAssign = () => {
    if (!coordinatorId) return
    assign(
      {
        coordinatorId,
        taskRole,
        taskNote: taskNote.trim() || undefined,
        isBackup,
        notes: notes.trim() || undefined,
      },
      { onSuccess: () => { setOpen(false); resetForm() } },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger render={
        <Button size="sm">
          <Plus size={14} aria-hidden="true" /> Assign coordinator
        </Button>
      }>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign coordinator to event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">

          {/* Coordinator selector */}
          <div className="space-y-1.5">
            <Label>Coordinator</Label>
            <Select value={coordinatorId} onValueChange={(e) => setCoordinatorId(e!)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a coordinator" />
              </SelectTrigger>
              <SelectContent>
                {availableCoordinators.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[12px] text-text-muted">
                    No available coordinators
                  </div>
                ) : (
                  availableCoordinators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                      <span className="ml-2 text-[10px] text-text-muted">
                        {c.upcomingCount} upcoming
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* FR-40 — non-blocking conflict warning */}
          {coordinatorId && checkingConflict && (
            <div className="h-12 rounded-lg bg-border/30 animate-pulse" />
          )}
          {coordinatorId && !checkingConflict && conflict?.hasConflict && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-[12px] font-semibold text-amber-700">
                  Already committed on this date
                </p>
                <p className="text-[11px] text-amber-600 mt-0.5">
                  This coordinator is assigned to {conflict.conflicts.length} other event
                  {conflict.conflicts.length !== 1 ? "s" : ""} on the same date. You can still
                  assign them if this is intentional (e.g. a short, overlapping event).
                </p>
              </div>
            </div>
          )}
          {coordinatorId && !checkingConflict && conflict && !conflict.hasConflict && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" aria-hidden="true" />
              <p className="text-[11px] text-emerald-700">No scheduling conflicts on this date</p>
            </div>
          )}

          {/* Task role */}
          <div className="space-y-1.5">
            <Label>Task role</Label>
            <Select value={taskRole} onValueChange={(v) => setTaskRole(v as StaffTaskRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {STAFF_TASK_ROLE_ICONS[role]} {STAFF_TASK_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task note — extra detail, especially useful for "Other" */}
          <div className="space-y-1.5">
            <Label>Task detail <span className="text-text-muted text-[11px]">(optional)</span></Label>
            <Input
              value={taskNote}
              onChange={(e) => setTaskNote(e.target.value)}
              placeholder="e.g. Oversee gift table and guestbook"
            />
          </div>

          {/* Backup toggle */}
          <button
            type="button"
            onClick={() => setIsBackup((b) => !b)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
              isBackup
                ? "border-primary bg-primary-soft"
                : "border-border bg-white hover:border-border-strong",
            )}
          >
            <div className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              isBackup ? "bg-white" : "bg-background-blush",
            )}>
              <Shield size={14} className={isBackup ? "text-primary" : "text-text-muted"} aria-hidden="true" />
            </div>
            <div>
              <p className={cn("text-[12px] font-semibold", isBackup ? "text-primary" : "text-text-main")}>
                Backup coordinator
              </p>
              <p className="text-[11px] text-text-muted">
                Doesn't count toward the primary staffing recommendation (FR-39)
              </p>
            </div>
          </button>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-text-muted text-[11px]">(optional)</span></Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions…"
              rows={2}
            />
          </div>

          <Button className="w-full" onClick={handleAssign} disabled={isPending || !coordinatorId}>
            {isPending ? "Assigning…" : "Assign coordinator"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
