// test-harness/ui/login-portal.test.tsx
//
// The two login pages: right after Clerk says "signed in", they ask the server whether this account belongs on THIS page.
import "./module-mocks"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AxiosError } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"
import SignInPage from "@/app/(pages)/(public)/sign-in/[[...sign-in]]/page"
import StaffLoginPage from "@/app/(pages)/(public)/staff-login/[[...sign-in]]/page"
import { mockApi, routerMock } from "./utils"

const signOutMock = vi.fn(async (_opts?: { redirectUrl: string }) => {})
const state: { currentTask: unknown } = { currentTask: null }
const signInMock: any = {
  status: "complete",
  password: vi.fn(async () => ({ error: null })),
  finalize: vi.fn(async ({ navigate }: any) => {
    await navigate({ session: { currentTask: state.currentTask, getToken: async () => "session-token-123" }, decorateUrl: (u: string) => u })
    return { error: null }
  }),
}
const authState = { isLoaded: true, isSignedIn: false }
vi.mock("@clerk/nextjs", () => ({
  useSignIn: () => ({ signIn: signInMock, errors: null, fetchStatus: "idle" }),
  useClerk: () => ({ signOut: signOutMock }),
  useAuth: () => authState,
}))

const wrong = (error: string, portal: string) =>
  new AxiosError("Forbidden", "403", undefined, undefined, { status: 403, data: { error, code: "WRONG_PORTAL", portal } } as any)

async function submitClient() {
  const user = userEvent.setup(); render(<SignInPage />)
  await user.type(screen.getByLabelText(/email address\/username/i), "someone"); await user.type(screen.getByLabelText(/^password/i), "pw-12345")
  await user.click(screen.getByRole("button", { name: /sign in/i }))
}
async function submitStaff() {
  const user = userEvent.setup(); render(<StaffLoginPage />)
  await user.type(screen.getByLabelText(/^username/i), "admin"); await user.type(screen.getByLabelText(/^password/i), "pw-12345")
  await user.click(screen.getByRole("button", { name: /sign in/i }))
}

beforeEach(() => { vi.clearAllMocks(); state.currentTask = null; authState.isSignedIn = false; window.history.replaceState(null, "", "/") })

