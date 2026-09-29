// e2e/support/session.ts
//
// "Actors": a signed-in browser page for one role, plus an `api` helper that calls the app's
// own /api routes FROM INSIDE that page. Calling from inside the page means the request carries
// the real Clerk session exactly like the app's own screens do (Clerk session tokens last about
// a minute, so each call first asks Clerk for a fresh one).
import { setupClerkTestingToken } from "@clerk/testing/playwright"
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test"
import { HOME, LOGIN_PAGE, storageStatePath, type Role } from "./env"

export interface ApiResponse<T = any> {
  status: number
  json: T
  text: string
  contentType: string | null
  disposition: string | null
}

export interface Api {
  get<T = any>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>>
  post<T = any>(path: string, body?: unknown, headers?: Record<string, string>): Promise<ApiResponse<T>>
  patch<T = any>(path: string, body?: unknown): Promise<ApiResponse<T>>
  del<T = any>(path: string): Promise<ApiResponse<T>>
}

export interface Actor {
  role: Role | "public"
  context: BrowserContext
  page: Page
  api: Api
  close(): Promise<void>
}

function withQuery(path: string, query?: Record<string, string | number | boolean | undefined>) {
  if (!query) return path
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) if (v !== undefined) q.set(k, String(v))
  const s = q.toString()
  return s ? `${path}${path.includes("?") ? "&" : "?"}${s}` : path
}

export function makeApi(page: Page): Api {
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
    page.evaluate(
      async ({ method, path, body, headers }) => {
        const clerk = (window as any).Clerk
        const token = clerk?.session ? await clerk.session.getToken() : null
        const res = await fetch(path, {
          method,
          headers: {
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        })
        const text = await res.text()
        let json: unknown = null
        try { json = JSON.parse(text) } catch { /* not JSON (e.g. CSV) */ }
        return {
          status: res.status,
          json,
          text,
          contentType: res.headers.get("content-type"),
          disposition: res.headers.get("content-disposition"),
        }
      },
      { method, path, body, headers },
    ) as Promise<ApiResponse>
  return {
    get: (path, query) => call("GET", withQuery(path, query)),
    post: (path, body, headers) => call("POST", path, body ?? {}, headers),
    patch: (path, body) => call("PATCH", path, body ?? {}),
    del: (path) => call("DELETE", path),
  }
}

/** Waits until Clerk has loaded in the page (needed before api calls). */
export async function waitForClerk(page: Page) {
  await page.waitForFunction(() => (window as any).Clerk?.loaded === true, null, { timeout: 30_000 })
}

/** A browser signed in as `role`, opened on that role's home page. */
export async function openAs(browser: Browser, role: Role): Promise<Actor> {
  const context = await browser.newContext({ storageState: storageStatePath(role) })
  const page = await context.newPage()
  await setupClerkTestingToken({ page })
  await page.goto(HOME[role])
  await waitForClerk(page)
  return { role, context, page, api: makeApi(page), close: () => context.close() }
}

/** A signed-out browser (used for public pages and the vendor brief). */
export async function openPublic(browser: Browser): Promise<Actor> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await setupClerkTestingToken({ page })
  await page.goto("/")
  await waitForClerk(page).catch(() => { /* public pages still work without Clerk */ })
  return { role: "public", context, page, api: makeApi(page), close: () => context.close() }
}

/** Fills and submits the real login form of the right portal. */
export async function signInThroughForm(page: Page, cred: { identifier: string; password: string; portal: "staff" | "client" }) {
  await page.goto(LOGIN_PAGE[cred.portal])
  const idField = cred.portal === "staff" ? page.locator("#username") : page.locator("#identifier")
  await idField.fill(cred.identifier)
  await page.locator("#password").fill(cred.password)
  await page.getByRole("button", { name: /^sign in/i }).click()
  // Success leaves the login page; a refusal keeps it and shows a red message.
  await expect(page).not.toHaveURL(new RegExp(`${LOGIN_PAGE[cred.portal]}(\\?|$)`), { timeout: 45_000 })
}
