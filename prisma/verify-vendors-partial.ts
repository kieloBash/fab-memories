// prisma/verify-vendors-partial.ts
/**
 * A PATCH is a PARTIAL update — a field not sent must be left unchanged. Both updateVendorRecord() and
 * updateBookingVendorRecord() used to overwrite every field, so any single-field edit silently erased
 * everything else. This proves the fix, field by field, through the real query functions.
 *
 *   npx tsx prisma/verify-vendors-partial.ts
 */
import "dotenv/config"
import { updateBookingVendorRecord, updateVendorRecord } from "@/features/vendors/vendors.query"
import { prisma } from "@/lib/prisma"

const TAG = "[test:vendors-partial]"
let pass = 0; const fails: string[] = []
const check = (n: string, ok: boolean, d?: unknown) => { if (ok) { pass++; console.log(`  ✅  ${n}`) } else { fails.push(n); console.log(`  ❌  ${n}${d !== undefined ? `\n        → ${JSON.stringify(d)}` : ""}`) } }
const section = (t: string) => console.log(`\n── ${t}`)

async function cleanup() {
  await prisma.bookingVendor.deleteMany({ where: { booking: { staffNote: TAG } } })
  await prisma.booking.deleteMany({ where: { staffNote: TAG } })
  await prisma.vendor.deleteMany({ where: { name: { startsWith: TAG } } })
}

