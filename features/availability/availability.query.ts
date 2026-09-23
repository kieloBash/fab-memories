// features/availability/availability.query.ts
"use server"

// A coordinator's self-marked unavailable days (B-04). Deliberately simple: one row per day, no ranges,
// no recurring rules — matching what the assignment screen actually needs to check.

import { prisma } from "@/lib/prisma"
import type { AddUnavailableDayInput } from "./availability.schema"

const toDateOnly = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`)

async function withConflictFlag(rows: { id: string; date: Date; reason: string | null; createdAt: Date; coordinatorId: string }[]) {
  if (rows.length === 0) return []
  const assignments = await prisma.staffAssignment.findMany({
    where: {
      coordinatorId: { in: [...new Set(rows.map((r) => r.coordinatorId))] },
      booking: { status: { in: ["CONFIRMED", "PENDING"] }, eventDate: { in: rows.map((r) => r.date) } },
    },
    select: { coordinatorId: true, booking: { select: { eventDate: true } } },
  })
  const busy = new Set(assignments.map((a) => `${a.coordinatorId}|${a.booking.eventDate.toISOString().slice(0, 10)}`))
  return rows.map((r) => ({
    id: r.id, date: r.date.toISOString().slice(0, 10), reason: r.reason, createdAt: r.createdAt.toISOString(),
    conflictsWithAssignment: busy.has(`${r.coordinatorId}|${r.date.toISOString().slice(0, 10)}`),
  }))
}

export async function getUnavailableDays(coordinatorId: string) {
  const rows = await prisma.coordinatorUnavailability.findMany({ where: { coordinatorId }, orderBy: { date: "asc" } })
  return withConflictFlag(rows)
}

export async function isCoordinatorUnavailable(coordinatorId: string, eventDate: Date): Promise<boolean> {
  const day = new Date(Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate()))
  return (await prisma.coordinatorUnavailability.count({ where: { coordinatorId, date: day } })) > 0
}

/** Idempotent: marking the same day twice just returns the existing row (updating the reason if a new one was given). */
export async function addUnavailableDay(coordinatorId: string, input: AddUnavailableDayInput) {
  const date = toDateOnly(input.date)
  const row = await prisma.coordinatorUnavailability.upsert({
    where: { coordinatorId_date: { coordinatorId, date } },
    create: { coordinatorId, date, reason: input.reason ?? null },
    update: input.reason !== undefined ? { reason: input.reason } : {},
  })
  const [withFlag] = await withConflictFlag([{ ...row, coordinatorId }])
  return withFlag
}

export async function removeUnavailableDay(id: string, coordinatorId: string) {
  // Scoped to coordinatorId so one coordinator can never delete another's entry via a guessed id.
  const result = await prisma.coordinatorUnavailability.deleteMany({ where: { id, coordinatorId } })
  return result.count > 0
}
