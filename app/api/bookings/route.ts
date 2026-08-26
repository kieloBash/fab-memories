// app/api/bookings/route.ts

import {
  createBookingRecord,
  getAllBookings,
  getBookingsByClientId,
  isDateAvailable,
  resolveAgreedPrice,
} from "@/features/bookings/bookings.query"
import { bookingFilterSchema, createBookingSchema } from "@/features/bookings/bookings.schema"
import { logAction } from "@/lib/audit/log"
import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { NextResponse } from "next/server"

/**
 * GET /api/bookings
 * - ADMIN / COORDINATOR: all bookings with optional filters
 * - CLIENT: own bookings only
 */
export async function GET(req: Request) {
  let role: string
  try {
    role = await requireRole(["ADMIN", "COORDINATOR", "CLIENT"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (role === "CLIENT") {
    const bookings = await getBookingsByClientId(actor.id)
    return NextResponse.json(bookings)
  }

  const { searchParams } = new URL(req.url)
  const filters = bookingFilterSchema.safeParse({
    status:    searchParams.get("status")    ?? undefined,
    eventType: searchParams.get("eventType") ?? undefined,
    from:      searchParams.get("from")      ?? undefined,
    to:        searchParams.get("to")        ?? undefined,
  })

  const bookings = await getAllBookings(filters.success ? filters.data : undefined)
  return NextResponse.json(bookings)
}

/**
 * POST /api/bookings
 * Creates a booking request. CLIENT only.
 *
 * Resolves agreedPrice here (server-side) from the package record
 * so the client cannot manipulate the price.
 *
 * Enforces one-confirmed-event-per-day availability rule.
 */
export async function POST(req: Request) {
  try {
    await requireRole(["CLIENT"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = createBookingSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )
  }

  // Check availability
  const available = await isDateAvailable(parsed.data.eventDate)
  if (!available) {
    return NextResponse.json(
      { error: "This date is already booked. Please choose a different date." },
      { status: 409 },
    )
  }

  // Resolve agreed price server-side — client cannot manipulate this
  let agreedPrice: number
  try {
    agreedPrice = await resolveAgreedPrice(
      parsed.data.packageId,
      parsed.data.isProvincial ?? false,
    )
  } catch {
    return NextResponse.json({ error: "Package not found" }, { status: 404 })
  }

  const booking = await createBookingRecord(actor.id, parsed.data, agreedPrice)

  await logAction({
    userId:      actor.id,
    action:      "CREATE",
    module:      "BOOKING",
    description: `Client "${actor.fullName}" submitted a booking request for ${parsed.data.eventDate}`,
    metadata:    {
      bookingId:    booking.id,
      packageId:    parsed.data.packageId,
      agreedPrice,
      isProvincial: parsed.data.isProvincial ?? false,
    },
  })

  return NextResponse.json(booking, { status: 201 })
}
