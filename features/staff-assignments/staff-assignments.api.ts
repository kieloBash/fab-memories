// features/staff-assignments/staff-assignments.api.ts
"use client"

import api from "@/lib/axios"
import { staffRoutes } from "./staff-assignments.constants"
import type {
  CoordinatorRosterRow,
  MyAssignment,
  StaffAssignment,
  StaffingCompliance,
  CoordinatorConflictCheck,
  StaffingCalendarEntry,
  CoordinatorDashboardSummary,
} from "./staff-assignments.types"
import type { AssignStaffInput, UpdateStaffAssignmentInput } from "./staff-assignments.schema"

// ── Roster & self-service ────────────────────────────────────────

export async function fetchCoordinatorRoster(): Promise<CoordinatorRosterRow[]> {
  const { data } = await api.get<CoordinatorRosterRow[]>(staffRoutes.roster)
  return data
}

export async function fetchMyAssignments(): Promise<MyAssignment[]> {
  const { data } = await api.get<MyAssignment[]>(staffRoutes.mySchedule)
  return data
}

export async function fetchMyDashboardSummary(): Promise<CoordinatorDashboardSummary> {
  const { data } = await api.get<CoordinatorDashboardSummary>(staffRoutes.myDashboard)
  return data
}

/** year: full year (e.g. 2026), month: 0-indexed (0 = January) */
export async function fetchStaffingCalendar(
  year: number,
  month: number,
): Promise<StaffingCalendarEntry[]> {
  const { data } = await api.get<StaffingCalendarEntry[]>(staffRoutes.calendar, {
    params: { year, month },
  })
  return data
}

// ── Booking-scoped assignments ───────────────────────────────────

export async function fetchBookingStaff(bookingId: string): Promise<StaffAssignment[]> {
  const { data } = await api.get<StaffAssignment[]>(staffRoutes.bookingStaff(bookingId))
  return data
}

export async function fetchStaffingCompliance(bookingId: string): Promise<StaffingCompliance> {
  const { data } = await api.get<StaffingCompliance>(staffRoutes.bookingStaff(bookingId), {
    params: { compliance: "true" },
  })
  return data
}

export async function fetchCoordinatorConflict(
  bookingId: string,
  coordinatorId: string,
): Promise<CoordinatorConflictCheck> {
  const { data } = await api.get<CoordinatorConflictCheck>(staffRoutes.bookingStaff(bookingId), {
    params: { conflict: "true", coordinatorId },
  })
  return data
}

export async function assignStaff(
  bookingId: string,
  input: AssignStaffInput,
): Promise<StaffAssignment> {
  const { data } = await api.post<StaffAssignment>(staffRoutes.bookingStaff(bookingId), input)
  return data
}

export async function updateStaffAssignment(
  bookingId: string,
  assignmentId: string,
  input: UpdateStaffAssignmentInput,
): Promise<StaffAssignment> {
  const { data } = await api.patch<StaffAssignment>(
    staffRoutes.assignment(bookingId, assignmentId),
    input,
  )
  return data
}

export async function removeStaffAssignment(
  bookingId: string,
  assignmentId: string,
): Promise<void> {
  await api.delete(staffRoutes.assignment(bookingId, assignmentId))
}
