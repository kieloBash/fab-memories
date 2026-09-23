// test-harness/ui/booking-actions.test.tsx
//
// Happy paths for the booking action dialogs and the contract-terms form: the user completes the action and the
// right request is sent (URL + exact body), with the success toast shown.
import "./module-mocks"
import { ConfirmBookingDialog } from "@/features/bookings/components/confirm-booking-dialog"
import { CancelBookingDialog } from "@/features/bookings/components/cancel-booking-dialog"
import { CancelRequestDialog } from "@/features/bookings/components/cancel-request-dialog"
import { ContractTermsForm } from "@/features/bookings/components/contract-terms-form"
import { WithdrawBookingDialog } from "@/features/bookings/components/withdraw-booking-dialog"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { mockApi, renderWithClient, routeGet, toastMock } from "./utils"

const coverage = (missing: string[], covered: string[] = []) => ({
  "/bookings/b1/vendors": (cfg: any) => (cfg?.params?.coverage === "true" ? { requested: [...missing, ...covered], covered, missing, isFullyCovered: missing.length === 0 } : []),
})

describe("ConfirmBookingDialog", () => {
  it("confirming sends { status: CONFIRMED }, closes, calls onSuccess and toasts", async () => {
    const user = userEvent.setup(); const onSuccess = vi.fn()
    routeGet(coverage([], ["CATERING"]))
    mockApi.patch.mockResolvedValue({ data: { id: "b1", status: "CONFIRMED" } })
    renderWithClient(<ConfirmBookingDialog bookingId="b1" eventDate="2027-02-14T00:00:00.000Z" onSuccess={onSuccess} />)
    await user.click(screen.getByRole("button", { name: /confirm booking/i }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent("February 14, 2027")
    expect(await within(dialog).findByText(/all requested vendor categories have confirmed vendors/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: /yes, confirm booking/i }))
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalledWith("/bookings/b1", { status: "CONFIRMED" }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(toastMock.success).toHaveBeenCalledWith("Booking confirmed")
  })

  it("shows the non-blocking warning for requested vendor categories nobody covers yet", async () => {
    const user = userEvent.setup()
    routeGet(coverage(["PHOTOGRAPHY"]))
    renderWithClient(<ConfirmBookingDialog bookingId="b1" eventDate="2027-02-14T00:00:00.000Z" />)
    await user.click(screen.getByRole("button", { name: /confirm booking/i }))
    const dialog = await screen.findByRole("dialog")
    expect(await within(dialog).findByText(/unconfirmed vendor categories/i)).toBeInTheDocument()
    expect(dialog).toHaveTextContent("Photography")
    expect(within(dialog).getByRole("button", { name: /yes, confirm booking/i })).toBeEnabled()
  })
})

describe("CancelBookingDialog (staff)", () => {
  it("requires a reason, then sends CANCELLED with the trimmed reason", async () => {
    const user = userEvent.setup()
    mockApi.patch.mockResolvedValue({ data: { id: "b1", status: "CANCELLED" } })
    renderWithClient(<CancelBookingDialog bookingId="b1" />)
    await user.click(screen.getByRole("button", { name: /cancel booking/i }))
    const dialog = await screen.findByRole("dialog")
    const submit = within(dialog).getByRole("button", { name: /^cancel booking$/i })
    expect(submit).toBeDisabled()
    await user.type(within(dialog).getByLabelText(/cancellation reason/i), "  Venue closed  ")
    await user.click(submit)
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalledWith("/bookings/b1", { status: "CANCELLED", cancellationReason: "Venue closed" }))
    expect(toastMock.success).toHaveBeenCalledWith("Booking cancelled")
  })
})

describe("CancelRequestDialog (client)", () => {
  it("enables Submit at 10 characters and posts the reason", async () => {
    const user = userEvent.setup()
    mockApi.post.mockResolvedValue({ data: { id: "b1", status: "CANCELLATION_REQUESTED" } })
    renderWithClient(<CancelRequestDialog bookingId="b1" />)
    await user.click(screen.getByRole("button", { name: /request cancellation/i }))
    const dialog = await screen.findByRole("dialog")
    const submit = within(dialog).getByRole("button", { name: /submit request/i })
    await user.type(within(dialog).getByLabelText(/reason for cancellation/i), "Too short")
    expect(submit).toBeDisabled()
    await user.type(within(dialog).getByLabelText(/reason for cancellation/i), "!")
    expect(within(dialog).getByText("10 / 500")).toBeInTheDocument()
    await user.click(submit)
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/bookings/b1/cancel-request", { reason: "Too short!" }))
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringMatching(/cancellation request submitted/i))
  })
})

describe("WithdrawBookingDialog (client)", () => {
  it("asks for confirmation, then DELETEs the pending request", async () => {
    const user = userEvent.setup(); const onSuccess = vi.fn()
    mockApi.delete.mockResolvedValue({ data: { success: true } })
    renderWithClient(<WithdrawBookingDialog bookingId="b1" onSuccess={onSuccess} />)
    await user.click(screen.getByRole("button", { name: /withdraw request/i }))
    const dialog = await screen.findByRole("alertdialog")
    expect(mockApi.delete).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole("button", { name: /yes, withdraw/i }))
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith("/bookings/b1"))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })
})

describe("ContractTermsForm (staff)", () => {
  const booking = {
    id: "b1", agreedPrice: "120000", paymentPlan: null, depositAmount: null, depositDueDate: null, fullPaymentDueDate: null,
    staffNote: null, isProvincial: false, package: { price: "120000", priceProvincial: null },
  } as any

  it("choosing the installment plan + deposit shows the balance and saves exactly those terms", async () => {
    const user = userEvent.setup()
    mockApi.patch.mockResolvedValue({ data: booking })
    renderWithClient(<ContractTermsForm booking={booking} />)
    expect(screen.getByText(/pending discussion/i)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /split into scheduled installments/i }))
    expect(screen.getByRole("button", { name: /split into scheduled installments/i })).toHaveAttribute("aria-pressed", "true")
    await user.type(screen.getByLabelText(/deposit amount/i), "30000")
    fireEvent.change(screen.getByLabelText(/deposit due by/i), { target: { value: "2027-01-10" } })
    expect(screen.getByText(/to schedule as installments/i).parentElement).toHaveTextContent("90,000")
    await user.click(screen.getByRole("button", { name: /save contract terms/i }))
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalledTimes(1))
    expect(mockApi.patch.mock.calls[0][0]).toBe("/bookings/b1/contract-terms")
    expect(mockApi.patch.mock.calls[0][1]).toEqual({ agreedPrice: 120000, paymentPlan: "INSTALLMENT", depositAmount: 30000, depositDueDate: "2027-01-10" })
    expect(toastMock.success).toHaveBeenCalledWith("Contract terms saved")
  })

  it("the FULL plan also sends the balance due date", async () => {
    const user = userEvent.setup()
    mockApi.patch.mockResolvedValue({ data: booking })
    renderWithClient(<ContractTermsForm booking={booking} />)
    await user.click(screen.getByRole("button", { name: /one remaining balance payment/i }))
    await user.type(screen.getByLabelText(/deposit amount/i), "20000")
    fireEvent.change(screen.getByLabelText(/full balance due by/i), { target: { value: "2027-03-01" } })
    await user.click(screen.getByRole("button", { name: /save contract terms/i }))
    await waitFor(() => expect(mockApi.patch.mock.calls[0][1]).toEqual({ agreedPrice: 120000, paymentPlan: "FULL", depositAmount: 20000, fullPaymentDueDate: "2027-03-01" }))
  })
})
