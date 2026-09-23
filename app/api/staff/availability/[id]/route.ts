// app/api/staff/availability/[id]/route.ts

import { removeUnavailableDay } from "@/features/availability/availability.query"
import { logAction } from "@/lib/audit/log"
import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { NextResponse } from "next/server"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireRole(["COORDINATOR"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  // Scoped to the caller's own id inside removeUnavailableDay — a coordinator cannot remove another's entry.
  const removed = await removeUnavailableDay(id, actor.id)
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await logAction({ userId: actor.id, action: "DELETE", module: "STAFF_SCHEDULE", description: "Coordinator removed an unavailable day", metadata: { unavailabilityId: id } })
  return NextResponse.json({ ok: true })
}
