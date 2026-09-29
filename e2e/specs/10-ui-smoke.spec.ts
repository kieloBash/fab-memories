// e2e/specs/10-ui-smoke.spec.ts
//
// Opens every main page of each role and checks it renders without an error page.
// Runs on desktop AND on a phone-sized screen (project "mobile-chrome") → evidence for NFR-11 / NFR-22.
import { expect, test } from "@playwright/test"
import type { Role } from "../support/env"
import { openAs, openPublic } from "../support/session"

const pages: Record<Role | "public", string[]> = {
  public: ["/", "/packages", "/sign-in", "/sign-up", "/staff-login", "/support", "/privacy", "/terms"],
  admin: ["/staff/admin", "/staff/admin/bookings", "/staff/admin/payments", "/staff/admin/packages", "/staff/admin/vendors", "/staff/admin/staff", "/staff/admin/audit", "/staff/admin/reports", "/staff/admin/users"],
  coordinator: ["/staff/coordinator", "/staff/coordinator/bookings", "/staff/coordinator/payments", "/staff/coordinator/calendar", "/staff/coordinator/staff", "/staff/coordinator/availability", "/staff/coordinator/reports"],
  coordinator2: [],
  client: ["/portal", "/portal/bookings", "/portal/bookings/new", "/portal/payments", "/portal/account"],
  client2: [],
}

for (const [who, paths] of Object.entries(pages)) {
  if (!paths.length) continue
  test(`NFR-SMOKE ${who} pages render`, async ({ browser }) => {
    const actor = who === "public" ? await openPublic(browser) : await openAs(browser, who as Role)
    const errors: string[] = []
    actor.page.on("pageerror", (e) => errors.push(e.message))
    for (const p of paths) {
      const res = await actor.page.goto(p)
      expect.soft(res?.status() ?? 0, `${p} HTTP status`).toBeLessThan(400)
      await expect.soft(actor.page.getByText(/application error|page not found|could not be found/i), `${p} error text`).toHaveCount(0)
    }
    expect(errors, "uncaught browser errors").toEqual([])
    await actor.close()
  })
}
