// prisma/seeds/_shared.ts
//
// Shared pieces for every seed: the database connection, the seed contract, and the Clerk client.
// Seeds connect with DATABASE_URL — use the database OWNER role here (not the restricted app_runtime role),
// because `--fresh` has to delete audit rows.

import { PrismaClient } from "@/app/generated/prisma/client"
import { createClerkClient } from "@clerk/backend"
import { PrismaPg } from "@prisma/adapter-pg"
import "dotenv/config"
import { existsSync, readFileSync, writeFileSync } from "node:fs"

export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

// ── The seed contract ─────────────────────────────────────────────

export interface SeedContext {
  /** Raw command-line arguments, so a seed can read its own flags (e.g. --bulk=1000). */
  args: string[]
}

export interface SeedModule {
  /** Short id used on the command line: --with=<name>, --reset=<name>. */
  name: string
  description: string
  /** "base" = foundation data (users, packages…). "addon" = extra scenarios layered on top. */
  kind: "base" | "addon"
  /** Names of seeds whose data must already exist. */
  requires?: string[]
  /** Extra flags this seed understands — shown by --list. */
  flags?: string[]
  /** Base only: is the database already populated? (the base seed is skipped when it is) */
  isPresent?: () => Promise<boolean>
  /** Create the data. Add-ons must be safe to run repeatedly (reset their own data first). */
  run: (ctx: SeedContext) => Promise<void>
  /** Remove ONLY the data this seed created (identify it with a tag). Add-ons should provide this. */
  reset?: () => Promise<void>
}

// ── Clerk ─────────────────────────────────────────────────────────
//
// SEED_CLERK_STUB=<file.json> switches to an OFFLINE fake Clerk that stores its users in that file. It exists so the
// seed logic can be tested without touching a real Clerk instance. Users created this way cannot sign in.

function makeFileStub(path: string): any {
  type U = { id: string; username?: string; emailAddresses: { emailAddress: string }[] }
  const load = (): U[] => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [])
  const save = (u: U[]) => writeFileSync(path, JSON.stringify(u))
  let deletes = 0
  return {
    users: {
      getUserList: async (p: any = {}) => {
        let all = load()
        if (p.emailAddress?.length) all = all.filter((u) => u.emailAddresses.some((e) => p.emailAddress.includes(e.emailAddress)))
        if (p.username?.length) all = all.filter((u) => !!u.username && p.username.includes(u.username))
        const limit = p.limit ?? 10, offset = p.offset ?? 0
        return { data: all.slice(offset, offset + limit), totalCount: all.length }
      },
      deleteUser: async (id: string) => {
        if (process.env.SEED_CLERK_STUB_429 && ++deletes % 7 === 0) { const e: any = new Error("Too many requests"); e.status = 429; throw e }
        save(load().filter((u) => u.id !== id))
        return { id, deleted: true }
      },
      createUser: async (p: any) => {
        const u = { id: "user_stub_" + Math.random().toString(36).slice(2, 12), username: p.username, emailAddresses: (p.emailAddress ?? []).map((e: string) => ({ emailAddress: e })) }
        save([...load(), u]); return u
      },
    },
  }
}

export const clerkIsStubbed = !!process.env.SEED_CLERK_STUB
export const clerk: ReturnType<typeof createClerkClient> = clerkIsStubbed
  ? makeFileStub(process.env.SEED_CLERK_STUB!)
  : createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY ?? "" })
