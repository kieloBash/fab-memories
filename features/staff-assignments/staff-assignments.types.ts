// features/staff-assignments/staff-assignments.types.ts

import type { StaffTaskRole } from "@/app/generated/prisma/client"

export interface CoordinatorSummary {
  id:       string
  fullName: string
  username: string | null
  isActive: boolean
}

export interface StaffAssignment {
  id:            string
  bookingId:     string
  coordinatorId: string
  taskRole:      StaffTaskRole
  taskNote:      string | null
  isBackup:      boolean
  notes:         string | null
  assignedAt:    string
  updatedAt:     string
  coordinator:   CoordinatorSummary
}

/** A booking summary attached to a coordinator's own assignment list */
export interface AssignedBookingSummary {
  id:         string
  eventType:  string
  eventDate:  string
  venue:      string
  status:     string
}

export interface MyAssignment extends Omit<StaffAssignment, "coordinator"> {
  booking: AssignedBookingSummary
}

/** One upcoming assignment as summarized for the coordinator dashboard */
export interface CoordinatorDashboardUpcoming {
  id:        string
  taskRole:  StaffTaskRole
  isBackup:  boolean
  booking:   AssignedBookingSummary
}

/** Coordinator dashboard stat summary — self-scoped, computed server-side to avoid N+1 client queries */
export interface CoordinatorDashboardSummary {
  upcomingCount:      number  // total future CONFIRMED/PENDING assignments
  thisWeekCount:      number  // subset within the next 7 days
  understaffedCount:  number  // of the above, how many bookings are below FR-37 minimum
  upcoming:           CoordinatorDashboardUpcoming[] // next 5, soonest first
}

/** One row in the coordinator roster table */
export interface CoordinatorRosterRow {
  id:               string
  fullName:         string
  username:         string | null
  isActive:         boolean
  upcomingCount:    number   // count of future CONFIRMED/PENDING assignments
  nextAssignment:   { bookingId: string; eventDate: string; eventType: string } | null
}

/** FR-37 — recommended staffing band for a given guest count */
export interface StaffingRecommendation {
  guestCount: number
  min:        number
  max:        number
  label:      string // e.g. "51–150 guests"
}

/** Compliance check for a specific booking's current staff count vs. FR-37 */
export interface StaffingCompliance {
  guestCount:      number
  assignedCount:   number   // non-backup assignments only
  recommendation:  StaffingRecommendation
  isCompliant:     boolean  // assignedCount within [min, max]
}

/** Non-blocking date-conflict info for a coordinator on a given event date */
export interface CoordinatorConflictCheck {
  hasConflict: boolean
  conflicts: {
    bookingId: string
    eventType: string
    eventDate: string
    venue:     string
  }[]
}

/**
 * One event on the staffing calendar — a booking within the visible
 * month, with its FR-37 compliance pre-computed so the calendar can
 * render a status dot without an N+1 query per day.
 */
export interface StaffingCalendarEntry {
  bookingId:      string
  eventType:      string
  eventDate:      string
  venue:          string
  status:         string   // BookingStatus
  guestCount:     number
  assignedCount:  number
  recommendation: StaffingRecommendation
  isCompliant:    boolean
  coordinatorNames: string[] // primary (non-backup) coordinators, for a quick hover/tooltip
}
