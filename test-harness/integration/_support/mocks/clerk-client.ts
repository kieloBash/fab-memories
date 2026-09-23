// test-harness/integration/_support/mocks/clerk-client.ts — stands in for lib/clerk/client.ts
// Every call is recorded on globalThis.__clerkCalls so a test can assert "deactivating locked the Clerk user".
type Calls = Record<"createUser" | "updateUserMetadata" | "lockUser" | "unlockUser" | "deleteUser" | "revokeSession", number>

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
      updateUserMetadata: async (id: string) => { calls.updateUserMetadata++; return { id } },
      lockUser: async (id: string) => { calls.lockUser++; return { id, locked: true } },
      unlockUser: async (id: string) => { calls.unlockUser++; return { id, locked: false } },
      deleteUser: async (id: string) => { calls.deleteUser++; return { id, deleted: true } },
    },
    sessions: {
      revokeSession: async (id: string) => { calls.revokeSession++; return { id } },
    },
  }
}
