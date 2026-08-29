// prisma/seed.ts
/**
 * Updated seed — includes:
 *   - fullPaymentDueDate on FULL plan bookings
 *   - FULL_BALANCE payment type on Ben's corporate booking
 *   - clientPhone on all bookings
 *   - Overdue deposit scenario (Anna's Wedding — past depositDueDate, no deposit)
 *
 * Bookings:
 *   1. Anna / Debut    CONFIRMED  | provincial ₱74,750 | INSTALLMENT plan
 *   2. Ben  / Corp     CONFIRMED  | metro ₱50,000      | FULL plan (deposit verified, balance SUBMITTED)
 *   3. Anna / Wedding  PENDING    | provincial ₱97,750 | no terms  (for "awaiting terms" test)
 *   4. Ben  / Birthday PENDING    | provincial ₱34,500 | FULL plan | deposit OVERDUE
 *   5. Anna / Wedding  CANCELLED
 */

import {
  PrismaClient,
  Role, EventType,
  BookingStatus, PaymentMethod, PaymentType, PaymentStatus,
  InstallmentStatus, PaymentPlan,
} from "@/app/generated/prisma/client"
import { createClerkClient } from "@clerk/backend"
import { PrismaPg } from "@prisma/adapter-pg"
import "dotenv/config"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma  = new PrismaClient({ adapter })
const clerk   = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

function futureDate(days: number): Date {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setDate(d.getDate() + days); return d
}
function pastDate(days: number): Date {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setDate(d.getDate() - days); return d
}

