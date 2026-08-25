// app/api/payments/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { submitPaymentSchema, paymentFilterSchema } from "@/features/payments/payments.schema"
import {
  createPaymentRecord,
  getAllPayments,
  getPaymentsByBookingId,
} from "@/features/payments/payments.query"
import { NextResponse } from "next/server"

/**
 * GET /api/payments
 * - ADMIN / COORDINATOR: all payments with optional ?status= / ?bookingId= filters
 * - CLIENT: only their own booking payments (?bookingId= required)
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

  const { searchParams } = new URL(req.url)
  const filters = paymentFilterSchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    bookingId: searchParams.get("bookingId") ?? undefined,
  })

  if (role === "CLIENT") {
    const bookingId = searchParams.get("bookingId")
    if (!bookingId) {
      return NextResponse.json(
        { error: "?bookingId is required for client payment lookup" },
        { status: 400 },
      )
    }
    const payments = await getPaymentsByBookingId(bookingId)
    return NextResponse.json(payments)
  }

  const payments = await getAllPayments(filters.success ? filters.data : undefined)
  return NextResponse.json(payments)
}

/**
 * POST /api/payments
 * Submits a payment proof. CLIENT only.
 * Accepts either a proofImageUrl (after client-side upload) or a referenceNumber.
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
  const parsed = submitPaymentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )
  }

  const payment = await createPaymentRecord(parsed.data)

  await logAction({
    userId: actor.id,
    action: "CREATE",
    module: "PAYMENT",
    description: `Client "${actor.fullName}" submitted payment proof for booking ${parsed.data.bookingId}`,
    metadata: {
      paymentId: payment.id,
      bookingId: parsed.data.bookingId,
      method: parsed.data.method,
      amount: parsed.data.amount,
    },
  })

  return NextResponse.json(payment, { status: 201 })
}
