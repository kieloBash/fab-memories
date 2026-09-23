// test-harness/integration/_support/mocks/clerk-client.ts — stands in for lib/clerk/client.ts
// Every call is recorded on globalThis.__clerkCalls so a test can assert "deactivating locked the Clerk user".
// users.getUser() answers from a small registry of fake Clerk users (registerClerkUser); unknown ids → 404, like Clerk.
// Seeded accounts (their clerkId is in our database) are always treated as existing.
import { prisma } from "@/lib/prisma"

type Calls = Record<"createUser" | "updateUserMetadata" | "lockUser" | "unlockUser" | "deleteUser" | "revokeSession" | "getUser", number>

export interface FakeClerkUser {
  id: string
  username?: string | null
  firstName?: string | null
  lastName?: string | null
  publicMetadata?: Record<string, unknown>
  primaryEmailAddressId?: string | null
  emailAddresses?: { id: string; emailAddress: string; verification: { status: string } }[]
}

const registry: Map<string, FakeClerkUser> = ((globalThis as any).__clerkUsers ??= new Map())
const gone: Set<string> = ((globalThis as any).__clerkGone ??= new Set())

/** Make a fake Clerk user exist (for users.getUser). */
export function registerClerkUser(u: FakeClerkUser) { registry.set(u.id, u); gone.delete(u.id) }
/** Make a Clerk id NOT exist any more, even if a database row still points at it. */
export function deleteClerkUser(id: string) { registry.delete(id); gone.add(id) }
export function fakeClerkUser(id: string) { return registry.get(id) }

export function clerkCalls(): Calls {
  return ((globalThis as any).__clerkCalls ??= {
    createUser: 0, updateUserMetadata: 0, lockUser: 0, unlockUser: 0, deleteUser: 0, revokeSession: 0,
  })
}

export async function clerkClient() {
  const calls = clerkCalls()
  return {
    users: {
      createUser: async (p: { username?: string }) => {
        calls.createUser++
        return { id: `user_itest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, username: p.username }
      },
      getUser: async (id: string) => {
        calls.getUser = (calls.getUser ?? 0) + 1
        const u = registry.get(id)
        if (u) return u
        if (!gone.has(id) && (await prisma.user.findUnique({ where: { clerkId: id }, select: { id: true } }))) return { id }
        throw Object.assign(new Error("Not Found"), { status: 404, errors: [{ code: "resource_not_found" }] })
      },
      updateUserMetadata: async (id: string, p?: { publicMetadata?: Record<string, unknown> }) => {
        calls.updateUserMetadata++
        const u = registry.get(id)
        if (u && p?.publicMetadata) u.publicMetadata = { ...(u.publicMetadata ?? {}), ...p.publicMetadata }
        return { id }
      },
      lockUser: async (id: string) => { calls.lockUser++; return { id, locked: true } },
      unlockUser: async (id: string) => { calls.unlockUser++; return { id, locked: false } },
      deleteUser: async (id: string) => { calls.deleteUser++; return { id, deleted: true } },
    },
    sessions: {
      revokeSession: async (id: string) => { calls.revokeSession++; return { id } },
    },
  }
}
