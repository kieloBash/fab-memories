// app/api/notifications/route.ts
//
// GET  — the signed-in user's own latest 20 notifications + unread count.
// POST /mark-all-read handled in mark-all-read/route.ts (kept separate so this file stays a plain GET).

import { getCurrentDbUser } from "@/lib/clerk/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where: { userId: actor.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.notification.count({ where: { userId: actor.id, isRead: false } }),
  ])
  return NextResponse.json({ items, unreadCount }, { headers: { "Cache-Control": "no-store" } })
}
