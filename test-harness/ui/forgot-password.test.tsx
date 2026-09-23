// test-harness/ui/forgot-password.test.tsx
//
// The password-reset flow (reported bug: "reset worked, but signing in with the new password returned Unauthorized
// and bounced to /"). The page used to finish by going straight to /portal WITHOUT the server-side portal check, so a
// broken account looked fine until the next sign-in. It now finishes exactly like the login pages.
//
// Clerk's useSignIn() is mocked as a small store: the page re-renders when signIn.status changes, like the real hook.
import "./module-mocks"
import ForgotPasswordPage from "@/app/(pages)/(public)/forgot-password/page"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AxiosError } from "axios"
import { useEffect, useReducer } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { mockApi, routerMock } from "./utils"

const listeners = new Set<() => void>()
const store = { status: "needs_identifier" as string, currentTask: null as unknown }
const setStatus = (s: string) => { store.status = s; listeners.forEach((l) => l()) }

const signOutMock = vi.fn(async (_opts?: { redirectUrl: string }) => {})
const signInMock: any = {
  get status() { return store.status },
  create: vi.fn(async () => ({ error: null })),
  resetPasswordEmailCode: {
    sendCode: vi.fn(async () => ({ error: null })),
    verifyCode: vi.fn(async () => { setStatus("needs_new_password"); return { error: null } }),
    submitPassword: vi.fn(async () => { setStatus("complete"); return { error: null } }),
  },
  finalize: vi.fn(async ({ navigate }: any) => {
    await navigate({ session: { currentTask: store.currentTask, getToken: async () => "fresh-token" }, decorateUrl: (u: string) => u })
    return { error: null }
  }),
}
vi.mock("@clerk/nextjs", () => ({
  useSignIn: () => {
    const [, force] = useReducer((x: number) => x + 1, 0)
    useEffect(() => { listeners.add(force); return () => { listeners.delete(force) } }, [])
    return { signIn: signInMock, errors: null, fetchStatus: "idle" }
  },
  useClerk: () => ({ signOut: signOutMock }),
}))

beforeEach(() => {
  store.status = "needs_identifier"; store.currentTask = null
  window.history.replaceState(null, "", "/forgot-password")
})

async function resetPassword(identifier = "anna@example.com") {
  const user = userEvent.setup()
  render(<ForgotPasswordPage />)
  await user.type(screen.getByLabelText(/email address/i), identifier)
  await user.click(screen.getByRole("button", { name: /send reset code/i }))
  await user.type(await screen.findByLabelText(/verification code/i), "123456")
  await user.click(screen.getByRole("button", { name: /verify code/i }))
  await user.type(await screen.findByLabelText(/new password/i), "N3w-password!")
  await user.click(screen.getByRole("button", { name: /reset password/i }))
  return user
}

describe("Forgot password — client (default)", () => {
  it("runs Clerk's three steps with the right values", async () => {
    mockApi.post.mockResolvedValue({ data: { ok: true, destination: "/portal" } })
    await resetPassword()
    expect(signInMock.create).toHaveBeenCalledWith({ identifier: "anna@example.com" })
    expect(signInMock.resetPasswordEmailCode.verifyCode).toHaveBeenCalledWith({ code: "123456" })
    expect(signInMock.resetPasswordEmailCode.submitPassword).toHaveBeenCalledWith({ password: "N3w-password!", signOutOfOtherSessions: true })
  })

  it("FIX: finishes with the SAME server check as /sign-in (fresh token), then goes where the server says", async () => {
    mockApi.post.mockResolvedValue({ data: { ok: true, destination: "/portal" } })
    await resetPassword()
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/auth/portal-check", { portal: "client" }, { headers: { Authorization: "Bearer fresh-token" } }))
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/portal"))
    expect(await screen.findByText("Password reset")).toBeInTheDocument()
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it("FIX: a refused account is explained and signed out back to /sign-in — never dropped into /portal or bounced to /", async () => {
    mockApi.post.mockRejectedValue(new AxiosError("Forbidden", "403", undefined, undefined, { status: 403, data: { error: "x", code: "ACCOUNT_NOT_FOUND" } } as any))
    await resetPassword()
    expect(await screen.findByText(/couldn't find your account details/i)).toBeInTheDocument()
    expect(signOutMock).toHaveBeenCalledWith({ redirectUrl: "/sign-in?error=ACCOUNT_NOT_FOUND" })
    expect(routerMock.push).not.toHaveBeenCalled()
    expect(screen.queryByText("Password reset")).not.toBeInTheDocument()
  })

  it("a deactivated account cannot get a session through a reset", async () => {
    mockApi.post.mockRejectedValue(new AxiosError("Forbidden", "403", undefined, undefined, { status: 403, data: { error: "x", code: "ACCOUNT_DEACTIVATED" } } as any))
    await resetPassword()
    expect(await screen.findByText(/has been deactivated/i)).toBeInTheDocument()
    expect(signOutMock).toHaveBeenCalledWith({ redirectUrl: "/sign-in?error=ACCOUNT_DEACTIVATED" })
  })

  it("'Back to sign in' goes to the client sign-in", () => {
    render(<ForgotPasswordPage />)
    expect(screen.getByRole("link", { name: /back to sign in/i })).toHaveAttribute("href", "/sign-in")
  })
})

describe("Forgot password — staff (?portal=staff, linked from /staff-login)", () => {
  beforeEach(() => { window.history.replaceState(null, "", "/forgot-password?portal=staff") })

  it("checks the STAFF portal and lands on the staff dashboard the server names", async () => {
    mockApi.post.mockResolvedValue({ data: { ok: true, destination: "/staff/admin" } })
    await resetPassword("admin.fabmemories@example.com")
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/auth/portal-check", { portal: "staff" }, expect.anything()))
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/staff/admin"))
  })

  it("a refusal returns to /staff-login (not the client page)", async () => {
    mockApi.post.mockRejectedValue(new AxiosError("Forbidden", "403", undefined, undefined, { status: 403, data: { error: "x", code: "WRONG_PORTAL" } } as any))
    await resetPassword("someone@example.com")
    await waitFor(() => expect(signOutMock).toHaveBeenCalledWith({ redirectUrl: "/staff-login?error=WRONG_PORTAL" }))
    expect(screen.getByText(/client accounts sign in at the regular sign-in/i)).toBeInTheDocument()
  })

  it("'Back to sign in' goes to the staff login", async () => {
    render(<ForgotPasswordPage />)
    await waitFor(() => expect(screen.getByRole("link", { name: /back to sign in/i })).toHaveAttribute("href", "/staff-login"))
  })
})

describe("the staff login links to the staff reset flow", () => {
  it("/staff-login → 'Forgot password?' → /forgot-password?portal=staff", async () => {
    const { default: StaffLoginPage } = await import("@/app/(pages)/(public)/staff-login/[[...sign-in]]/page")
    await act(async () => { render(<StaffLoginPage />) })
    expect(screen.getByRole("link", { name: /forgot password/i })).toHaveAttribute("href", "/forgot-password?portal=staff")
  })
})
