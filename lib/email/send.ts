// lib/email/send.ts
//
// The ONE place the system sends email. Uses Gmail through Nodemailer (same approach as LiveAdmin).
//
// The transport is chosen from the environment variables, in this order:
//   1. Gmail OAuth2        GMAIL_USER + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN
//   2. Gmail App Password  GMAIL_USER + GMAIL_APP_PASSWORD
//   3. Console             nothing configured → the email is only written to the server log
//                          (the default in development and in every automated test)
//
// Email is always BEST-EFFORT: sendEmail() never throws, so a Gmail problem can never break the booking or
// payment action that triggered it. Every attempt is recorded in the EmailLog table (without the body) so
// the administrator and the e2e tests can confirm an email was really sent — see /api/admin/email/log.

import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"

export interface EmailMessage {
  to: string
  subject: string
  /** Plain-text version — always sent; some mail apps show only this. */
  text: string
  /** HTML version (lib/email/templates). Optional. */
  html?: string
  /** What kind of email this is, for the EmailLog (e.g. BOOKING_CONFIRMED). Defaults to GENERAL. */
  kind?: string
  /** Related booking, for the EmailLog. */
  bookingId?: string
}

export type EmailMode = "gmail-oauth2" | "gmail-app-password" | "console"

export interface SendResult {
  sent: boolean
  mode: EmailMode
  messageId?: string
  error?: string
}

type Transport = ReturnType<typeof nodemailer.createTransport>
let cached: { mode: EmailMode; transport: Transport | null } | undefined

function resolveTransport(): { mode: EmailMode; transport: Transport | null } {
  if (cached) return cached
  const user = process.env.GMAIL_USER
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GMAIL_APP_PASSWORD } = process.env

  if (user && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN) {
    cached = {
      mode: "gmail-oauth2",
      transport: nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user,
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          refreshToken: GOOGLE_REFRESH_TOKEN,
        },
      }),
    }
  } else if (user && GMAIL_APP_PASSWORD) {
    cached = {
      mode: "gmail-app-password",
      transport: nodemailer.createTransport({ service: "gmail", auth: { user, pass: GMAIL_APP_PASSWORD.replace(/\s+/g, "") } }),
    }
  } else {
    cached = { mode: "console", transport: null }
  }
  return cached
}

/** Which transport is configured and the sender address — safe to show to an administrator (no secrets). */
export function describeEmailTransport() {
  const { mode } = resolveTransport()
  return { mode, from: mode === "console" ? null : senderAddress() }
}

function senderAddress() {
  const name = process.env.EMAIL_FROM_NAME ?? "Fab Memories Events"
  return `${name} <${process.env.GMAIL_USER}>`
}

async function record(msg: EmailMessage, status: "SENT" | "FAILED" | "LOGGED", mode: EmailMode, messageId?: string, error?: string) {
  try {
    await prisma.emailLog.create({
      data: {
        to: msg.to,
        subject: msg.subject.slice(0, 300),
        kind: msg.kind ?? "GENERAL",
        bookingId: msg.bookingId ?? null,
        status,
        mode,
        messageId: messageId ?? null,
        error: error ? error.slice(0, 500) : null,
      },
    })
  } catch (err) {
    // The log is evidence, not a dependency — never let it break sending.
    console.error("Failed to write EmailLog:", err)
  }
}

export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const { mode, transport } = resolveTransport()

  if (!transport) {
    console.log(`[email:console] to=${msg.to} subject="${msg.subject}"\n${msg.text}`)
    await record(msg, "LOGGED", mode)
    return { sent: true, mode }
  }

  try {
    const info = await transport.sendMail({
      from: senderAddress(),
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      ...(msg.html ? { html: msg.html } : {}),
    })
    await record(msg, "SENT", mode, info.messageId)
    return { sent: true, mode, messageId: info.messageId }
  } catch (err) {
    const error = String((err as Error)?.message ?? err)
    console.error("Failed to send email:", err)
    await record(msg, "FAILED", mode, undefined, error)
    return { sent: false, mode, error }
  }
}

/** Test-only: forget the cached transport so a test can change the environment variables. */
export function _resetEmailTransportForTests() { cached = undefined }
