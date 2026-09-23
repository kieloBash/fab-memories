// test-harness/unit/helpers.unit.test.ts
//
// Small pure helpers the features rely on: RBAC routing, staffing ratios (FR-37), Metro Manila detection,
// report dates (Manila time) and CSV export (formula-injection safe, Excel-friendly).
import { detectIsMetroManila } from "@/features/bookings/bookings.constants"
import { buildCsv } from "@/features/reports/reports.export"
import { addDays, dateOnly, dayDiff, manilaDayEndUtc, manilaDayStartUtc, manilaYmd, toMonthKey, toYmd } from "@/features/reports/reports.dates"
import { humanize, peso } from "@/features/reports/reports.format"
import { getStaffingRecommendation } from "@/features/staff-assignments/staff-assignments.constants"
import { arrayToCsv } from "@/lib/csv-export"
import { canAccess, getDefaultRedirect } from "@/lib/rbac"
import { describe, expect, it } from "vitest"

describe("RBAC", () => {
  it.each([
    ["/staff/admin/bookings", "ADMIN", true], ["/staff/admin", "COORDINATOR", false],
    ["/staff/coordinator/calendar", "COORDINATOR", true], ["/staff/coordinator", "ADMIN", true],
    ["/staff/vendor", "VENDOR", true], ["/staff/vendor", "COORDINATOR", false],
    ["/portal/bookings", "CLIENT", true], ["/portal", "ADMIN", false], ["/staff", "CLIENT", false],
    ["/packages", "CLIENT", true],
  ] as const)("%s as %s → %s", (p, role, expected) => expect(canAccess(p, role)).toBe(expected))

  it("signed-out users are never let into gated pages", () => expect(canAccess("/portal", null)).toBe(false))

  it("each role lands on its own dashboard", () => {
    expect(["ADMIN", "COORDINATOR", "VENDOR", "CLIENT"].map((r) => getDefaultRedirect(r as any)))
      .toEqual(["/staff/admin", "/staff/coordinator", "/staff/vendor", "/portal"])
  })
})

describe("Staffing recommendation (FR-37)", () => {
  it.each([[1, 4, 5], [50, 4, 5], [51, 7, 8], [150, 7, 8], [151, 8, 12], [800, 8, 12]])("%i guests → %i–%i coordinators", (g, min, max) => {
    expect(getStaffingRecommendation(g)).toMatchObject({ guestCount: g, min, max })
  })
})

describe("Metro Manila detection", () => {
  it.each([["SMX Convention Center, Pasay City", true], ["Makati Shangri-La", true], ["Las Pinas", true], ["Taal Vista, Tagaytay", false], ["Waterfront Hotel, Cebu", false]])(
    "%s → %s", (venue, expected) => expect(detectIsMetroManila(venue)).toBe(expected),
  )
})

describe("Report dates (Asia/Manila)", () => {
  it("11pm UTC is already the next day in Manila", () => expect(manilaYmd(new Date("2026-09-22T23:00:00Z"))).toBe("2026-09-23"))
  it("a Manila day spans 16:00Z the day before → 15:59:59.999Z", () => {
    expect(manilaDayStartUtc("2026-09-23").toISOString()).toBe("2026-09-22T16:00:00.000Z")
    expect(manilaDayEndUtc("2026-09-23").toISOString()).toBe("2026-09-23T15:59:59.999Z")
  })
  it("date-only arithmetic", () => {
    const d = dateOnly("2026-12-30")
    expect(toYmd(addDays(d, 3))).toBe("2027-01-02")
    expect(dayDiff(d, dateOnly("2027-01-09"))).toBe(10)
    expect(toMonthKey(d)).toBe("2026-12")
  })
})

describe("Formatting", () => {
  it("peso amounts", () => { expect(peso(1234567.5)).toBe("₱1,234,567.5"); expect(peso(0)).toBe("₱0") })
  it("humanize enum values", () => expect(humanize("CANCELLATION_REQUESTED").toLowerCase()).toBe("cancellation requested"))
})

describe("CSV export", () => {
  const cols = [{ key: "name", label: "Client" }, { key: "venue", label: "Venue" }, { key: "amount", label: "Amount (PHP)" }]
  it("escapes commas, quotes and newlines", () => {
    expect(arrayToCsv([{ name: 'Ana "Jo" Cruz', venue: "Hall A, Makati", amount: 5 }], cols))
      .toBe('Client,Venue,Amount (PHP)\n"Ana ""Jo"" Cruz","Hall A, Makati",5')
  })
  it("report CSVs start with a UTF-8 BOM (so Excel shows ₱) and end with a newline", () => {
    const csv = buildCsv([{ name: "Ana", venue: "x", amount: 1 }], cols)
    expect(csv.startsWith("\uFEFF")).toBe(true)
    expect(csv.endsWith("\n")).toBe(true)
  })
  it("neutralises spreadsheet formulas in user-typed cells", () => {
    const csv = buildCsv([{ name: "=HYPERLINK(\"http://evil\")", venue: "+SUM(A1)", amount: -5 }], cols)
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`)
    expect(csv).toContain("'+SUM(A1)")
    expect(csv).toContain(",-5") // numbers are not text — left alone
  })
  it("an empty report still has its header row", () => expect(buildCsv([], cols)).toBe("\uFEFFClient,Venue,Amount (PHP)\n"))
})
