// app/api/payments/manual/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { auditedTransaction, logAction } from "@/lib/audit/log"
import { attempt } from "@/lib/route-errors"
import { recordManualPaymentSchema } from "@/features/payments/payments.schema"
import { recordManualPaymentRecord } from "@/features/payments/payments.query"
import { getBookingById } from "@/features/bookings/bookings.query"
import { NextResponse } from "next/server"

/**
 * POST /api/payments/manual
 * Admin records a cash / face-to-face / walk-in payment.
 * Creates the payment as immediately VERIFIED.
 *
 * Rules:
 *   - ADMIN or COORDINATOR only
 *   - Booking must be CONFIRMED (except DEPOSIT which confirms it)
 *   - DEPOSIT: also confirms booking → status CONFIRMED
 *   - INSTALLMENT: also marks linked installment PAID
 *   - FULL_BALANCE: just records as verified
 */
export async function POST(req: Request) {
  try {
    await requireRole(["ADMIN", "COORDINATOR"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = recordManualPaymentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )
  }

  const booking = await getBookingById(parsed.data.bookingId)
  if (!booking)
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })

  // DEPOSIT can be recorded on PENDING bookings (it confirms them)
  // All other types require the booking to already be CONFIRMED
  if (
    parsed.data.paymentType !== "DEPOSIT" &&
    booking.status !== "CONFIRMED"
  ) {
    return NextResponse.json(
      { error: "Booking must be confirmed before recording non-deposit payments" },
      { status: 409 },
    )
  }

  // A DEPOSIT records AND confirms — it is only meaningful for a booking that is still pending.
  if (parsed.data.paymentType === "DEPOSIT" && booking.status !== "PENDING") {
    return NextResponse.json(
      { error: "A deposit can only be recorded for a pending booking." , code: "INVALID_STATE" },
      { status: 409 },
    )
  }

  const r_payment = await attempt(
    auditedTransaction(async (tx, audit) => {
      const result = await recordManualPaymentRecord(parsed.data, actor.id, tx)
      audit({
    userId:      actor.id,
    action:      "CREATE",
    module:      "PAYMENT",
    description: `${actor.role} recorded manual ${parsed.data.paymentType} payment of ₱${parsed.data.amount} for booking ${parsed.data.bookingId}`,
    metadata: {
      bookingId:    parsed.data.bookingId,
      paymentType:  parsed.data.paymentType,
      method:       parsed.data.method,
      amount:       parsed.data.amount,
      installmentId: parsed.data.installmentId,
    },
  })
      return result
    }),
    { userId: actor.id, module: "PAYMENT", action: "CREATE", what: "record the manual payment" },
  )
  if (!r_payment.ok) return r_payment.response
  const payment = r_payment.value

  return NextResponse.json(payment, { status: 201 })
}
