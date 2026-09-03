// prisma/seed.ts
/**
 * Seed file for Fab Memories Events.
 *
 * Fixes applied vs previous version:
 *   - seedVendors() is now awaited inside main() — no more fire-and-forget
 *   - Vendor + BookingVendor cleanup moved to top of main() cleanup block
 *     (before booking cleanup) so FK constraints are satisfied
 *   - vendorCategories added to relevant booking creates (FR-19)
 *   - fullPaymentDueDate on FULL plan bookings
 *   - FULL_BALANCE payment type on Ben's corporate booking
 *   - clientPhone on all bookings
 *   - Overdue deposit scenario (Ben's Birthday — past depositDueDate, no deposit)
 *
 * Bookings:
 *   1. Anna / Debut    CONFIRMED  | provincial ₱74,750 | INSTALLMENT plan
 *   2. Ben  / Corp     CONFIRMED  | metro ₱50,000      | FULL plan (deposit verified, balance SUBMITTED)
 *   3. Anna / Wedding  PENDING    | provincial ₱97,750 | no terms  (for "awaiting terms" test)
 *   4. Ben  / Birthday PENDING    | provincial ₱34,500 | FULL plan | deposit OVERDUE
 *   5. Anna / Wedding  CANCELLED
 */

import {
  BookingStatus,
  EventType,
  InstallmentStatus,
  PaymentMethod,
  PaymentPlan,
  PaymentStatus,
  PaymentType,
  PrismaClient,
  Role,
  VendorCategory,
} from "@/app/generated/prisma/client"
import { createClerkClient } from "@clerk/backend"
import { PrismaPg } from "@prisma/adapter-pg"
import "dotenv/config"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

function futureDate(days: number): Date {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setDate(d.getDate() + days); return d
}
function pastDate(days: number): Date {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setDate(d.getDate() - days); return d
}

async function cleanupClerkUser(email: string, clerkId?: string) {
  if (clerkId) { try { await clerk.users.deleteUser(clerkId) } catch { } }
  try {
    const r = await clerk.users.getUserList({ emailAddress: [email], limit: 1 })
    if (r.data.length) await clerk.users.deleteUser(r.data[0].id)
  } catch { }
}

async function cleanupUser(u: { username: string; email: string }) {
  const existing = await prisma.user.findUnique({ where: { username: u.username } })
  if (existing) {
    await cleanupClerkUser(u.email, existing.clerkId)
    await prisma.user.delete({ where: { id: existing.id } })
  } else {
    await cleanupClerkUser(u.email)
  }
}

async function createUser(u: {
  username: string
  password: string
  fullName: string
  email: string
  role: Role
}): Promise<string> {
  const isStaff = u.role !== Role.CLIENT
  const clerkUser = await clerk.users.createUser({
    username: u.username,
    password: u.password,
    emailAddress: [isStaff ? `seed.${u.username}@example.com` : u.email],
    publicMetadata: { role: u.role },
    skipPasswordChecks: false,
  })
  const db = await prisma.user.create({
    data: {
      clerkId: clerkUser.id,
      username: u.username,
      fullName: u.fullName,
      email: isStaff ? null : u.email,
      role: u.role,
    },
  })
  console.log(`  ✅  ${u.role.padEnd(11)} "${u.username}"`)
  return db.id
}

const USERS = [
  {
    username: process.env.SEED_ADMIN_USERNAME ?? "admin",
    password: process.env.SEED_ADMIN_PASSWORD ?? "FabMemories123!",
    fullName: "System Administrator",
    email: process.env.SEED_ADMIN_EMAIL ?? "admin.fabmemories@example.com",
    role: Role.ADMIN,
  },
  { username: "coordinator", password: "FabMemories123!", fullName: "Maria Santos",    email: "coordinator.fabmemories@example.com", role: Role.COORDINATOR },
  { username: "vendor",      password: "FabMemories123!", fullName: "Juan dela Cruz",  email: "vendor.fabmemories@example.com",      role: Role.VENDOR },
  { username: "client_anna", password: "FabMemories123!", fullName: "Anna Reyes",      email: "anna.fabmemories@example.com",        role: Role.CLIENT },
  { username: "client_ben",  password: "FabMemories123!", fullName: "Ben Torres",      email: "ben.fabmemories@example.com",         role: Role.CLIENT },
]