async function cleanupClerkUser(email: string, clerkId?: string) {
  if (clerkId) { try { await clerk.users.deleteUser(clerkId) } catch {} }
  try {
    const r = await clerk.users.getUserList({ emailAddress: [email], limit: 1 })
    if (r.data.length) await clerk.users.deleteUser(r.data[0].id)
  } catch {}
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

async function createUser(u: { username: string; password: string; fullName: string; email: string; role: Role }): Promise<string> {
  const isStaff = u.role !== Role.CLIENT
  const clerkUser = await clerk.users.createUser({
    username: u.username, password: u.password,
    emailAddress: [isStaff ? `seed.${u.username}@example.com` : u.email],
    publicMetadata: { role: u.role }, skipPasswordChecks: false,
  })
  const db = await prisma.user.create({
    data: { clerkId: clerkUser.id, username: u.username, fullName: u.fullName, email: isStaff ? null : u.email, role: u.role },
  })
  console.log(`  ✅  ${u.role.padEnd(11)} "${u.username}"`)
  return db.id
}

const USERS = [
  { username: process.env.SEED_ADMIN_USERNAME ?? "admin", password: process.env.SEED_ADMIN_PASSWORD ?? "FabMemories123!", fullName: "System Administrator", email: process.env.SEED_ADMIN_EMAIL ?? "admin.fabmemories@example.com", role: Role.ADMIN },
  { username: "coordinator", password: "FabMemories123!", fullName: "Maria Santos",   email: "coordinator.fabmemories@example.com", role: Role.COORDINATOR },
  { username: "vendor",      password: "FabMemories123!", fullName: "Juan dela Cruz", email: "vendor.fabmemories@example.com",      role: Role.VENDOR },
  { username: "client_anna", password: "FabMemories123!", fullName: "Anna Reyes",     email: "anna.fabmemories@example.com",        role: Role.CLIENT },
  { username: "client_ben",  password: "FabMemories123!", fullName: "Ben Torres",     email: "ben.fabmemories@example.com",         role: Role.CLIENT },
]

const PACKAGES = [
  { name: "Classic Wedding Package",      description: "Elegant all-inclusive wedding.",             eventType: EventType.WEDDING,   price: 85000,  priceProvincial: 97750,  inclusions: ["8-hour coverage","Bridal car","Floral centerpieces (10 tables)","Wedding cake (3 tiers)","Sound system & emcee","Photo & video","Coordinator"] },
  { name: "Grand Wedding Package",         description: "Full-scale premium wedding.",               eventType: EventType.WEDDING,   price: 150000, priceProvincial: 172500, inclusions: ["12-hour coverage","Bridal car","Floral arch & centerpieces (20 tables)","Premium cake (5 tiers)","Full band","Cinematic coverage","Drone","Prenup shoot","2 coordinators"] },
  { name: "Elegant Debut Package",         description: "Memorable 18th birthday celebration.",      eventType: EventType.DEBUT,     price: 65000,  priceProvincial: 74750,  inclusions: ["8-hour coverage","18 roses & candles","Gown styling","Floral (8 tables)","Debut cake","DJ","Photo & video","Coordinator"] },
  { name: "Corporate Events Package",      description: "Professional corporate event management.", eventType: EventType.CORPORATE, price: 50000,  priceProvincial: 57500,  inclusions: ["6-hour coverage","Corporate backdrop","LED & projector","Sound system","Emcee","Event documentation","Coordinator"] },
  { name: "Birthday Celebration Package",  description: "Fun festive birthday party.",              eventType: EventType.BIRTHDAY,  price: 30000,  priceProvincial: 34500,  inclusions: ["5-hour coverage","Balloon decorations","Birthday cake (2 tiers)","Photo booth","DJ","Coordinator"] },
]

async function main() {
  console.log("\n🌱  Starting seed…")

  if (!process.env.CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY required")
  if (!process.env.DATABASE_URL)     throw new Error("DATABASE_URL required")

  console.log("\n🧹  Cleaning up…")
  await prisma.installment.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.auditLog.deleteMany()

  console.log("\n👤  Seeding users…\n")
  for (const u of USERS) await cleanupUser(u)
  const ids: Record<string, string> = {}
  for (const u of USERS) ids[u.username] = await createUser(u)

  console.log("\n📦  Seeding packages…\n")
  await prisma.package.deleteMany()
  const pkgIds: Record<string, string> = {}
  for (const p of PACKAGES) {
    const created = await prisma.package.create({ data: p })
    console.log(`  ✅  ${p.eventType.padEnd(10)} "${p.name}"`)
    if (!pkgIds[p.eventType]) pkgIds[p.eventType] = created.id
  }

  console.log("\n📅  Seeding bookings & payments…\n")
  await prisma.installment.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.booking.deleteMany()

  // ── 1. Anna / Debut — CONFIRMED | INSTALLMENT | provincial ──
  const D = 74750, DEP = 22425, REM = D - DEP
  const INST1 = Math.round(REM / 3), INST2 = Math.round(REM / 3), INST3 = REM - INST1 - INST2

  const annaDebut = await prisma.booking.create({ data: {
    clientId: ids["client_anna"], packageId: pkgIds[EventType.DEBUT],
    eventType: EventType.DEBUT, eventDate: futureDate(45),
    venue: "Waterfront Hotel, Lahug, Cebu City",
    venueLatitude: 10.3157, venueLongitude: 123.8854,
    venueFormattedAddress: "Waterfront Cebu City Hotel & Casino, 1 Salinas Dr, Lahug, Cebu City",
    guestCount: 200, clientPhone: "09171234567",
    isProvincial: true, agreedPrice: D,
    paymentPlan: PaymentPlan.INSTALLMENT, depositAmount: DEP,
    depositDueDate: pastDate(22),
    staffNote: "Discussed via call — gold & white motif, 3-month installments",
    status: BookingStatus.CONFIRMED,
    depositVerifiedAt: pastDate(19), depositVerifiedById: ids["coordinator"],
    notes: "Gold and white color motif.",
    packageCustomizations: ["Extra floral centerpieces", "String quartet"],
  }})
  console.log(`  ✅  CONFIRMED | Anna | Debut +45d | provincial ₱${D.toLocaleString()} | INSTALLMENT`)

  const ad = await prisma.payment.create({ data: { bookingId: annaDebut.id, paymentType: PaymentType.DEPOSIT, method: PaymentMethod.GCASH, status: PaymentStatus.VERIFIED, amount: DEP, referenceNumber: "GC-20250001", submittedAt: pastDate(20), verifiedById: ids["coordinator"], verifiedAt: pastDate(19), verificationNote: "Deposit confirmed." } })
  const i1 = await prisma.installment.create({ data: { bookingId: annaDebut.id, order: 1, dueDate: pastDate(45), amount: INST1, status: InstallmentStatus.PAID, paidAt: pastDate(10), note: "1st installment" } })
  const i2 = await prisma.installment.create({ data: { bookingId: annaDebut.id, order: 2, dueDate: pastDate(5), amount: INST2, status: InstallmentStatus.UNPAID, note: "2nd installment — overdue" } })
  await prisma.installment.create({ data: { bookingId: annaDebut.id, order: 3, dueDate: futureDate(25), amount: INST3, status: InstallmentStatus.UNPAID, note: "Final installment" } })
  await prisma.payment.create({ data: { bookingId: annaDebut.id, paymentType: PaymentType.INSTALLMENT, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.VERIFIED, amount: INST1, referenceNumber: "BT-20250010", submittedAt: pastDate(11), verifiedById: ids["coordinator"], verifiedAt: pastDate(10), verificationNote: "Confirmed.", installmentId: i1.id } })
  await prisma.installment.update({ where: { id: i1.id }, data: { status: InstallmentStatus.PAID, paidAt: pastDate(10) } })
  await prisma.payment.create({ data: { bookingId: annaDebut.id, paymentType: PaymentType.INSTALLMENT, method: PaymentMethod.GCASH, status: PaymentStatus.SUBMITTED, amount: INST2, referenceNumber: "GC-20250055", submittedAt: pastDate(1), installmentId: i2.id } })
  console.log(`  ✅  + deposit VERIFIED, inst#1 PAID, inst#2 SUBMITTED`)

  // ── 2. Ben / Corporate — CONFIRMED | FULL | metro ── deposit verified + balance SUBMITTED ──
  const CORP = 50000, CORP_DEP = 15000, CORP_BAL = CORP - CORP_DEP

  const benCorp = await prisma.booking.create({ data: {
    clientId: ids["client_ben"], packageId: pkgIds[EventType.CORPORATE],
    eventType: EventType.CORPORATE, eventDate: futureDate(60),
    venue: "Radisson Blu Hotel, Cebu City",
    venueLatitude: 10.3236, venueLongitude: 123.9014,
    venueFormattedAddress: "Radisson Blu Cebu, Cebu City, Philippines",
    guestCount: 300, clientPhone: "09281234567",
    isProvincial: false, agreedPrice: CORP,
    paymentPlan: PaymentPlan.FULL, depositAmount: CORP_DEP,
    depositDueDate: pastDate(10),
    fullPaymentDueDate: futureDate(30),
    staffNote: "Full payment after deposit. Due 30 days before event.",
    status: BookingStatus.CONFIRMED,
    depositVerifiedAt: pastDate(8), depositVerifiedById: ids["coordinator"],
  }})
  console.log(`  ✅  CONFIRMED | Ben  | Corporate +60d | metro ₱${CORP.toLocaleString()} | FULL`)
  await prisma.payment.create({ data: { bookingId: benCorp.id, paymentType: PaymentType.DEPOSIT, method: PaymentMethod.MAYA, status: PaymentStatus.VERIFIED, amount: CORP_DEP, referenceNumber: "MY-20250007", submittedAt: pastDate(10), verifiedById: ids["coordinator"], verifiedAt: pastDate(8), verificationNote: "Deposit confirmed." } })
  // Client submitted full balance
  await prisma.payment.create({ data: { bookingId: benCorp.id, paymentType: PaymentType.FULL_BALANCE, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.SUBMITTED, amount: CORP_BAL, referenceNumber: "BT-20250099", submittedAt: new Date() } })
  console.log(`  ✅  + deposit VERIFIED, full balance (₱${CORP_BAL.toLocaleString()}) SUBMITTED`)

  // ── 3. Anna / Wedding — PENDING | no terms ──
  await prisma.booking.create({ data: {
    clientId: ids["client_anna"], packageId: pkgIds[EventType.WEDDING],
    eventType: EventType.WEDDING, eventDate: futureDate(90),
    venue: "The Ruins, Talisay City, Negros Occidental",
    venueLatitude: 10.7202, venueLongitude: 122.9656,
    venueFormattedAddress: "The Ruins, Talisay City, Negros Occidental, Philippines",
    guestCount: 120, clientPhone: "09171234567",
    isProvincial: true, agreedPrice: 97750,
    status: BookingStatus.PENDING,
    notes: "String quartet during the reception.",
    packageCustomizations: ["String quartet", "Garden setup"],
  }})
  console.log(`  ✅  PENDING   | Anna | Wedding  +90d  | provincial ₱97,750 | no terms`)

  // ── 4. Ben / Birthday — PENDING | FULL | deposit OVERDUE ──
  await prisma.booking.create({ data: {
    clientId: ids["client_ben"], packageId: pkgIds[EventType.BIRTHDAY],
    eventType: EventType.BIRTHDAY, eventDate: futureDate(14),
    venue: "Balay ni Atong, Cebu City",
    guestCount: 60, clientPhone: "09281234567",
    isProvincial: true, agreedPrice: 34500,
    paymentPlan: PaymentPlan.FULL,
    depositAmount: 10350,           // 30%
    depositDueDate: pastDate(3),    // OVERDUE — 3 days ago
    fullPaymentDueDate: futureDate(7),
    staffNote: "Deposit was due 3 days ago. Need to follow up.",
    status: BookingStatus.PENDING,
    notes: "Dinosaur theme for the kids.",
  }})
  console.log(`  ✅  PENDING   | Ben  | Birthday +14d  | provincial ₱34,500 | FULL | deposit OVERDUE`)

  // ── 5. Anna / Wedding — CANCELLED ──
  await prisma.booking.create({ data: {
    clientId: ids["client_anna"], packageId: pkgIds[EventType.WEDDING],
    eventType: EventType.WEDDING, eventDate: pastDate(10),
    venue: "Plantation Bay Resort, Mactan, Lapu-Lapu City",
    guestCount: 80, clientPhone: "09171234567",
    isProvincial: true, agreedPrice: 97750,
    status: BookingStatus.CANCELLED,
    cancellationReason: "Client requested cancellation due to venue conflict.",
  }})
  console.log(`  ✅  CANCELLED | Anna | Wedding -10d`)

  console.log("\n✨  Seed complete!\n")
  console.log("  Staff logins (/staff-login):")
  console.log("    admin / coordinator / vendor  →  FabMemories123!")
  console.log("\n  Client logins (/sign-in by email):")
  console.log("    anna.fabmemories@example.com  →  FabMemories123!")
  console.log("    ben.fabmemories@example.com   →  FabMemories123!\n")
  console.log("  Scenarios:")
  console.log("    Anna Debut  : CONFIRMED | INSTALLMENT | inst#2 overdue + SUBMITTED")
  console.log("    Ben  Corp   : CONFIRMED | FULL        | balance SUBMITTED (to verify)")
  console.log("    Anna Wedding: PENDING   | no terms    | awaiting admin contact")
  console.log("    Ben  Birthday: PENDING  | FULL        | deposit OVERDUE")
  console.log("    Anna Wedding: CANCELLED\n")
}

main()
  .catch((e) => { console.error("❌  Seed failed:", e); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
