// test-harness/unit/schemas.unit.test.ts
//
// Every zod schema accepts a realistic, complete happy-path payload — and the business rules encoded in them hold.
import { addUnavailableDaySchema } from "@/features/availability/availability.schema"
import { auditFilterSchema } from "@/features/audit/audit.schema"
import {
  cancelRequestSchema, createBookingSchema, setContractTermsSchema, updateBookingSchema, updateBookingStatusSchema,
} from "@/features/bookings/bookings.schema"
import { createInstallmentScheduleSchema } from "@/features/installments/installments.schema"
import { createPackageSchema, updatePackageSchema } from "@/features/packages/packages.schema"
import { recordManualPaymentSchema, submitPaymentSchema, verifyPaymentSchema } from "@/features/payments/payments.schema"
import { parseReportFilters } from "@/features/reports/reports.schema"
import { createStaffAccountSchema, updateStaffAccountSchema } from "@/features/staff-accounts/staff-accounts.schema"
import { assignStaffSchema, updateStaffAssignmentSchema } from "@/features/staff-assignments/staff-assignments.schema"
import { assignVendorSchema, createVendorSchema, updateBookingVendorSchema, updateVendorSchema } from "@/features/vendors/vendors.schema"
import { describe, expect, it } from "vitest"
import type { ZodType } from "zod"

const nextYear = `${new Date().getFullYear() + 1}-06-15`
const ok = (schema: ZodType, value: unknown) => {
  const r = schema.safeParse(value)
  if (!r.success) throw new Error(JSON.stringify(r.error.issues))
  return r.data as any
}
const firstError = (schema: ZodType, value: unknown) => {
  const r = schema.safeParse(value)
  return r.success ? null : r.error.issues[0].message
}

describe("Happy-path payloads are accepted", () => {
  it.each<[string, ZodType, unknown]>([
    ["createBooking", createBookingSchema, {
      packageId: "pkg1", eventType: "WEDDING", eventDate: nextYear, eventTime: "15:00", venue: "Taal Vista, Tagaytay",
      venueLatitude: 14.1, venueLongitude: 120.9, guestCount: 150, clientPhone: "09171234567", notes: "Blush motif",
      packageCustomizations: ["LED wall"], vendorCategories: ["CATERING", "PHOTOGRAPHY"], isProvincial: true,
    }],
    ["updateBooking", updateBookingSchema, { guestCount: 180, eventDate: nextYear, clientPhone: "+639171234567" }],
    ["confirm", updateBookingStatusSchema, { status: "CONFIRMED" }],
    ["cancel", updateBookingStatusSchema, { status: "CANCELLED", cancellationReason: "Venue closed" }],
    ["contractTerms", setContractTermsSchema, { agreedPrice: 120000, paymentPlan: "INSTALLMENT", depositAmount: 30000.5, depositDueDate: nextYear }],
    ["cancelRequest", cancelRequestSchema, { reason: "We need to move abroad." }],
    ["installments", createInstallmentScheduleSchema, { installments: [{ order: 1, dueDate: nextYear, amount: 45000 }, { order: 2, dueDate: nextYear, amount: 45000.25, note: "final" }] }],
    ["submitPayment (reference)", submitPaymentSchema, { bookingId: "b1", paymentType: "DEPOSIT", method: "GCASH", amount: 25000, referenceNumber: "GC-1" }],
    ["submitPayment (screenshot)", submitPaymentSchema, { bookingId: "b1", paymentType: "INSTALLMENT", installmentId: "i1", method: "MAYA", amount: 19.99, proofStoragePath: "b1/installment/1.jpg" }],
    ["submitPayment (cheque deposit)", submitPaymentSchema, { bookingId: "b1", paymentType: "DEPOSIT", method: "CHEQUE", amount: 10000, referenceNumber: "CHQ-1" }],
    ["manualPayment", recordManualPaymentSchema, { bookingId: "b1", paymentType: "FULL_BALANCE", method: "CASH", amount: 50000, verificationNote: "At the office" }],
    ["verifyPayment", verifyPaymentSchema, { action: "VERIFY", verificationNote: "OK" }],
    ["flagPayment", verifyPaymentSchema, { action: "FLAG" }],
    ["createPackage", createPackageSchema, { name: "Premium Wedding", eventType: "WEDDING", price: 150000, inclusions: ["Coordination"] }],
    ["updatePackage", updatePackageSchema, { description: null, isActive: false }],
    ["createVendor", createVendorSchema, { name: "Feast Co", category: "CATERING", contactEmail: "a@b.co", coverageAreas: ["Cavite"] }],
    ["createVendor (blank email)", createVendorSchema, { name: "Feast Co", category: "CATERING", contactEmail: "" }],
    ["updateVendor", updateVendorSchema, { contactName: null, contactEmail: null }],
    ["assignVendor", assignVendorSchema, { vendorId: "v1", category: "FLORALS", notes: "Centerpieces" }],
    ["updateBookingVendor", updateBookingVendorSchema, { contactedAt: new Date().toISOString(), confirmedAt: null, quotationAmount: 12500.5, quotationNote: null }],
    ["assignStaff", assignStaffSchema, { coordinatorId: "u1", taskRole: "LEAD_COORDINATOR", isBackup: false, notes: "7am call time" }],
    ["updateStaffAssignment", updateStaffAssignmentSchema, { taskRole: "LOGISTICS", isBackup: true }],
    ["createStaffAccount", createStaffAccountSchema, { username: "maria.santos", password: "S3cure-pass", fullName: "Maria Santos", role: "COORDINATOR" }],
    ["updateStaffAccount", updateStaffAccountSchema, { isActive: false }],
    ["unavailableDay", addUnavailableDaySchema, { date: nextYear, reason: "Seminar" }],
    ["auditFilter", auditFilterSchema, { module: "PAYMENT", action: "VERIFY", status: "SUCCESS", page: "2", pageSize: "50" }],
  ])("%s", (_name, schema, payload) => {
    expect(() => ok(schema, payload)).not.toThrow()
  })

  it("money amounts with 2 decimals are accepted without floating-point false alarms", () => {
    for (const amount of [0.07, 1.15, 4.35, 19.99, 10.12, 12500.5, 99999.99]) {
      expect(ok(submitPaymentSchema, { bookingId: "b", paymentType: "DEPOSIT", method: "GCASH", amount, referenceNumber: "r" }).amount).toBe(amount)
    }
  })

  it("report filters: empty strings mean 'All', paging defaults are applied", () => {
    const r = parseReportFilters(new URLSearchParams("from=2026-01-01&to=2026-12-31&bookingStatus=&eventType=DEBUT"))
    expect(r.success && r.data).toMatchObject({ from: "2026-01-01", to: "2026-12-31", eventType: "DEBUT", page: 1 })
    expect(r.success && r.data.bookingStatus).toBeUndefined()
  })
})