const PACKAGES = [
  {
    name: "Classic Wedding Package",
    description: "Elegant all-inclusive wedding.",
    eventType: EventType.WEDDING,
    price: 85000, priceProvincial: 97750,
    inclusions: ["8-hour coverage", "Bridal car", "Floral centerpieces (10 tables)", "Wedding cake (3 tiers)", "Sound system & emcee", "Photo & video", "Coordinator"],
  },
  {
    name: "Grand Wedding Package",
    description: "Full-scale premium wedding.",
    eventType: EventType.WEDDING,
    price: 150000, priceProvincial: 172500,
    inclusions: ["12-hour coverage", "Bridal car", "Floral arch & centerpieces (20 tables)", "Premium cake (5 tiers)", "Full band", "Cinematic coverage", "Drone", "Prenup shoot", "2 coordinators"],
  },
  {
    name: "Elegant Debut Package",
    description: "Memorable 18th birthday celebration.",
    eventType: EventType.DEBUT,
    price: 65000, priceProvincial: 74750,
    inclusions: ["8-hour coverage", "18 roses & candles", "Gown styling", "Floral (8 tables)", "Debut cake", "DJ", "Photo & video", "Coordinator"],
  },
  {
    name: "Corporate Events Package",
    description: "Professional corporate event management.",
    eventType: EventType.CORPORATE,
    price: 50000, priceProvincial: 57500,
    inclusions: ["6-hour coverage", "Corporate backdrop", "LED & projector", "Sound system", "Emcee", "Event documentation", "Coordinator"],
  },
  {
    name: "Birthday Celebration Package",
    description: "Fun festive birthday party.",
    eventType: EventType.BIRTHDAY,
    price: 30000, priceProvincial: 34500,
    inclusions: ["5-hour coverage", "Balloon decorations", "Birthday cake (2 tiers)", "Photo booth", "DJ", "Coordinator"],
  },
]

const VENDORS = [
  {
    name: "Bloom & Petal Florals",
    category: VendorCategory.FLORALS,
    contactName: "Maria Cruz",
    contactPhone: "09171111001",
    contactChannel: "Viber",
    coverageAreas: ["Metro Manila", "Tagaytay", "Cavite"],
    notes: "₱12,000–₱18,000 per event. Excellent quality. 2-week booking lead time required.",
  },
  {
    name: "Lens & Frame Photography",
    category: VendorCategory.PHOTOGRAPHY,
    contactName: "Juan Dela Cruz",
    contactPhone: "09281111002",
    contactChannel: "FB Messenger",
    coverageAreas: ["Metro Manila", "Batangas", "Laguna"],
    notes: "₱25,000 full-day. Includes 500 edited photos. Preferred for debuts.",
  },
  {
    name: "CineVision Videography",
    category: VendorCategory.VIDEOGRAPHY,
    contactName: "Ben Santos",
    contactPhone: "09191111003",
    contactChannel: "Viber",
    coverageAreas: ["Metro Manila", "Bulacan"],
    notes: "₱20,000 full-day cinematic. Drone add-on ₱5,000. 3-week delivery.",
  },
  {
    name: "Feria Catering Services",
    category: VendorCategory.CATERING,
    contactName: "Ana Reyes",
    contactPhone: "09151111004",
    contactChannel: "SMS",
    coverageAreas: ["Metro Manila", "Cavite", "Batangas", "Laguna"],
    notes: "₱650/head buffet. Minimum 80 pax. Good for weddings and debuts.",
  },
  {
    name: "Glow Events Decoration",
    category: VendorCategory.DECORATION,
    contactName: "Rose Lim",
    contactPhone: "09221111005",
    contactChannel: "FB Messenger",
    coverageAreas: ["Metro Manila", "Cebu", "Nationwide"],
    notes: "₱15,000–₱35,000 depending on scope. Gold/blush/white themes specialty.",
  },
]

