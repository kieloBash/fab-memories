// features/availability/availability.types.ts

export interface UnavailableDay {
  id: string
  date: string          // YYYY-MM-DD
  reason: string | null
  createdAt: string
  /** True when the coordinator already has a live assignment on this date — shown as a warning, never blocking. */
  conflictsWithAssignment: boolean
}
