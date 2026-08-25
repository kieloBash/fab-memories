// app/api/bookings/[bookingId]/installments/route.ts

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { createInstallmentScheduleSchema } from "@/features/installments/installments.schema"
import {
  createInstallmentScheduleRecord,
  getInstallmentsByBookingId,
} from "@/features/installments/installments.query"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ bookingId: string }> }

/**
 * GET /api/bookings/[bookingId]/installments
 * Returns the installment schedule for a booking, ordered by due date.
 * - ADMIN / COORDINATOR: any booking
 * - CLIENT: only their own booking
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

  const { bookingId } = await params

  if (role === "CLIENT") {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { clientId: true },
    })
    if (!booking || booking.clientId !== actor.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const installments = await getInstallmentsByBookingId(bookingId)
  return NextResponse.json(installments)
}

/**
 * POST /api/bookings/[bookingId]/installments
 * Admin creates the installment schedule per contract terms.
 * Booking must be CONFIRMED (deposit verified) before a schedule can be set.
 * Replaces any existing UNPAID installments.
 */
export async function POST(req: Request, { params }: Params) {
  try {
    await requireRole(["ADMIN"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId } = await params
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, package: { select: { name: true } } },
  })

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  if (booking.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "Installment schedule can only be set for CONFIRMED bookings" },
      { status: 409 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const parsed = createInstallmentScheduleSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    )
  }

  const result = await createInstallmentScheduleRecord(bookingId, parsed.data)

  await logAction({
    userId:      actor.id,
    action:      "CREATE",
    module:      "PAYMENT",
    description: `Admin "${actor.fullName}" created installment schedule (${result.count} installments) for booking ${bookingId}`,
    metadata:    { bookingId, count: result.count },
  })

  return NextResponse.json({ count: result.count }, { status: 201 })
}
