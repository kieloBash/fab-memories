// app/api/admin/email/test/route.ts
//
// POST /api/admin/email/test — ADMIN only.
// Sends a test email through the real transport and reports what happened, so the administrator (and the
// Playwright e2e test TC-EMAIL-01) can confirm the live system can actually send email.
//
// Body (optional): { "to": "someone@example.com" } — defaults to the administrator's own email.
// Response: { sent, mode, messageId?, error?, to, from }
//   mode "gmail-oauth2" / "gmail-app-password" → really sent through Gmail
//   mode "console" → NO email credentials configured on the server; nothing left the server.

import { getCurrentDbUser, requireRole } from "@/lib/clerk/auth"
import { logAction } from "@/lib/audit/log"
import { describeEmailTransport, sendEmail } from "@/lib/email/send"
import { testEmail } from "@/lib/email/templates"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({ to: z.string().email("Enter a valid email address").optional() })

export async function POST(req: Request) {
  try { await requireRole(["ADMIN"]) }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }) }

  const actor = await getCurrentDbUser()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 })

  const to = parsed.data.to ?? actor.email
  if (!to) return NextResponse.json({ error: "Your account has no email address — pass { to }." }, { status: 422 })

  const { mode, from } = describeEmailTransport()
  const mail = testEmail({ requestedBy: actor.fullName ?? actor.username ?? "administrator", mode, sentAt: new Date() })
  const result = await sendEmail({ to, ...mail, kind: "TEST" })

  await logAction({
    userId: actor.id,
    action: "CREATE",
    module: "USER_MANAGEMENT",
    description: `${actor.role} sent a test email (${result.mode}, ${result.sent ? "sent" : "failed"})`,
    metadata: { mode: result.mode, sent: result.sent },
  })

  return NextResponse.json({ ...result, to, from }, { status: result.sent ? 200 : 502 })
}
