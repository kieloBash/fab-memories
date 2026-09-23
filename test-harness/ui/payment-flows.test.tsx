// test-harness/ui/payment-flows.test.tsx
//
// Happy paths for paying (client) and reviewing payments (staff), and for building an installment schedule (admin).
import "./module-mocks"
import { InstallmentScheduleForm } from "@/features/installments/components/installment-schedule-form"
import { PaymentProofUpload } from "@/features/payments/components/payment-proof-upload"
import { PaymentVerificationForm } from "@/features/payments/components/payment-verification-form"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { mockApi, renderWithClient, routeGet, toastMock } from "./utils"

// Supabase Storage is not reachable from tests: the upload returns a storage path, like the real helper does.
vi.mock("@/lib/storage", () => ({
  validatePaymentProofFile: () => ({ valid: true }),
  uploadPaymentProof: vi.fn(async (_f: File, bookingId: string, kind: string) => `${bookingId}/${kind}/proof.png`),
}))

describe("PaymentProofUpload (client)", () => {
  it("deposit by reference number → POST /payments with the method, amount and reference", async () => {
    const user = userEvent.setup(); const onSuccess = vi.fn()
    mockApi.post.mockResolvedValue({ data: { id: "p1", bookingId: "b1", paymentType: "DEPOSIT" } })
    renderWithClient(<PaymentProofUpload bookingId="b1" paymentType="DEPOSIT" defaultAmount={25000} onSuccess={onSuccess} />)
    await user.type(screen.getByPlaceholderText("e.g. 1234567890"), " GC-778899 ")
    await user.click(screen.getByRole("button", { name: /submit payment/i }))
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/payments", {
      bookingId: "b1", paymentType: "DEPOSIT", method: "GCASH", amount: 25000, referenceNumber: "GC-778899", proofStoragePath: undefined,
    }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(toastMock.success).toHaveBeenCalledWith("Deposit proof submitted successfully")
  })

  it("installment by screenshot → the file is uploaded first and its storage path is submitted (amount is fixed)", async () => {
    const user = userEvent.setup()
    mockApi.post.mockResolvedValue({ data: { id: "p2", bookingId: "b1", paymentType: "INSTALLMENT" } })
    renderWithClient(<PaymentProofUpload bookingId="b1" paymentType="INSTALLMENT" installmentId="i1" defaultAmount={45000} />)
    expect(screen.getByPlaceholderText("0.00")).toHaveAttribute("readonly")
    await user.click(screen.getByRole("tab", { name: /screenshot/i }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, new File(["png"], "receipt.png", { type: "image/png" }))
    expect(await screen.findByText("receipt.png")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /upload & submit/i }))
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/payments", {
      bookingId: "b1", paymentType: "INSTALLMENT", method: "GCASH", amount: 45000, installmentId: "i1", proofStoragePath: "b1/installment/proof.png",
    }))
  })
})

describe("PaymentVerificationForm (staff)", () => {
  it("Verify sends VERIFY with the note; the deposit toast says the booking is confirmed", async () => {
    const user = userEvent.setup()
    mockApi.patch.mockResolvedValue({ data: { id: "p1", bookingId: "b1", paymentType: "DEPOSIT" } })
    renderWithClient(<PaymentVerificationForm paymentId="p1" paymentType="DEPOSIT" />)
    expect(screen.getByText(/will confirm the booking/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText(/note/i), "Matched GCash ref")
    await user.click(screen.getByRole("button", { name: /^verify$/i }))
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalledWith("/payments/p1/verify", { action: "VERIFY", verificationNote: "Matched GCash ref" }))
    expect(toastMock.success).toHaveBeenCalledWith("Deposit verified — booking is now confirmed")
  })

  it("Flag sends FLAG (no note → no verificationNote)", async () => {
    const user = userEvent.setup()
    mockApi.patch.mockResolvedValue({ data: { id: "p1", bookingId: "b1", paymentType: "INSTALLMENT" } })
    renderWithClient(<PaymentVerificationForm paymentId="p1" paymentType="INSTALLMENT" />)
    await user.click(screen.getByRole("button", { name: /flag for resubmission/i }))
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalledWith("/payments/p1/verify", { action: "FLAG", verificationNote: undefined }))
    expect(toastMock.success).toHaveBeenCalledWith("Payment flagged for resubmission")
  })
})

describe("InstallmentScheduleForm (admin)", () => {
  const today = new Date().toISOString().split("T")[0]

  it("starts balanced with one row for the whole remaining balance and saves it", async () => {
    const user = userEvent.setup()
    routeGet({ "/bookings/b1/installments": [] })
    mockApi.post.mockResolvedValue({ data: { count: 1 } })
    renderWithClient(<InstallmentScheduleForm bookingId="b1" packagePrice={100000} depositPaid={25000} />)
    expect(await screen.findByText("✓ Balanced")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /save installment schedule/i }))
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith("/bookings/b1/installments", {
      installments: [{ order: 1, dueDate: today, amount: 75000 }],
    }))
    expect(toastMock.success).toHaveBeenCalledWith("Schedule saved — 1 installment added")
  })

  it("add a row + equal split → two balanced rows with their own due dates", async () => {
    const user = userEvent.setup()
    routeGet({ "/bookings/b1/installments": [] })
    mockApi.post.mockResolvedValue({ data: { count: 2 } })
    renderWithClient(<InstallmentScheduleForm bookingId="b1" packagePrice={100000} depositPaid={25000} />)
    await screen.findByText("✓ Balanced")
    await user.click(screen.getByRole("button", { name: /add installment/i }))
    // the new row is empty: still "balanced" (₱0 added) but Save stays disabled until every row has an amount
    expect(screen.getByRole("button", { name: /save installment schedule/i })).toBeDisabled()
    await user.click(screen.getByRole("button", { name: /equal split/i }))
    expect(screen.getByText("✓ Balanced")).toBeInTheDocument()
    const dates = document.querySelectorAll('input[type="date"]')
    fireEvent.change(dates[0], { target: { value: "2027-01-15" } })
    fireEvent.change(dates[1], { target: { value: "2027-02-15" } })
    await user.click(screen.getByRole("button", { name: /save installment schedule/i }))
    await waitFor(() => expect(mockApi.post.mock.calls[0][1]).toEqual({
      installments: [{ order: 1, dueDate: "2027-01-15", amount: 37500 }, { order: 2, dueDate: "2027-02-15", amount: 37500 }],
    }))
  })

  it("already-paid installments are locked and numbering continues after them", async () => {
    routeGet({ "/bookings/b1/installments": [{ id: "i1", order: 1, dueDate: "2026-10-01", amount: "25000", status: "PAID", payments: [] }] })
    renderWithClient(<InstallmentScheduleForm bookingId="b1" packagePrice={100000} depositPaid={25000} />)
    expect(await screen.findByText(/paid installments \(locked\)/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument()) // next row is #2
    expect(screen.getByText("✓ Balanced")).toBeInTheDocument()            // 100k − 25k deposit − 25k paid = 50k row
  })
})
