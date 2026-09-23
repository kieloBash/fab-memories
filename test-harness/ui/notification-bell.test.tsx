// test-harness/ui/notification-bell.test.tsx
import "./module-mocks"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import NotificationBell from "@/features/layouts/components/NotificationBell"
import { mockApi, renderWithClient, routeGet, routerMock } from "./utils"

const unread = { id: "n1", type: "PAYMENT_SUBMITTED", title: "New payment submitted", body: "A client submitted deposit proof.", link: "/staff/admin/payments/p1", isRead: false, createdAt: new Date().toISOString() }
const read = { id: "n2", type: "BOOKING_CANCELLED", title: "Old one", body: "Already seen", link: null, isRead: true, createdAt: new Date().toISOString() }

describe("NotificationBell", () => {
  it("shows the unread count as a badge", async () => {
    routeGet({ "/notifications": { items: [unread, read], unreadCount: 1 } })
    renderWithClient(<NotificationBell />)
    expect(await screen.findByText("1")).toBeInTheDocument()
  })

  it("no badge when everything is read", async () => {
    routeGet({ "/notifications": { items: [read], unreadCount: 0 } })
    renderWithClient(<NotificationBell />)
    await screen.findByRole("button", { name: /notifications/i })
    expect(screen.queryByText("0")).not.toBeInTheDocument()
  })

  it("opens the dropdown and lists notifications", async () => {
    const user = userEvent.setup()
    routeGet({ "/notifications": { items: [unread, read], unreadCount: 1 } })
    renderWithClient(<NotificationBell />)
    await user.click(await screen.findByRole("button", { name: /1 unread/i }))
    expect(await screen.findByText("New payment submitted")).toBeInTheDocument()
    expect(screen.getByText("Old one")).toBeInTheDocument()
  })

  it("clicking an unread notification marks it read and navigates to its link", async () => {
    const user = userEvent.setup()
    routeGet({ "/notifications": { items: [unread], unreadCount: 1 } })
    mockApi.patch.mockResolvedValue({ data: { ok: true } })
    renderWithClient(<NotificationBell />)
    await user.click(await screen.findByRole("button", { name: /1 unread/i }))
    await user.click(await screen.findByText("New payment submitted"))
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalledWith("/notifications/n1", { isRead: true }))
    expect(routerMock.push).toHaveBeenCalledWith("/staff/admin/payments/p1")
  })

  it("clicking an already-read notification does not re-mark it, but still navigates if it has a link", async () => {
    const user = userEvent.setup()
    routeGet({ "/notifications": { items: [{ ...read, link: "/somewhere" }], unreadCount: 0 } })
    renderWithClient(<NotificationBell />)
    await user.click(screen.getByRole("button", { name: /notifications/i }))
    await user.click(await screen.findByText("Old one"))
    expect(mockApi.patch).not.toHaveBeenCalled()
    expect(routerMock.push).toHaveBeenCalledWith("/somewhere")
  })

  it("Mark all read only appears when there is something unread, and calls the endpoint", async () => {
    const user = userEvent.setup()
    routeGet({ "/notifications": { items: [unread], unreadCount: 1 } })
    mockApi.post.mockResolvedValue({ data: { ok: true } })
    renderWithClient(<NotificationBell />)
    await user.click(await screen.findByRole("button", { name: /1 unread/i }))
    await user.click(await screen.findByRole("button", { name: /mark all read/i }))
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/notifications/mark-all-read"))
  })

  it("no notifications shows a clear empty state", async () => {
    const user = userEvent.setup()
    routeGet({ "/notifications": { items: [], unreadCount: 0 } })
    renderWithClient(<NotificationBell />)
    await user.click(screen.getByRole("button", { name: /notifications/i }))
    expect(await screen.findByText("No notifications yet.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /mark all read/i })).not.toBeInTheDocument()
  })
})
