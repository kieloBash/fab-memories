// prisma/simulate-lockout.ts
/**
 * Manual test helper: pretends Clerk just told us an account was locked.
 * (The real webhook needs a Clerk/Svix signature, so this calls the same handler directly.)
 *
 *   npx tsx prisma/simulate-lockout.ts coordinator
 *
 * Then open Audit trail → filter Module = Authentication, Status = Failure.
 * Run it again within 30 minutes: no second entry (de-duplicated).
 */
import "dotenv/config"
import { processClerkEvent } from "@/lib/clerk/webhook-handler"
import { prisma } from "@/lib/prisma"

async function main() {
  const username = process.argv[2]
  if (!username) { console.error("Usage: npx tsx prisma/simulate-lockout.ts <username>"); process.exit(1) }
  const u = await prisma.user.findUnique({ where: { username } })
  if (!u) { console.error(`No user "${username}".`); process.exit(1) }
  const [first, ...rest] = u.fullName.split(" ")
  const before = await prisma.auditLog.count()
  await processClerkEvent({ type: "user.updated", data: {
    id: u.clerkId, locked: true, lockout_expires_in_seconds: 600, public_metadata: { role: u.role },
    email_addresses: u.email ? [{ email_address: u.email }] : [], username: u.username, first_name: first, last_name: rest.join(" "),
  } })
  const added = (await prisma.auditLog.count()) - before
  console.log(added ? `✅ Logged a lockout entry for ${u.fullName}.` : `ℹ️  Nothing new logged — a lockout for ${u.fullName} was already recorded in the last 30 minutes (de-duplicated).`)
}
main().finally(() => prisma.$disconnect())
