// app/(pages)/(protected)/staff/coordinator/bookings/page.tsx
"use client"

import { BookingsListView } from "@/features/bookings/components/bookings-list-view"

export default function CoordinatorBookingsPage() {
  return <BookingsListView basePath="/staff/coordinator/bookings" />
}
