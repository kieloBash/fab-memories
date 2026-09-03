// app/api/vendor-brief/[bookingId]/route.ts
//
// PUBLIC route — no Clerk session required.
// Whitelisted in middleware.ts under /api/vendor-brief/**.
//
// GET /api/vendor-brief/[bookingId]?view=[bookingVendorId]
//
// Returns a scoped, read-only snapshot of a booking for an external vendor.
// The ?view= param identifies which BookingVendor assignment to include.
//
// Deliberately excluded from the response:
//   - client name / phone
//   - payment / pricing information
//   - internal staff notes (staffNote)
//   - other vendor assignments
//   - cancellation reasons / admin metadata
//
// Security model: BookingVendor IDs are cuid2 (~22 random chars) —
// unguessable without the link. This is equivalent to a share link token.

import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ bookingId: string }> }

export async function GET(req: Request, { params }: Params) {
  const { bookingId } = await params
  const { searchParams } = new URL(req.url)
  const bookingVendorId = searchParams.get("view") ?? null

  // ── Fetch booking — only the fields a vendor needs ────────────
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id:                    true,
      eventType:             true,
      eventDate:             true,
      venue:                 true,
      venueLatitude:         true,
      venueLongitude:        true,
      venueFormattedAddress: true,
      guestCount:            true,
      status:                true,
      notes:                 true,                 // client's event notes (motif, theme)
      packageCustomizations: true,
      isProvincial:          true,
      vendorCategories:      true,
      package: {
        select: { name: true, eventType: true },
      },
      // No: clientId, clientPhone, agreedPrice, depositAmount,
      //     paymentPlan, staffNote, payments, cancellationReason
    },
  })

  if (!booking) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  // ── Optionally fetch the specific vendor assignment ────────────
  let assignment = null
  if (bookingVendorId) {
    const raw = await prisma.bookingVendor.findFirst({
      where: {
        id:        bookingVendorId,
        bookingId,             // must belong to this booking
      },
      select: {
        id:          true,
        category:    true,
        notes:       true,     // coordinator's agreed rate / scope note
        contactedAt: true,
        confirmedAt: true,
        vendor: {
          select: {
            name:           true,
            category:       true,
            // No: contactPhone, contactEmail, contactName, notes (admin private notes)
          },
        },
      },
    })
    // silently return null if the ID doesn't match — no error exposed
    assignment = raw ?? null
  }

  return NextResponse.json({
    booking,
    assignment,
  })
}
