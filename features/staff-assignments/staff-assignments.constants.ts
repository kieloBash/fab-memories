// features/staff-assignments/staff-assignments.constants.ts

import type { StaffingRecommendation } from "./staff-assignments.types"

export const staffKeys = {
  roster:    ["staff-roster"] as const,
  mySchedule: ["staff-my-schedule"] as const,
  calendar:  (year: number, month: number) => ["staff-calendar", year, month] as const,
  myDashboard: ["staff-my-dashboard"] as const,
}

export const bookingStaffKeys = {
  byBooking: (bookingId: string) => ["booking-staff", bookingId] as const,
}

export const staffRoutes = {
  roster:        "/staff",
  mySchedule:    "/staff/my-schedule",
  calendar:      "/staff/calendar",
  myDashboard:   "/staff/my-dashboard",
  bookingStaff:  (bookingId: string) => `/bookings/${bookingId}/staff`,
  assignment:    (bookingId: string, assignmentId: string) =>
    `/bookings/${bookingId}/staff/${assignmentId}`,
} as const

export const STAFF_TASK_ROLE_LABELS: Record<string, string> = {
  LEAD_COORDINATOR:   "Lead Coordinator",
  GUEST_REGISTRATION: "Guest Registration",
  VENDOR_LIAISON:     "Vendor Liaison",
  LOGISTICS:          "Logistics",
  PROGRAM_FLOW:       "Program Flow",
  OTHER:              "Other",
}

export const STAFF_TASK_ROLE_ICONS: Record<string, string> = {
  LEAD_COORDINATOR:   "⭐",
  GUEST_REGISTRATION: "📋",
  VENDOR_LIAISON:     "🤝",
  LOGISTICS:          "🚚",
  PROGRAM_FLOW:       "🎬",
  OTHER:              "📌",
}

/**
 * FR-37 — Guest count-based staffing ratios, as specified in the thesis:
 *   4–5 coordinators   for up to 50 guests
 *   7–8 coordinators   for 51–150 guests
 *   8–12 coordinators  for 151+ guests
 */
export function getStaffingRecommendation(guestCount: number): StaffingRecommendation {
  if (guestCount <= 50) {
    return { guestCount, min: 4, max: 5, label: "Up to 50 guests" }
  }
  if (guestCount <= 150) {
    return { guestCount, min: 7, max: 8, label: "51–150 guests" }
  }
  return { guestCount, min: 8, max: 12, label: "151+ guests" }
}
