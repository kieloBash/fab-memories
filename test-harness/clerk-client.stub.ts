// test-harness/clerk-client.stub.ts
//
// TEST-ONLY replacement for lib/clerk/client.ts, swapped in temporarily by run-route-tests.sh so routes that
// call Clerk (staff-account create/update/deactivate) can be tested without real Clerk credentials or network
// access. Records call counts on globalThis so a test can assert e.g. "reactivating unlocked the Clerk user".

export function resetClerkCallLog() {
    (globalThis as any).__clerkCalls = { createUser: 0, updateUserMetadata: 0, lockUser: 0, unlockUser: 0, deleteUser: 0 }
}

export async function clerkClient() {
    const calls = ((globalThis as any).__clerkCalls ??= { createUser: 0, updateUserMetadata: 0, lockUser: 0, unlockUser: 0, deleteUser: 0 })
    let seq = 0
    return {
        users: {
            createUser: async (p: { username?: string }) => { calls.createUser++; return { id: `clerk_stub_${Date.now()}_${++seq}`, username: p.username } },
            updateUserMetadata: async (id: string) => { calls.updateUserMetadata++; return { id } },
            lockUser: async (id: string) => { calls.lockUser++; return { id, locked: true } },
            unlockUser: async (id: string) => { calls.unlockUser++; return { id, locked: false } },
            deleteUser: async (id: string) => { calls.deleteUser++; return { id, deleted: true } },
        },
    }
}