async function main() {
  await cleanup()

  section("Vendor directory — updateVendorRecord()")
  const full = await prisma.vendor.create({ data: {
    name: `${TAG} Full Bloom Florist`, category: "FLORALS", contactName: "Rosa Cruz", contactPhone: "09171234567",
    contactEmail: "rosa@fullbloom.test", contactChannel: "Viber", coverageAreas: ["Cavite", "Laguna"], notes: "Prefers Fridays.",
  } })

  const afterNameOnly = await updateVendorRecord(full.id, { name: `${TAG} Full Bloom Florist Co.` })
  check("updating ONLY the name leaves every other field untouched", afterNameOnly.name === `${TAG} Full Bloom Florist Co.`
    && afterNameOnly.contactName === "Rosa Cruz" && afterNameOnly.contactPhone === "09171234567" && afterNameOnly.contactEmail === "rosa@fullbloom.test"
    && afterNameOnly.contactChannel === "Viber" && JSON.stringify(afterNameOnly.coverageAreas) === JSON.stringify(["Cavite", "Laguna"]) && afterNameOnly.notes === "Prefers Fridays.", afterNameOnly)

  const afterPhoneOnly = await updateVendorRecord(full.id, { contactPhone: "09179999999" })
  check("updating ONLY the phone leaves name, email, channel, coverage and notes untouched",
    afterPhoneOnly.contactPhone === "09179999999" && afterPhoneOnly.name === `${TAG} Full Bloom Florist Co.` && afterPhoneOnly.contactEmail === "rosa@fullbloom.test"
    && afterPhoneOnly.contactChannel === "Viber" && afterPhoneOnly.notes === "Prefers Fridays.", afterPhoneOnly)

  const afterCategoryOnly = await updateVendorRecord(full.id, { category: "DECORATION" })
  check("updating ONLY the category leaves the coverage areas untouched", afterCategoryOnly.category === "DECORATION" && JSON.stringify(afterCategoryOnly.coverageAreas) === JSON.stringify(["Cavite", "Laguna"]), afterCategoryOnly)

  const cleared = await updateVendorRecord(full.id, { contactEmail: null, notes: "" })
  check("null explicitly CLEARS contactEmail", cleared.contactEmail === null, cleared.contactEmail)
  check('"" explicitly CLEARS notes (treated the same as null)', cleared.notes === null, cleared.notes)
  check("…but contactPhone and contactChannel (not sent) are still untouched", cleared.contactPhone === "09179999999" && cleared.contactChannel === "Viber", cleared)

  const clearedArray = await updateVendorRecord(full.id, { coverageAreas: [] })
  check("sending an EMPTY ARRAY clears coverage areas", JSON.stringify(clearedArray.coverageAreas) === "[]", clearedArray.coverageAreas)
  const untouchedArray = await updateVendorRecord(full.id, { contactPhone: "09170000001" })
  check("…while OMITTING coverageAreas afterwards leaves it empty, not repopulated", JSON.stringify(untouchedArray.coverageAreas) === "[]", untouchedArray.coverageAreas)

  const noop = await updateVendorRecord(full.id, {})
  check("an update with NO fields changes nothing", noop.name === afterCategoryOnly.name && noop.contactPhone === "09170000001" && noop.category === "DECORATION")

  section("Booking-vendor assignment — updateBookingVendorRecord()")
  const [client, pkg] = await Promise.all([prisma.user.findFirst({ where: { role: "CLIENT" } }), prisma.package.findFirst()])
  if (!client || !pkg) throw new Error("Run the base seed first.")
  const booking = await prisma.booking.create({ data: {
    clientId: client.id, packageId: pkg.id, eventType: "OTHER", eventDate: new Date(Date.UTC(2045, 0, 1)), venue: "test",
    guestCount: 10, clientPhone: "0", agreedPrice: 10000, paymentPlan: "FULL", depositAmount: 3000, staffNote: TAG,
  } })
  const vendor2 = await prisma.vendor.create({ data: { name: `${TAG} Sound Guys`, category: "SOUNDS_LIGHTING" } })
  await prisma.bookingVendor.create({ data: {
    bookingId: booking.id, vendorId: vendor2.id, category: "SOUNDS_LIGHTING", notes: "Bring backup mic",
    contactedAt: new Date("2026-01-01"), confirmedAt: new Date("2026-01-05"), quotationAmount: 15000, quotationNote: "Package B",
  } })

  const afterQuoteOnly = await updateBookingVendorRecord(booking.id, vendor2.id, { quotationAmount: 18000 })
  check("recording ONLY a new quotation amount leaves notes, contactedAt and confirmedAt untouched (the original bug)",
    Number(afterQuoteOnly.quotationAmount) === 18000 && afterQuoteOnly.notes === "Bring backup mic"
    && afterQuoteOnly.contactedAt?.toISOString().slice(0, 10) === "2026-01-01" && afterQuoteOnly.confirmedAt?.toISOString().slice(0, 10) === "2026-01-05", afterQuoteOnly)

  const afterNoteOnly = await updateBookingVendorRecord(booking.id, vendor2.id, { notes: "Confirmed via Viber" })
  check("updating ONLY the note leaves the quotation and dates untouched", afterNoteOnly.notes === "Confirmed via Viber" && Number(afterNoteOnly.quotationAmount) === 18000 && afterNoteOnly.confirmedAt !== null, afterNoteOnly)

  const unmarked = await updateBookingVendorRecord(booking.id, vendor2.id, { confirmedAt: null })
  check("null explicitly un-marks confirmedAt", unmarked.confirmedAt === null)
  check("…while contactedAt and the quotation (not sent) survive", unmarked.contactedAt !== null && Number(unmarked.quotationAmount) === 18000, unmarked)

  const clearedQuote = await updateBookingVendorRecord(booking.id, vendor2.id, { quotationAmount: null, quotationNote: null })
  check("null clears BOTH quotation fields", clearedQuote.quotationAmount === null && clearedQuote.quotationNote === null)
  check("…while the note (not sent) is untouched", clearedQuote.notes === "Confirmed via Viber", clearedQuote.notes)

  await cleanup()
  console.log(`\n${"═".repeat(60)}\n  ${pass} passed, ${fails.length} failed`)
  if (fails.length) { fails.forEach((f) => console.log("   •", f)); process.exit(1) }
}
main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1) }).finally(() => prisma.$disconnect())
