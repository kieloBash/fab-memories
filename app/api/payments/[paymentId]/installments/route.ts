// app/api/payments/[paymentId]/installments/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { getInstallmentsByPaymentId } from "@/features/installments/installments.query"
import { getPaymentById } from "@/features/payments/payments.query"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ paymentId: string }> }

/**
 * GET /api/payments/[paymentId]/installments
 * Returns the installment schedule for a payment, ordered by due date.
 * - ADMIN / COORDINATOR: any payment
 * - CLIENT: only their own booking's payments
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

  if (role === "CLIENT" && payment.booking.client.id !== actor.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const installments = await getInstallmentsByPaymentId(paymentId)
  return NextResponse.json(installments)
}
