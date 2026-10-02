// e2e/specs/12-scope.spec.ts
//
// Scope cleanup (Bundle 1): the system covers Wedding and Debut events only, and document generation is out of
// scope (thesis delimitation). These checks are the evidence that the out-of-scope parts are hidden everywhere.
import { expect, test } from "@playwright/test"
import { openAs, openPublic, type Actor } from "../support/session"

const IN_SCOPE = ["WEDDING", "DEBUT"]

test.describe.serial("Scope — Wedding & Debut only, no document module", () => {
  let admin: Actor, coordinator: Actor, client: Actor, anon: Actor

  test.beforeAll(async ({ browser }) => {
    admin = await openAs(browser, "admin")
    coordinator = await openAs(browser, "coordinator")
    client = await openAs(browser, "client")
    anon = await openPublic(browser)
  })
  test.afterAll(async () => { await Promise.all([admin, coordinator, client, anon].map((a) => a?.close())) })

  test("TC-SCOPE-01 Package lists return Wedding and Debut packages only", async () => {
    for (const [who, actor, query] of [
      ["admin (all)", admin, undefined],
      ["admin (active)", admin, { active: true }],
      ["client (booking form)", client, { active: true }],
    ] as const) {
      const r = await actor.api.get("/api/packages", query)
      expect(r.status, who).toBe(200)
      expect((r.json as { eventType: string }[]).every((p) => IN_SCOPE.includes(p.eventType)), `${who}: only in-scope types`).toBe(true)
    }
    const pub = await anon.api.get("/api/public/packages")
    expect((pub.json as { eventType: string }[]).every((p) => IN_SCOPE.includes(p.eventType))).toBe(true)
  })

  test("TC-SCOPE-02 Out-of-scope event types are rejected by the API", async () => {
    for (const eventType of ["CORPORATE", "BIRTHDAY", "OTHER"]) {
      const pkg = await admin.api.post("/api/packages", { name: `e2e scope ${eventType}`, eventType, price: 10_000, inclusions: ["x"] })
      expect(pkg.status, `package ${eventType}`).toBe(422)
    }
  })

  test("TC-SCOPE-03 The booking form offers only Wedding and Debut", async () => {
    await client.page.goto("/portal/bookings/new")
    await expect(client.page.getByRole("button", { name: /wedding/i }).first()).toBeVisible()
    await expect(client.page.getByRole("button", { name: /debut/i }).first()).toBeVisible()
    await expect(client.page.getByRole("button", { name: /corporate|birthday/i })).toHaveCount(0)
  })

  test("TC-SCOPE-04 No Documents entry in any menu", async () => {
    for (const [who, actor, home] of [
      ["admin", admin, "/staff/admin"],
      ["coordinator", coordinator, "/staff/coordinator"],
      ["client", client, "/portal"],
    ] as const) {
      await actor.page.goto(home)
      await expect(actor.page.locator('a[href$="/documents"]'), `${who} menu`).toHaveCount(0)
    }
  })

  test("TC-SCOPE-05 Old Documents URLs redirect to the role's home page", async () => {
    for (const [who, actor, from, to] of [
      ["admin", admin, "/staff/admin/documents", /\/staff\/admin\/?$/],
      ["coordinator", coordinator, "/staff/coordinator/documents", /\/staff\/coordinator\/?$/],
      ["client", client, "/portal/documents", /\/portal\/?$/],
    ] as const) {
      await actor.page.goto(from)
      await expect(actor.page, `${who}: ${from}`).toHaveURL(to)
      await expect(actor.page.getByText(/coming soon/i)).toHaveCount(0)
    }
  })

  test("TC-SCOPE-06 Client home shows no document counter; landing page has no document feature", async () => {
    await client.page.goto("/portal")
    await expect(client.page.getByText(/documents ready/i)).toHaveCount(0)
    await anon.page.goto("/")
    await expect(anon.page.getByText(/document generation/i)).toHaveCount(0)
  })
})
