// features/reports/reports.types.ts

/** One item in the Admin dashboard's merged "needs attention" list */
export interface NeedsAttentionItem {
  kind:        "CONTRACT_TERMS" | "PAYMENT_REVIEW" | "CANCELLATION_REQUEST"
  bookingId:   string
  paymentId?:  string
  label:       string   // e.g. client name or event type
  detail:      string   // short context line
  href:        string   // where clicking this item should navigate
  createdAt:   string   // for sorting, most recent first
}

/** One upcoming event row for the dashboard's "This week" list */
export interface UpcomingEventSummary {
  bookingId:  string
  eventType:  string
  eventDate:  string
  venue:      string
  status:     string
  clientName: string
}

export interface AdminDashboardSummary {
  activeBookingsCount:      number  // CONFIRMED
  pendingRequestsCount:     number  // PENDING
  paymentsToVerifyCount:    number  // Payment.status = SUBMITTED
  upcomingThisWeekCount:    number  // eventDate within next 7 days, CONFIRMED or PENDING

  understaffedCount:        number  // upcoming events below FR-37 minimum
  vendorGapCount:           number  // upcoming events with an unmet requested vendor category

  needsAttention:           NeedsAttentionItem[]   // merged, most recent first, capped
  upcomingEvents:           UpcomingEventSummary[] // next 7 days, soonest first, capped
}