describe.each([
  { name: "client sign-in (/sign-in)", portal: "client", submit: submitClient, home: "/portal", staffHint: /staff login/i, page: "/sign-in", Page: SignInPage },
  { name: "staff login (/staff-login)", portal: "staff", submit: submitStaff, home: "/staff/admin", staffHint: /regular sign-in/i, page: "/staff-login", Page: StaffLoginPage },
])("$name", ({ portal, submit, home, staffHint, page, Page }) => {
  it("asks the server about THIS portal, with the fresh session token", async () => {
    mockApi.post.mockResolvedValue({ data: { ok: true, destination: home } })
    await submit()
    await waitFor(() => expect(mockApi.post).toHaveBeenCalled())
    expect(mockApi.post).toHaveBeenCalledWith("/auth/portal-check", { portal }, { headers: { Authorization: "Bearer session-token-123" } })
  })

  it("right account → goes to the dashboard the server names, stays signed in", async () => {
    mockApi.post.mockResolvedValue({ data: { ok: true, destination: home } })
    await submit()
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith(home))
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it("WRONG account → shows the server's message, signs the browser out, does NOT navigate", async () => {
    const message = portal === "client" ? "This is the client sign-in. Staff accounts sign in at the staff login (/staff-login)." : "This is the staff sign-in. Client accounts sign in at the regular sign-in (/sign-in)."
    mockApi.post.mockRejectedValue(wrong(message, portal === "client" ? "staff" : "client"))
    await submit()
    expect(await screen.findByText(staffHint)).toBeInTheDocument()
    expect(signOutMock).toHaveBeenCalledTimes(1)
    // back to THIS login page with the reason — not Clerk's default "/" (the reported bounce)
    expect(signOutMock).toHaveBeenCalledWith({ redirectUrl: `${page}?error=WRONG_PORTAL` })
    expect(routerMock.push).not.toHaveBeenCalled()
  })

  it("FAILS CLOSED: if the check itself errors, nobody is let through", async () => {
    mockApi.post.mockRejectedValue(new AxiosError("Network Error"))
    await submit()
    expect(await screen.findByText(/couldn't verify your account/i)).toBeInTheDocument()
    expect(signOutMock).toHaveBeenCalledWith({ redirectUrl: `${page}?error=CHECK_FAILED` })
    expect(routerMock.push).not.toHaveBeenCalled()
  })

  it("401 NO_SESSION (the server could not see the session) → explained, back to this page, not to /", async () => {
    mockApi.post.mockRejectedValue(new AxiosError("Unauthorized", "401", undefined, undefined, { status: 401, data: { error: "Unauthorized", code: "NO_SESSION" } } as any))
    await submit()
    expect(await screen.findByText(/sign-in didn't finish/i)).toBeInTheDocument()
    expect(signOutMock).toHaveBeenCalledWith({ redirectUrl: `${page}?error=NO_SESSION` })
  })

  it("403 ACCOUNT_NOT_FOUND (row missing and could not be linked) → explained, back to this page", async () => {
    mockApi.post.mockRejectedValue(new AxiosError("Forbidden", "403", undefined, undefined, { status: 403, data: { error: "x", code: "ACCOUNT_NOT_FOUND" } } as any))
    await submit()
    expect(await screen.findByText(/couldn't find your account details/i)).toBeInTheDocument()
    expect(signOutMock).toHaveBeenCalledWith({ redirectUrl: `${page}?error=ACCOUNT_NOT_FOUND` })
  })

  it("after the sign-out redirect, ?error=<code> is explained on the page and removed from the address bar", async () => {
    window.history.pushState(null, "", `${page}?error=ACCOUNT_DEACTIVATED`)
    render(<Page />)
    expect(await screen.findByText(/has been deactivated/i)).toBeInTheDocument()
    expect(window.location.search).toBe("")
  })

  it("an unknown ?error value never shows its own text (no injection through the link)", async () => {
    window.history.pushState(null, "", `${page}?error=${encodeURIComponent("Call 0917 now for a refund")}`)
    render(<Page />)
    expect(await screen.findByText(/couldn't verify your account/i)).toBeInTheDocument()
    expect(screen.queryByText(/refund/i)).not.toBeInTheDocument()
  })

  it("a deactivated account is turned away with the server's message", async () => {
    mockApi.post.mockRejectedValue(new AxiosError("Forbidden", "403", undefined, undefined, { status: 403, data: { error: "This account has been deactivated. Please contact an administrator.", code: "ACCOUNT_DEACTIVATED" } } as any))
    await submit()
    expect(await screen.findByText(/has been deactivated/i)).toBeInTheDocument()
    expect(routerMock.push).not.toHaveBeenCalled()
  })

  it("a pending 'reset-password' session task → explained (use Forgot password), signed out, no check, no navigation", async () => {
    state.currentTask = { key: "reset-password" }
    await submit()
    expect(await screen.findByText(/set a new password first/i)).toBeInTheDocument()
    expect(signOutMock).toHaveBeenCalledWith({ redirectUrl: `${page}?error=RESET_PASSWORD_REQUIRED` })
    expect(mockApi.post).not.toHaveBeenCalled()
    expect(routerMock.push).not.toHaveBeenCalled()
  })
  it("?error=SESSION_EXPIRED while STILL signed in → ends the session on the server, then signs out back to this page", async () => {
    authState.isSignedIn = true
    mockApi.post.mockResolvedValue({ data: { ok: true, revoked: true } })
    window.history.pushState(null, "", `${page}?error=SESSION_EXPIRED`)
    render(<Page />)
    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument()
    await waitFor(() => expect(signOutMock).toHaveBeenCalledWith({ redirectUrl: `${page}?error=SESSION_EXPIRED` }))
    expect(mockApi.post).toHaveBeenCalledWith("/auth/session-expired")
    expect(window.location.search).toBe("")
  })

  it("?error=SESSION_EXPIRED after the sign-out (signed out) → message only, no second sign-out (no loop)", async () => {
    window.history.pushState(null, "", `${page}?error=SESSION_EXPIRED`)
    render(<Page />)
    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument()
    expect(signOutMock).not.toHaveBeenCalled()
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  it("the server call failing does not stop the browser sign-out", async () => {
    authState.isSignedIn = true
    mockApi.post.mockRejectedValue(new AxiosError("Network Error"))
    window.history.pushState(null, "", `${page}?error=SESSION_EXPIRED`)
    render(<Page />)
    await waitFor(() => expect(signOutMock).toHaveBeenCalledWith({ redirectUrl: `${page}?error=SESSION_EXPIRED` }))
  })
})
