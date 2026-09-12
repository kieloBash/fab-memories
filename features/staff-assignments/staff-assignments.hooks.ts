// features/staff-assignments/staff-assignments.hooks.ts
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/axios"
import { bookingStaffKeys, staffKeys } from "./staff-assignments.constants"
import {
  assignStaff,
  fetchBookingStaff,
  fetchCoordinatorConflict,
  fetchCoordinatorRoster,
  fetchMyAssignments,
  fetchMyDashboardSummary,
  fetchStaffingCalendar,
  fetchStaffingCompliance,
  removeStaffAssignment,
  updateStaffAssignment,
} from "./staff-assignments.api"
import type { AssignStaffInput, UpdateStaffAssignmentInput } from "./staff-assignments.schema"

// ── Queries ───────────────────────────────────────────────────

export function useCoordinatorRoster() {
  return useQuery({
    queryKey: staffKeys.roster,
    queryFn:  fetchCoordinatorRoster,
  })
}

export function useMyAssignments() {
  return useQuery({
    queryKey: staffKeys.mySchedule,
    queryFn:  fetchMyAssignments,
  })
}

/** Self-scoped dashboard summary — stat counts + short upcoming list */
export function useMyDashboardSummary() {
  return useQuery({
    queryKey: staffKeys.myDashboard,
    queryFn:  fetchMyDashboardSummary,
  })
}

/** year: full year, month: 0-indexed (0 = January), matching JS Date conventions */
export function useStaffingCalendar(year: number, month: number) {
  return useQuery({
    queryKey: staffKeys.calendar(year, month),
    queryFn:  () => fetchStaffingCalendar(year, month),
  })
}

export function useBookingStaff(bookingId: string) {
  return useQuery({
    queryKey: bookingStaffKeys.byBooking(bookingId),
    queryFn:  () => fetchBookingStaff(bookingId),
    enabled:  !!bookingId,
  })
}

export function useStaffingCompliance(bookingId: string) {
  return useQuery({
    queryKey: [...bookingStaffKeys.byBooking(bookingId), "compliance"],
    queryFn:  () => fetchStaffingCompliance(bookingId),
    enabled:  !!bookingId,
  })
}

/** On-demand conflict check — called right before submitting an assignment. */
export function useCoordinatorConflictCheck(bookingId: string, coordinatorId: string | null) {
  return useQuery({
    queryKey: [...bookingStaffKeys.byBooking(bookingId), "conflict", coordinatorId],
    queryFn:  () => fetchCoordinatorConflict(bookingId, coordinatorId!),
    enabled:  !!bookingId && !!coordinatorId,
  })
}

// ── Mutations ─────────────────────────────────────────────────

export function useAssignStaff(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AssignStaffInput) => assignStaff(bookingId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingStaffKeys.byBooking(bookingId) })
      queryClient.invalidateQueries({ queryKey: staffKeys.roster })
      queryClient.invalidateQueries({ queryKey: ["staff-calendar"] })
      toast.success("Coordinator assigned to event")
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useUpdateStaffAssignment(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ assignmentId, input }: { assignmentId: string; input: UpdateStaffAssignmentInput }) =>
      updateStaffAssignment(bookingId, assignmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingStaffKeys.byBooking(bookingId) })
      queryClient.invalidateQueries({ queryKey: ["staff-calendar"] })
      toast.success("Assignment updated")
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useRemoveStaffAssignment(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (assignmentId: string) => removeStaffAssignment(bookingId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingStaffKeys.byBooking(bookingId) })
      queryClient.invalidateQueries({ queryKey: staffKeys.roster })
      queryClient.invalidateQueries({ queryKey: ["staff-calendar"] })
      toast.success("Coordinator removed from event")
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}
