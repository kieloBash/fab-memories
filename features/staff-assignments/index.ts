// features/staff-assignments/index.ts

export {
  staffKeys, bookingStaffKeys, staffRoutes,
  STAFF_TASK_ROLE_LABELS, STAFF_TASK_ROLE_ICONS,
  getStaffingRecommendation,
} from "./staff-assignments.constants"

export { assignStaffSchema, updateStaffAssignmentSchema } from "./staff-assignments.schema"
export type { AssignStaffInput, UpdateStaffAssignmentInput } from "./staff-assignments.schema"

export type {
  CoordinatorSummary, StaffAssignment, AssignedBookingSummary, MyAssignment,
  CoordinatorRosterRow, StaffingRecommendation, StaffingCompliance,
  CoordinatorConflictCheck, StaffingCalendarEntry,
  CoordinatorDashboardUpcoming, CoordinatorDashboardSummary,
} from "./staff-assignments.types"

export {
  fetchCoordinatorRoster, fetchMyAssignments, fetchBookingStaff,
  fetchStaffingCompliance, fetchCoordinatorConflict, fetchStaffingCalendar,
  fetchMyDashboardSummary,
  assignStaff, updateStaffAssignment, removeStaffAssignment,
} from "./staff-assignments.api"

export {
  useCoordinatorRoster, useMyAssignments, useBookingStaff,
  useStaffingCompliance, useCoordinatorConflictCheck, useStaffingCalendar,
  useMyDashboardSummary,
  useAssignStaff, useUpdateStaffAssignment, useRemoveStaffAssignment,
} from "./staff-assignments.hooks"

// Server-only — import directly in route handlers, not through this barrel:
// export { ... } from "./staff-assignments.query"
