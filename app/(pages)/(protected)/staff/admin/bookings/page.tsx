// app/(pages)/(protected)/staff/admin/bookings/page.tsx
"use client"

import { BookingsListView } from "@/features/bookings/components/bookings-list-view"

export default function AdminBookingsPage() {
  return <BookingsListView basePath="/staff/admin/bookings" />
}
