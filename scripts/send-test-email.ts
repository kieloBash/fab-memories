// scripts/send-test-email.ts
//
// Sends one real test email using the Gmail settings in your .env — the quickest way to check your
// credentials before deploying. The attempt is also recorded in the EmailLog table.
//
//   npm run email:test -- you@example.com

import "dotenv/config"
import { describeEmailTransport, sendEmail } from "@/lib/email/send"
import { testEmail } from "@/lib/email/templates"

async function main() {
  const to = process.argv[2]
  if (!to) throw new Error("Usage: npm run email:test -- you@example.com")
  const { mode, from } = describeEmailTransport()
  console.log(`Transport: ${mode}${from ? ` (from ${from})` : ""}`)
  if (mode === "console") console.log("No Gmail credentials found — the email will only be printed below, not sent.")
  const result = await sendEmail({ to, ...testEmail({ requestedBy: "command line", mode, sentAt: new Date() }), kind: "TEST" })
  console.log(result)
  process.exit(result.sent ? 0 : 1)
}

main().catch((err) => { console.error(err); process.exit(1) })
