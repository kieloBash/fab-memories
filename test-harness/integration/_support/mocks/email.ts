// test-harness/integration/_support/mocks/email.ts — stands in for lib/email/send.ts
// Captures every message instead of sending it. The real sender also writes an EmailLog row; that part is
// covered by test-harness/unit/email-send.unit.test.ts.
export interface EmailMessage { to: string; subject: string; text: string; html?: string; kind?: string; bookingId?: string }

export const sentEmails: EmailMessage[] = ((globalThis as any).__itestEmails ??= [])

export async function sendEmail(msg: EmailMessage) {
  sentEmails.push(msg)
  return { sent: true, mode: "console" as const }
}

export function describeEmailTransport() {
  return { mode: "console" as const, from: null }
}

export function _resetEmailTransportForTests() {}
