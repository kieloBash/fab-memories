// app/api/bookings/[bookingId]/contract-terms/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { setContractTermsSchema } from "@/features/bookings/bookings.schema"
import {
  getBookingById,
  setContractTermsRecord,
} from "@/features/bookings/bookings.query"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ bookingId: string }> }

/**
 * PATCH /api/bookings/[bookingId]/contract-terms
 * Admin sets contract terms after discussing with client.
 * Only valid while booking is PENDING.
 *
 * Fields:
 *   agreedPrice    — override the auto-calculated price
 *   paymentPlan    — FULL | INSTALLMENT
 *   depositAmount  — negotiated deposit amount
 *   depositDueDate — when client must pay the deposit by
 *   staffNote      — internal note on what was discussed
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireRole(["ADMIN", "COORDINATOR"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId } = await params
  const existing = await getBookingById(bookingId)

  if (!existing)
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })

  if (existing.status !== "PENDING")
    return NextResponse.json(
      { error: "Contract terms can only be set while the booking is pending" },
      { status: 409 },
    )

  const body = await req.json().catch(() => ({}))
  const parsed = setContractTermsSchema.safeParse(body)

  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )

  // Validate depositAmount doesn't exceed agreedPrice
  const effectiveAgreedPrice = parsed.data.agreedPrice ?? Number(existing.agreedPrice)
  if (
    parsed.data.depositAmount !== undefined &&
    parsed.data.depositAmount >= effectiveAgreedPrice
  ) {
    return NextResponse.json(
      { error: "Deposit amount must be less than the agreed price" },
      { status: 422 },
    )
  }

  const updated = await setContractTermsRecord(bookingId, parsed.data)

  await logAction({
    userId:      actor.id,
    action:      "UPDATE",
    module:      "BOOKING",
    description: `${actor.role} "${actor.fullName}" set contract terms for booking ${bookingId}`,
    metadata:    {
      bookingId,
      agreedPrice:   parsed.data.agreedPrice,
      paymentPlan:   parsed.data.paymentPlan,
      depositAmount: parsed.data.depositAmount,
      depositDueDate: parsed.data.depositDueDate,
    },
  })

  return NextResponse.json(updated)
}