async function main() {
  console.log("\n🌱  Starting seed…")

  if (!process.env.CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY required")
  if (!process.env.DATABASE_URL)     throw new Error("DATABASE_URL required")

  // ── Cleanup (order matters: children before parents) ─────────────
  console.log("\n🧹  Cleaning up…")
  await prisma.bookingVendor.deleteMany()   // must come before vendor + booking
  await prisma.vendor.deleteMany()
  await prisma.installment.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.auditLog.deleteMany()
  console.log("  🗑  Cleared all transactional data")

  // ── Users ─────────────────────────────────────────────────────────
  console.log("\n👤  Seeding users…\n")
  for (const u of USERS) await cleanupUser(u)
  const ids: Record<string, string> = {}
  for (const u of USERS) ids[u.username] = await createUser(u)

  // ── Packages ──────────────────────────────────────────────────────
  console.log("\n📦  Seeding packages…\n")
  await prisma.package.deleteMany()
  const pkgIds: Record<string, string> = {}
  for (const p of PACKAGES) {
    const created = await prisma.package.create({ data: p })
    console.log(`  ✅  ${p.eventType.padEnd(10)} "${p.name}"`)
    if (!pkgIds[p.eventType]) pkgIds[p.eventType] = created.id
  }

  // ── Bookings & payments ───────────────────────────────────────────
  console.log("\n📅  Seeding bookings & payments…\n")

  // ── 1. Anna / Debut — CONFIRMED | INSTALLMENT | provincial ──────
  const D = 74750, DEP = 22425, REM = D - DEP
  const INST1 = Math.round(REM / 3), INST2 = Math.round(REM / 3), INST3 = REM - INST1 - INST2

  const annaDebut = await prisma.booking.create({
    data: {
      clientId:    ids["client_anna"],
      packageId:   pkgIds[EventType.DEBUT],
      eventType:   EventType.DEBUT,
      eventDate:   futureDate(45),
      venue:       "Waterfront Hotel, Lahug, Cebu City",
      venueLatitude:  10.3157,
      venueLongitude: 123.8854,
      venueFormattedAddress: "Waterfront Cebu City Hotel & Casino, 1 Salinas Dr, Lahug, Cebu City",
      guestCount:  200,
      clientPhone: "09171234567",
      isProvincial: true,
      agreedPrice:  D,
      paymentPlan:  PaymentPlan.INSTALLMENT,
      depositAmount: DEP,
      depositDueDate: pastDate(22),
      staffNote:   "Discussed via call — gold & white motif, 3-month installments",
      status:      BookingStatus.CONFIRMED,
      depositVerifiedAt:   pastDate(19),
      depositVerifiedById: ids["coordinator"],
      notes:       "Gold and white color motif.",
      packageCustomizations: ["Extra floral centerpieces", "String quartet"],
      // Client requested these vendor categories
      vendorCategories: [VendorCategory.FLORALS, VendorCategory.PHOTOGRAPHY, VendorCategory.CATERING],
    },
  })
  console.log(`  ✅  CONFIRMED | Anna | Debut +45d | provincial ₱${D.toLocaleString()} | INSTALLMENT`)

  await prisma.payment.create({
    data: {
      bookingId: annaDebut.id, paymentType: PaymentType.DEPOSIT,
      method: PaymentMethod.GCASH, status: PaymentStatus.VERIFIED,
      amount: DEP, referenceNumber: "GC-20250001",
      submittedAt: pastDate(20), verifiedById: ids["coordinator"],
      verifiedAt: pastDate(19), verificationNote: "Deposit confirmed.",
    },
  })

  const i1 = await prisma.installment.create({
    data: { bookingId: annaDebut.id, order: 1, dueDate: pastDate(45), amount: INST1, status: InstallmentStatus.PAID, paidAt: pastDate(10), note: "1st installment" },
  })
  const i2 = await prisma.installment.create({
    data: { bookingId: annaDebut.id, order: 2, dueDate: pastDate(5), amount: INST2, status: InstallmentStatus.UNPAID, note: "2nd installment — overdue" },
  })
  await prisma.installment.create({
    data: { bookingId: annaDebut.id, order: 3, dueDate: futureDate(25), amount: INST3, status: InstallmentStatus.UNPAID, note: "Final installment" },
  })

  await prisma.payment.create({
    data: {
      bookingId: annaDebut.id, paymentType: PaymentType.INSTALLMENT,
      method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.VERIFIED,
      amount: INST1, referenceNumber: "BT-20250010",
      submittedAt: pastDate(11), verifiedById: ids["coordinator"],
      verifiedAt: pastDate(10), verificationNote: "Confirmed.", installmentId: i1.id,
    },
  })
  await prisma.installment.update({ where: { id: i1.id }, data: { status: InstallmentStatus.PAID, paidAt: pastDate(10) } })

  await prisma.payment.create({
    data: {
      bookingId: annaDebut.id, paymentType: PaymentType.INSTALLMENT,
      method: PaymentMethod.GCASH, status: PaymentStatus.SUBMITTED,
      amount: INST2, referenceNumber: "GC-20250055",
      submittedAt: pastDate(1), installmentId: i2.id,
    },
  })
  console.log(`  ✅  + deposit VERIFIED, inst#1 PAID, inst#2 SUBMITTED`)

  // ── 2. Ben / Corporate — CONFIRMED | FULL | metro ───────────────
  const CORP = 50000, CORP_DEP = 15000, CORP_BAL = CORP - CORP_DEP

  const benCorp = await prisma.booking.create({
    data: {
      clientId:    ids["client_ben"],
      packageId:   pkgIds[EventType.CORPORATE],
      eventType:   EventType.CORPORATE,
      eventDate:   futureDate(60),
      venue:       "Radisson Blu Hotel, Cebu City",
      venueLatitude:  10.3236,
      venueLongitude: 123.9014,
      venueFormattedAddress: "Radisson Blu Cebu, Cebu City, Philippines",
      guestCount:  300,
      clientPhone: "09281234567",
      isProvincial: false,
      agreedPrice:  CORP,
      paymentPlan:  PaymentPlan.FULL,
      depositAmount: CORP_DEP,
      depositDueDate: pastDate(10),
      fullPaymentDueDate: futureDate(30),
      staffNote:   "Full payment after deposit. Due 30 days before event.",
      status:      BookingStatus.CONFIRMED,
      depositVerifiedAt:   pastDate(8),
      depositVerifiedById: ids["coordinator"],
      // No vendor categories — tests TC-VM-10 (no coverage check)
      vendorCategories: [],
    },
  })
  console.log(`  ✅  CONFIRMED | Ben  | Corporate +60d | metro ₱${CORP.toLocaleString()} | FULL`)

  await prisma.payment.create({
    data: {
      bookingId: benCorp.id, paymentType: PaymentType.DEPOSIT,
      method: PaymentMethod.MAYA, status: PaymentStatus.VERIFIED,
      amount: CORP_DEP, referenceNumber: "MY-20250007",
      submittedAt: pastDate(10), verifiedById: ids["coordinator"],
      verifiedAt: pastDate(8), verificationNote: "Deposit confirmed.",
    },
  })
  await prisma.payment.create({
    data: {
      bookingId: benCorp.id, paymentType: PaymentType.FULL_BALANCE,
      method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.SUBMITTED,
      amount: CORP_BAL, referenceNumber: "BT-20250099", submittedAt: new Date(),
    },
  })
  console.log(`  ✅  + deposit VERIFIED, full balance (₱${CORP_BAL.toLocaleString()}) SUBMITTED`)

  // ── 3. Anna / Wedding — PENDING | no terms ─────────────────────
  await prisma.booking.create({
    data: {
      clientId:    ids["client_anna"],
      packageId:   pkgIds[EventType.WEDDING],
      eventType:   EventType.WEDDING,
      eventDate:   futureDate(90),
      venue:       "The Ruins, Talisay City, Negros Occidental",
      venueLatitude:  10.7202,
      venueLongitude: 122.9656,
      venueFormattedAddress: "The Ruins, Talisay City, Negros Occidental, Philippines",
      guestCount:  120,
      clientPhone: "09171234567",
      isProvincial: true,
      agreedPrice:  97750,
      status:      BookingStatus.PENDING,
      notes:       "String quartet during the reception.",
      packageCustomizations: ["String quartet", "Garden setup"],
      vendorCategories: [VendorCategory.PHOTOGRAPHY, VendorCategory.CATERING, VendorCategory.FLORALS],
    },
  })
  console.log(`  ✅  PENDING   | Anna | Wedding  +90d  | provincial ₱97,750 | no terms`)

  // ── 4. Ben / Birthday — PENDING | FULL | deposit OVERDUE ────────
  await prisma.booking.create({
    data: {
      clientId:    ids["client_ben"],
      packageId:   pkgIds[EventType.BIRTHDAY],
      eventType:   EventType.BIRTHDAY,
      eventDate:   futureDate(14),
      venue:       "Balay ni Atong, Cebu City",
      guestCount:  60,
      clientPhone: "09281234567",
      isProvincial: true,
      agreedPrice:  34500,
      paymentPlan:  PaymentPlan.FULL,
      depositAmount: 10350,         // 30%
      depositDueDate: pastDate(3),  // OVERDUE — 3 days ago
      fullPaymentDueDate: futureDate(7),
      staffNote:   "Deposit was due 3 days ago. Need to follow up.",
      status:      BookingStatus.PENDING,
      notes:       "Dinosaur theme for the kids.",
      vendorCategories: [VendorCategory.DECORATION, VendorCategory.ENTERTAINMENT],
    },
  })
  console.log(`  ✅  PENDING   | Ben  | Birthday +14d  | provincial ₱34,500 | FULL | deposit OVERDUE`)

  // ── 5. Anna / Wedding — CANCELLED ───────────────────────────────
  await prisma.booking.create({
    data: {
      clientId:    ids["client_anna"],
      packageId:   pkgIds[EventType.WEDDING],
      eventType:   EventType.WEDDING,
      eventDate:   pastDate(10),
      venue:       "Plantation Bay Resort, Mactan, Lapu-Lapu City",
      guestCount:  80,
      clientPhone: "09171234567",
      isProvincial: true,
      agreedPrice:  97750,
      status:      BookingStatus.CANCELLED,
      cancellationReason: "Client requested cancellation due to venue conflict.",
      vendorCategories: [],
    },
  })
  console.log(`  ✅  CANCELLED | Anna | Wedding -10d`)

  // ── Vendors ───────────────────────────────────────────────────────
  console.log("\n🏪  Seeding vendors…\n")

  const vendorIds: string[] = []
  for (const v of VENDORS) {
    const created = await prisma.vendor.create({ data: v })
    vendorIds.push(created.id)
    console.log(`  ✅  ${v.category.padEnd(15)} "${v.name}"`)
  }

  const [floralsId, photoId, , cateringId, decorId] = vendorIds

  // Assign vendors to Anna's Debut booking (confirmed)
  await prisma.bookingVendor.createMany({
    data: [
      {
        bookingId:   annaDebut.id,
        vendorId:    floralsId,
        category:    VendorCategory.FLORALS,
        notes:       "Gold & white floral setup. ₱15,000 agreed.",
        contactedAt: new Date(),
        confirmedAt: new Date(),
      },
      {
        bookingId:   annaDebut.id,
        vendorId:    photoId,
        category:    VendorCategory.PHOTOGRAPHY,
        notes:       "Full-day package. ₱25,000 agreed.",
        contactedAt: new Date(),
        confirmedAt: new Date(),
      },
      {
        bookingId:   annaDebut.id,
        vendorId:    cateringId,
        category:    VendorCategory.CATERING,
        notes:       "200 pax buffet. ₱130,000 agreed.",
        contactedAt: new Date(),
        confirmedAt: null, // contacted but not yet confirmed
      },
    ],
  })
  console.log(`\n  ✅  3 vendors assigned to Anna's Debut (2 confirmed, 1 contacted/pending)`)

  // Assign vendors to Ben's Corporate booking
  await prisma.bookingVendor.create({
    data: {
      bookingId:   benCorp.id,
      vendorId:    decorId,
      category:    VendorCategory.DECORATION,
      notes:       "Corporate backdrop setup. ₱20,000 agreed.",
      contactedAt: new Date(),
      confirmedAt: new Date(),
    },
  })
  console.log(`  ✅  1 vendor assigned to Ben's Corporate`)

  // ── Summary ───────────────────────────────────────────────────────
  console.log("\n✨  Seed complete!\n")
  console.log("  Staff logins (/staff-login):")
  console.log("    admin / coordinator / vendor  →  FabMemories123!")
  console.log("\n  Client logins (/sign-in by email):")
  console.log("    anna.fabmemories@example.com  →  FabMemories123!")
  console.log("    ben.fabmemories@example.com   →  FabMemories123!\n")
  console.log("  Scenarios:")
  console.log("    Anna Debut   : CONFIRMED | INSTALLMENT | inst#2 overdue + SUBMITTED | 3 vendors (Florals ✓, Photo ✓, Catering pending)")
  console.log("    Ben  Corp    : CONFIRMED | FULL        | balance SUBMITTED (to verify) | 1 vendor (Decoration ✓)")
  console.log("    Anna Wedding : PENDING   | no terms    | 3 vendor categories requested")
  console.log("    Ben  Birthday: PENDING   | FULL        | deposit OVERDUE | 2 vendor categories requested")
  console.log("    Anna Wedding : CANCELLED\n")
  console.log("  Vendor directory: 5 vendors seeded (Florals, Photography, Videography, Catering, Decoration)")
}

main()
  .catch((e) => { console.error("❌  Seed failed:", e); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
