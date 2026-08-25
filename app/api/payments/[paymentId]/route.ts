// app/api/payments/[paymentId]/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { getPaymentById } from "@/features/payments/payments.query"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ paymentId: string }> }

/**
 * GET /api/payments/[paymentId]
 * Returns a single payment with relations.
 * - ADMIN / COORDINATOR: any payment
 * - CLIENT: only payments belonging to their own bookings
 */
export async function GET(_req: Request, { params }: Params) {
  let role: string
  try {
    role = await requireRole(["ADMIN", "COORDINATOR", "CLIENT"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { paymentId } = await params
  const payment = await getPaymentById(paymentId)

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }

  // Clients may only view payments on their own bookings
  if (role === "CLIENT" && payment.booking.client.id !== actor.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json(payment)
}
