// test-harness/integration/_support/mocks/email.ts — stands in for lib/email/send.ts
export interface EmailMessage { to: string; subject: string; text: string }

export const sentEmails: EmailMessage[] = ((globalThis as any).__itestEmails ??= [])

export async function sendEmail(msg: EmailMessage) {
  sentEmails.push(msg)
  return { sent: true, mode: "console" as const }
}
