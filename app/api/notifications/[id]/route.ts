// app/api/notifications/[id]/route.ts — mark ONE of the caller's own notifications read.

import { getCurrentDbUser } from "@/lib/clerk/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  // Scoped to the caller's own id — one user can never mark another's notification read via a guessed id.
  const result = await prisma.notification.updateMany({ where: { id, userId: actor.id }, data: { isRead: true } })
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
