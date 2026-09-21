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

const signOutMock = vi.fn(async () => {})
const state: { currentTask: unknown } = { currentTask: null }
const signInMock: any = {
  status: "complete",
  password: vi.fn(async () => ({ error: null })),
  finalize: vi.fn(async ({ navigate }: any) => {
    await navigate({ session: { currentTask: state.currentTask, getToken: async () => "session-token-123" }, decorateUrl: (u: string) => u })
    return { error: null }
  }),
}
vi.mock("@clerk/nextjs", () => ({
  useSignIn: () => ({ signIn: signInMock, errors: null, fetchStatus: "idle" }),
  useClerk: () => ({ signOut: signOutMock }),
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

beforeEach(() => { vi.clearAllMocks(); state.currentTask = null })

describe.each([
  { name: "client sign-in (/sign-in)", portal: "client", submit: submitClient, home: "/portal", staffHint: /staff login/i },
  { name: "staff login (/staff-login)", portal: "staff", submit: submitStaff, home: "/staff/admin", staffHint: /regular sign-in/i },
])("$name", ({ portal, submit, home, staffHint }) => {
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
    expect(routerMock.push).not.toHaveBeenCalled()
  })

  it("FAILS CLOSED: if the check itself errors, nobody is let through", async () => {
    mockApi.post.mockRejectedValue(new AxiosError("Network Error"))
    await submit()
    expect(await screen.findByText(/couldn't verify your account/i)).toBeInTheDocument()
    expect(signOutMock).toHaveBeenCalledTimes(1)
    expect(routerMock.push).not.toHaveBeenCalled()
  })

  it("a deactivated account is turned away with the server's message", async () => {
    mockApi.post.mockRejectedValue(new AxiosError("Forbidden", "403", undefined, undefined, { status: 403, data: { error: "This account has been deactivated. Please contact an administrator.", code: "ACCOUNT_DEACTIVATED" } } as any))
    await submit()
    expect(await screen.findByText(/has been deactivated/i)).toBeInTheDocument()
    expect(routerMock.push).not.toHaveBeenCalled()
  })

  it("a pending Clerk session task is left alone (no check, no navigation) — existing behaviour", async () => {
    state.currentTask = { key: "reset-password" }
    await submit()
    await waitFor(() => expect(signInMock.finalize).toHaveBeenCalled())
    expect(mockApi.post).not.toHaveBeenCalled()
    expect(routerMock.push).not.toHaveBeenCalled()
  })
})