describe("Business rules encoded in the schemas", () => {
  it("a booking must be in the future and use a PH mobile number", () => {
    const base = { packageId: "p", eventType: "WEDDING", venue: "x", guestCount: 10, clientPhone: "09171234567" }
    expect(firstError(createBookingSchema, { ...base, eventDate: "2020-01-01" })).toMatch(/future/)
    expect(firstError(createBookingSchema, { ...base, eventDate: nextYear, clientPhone: "12345" })).toMatch(/PH mobile/)
  })
  it("cancelling needs a reason; a cancellation request needs ≥10 characters", () => {
    expect(firstError(updateBookingStatusSchema, { status: "CANCELLED" })).toMatch(/reason is required/)
    expect(firstError(cancelRequestSchema, { reason: "short" })).toMatch(/10 characters/)
  })
  it("a payment needs a proof OR a reference; cheques only for deposits; installments need their id", () => {
    const base = { bookingId: "b", method: "GCASH", amount: 1 }
    expect(firstError(submitPaymentSchema, { ...base, paymentType: "DEPOSIT" })).toMatch(/proof screenshot or a reference/)
    expect(firstError(submitPaymentSchema, { ...base, method: "CHEQUE", paymentType: "FULL_BALANCE", referenceNumber: "r" })).toMatch(/Cheque/)
    expect(firstError(submitPaymentSchema, { ...base, paymentType: "INSTALLMENT", referenceNumber: "r" })).toMatch(/installmentId/)
  })
  it("amounts are positive with at most 2 decimals", () => {
    const base = { bookingId: "b", paymentType: "DEPOSIT", method: "GCASH", referenceNumber: "r" }
    expect(firstError(submitPaymentSchema, { ...base, amount: 0 })).toMatch(/greater than 0/)
    expect(firstError(submitPaymentSchema, { ...base, amount: 1.234 })).toMatch(/2 decimal/)
  })
  it("a report range cannot run backwards", () => {
    const r = parseReportFilters(new URLSearchParams("from=2026-12-31&to=2026-01-01"))
    expect(r.success).toBe(false)
  })
})
