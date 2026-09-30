// lib/notifications/notify.ts
//
// Creates an in-app notification AND, best-effort, emails it. Never throws — a notification failure must
// never break the booking/payment action that triggered it. A failure is logged and, like a failed audit
// write, is not silently invisible: it's counted in AuditWriteFailure-style fashion via the console + the
// caller's own audit entry for the business action, which always succeeds independently of this.
//
// The email uses the generic HTML template (lib/email/templates/notification.ts) unless the caller passes
// a ready-made one in `email` (e.g. the cancellation or flagged-payment templates). Every send is recorded
// in EmailLog by sendEmail().

import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email/send"
import { notificationEmail } from "@/lib/email/templates"
import type { NotificationType } from "@/app/generated/prisma/client"

export interface NotifyInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  link?: string
  /** Optional ready-made email (subject/html/text). Defaults to the generic notification template. */
  email?: { subject: string; html: string; text: string }
  /** Related booking, recorded in EmailLog. */
  bookingId?: string
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    const row = await prisma.notification.create({ data: { userId: input.userId, type: input.type, title: input.title, body: input.body, link: input.link ?? null } })
    const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } })
    if (user?.email) {
      const mail = input.email ?? notificationEmail({ title: input.title, body: input.body, link: input.link })
      const result = await sendEmail({ to: user.email, ...mail, kind: input.type, bookingId: input.bookingId })
      if (!result.sent) console.error(`Notification ${row.id} created but its email failed to send.`)
    }
  } catch (err) {
    console.error("Failed to create notification:", { userId: input.userId, type: input.type }, err)
  }
}

/** Same as notify(), for several recipients (e.g. every active admin/coordinator) — a failure for one recipient never stops the others. */
export async function notifyMany(userIds: string[], input: Omit<NotifyInput, "userId">): Promise<void> {
  await Promise.all(userIds.map((userId) => notify({ ...input, userId })))
}
