// app/api/admin/email/log/route.ts
//
// GET /api/admin/email/log — ADMIN only.
// Lists recent entries of the EmailLog (every email the system tried to send), newest first, so the
// administrator and the Playwright e2e tests can confirm an action really triggered its email.
//
// Query (all optional): to=<email>  kind=<BOOKING_CONFIRMED|PAYMENT_VERIFIED|...>  bookingId=<id>
//                       since=<ISO date-time>  limit=<1-100, default 20>

import { requireRole } from "@/lib/clerk/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

const querySchema = z.object({
  to: z.string().optional(),
  kind: z.string().optional(),
  bookingId: z.string().optional(),
  since: z.string().refine((v) => !isNaN(Date.parse(v)), "since must be a date").optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export async function GET(req: Request) {
  try { await requireRole(["ADMIN"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const params = Object.fromEntries(new URL(req.url).searchParams)
  const parsed = querySchema.safeParse(params)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid query" }, { status: 422 })
  const q = parsed.data

  const entries = await prisma.emailLog.findMany({
    where: {
      ...(q.to ? { to: { equals: q.to, mode: "insensitive" } } : {}),
      ...(q.kind ? { kind: q.kind } : {}),
      ...(q.bookingId ? { bookingId: q.bookingId } : {}),
      ...(q.since ? { createdAt: { gte: new Date(q.since) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: q.limit,
  })

  return NextResponse.json({ entries })
}
