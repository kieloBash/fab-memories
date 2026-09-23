// app/api/notifications/mark-all-read/route.ts

import { getCurrentDbUser } from "@/lib/clerk/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST() {
  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.notification.updateMany({ where: { userId: actor.id, isRead: false }, data: { isRead: true } })
  return NextResponse.json({ ok: true })
}
