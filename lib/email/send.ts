// lib/email/send.ts
//
// Thin wrapper around Nodemailer. Plain text only (no HTML templates — see the module README for why).
//
// If SMTP is not configured (SMTP_HOST unset), sendEmail() logs the message to the console instead of sending
// — this is the default in dev and in every automated test, so nothing here ever needs real credentials to run.
// A misconfigured or unreachable SMTP server never throws upward: email is always best-effort, and a failure
// here must never break the business action that triggered it (see lib/notifications/notify.ts).

import nodemailer from "nodemailer"

export interface EmailMessage { to: string; subject: string; text: string }

let cachedTransport: ReturnType<typeof nodemailer.createTransport> | null | undefined

function getTransport() {
  if (cachedTransport !== undefined) return cachedTransport
  const host = process.env.SMTP_HOST
  if (!host) { cachedTransport = null; return null }
  cachedTransport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  })
  return cachedTransport
}

export interface SendResult { sent: boolean; mode: "smtp" | "console"; error?: string }

export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const transport = getTransport()
  if (!transport) {
    console.log(`[email:console] to=${msg.to} subject="${msg.subject}"\n${msg.text}`)
    return { sent: true, mode: "console" }
  }
  try {
    await transport.sendMail({ from: process.env.EMAIL_FROM ?? "no-reply@fabmemories.example", to: msg.to, subject: msg.subject, text: msg.text })
    return { sent: true, mode: "smtp" }
  } catch (err) {
    console.error("Failed to send email:", err)
    return { sent: false, mode: "smtp", error: String((err as Error)?.message ?? err) }
  }
}

/** Test-only: forces the console fallback back on and clears the cached transport (module-level cache otherwise persists across tests). */
export function _resetEmailTransportForTests() { cachedTransport = undefined }
