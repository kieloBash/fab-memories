// e2e/specs/01-auth.spec.ts
//
// Module 1 — User Authentication and Access Control (FR-01 to FR-08).
// Manual only (see README §5): TC-FR05-01 lockout, TC-FR06-01 session expiry, TC-FR08-01/02 password change.
import { setupClerkTestingToken } from "@clerk/testing/playwright"
import { expect, test } from "@playwright/test"
import { CREDENTIALS, OPTIONAL } from "../support/env"
import { tag } from "../support/data"
import { openAs, openPublic, signInThroughForm, type Actor } from "../support/session"

test.describe.serial("Module 1 — authentication and access control", () => {
  let admin: Actor, coordinator: Actor, client: Actor

  test.beforeAll(async ({ browser }) => {
    admin = await openAs(browser, "admin")
    coordinator = await openAs(browser, "coordinator")
    client = await openAs(browser, "client")
  })
  test.afterAll(async () => { await Promise.all([admin, coordinator, client].map((a) => a?.close())) })

  test("TC-FR01-01 Admin creates a coordinator account", async () => {
    const username = `e2e_${Date.now().toString(36)}`
    const r = await admin.api.post("/api/staff-accounts", {
      username, password: "E2e-Str0ng-Pass!", fullName: tag("Coordinator"), role: "COORDINATOR",
    })
    expect(r.status, r.text).toBe(201)
    try {
      expect(r.json).toMatchObject({ username, role: "COORDINATOR", isActive: true })
      await admin.page.goto("/staff/admin/users")
      // The page renders the list twice (desktop table + a hidden phone layout) — check the visible copy only.
      const row = admin.page.getByRole("row").filter({ hasText: username }).filter({ visible: true }).first()
      await expect(row).toBeVisible()
      await expect(row).toContainText(/coordinator/i)
    } finally {
      // Always leave nothing active behind, even if a check above failed.
      // Accounts are deactivated, never deleted (their audit-trail entries must stay intact).
      expect((await admin.api.del(`/api/staff-accounts/${r.json.id}`)).status).toBe(200)
    }
  })

  test("TC-FR01-02 Client self-registration (with emailed code)", async ({ page }) => {
    test.skip(!OPTIONAL.signup, "Set E2E_ALLOW_SIGNUP=true (needs Clerk test mode) to run this test.")
    await setupClerkTestingToken({ page })
    const email = `e2e.signup.${Date.now()}+clerk_test@example.com`
    await page.goto("/sign-up")
    await page.locator("#firstName").fill("E2E")
    await page.locator("#lastName").fill("Signup")
    await page.locator("#email").fill(email)
    await page.locator("#password").fill("E2e-Str0ng-Pass!")
    await page.getByRole("button", { name: /create account/i }).click()
    // Clerk test mode: +clerk_test addresses accept the code 424242 and no e-mail is sent.
    await page.locator("#code").fill("424242")
    await page.getByRole("button", { name: /verify and continue/i }).click()
    await expect(page).toHaveURL(/\/portal/, { timeout: 45_000 })
  })

  test("TC-FR01-03 No public sign-up for staff", async ({ page }) => {
    await page.goto("/staff-login")
    await expect(page.getByText(/contact your administrator/i)).toBeVisible()
    await expect(page.getByRole("link", { name: /create an account|sign up/i })).toHaveCount(0)
  })

  test("TC-FR02-01 Login with valid credentials (client form)", async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await setupClerkTestingToken({ page })
    await signInThroughForm(page, CREDENTIALS.client)
    await expect(page).toHaveURL(/\/portal/)
    await ctx.close()
  })

  test("TC-FR02-02 Login with wrong password is refused", async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto("/sign-in")
    await page.locator("#identifier").fill(CREDENTIALS.client.identifier)
    await page.locator("#password").fill("definitely-not-the-password-1!")
    await page.getByRole("button", { name: /^sign in/i }).click()
    await expect(page.locator(".bg-red-50")).toBeVisible()
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test("TC-FR02-03 Protected page without login redirects to sign-in", async ({ browser }) => {
    const anon = await openPublic(browser)
    await anon.page.goto("/staff/admin")
    await expect(anon.page).toHaveURL(/\/staff-login/)
    await anon.page.goto("/portal")
    await expect(anon.page).toHaveURL(/\/sign-in/)
    const r = await anon.api.get("/api/bookings")
    expect(r.status).toBe(401)
    await anon.close()
  })

  // FR-03 (revised): a one-time code verifies the e-mail of every NEW client account (sign-up), and resets a
  // forgotten password. There is no code at ordinary sign-in. These tests use one throwaway +clerk_test account,
  // so they need Clerk test mode (code 424242) and E2E_ALLOW_SIGNUP=true.
  test.describe.serial("FR-03 email verification", () => {
    const email = `e2e.verify.${Date.now()}+clerk_test@example.com`
    const password = "E2e-Str0ng-Pass!"
    let page: import("@playwright/test").Page
    let ctx: import("@playwright/test").BrowserContext

    test.beforeAll(async ({ browser }) => {
      ctx = await browser.newContext()
      page = await ctx.newPage()
      await setupClerkTestingToken({ page })
    })
    test.afterAll(async () => { await ctx?.close() })

    test("TC-FR03-01 Verification code sent at sign-up", async () => {
      test.skip(!OPTIONAL.signup, "Set E2E_ALLOW_SIGNUP=true (needs Clerk test mode) to run this test.")
      await page.goto("/sign-up")
      await page.locator("#firstName").fill("E2E")
      await page.locator("#lastName").fill("Verify")
      await page.locator("#email").fill(email)
      await page.locator("#password").fill(password)
      await page.getByRole("button", { name: /create account/i }).click()
      await expect(page.getByText(new RegExp(`6-digit code to ${email.replace(/[.+]/g, "\\$&")}`, "i"))).toBeVisible()
      await expect(page.locator("#code")).toBeVisible()
    })

    test("TC-FR03-02 Wrong verification code is rejected", async () => {
      test.skip(!OPTIONAL.signup, "Set E2E_ALLOW_SIGNUP=true (needs Clerk test mode) to run this test.")
      await page.locator("#code").fill("000000")
      await page.getByRole("button", { name: /verify and continue/i }).click()
      await expect(page.locator(".text-red-600").first()).toBeVisible()
      await expect(page).toHaveURL(/\/sign-up/)
    })

    test("TC-FR03-03 Correct verification code activates the account", async () => {
      test.skip(!OPTIONAL.signup, "Set E2E_ALLOW_SIGNUP=true (needs Clerk test mode) to run this test.")
      await page.locator("#code").fill("424242")
      await page.getByRole("button", { name: /verify and continue/i }).click()
      await expect(page).toHaveURL(/\/portal/, { timeout: 45_000 })
    })

    test("TC-FR03-04 Password reset requires an emailed code", async () => {
      test.skip(!OPTIONAL.signup, "Set E2E_ALLOW_SIGNUP=true (needs Clerk test mode) to run this test.")
      await page.getByRole("button", { name: /sign out/i }).first().click()
      await expect(page).not.toHaveURL(/\/portal/)
      await page.goto("/forgot-password")
      await page.locator("#email").fill(email)
      await page.getByRole("button", { name: /send reset code/i }).click()
      await page.locator("#code").fill("424242")
      await page.getByRole("button", { name: /verify code/i }).click()
      await page.locator("#new-password").fill("E2e-N3w-Pass-2026!")
      await page.getByRole("button", { name: /reset password/i }).click()
      await expect(page).toHaveURL(/\/portal/, { timeout: 45_000 })
    })
  })

  test("TC-FR04-01 Coordinator blocked from admin pages", async () => {
    await coordinator.page.goto("/staff/admin/audit")
    await expect(coordinator.page).toHaveURL(/\/unauthorized/)
    await coordinator.page.goto("/staff/admin/users")
    await expect(coordinator.page).toHaveURL(/\/unauthorized/)
    expect((await coordinator.api.get("/api/audit")).status).toBe(403)
    expect((await coordinator.api.get("/api/staff-accounts")).status).toBe(403)
  })

  // TC-FR04-02 (client sees only own records) is in 02-bookings.spec.ts, where the bookings exist.

  test("TC-FR04-03 API blocks unauthorized request", async () => {
    await client.page.goto("/staff/admin")
    await expect(client.page).toHaveURL(/\/portal/)
    for (const path of ["/api/staff-accounts", "/api/audit", "/api/vendors", "/api/reports/dashboard"]) {
      const r = await client.api.get(path)
      expect(r.status, `${path} as CLIENT`).toBe(403)
    }
  })

  test("TC-FR07-01 Logout ends the session", async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await setupClerkTestingToken({ page })
    await signInThroughForm(page, CREDENTIALS.client)
    await page.getByRole("button", { name: /sign out/i }).first().click()
    await expect(page).not.toHaveURL(/\/portal/)
    await page.goto("/portal")
    await expect(page).toHaveURL(/\/sign-in/)
    await ctx.close()
  })
})
