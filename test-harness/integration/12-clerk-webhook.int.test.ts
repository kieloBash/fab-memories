// test-harness/integration/12-clerk-webhook.int.test.ts
//
// Module 1 — Clerk → database sync. Events are signed with svix exactly as Clerk signs them.
import { POST as webhookPOST } from "@/app/api/webhooks/clerk/route"
import { prisma } from "@/lib/prisma"
import { Webhook } from "svix"
import { describe, expect, it } from "vitest"
import { call, expectStatus } from "./_support/http"
import { clerkCalls } from "./_support/mocks/clerk-client"
import { setRequestHeaders } from "./_support/mocks/next-headers"

async function send(event: { type: string; data: Record<string, unknown> }) {
  const payload = JSON.stringify(event)
  const msgId = `msg_itest_${Math.random().toString(36).slice(2)}`
  const now = new Date()
  const signature = new Webhook(process.env.CLERK_WEBHOOK_SIGNING_SECRET!).sign(msgId, now, payload)
  setRequestHeaders({ "svix-id": msgId, "svix-timestamp": String(Math.floor(now.getTime() / 1000)), "svix-signature": signature })
  return call(webhookPOST, { body: payload })
}

describe.sequential("Clerk webhook", () => {
  const clerkId = `user_itest_${Date.now().toString(36)}`

  it("user.created (a client signing up) → a CLIENT row is created and the role is written back to Clerk", async () => {
    const before = clerkCalls().updateUserMetadata
    const r = await send({
      type: "user.created",
      data: { id: clerkId, username: null, first_name: "Carla", last_name: "Itest", email_addresses: [{ email_address: `${clerkId}@example.com` }], public_metadata: {} },
    })
    expectStatus(r, 200)
    const u = await prisma.user.findUniqueOrThrow({ where: { clerkId } })
    expect(u).toMatchObject({ role: "CLIENT", fullName: "Carla Itest", email: `${clerkId}@example.com` })
    expect(clerkCalls().updateUserMetadata).toBe(before + 1)
  })

  it("user.updated → name and e-mail are synced", async () => {
    const r = await send({
      type: "user.updated",
      data: { id: clerkId, username: null, first_name: "Carla", last_name: "Itest-Reyes", email_addresses: [{ email_address: `new.${clerkId}@example.com` }], public_metadata: { role: "CLIENT" } },
    })
    expectStatus(r, 200)
    expect(await prisma.user.findUniqueOrThrow({ where: { clerkId } })).toMatchObject({ fullName: "Carla Itest-Reyes", email: `new.${clerkId}@example.com` })
  })
})
