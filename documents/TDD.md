# Technical Design Document (TDD)
# Real-Time Transaction Monitoring in Event Management Systems

**Version:** 1.0
**Last Updated:** May 2026
**Author:** Vingno, John Carlo T. | Borces, Miguel C. | Santos, James Harlan T.
**Status:** Approved

---

## 1. Overview

### 1.1 Purpose
This document defines the technical architecture, data model, API design, and implementation conventions for the web-based event planning and real-time transaction monitoring system developed for Fab Memories Events. It serves as the single source of technical truth for all development decisions and locks in the stack, folder structure, database schema, and API contracts that all modules must conform to.

### 1.2 Reference Documents
- PRD: `PRD.md` — Product Requirements Document
- README: `README.md` — Project Setup and Folder Structure Guide
- Thesis: *Real-Time Transaction Monitoring in Event Management Systems: Leveraging Secure Audit Trails for Proactive Risk Mitigation and Decision Support* (Mapua University, May 2026)

### 1.3 Scope
This document covers all eight operational modules of the proposed system: User Authentication and Access Control, Event Booking and Scheduling, Service Package Management, Payment Processing and Transaction Management, Vendor Directory and Coordination, Staff Scheduling, Document Generation and Management, and Secured Event Planning / Audit Trail / Real-Time Reporting. The digital guest check-in system and third-party payment gateway integrations are explicitly out of scope.

---

## 2. Tech Stack

| Layer | Tool / Library | Notes |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Full-stack — frontend UI + backend API routes |
| Language | TypeScript | Strict mode enabled |
| Database | PostgreSQL | Hosted via Supabase |
| ORM | Prisma | Client generated to `app/generated/prisma/` |
| Auth | Clerk | Email/password + OTP-based MFA via email; roles stored on User record |
| State Management | TanStack React Query | Server state, data fetching, mutations, cache invalidation |
| Validation | Zod | Single schema shared between client form and server API route handler |
| Component Library | shadcn/ui | Never edit `components/ui/` manually — add via CLI only |
| Styling | Tailwind CSS | Utility-first; no custom CSS unless necessary |
| HTTP Client | Axios | Configured instance at `lib/axios.ts` with base URL and error interceptors |
| Email | Nodemailer / Resend / Gmail API | OTP delivery and document notification emails |
| PDF Generation | react-pdf or Puppeteer | For automated document generation (contracts, invoices, receipts, checklists) |
| File Storage | Supabase Storage | Payment proof uploads (screenshots); generated PDF documents |
| Deployment | Vercel | Free tier compatible with Next.js App Router |

---

## 3. Architecture

### 3.1 High-Level Architecture

```
Client (Browser)
  └── Next.js App Router
        ├── Server Components (RSC)
        │     └── Prisma → PostgreSQL (Supabase)   [initial data, SEO-sensitive pages]
        ├── Client Components
        │     └── Axios → Next.js API Routes
        │                 ├── JWT Middleware (auth check)
        │                 ├── Zod validation
        │                 └── Prisma → PostgreSQL (Supabase)
        ├── Supabase Storage
        │     └── Payment proof uploads + generated PDF documents
        └── Email Service (Resend / Nodemailer)
              └── OTP delivery, document notifications, payment receipts
```

### 3.2 Rendering Strategy

| Page Type | Strategy | Reason |
|---|---|---|
| Login / Auth pages | Client-side | Interactive form with OTP verification step |
| Admin dashboard | SSR + Client hydration | Real-time metrics must be fresh on load; client hydration for live updates |
| Booking list / Calendar | SSR | Initial data from server; client refetches for updates |
| Client portal (booking status) | SSR + Client polling | Client needs near-real-time payment status updates |
| Audit trail + Reports | SSR | Large datasets rendered server-side for performance |
| Vendor portal | Client-side with React Query | Assignment updates triggered by coordinator actions |
| Document download | API Route (stream) | PDFs generated on demand and streamed to the client |

### 3.3 Authentication and Authorization

**Auth choice for this project:** Custom JWT

| Concern | Implementation |
|---|---|
| Login flow | User submits email/password → server validates → generates OTP and sends via email → user submits OTP → server issues JWT (access token + refresh token) |
| Token storage | `httpOnly` cookie (access token, 15 min expiry) + `httpOnly` cookie (refresh token, 7 days) |
| Route protection | Next.js middleware at `middleware.ts` checks JWT validity on all `/(authenticated)/*` routes; redirects to `/login` on failure |
| Role enforcement | Role field on JWT payload + User record in DB; API routes check role before processing; Prisma queries scoped by userId for non-admin roles |
| MFA | OTP (6-digit, 10-min TTL) generated server-side, stored hashed in DB, sent via email; required on every login |
| Account lockout | Failed attempt counter on User record; locked after N consecutive failures; admin can unlock |
| Session expiry | Access token expires in 15 minutes; refresh token rotates on use; inactivity beyond session window triggers forced logout |
| Password storage | bcrypt hashed with appropriate salt rounds; plain text never stored or logged |
| Audit logging | Every authentication event (login success, login failure, MFA success, MFA failure, logout, lockout) is written to the AuditLog table |

---

## 4. Folder Structure and Conventions

> This project follows the standard feature-based architecture documented in `README.md`.

### 4.1 Project Structure

```
fab-memories/
├── app/
│   ├── (public)/
│   │   └── login/
│   ├── (authenticated)/
│   │   ├── dashboard/
│   │   ├── bookings/
│   │   ├── calendar/
│   │   ├── packages/
│   │   ├── payments/
│   │   ├── vendors/
│   │   ├── staff/
│   │   ├── documents/
│   │   ├── audit/
│   │   ├── reports/
│   │   ├── portal/          ← client portal
│   │   ├── vendor-portal/   ← vendor portal
│   │   └── settings/
│   ├── api/
│   │   ├── auth/
│   │   ├── bookings/
│   │   ├── packages/
│   │   ├── payments/
│   │   ├── vendors/
│   │   ├── staff/
│   │   ├── documents/
│   │   ├── audit/
│   │   └── reports/
│   └── generated/
│       └── prisma/          ← never edit manually
├── features/
│   ├── auth/
│   ├── bookings/
│   ├── packages/
│   ├── payments/
│   ├── installments/
│   ├── vendors/
│   ├── staff/
│   ├── documents/
│   ├── audit/
│   └── reports/
├── components/
│   ├── ui/                  ← never edit manually (shadcn)
│   ├── shared/
│   └── layout/
├── lib/
│   ├── prisma.ts
│   ├── axios.ts
│   ├── jwt.ts
│   ├── email.ts
│   ├── storage.ts
│   ├── pdf.ts
│   ├── query-client.ts
│   └── utils.ts
├── types/
│   └── index.ts
├── providers/
│   └── query-provider.tsx
├── prisma/
│   └── schema.prisma
├── scripts/
│   └── create-feature.mjs
├── middleware.ts
└── public/
```

### 4.2 Key Rules
1. **Feature-local first, promote when shared.** Start inside the feature. Move to `components/shared/`, `lib/`, or `types/` only when a second feature needs it.
2. **Barrel files keep imports clean.** Always import from `@/features/[feature]`, never from deep internal paths.
3. **Services → Hooks → Components. Never skip a layer.** Components call hooks. Hooks call services. Services call the HTTP client (`lib/axios.ts`).
4. **One schema, two uses.** The same Zod schema validates the form client-side and the request body in the API route handler.
5. **`app/` stays thin.** If a page file is growing with logic, it belongs in a hook or service.
6. **Never manually edit auto-generated folders.** `app/generated/prisma/` and `components/ui/` are owned by their respective CLI tools.
7. **All API routes write to AuditLog.** Every mutating API route (POST, PATCH, DELETE) writes an audit log entry as part of the same database transaction.

### 4.3 Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `booking-card.tsx`, `use-bookings.ts` |
| Components | PascalCase | `BookingCard`, `PaymentVerificationForm` |
| Hooks | camelCase, `use` prefix | `useBookings`, `useCreateBooking` |
| Services | camelCase | `getBookings`, `createBooking` |
| Schemas | camelCase, `Schema` suffix | `createBookingSchema`, `verifyPaymentSchema` |
| Types | PascalCase | `BookingWithPayments`, `VendorWithAssignments` |
| API routes | kebab-case segments | `/api/vendor-assignments`, `/api/staff-schedules` |
| Enum values | SCREAMING_SNAKE_CASE | `BOOKING_STATUS.CONFIRMED`, `PAYMENT_METHOD.GCASH` |

---

## 5. Data Model

### 5.1 Entity Relationship Overview
- A `User` has one `role` (ADMIN, COORDINATOR, VENDOR, CLIENT) and can have many `AuditLog` entries.
- A `Client` (User with role CLIENT) can have many `Booking` records.
- A `Booking` belongs to one `Client`, one `Package`, and has many `Payment`, `VendorAssignment`, `StaffAssignment`, and `Document` records.
- A `Payment` belongs to one `Booking`, is verified by one `User` (staff), and can have many `Installment` records.
- A `Vendor` (User with role VENDOR) has many `VendorAssignment` records.
- A `VendorAssignment` links one `Booking` to one `Vendor` with assignment status and quotation.
- A `Coordinator` (User with role COORDINATOR) has many `StaffAssignment` records.
- A `StaffAssignment` links one `Booking` to one `Coordinator` with role and backup designation.
- A `Document` belongs to one `Booking` and represents one generated file (contract, invoice, checklist, etc.).
- An `AuditLog` entry belongs to one `User` and records every action taken within the system.
- An `OtpToken` belongs to one `User` and is consumed on successful MFA verification.

### 5.2 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../app/generated/prisma"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─── Enums ───────────────────────────────────────────────────────────────────

enum Role {
  ADMIN
  COORDINATOR
  VENDOR
  CLIENT
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  SUBMITTED
  VERIFIED
  FLAGGED
}

enum PaymentMethod {
  GCASH
  MAYA
  BANK_TRANSFER
  CHEQUE
  CASH
}

enum ProofType {
  SCREENSHOT
  REFERENCE_NUMBER
}

enum EventType {
  WEDDING
  DEBUT
}

enum PackageTier {
  FULL_PLANNING
  PARTIAL_PLANNING
  ON_THE_DAY_COORDINATION
}

enum LocationType {
  METRO_MANILA
  PROVINCIAL
}

enum VendorServiceType {
  CATERER
  PHOTOGRAPHER
  VIDEOGRAPHER
  FLORIST
  VENUE_DECORATOR
  OTHER
}

enum AssignmentStatus {
  PENDING
  CONFIRMED
  DECLINED
}

enum DocumentType {
  CONTRACT
  WELCOME_LETTER
  INVOICE
  RECEIPT
  CHECKLIST_EVENT_DETAILS
  CHECKLIST_GUEST_LIST_ALPHA
  CHECKLIST_GUEST_LIST_TABLE
  CHECKLIST_SUPPLIERS_DIRECTORY
  CHECKLIST_ENTOURAGE_LIST
  CHECKLIST_CREW_MEAL
  CHECKLIST_SUPPLIERS_PAYMENT
  CHECKLIST_PERSONAL_REMINDERS
}

enum AuditAction {
  LOGIN_SUCCESS
  LOGIN_FAILED
  MFA_SUCCESS
  MFA_FAILED
  LOGOUT
  ACCOUNT_LOCKED
  BOOKING_CREATED
  BOOKING_CONFIRMED
  BOOKING_CANCELLED
  PAYMENT_SUBMITTED
  PAYMENT_VERIFIED
  PAYMENT_FLAGGED
  VENDOR_ASSIGNED
  VENDOR_CONFIRMED
  VENDOR_DECLINED
  STAFF_ASSIGNED
  DOCUMENT_GENERATED
  REPORT_ACCESSED
  AUDIT_EXPORTED
  USER_CREATED
  USER_UPDATED
  PACKAGE_UPDATED
}

// ─── Models ──────────────────────────────────────────────────────────────────

model User {
  id                 String    @id @default(cuid())
  name               String
  email              String    @unique
  passwordHash       String
  role               Role
  isActive           Boolean   @default(true)
  isLocked           Boolean   @default(false)
  failedLoginCount   Int       @default(0)
  lastLoginAt        DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  // Relations
  bookings           Booking[]              @relation("ClientBookings")
  verifiedPayments   Payment[]              @relation("PaymentVerifier")
  coordinatorProfile Coordinator?
  vendorProfile      Vendor?
  auditLogs          AuditLog[]
  otpTokens          OtpToken[]
}

model OtpToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Package {
  id                String      @id @default(cuid())
  name              String
  tier              PackageTier
  eventType         EventType
  location          LocationType
  basePrice         Decimal     @db.Decimal(12, 2)
  inclusions        String[]
  isActive          Boolean     @default(true)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  bookings          Booking[]
}

model Booking {
  id              String        @id @default(cuid())
  clientId        String
  packageId       String
  eventType       EventType
  eventDate       DateTime      @db.Date
  venue           String
  guestCount      Int
  status          BookingStatus @default(PENDING)
  customizations  String?
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  client          User          @relation("ClientBookings", fields: [clientId], references: [id])
  package         Package       @relation(fields: [packageId], references: [id])
  payments        Payment[]
  vendorAssignments VendorAssignment[]
  staffAssignments  StaffAssignment[]
  documents       Document[]

  // One event per day — enforced at DB level
  @@unique([eventDate, status], name: "one_confirmed_per_day")
}

model Payment {
  id                String        @id @default(cuid())
  bookingId         String
  amount            Decimal       @db.Decimal(12, 2)
  method            PaymentMethod
  proofType         ProofType?
  proofUrl          String?
  referenceNumber   String?
  status            PaymentStatus @default(PENDING)
  submittedAt       DateTime?
  verifiedAt        DateTime?
  verifiedById      String?
  verificationNote  String?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  booking           Booking       @relation(fields: [bookingId], references: [id])
  verifiedBy        User?         @relation("PaymentVerifier", fields: [verifiedById], references: [id])
  installments      Installment[]
}

model Installment {
  id        String   @id @default(cuid())
  paymentId String
  dueDate   DateTime @db.Date
  amount    Decimal  @db.Decimal(12, 2)
  isPaid    Boolean  @default(false)
  paidAt    DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  payment   Payment  @relation(fields: [paymentId], references: [id])
}

model Vendor {
  id           String            @id @default(cuid())
  userId       String            @unique
  serviceType  VendorServiceType
  businessName String
  contactInfo  String
  coverageAreas String[]
  isActive     Boolean           @default(true)
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  user         User              @relation(fields: [userId], references: [id])
  assignments  VendorAssignment[]
  availability VendorAvailability[]
}

model VendorAvailability {
  id         String   @id @default(cuid())
  vendorId   String
  date       DateTime @db.Date
  isBlocked  Boolean  @default(true)
  createdAt  DateTime @default(now())

  vendor     Vendor   @relation(fields: [vendorId], references: [id])
}

model VendorAssignment {
  id              String           @id @default(cuid())
  bookingId       String
  vendorId        String
  status          AssignmentStatus @default(PENDING)
  quotationAmount Decimal?         @db.Decimal(12, 2)
  quotationNote   String?
  assignedAt      DateTime         @default(now())
  respondedAt     DateTime?
  updatedAt       DateTime         @updatedAt

  booking         Booking          @relation(fields: [bookingId], references: [id])
  vendor          Vendor           @relation(fields: [vendorId], references: [id])
}

model Coordinator {
  id        String   @id @default(cuid())
  userId    String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user       User              @relation(fields: [userId], references: [id])
  assignments StaffAssignment[]
}

model StaffAssignment {
  id            String      @id @default(cuid())
  bookingId     String
  coordinatorId String
  taskRole      String?
  isBackup      Boolean     @default(false)
  assignedAt    DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  booking       Booking     @relation(fields: [bookingId], references: [id])
  coordinator   Coordinator @relation(fields: [coordinatorId], references: [id])

  @@unique([bookingId, coordinatorId])
}

model Document {
  id          String       @id @default(cuid())
  bookingId   String
  type        DocumentType
  filePath    String
  generatedAt DateTime     @default(now())

  booking     Booking      @relation(fields: [bookingId], references: [id])
}

model AuditLog {
  id          String      @id @default(cuid())
  userId      String
  action      AuditAction
  module      String
  description String
  status      String      @default("SUCCESS")
  metadata    Json?
  timestamp   DateTime    @default(now())

  user        User        @relation(fields: [userId], references: [id])
}

model DocumentTemplate {
  id        String       @id @default(cuid())
  type      DocumentType @unique
  content   String       // HTML/Markdown template string
  updatedAt DateTime     @updatedAt
  updatedById String?
}
```

### 5.3 Key Business Rules

| Rule | Enforcement Level |
|---|---|
| One confirmed event per calendar date | DB — partial unique index on `eventDate` where `status = CONFIRMED` |
| Cheque only accepted for deposit payments | API — validated against `PaymentMethod.CHEQUE` + installment order check |
| Payment records immutable after verification | API — PATCH blocked on verified payments; DB — no cascade update on verified status |
| Audit log entries are immutable | DB — no UPDATE or DELETE permissions on `AuditLog`; API — no route exposed |
| Coordinator cannot be double-assigned on same date | API — date conflict check before insert into `StaffAssignment` |
| Vendor availability must be clear before assignment | API — check `VendorAvailability` before creating `VendorAssignment` |
| OTP tokens expire in 10 minutes | API — `expiresAt` checked on OTP verification; expired tokens rejected |
| All mutating API routes write to AuditLog | API — audit write is part of the same Prisma transaction as the business operation |

---

## 6. API Design

### 6.1 Conventions
- All routes live under `/api/`
- Authenticated routes: JWT checked in `middleware.ts`; API routes do not re-implement auth checks
- Request bodies validated against the feature's Zod schema before any DB call
- Successful responses: `{ data: T, message?: string }` with appropriate 2xx status
- Error responses: `{ error: string }` with appropriate HTTP status code (400 for validation, 401 for auth, 403 for role, 404 for not found, 500 for server errors)
- All mutating routes write an `AuditLog` entry within the same Prisma transaction

### 6.2 Route Index

#### Auth
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Submit credentials; initiate OTP flow |
| POST | `/api/auth/verify-otp` | Public | Submit OTP; receive JWT tokens in httpOnly cookies |
| POST | `/api/auth/logout` | Auth | Invalidate session; clear cookies |
| POST | `/api/auth/refresh` | Public (cookie) | Rotate refresh token; issue new access token |
| PATCH | `/api/auth/change-password` | Auth | Change own password |

#### Users
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/users` | Admin | Create user account with role |
| GET | `/api/users` | Admin | List all users |
| GET | `/api/users/[userId]` | Admin | Get single user profile |
| PATCH | `/api/users/[userId]` | Admin | Update user info or unlock account |

#### Bookings
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/bookings` | Client | Submit new booking request |
| GET | `/api/bookings` | Admin, Coordinator | List all bookings with filters |
| GET | `/api/bookings/[bookingId]` | Admin, Coordinator, Client (own) | Get booking with full relations |
| PATCH | `/api/bookings/[bookingId]` | Admin, Coordinator | Confirm or cancel booking |
| GET | `/api/bookings/availability?date=` | Client | Check date availability |

#### Packages
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/packages` | All | List active packages |
| POST | `/api/packages` | Admin | Create new package |
| PATCH | `/api/packages/[packageId]` | Admin | Update package details or pricing |

#### Payments
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/payments` | Client | Submit payment proof for a booking |
| GET | `/api/payments` | Admin, Coordinator | List all payment submissions |
| GET | `/api/payments/[paymentId]` | Admin, Coordinator, Client (own) | Get payment detail with proof |
| PATCH | `/api/payments/[paymentId]/verify` | Admin, Coordinator | Verify or flag a payment submission |

#### Installments
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/payments/[paymentId]/installments` | Admin, Coordinator, Client (own) | Get installment schedule |
| PATCH | `/api/payments/[paymentId]/installments/[installmentId]` | Admin, Coordinator | Mark installment as paid |

#### Vendors
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/vendors` | Admin | Register new vendor |
| GET | `/api/vendors` | Admin, Coordinator | List vendor directory |
| GET | `/api/vendors/[vendorId]` | Admin, Coordinator | Get vendor profile with assignments |
| PATCH | `/api/vendors/[vendorId]` | Admin | Update vendor profile |
| GET | `/api/vendors/[vendorId]/availability` | Admin, Coordinator | Get vendor availability calendar |
| POST | `/api/vendors/[vendorId]/availability` | Admin | Block or unblock dates |

#### Vendor Assignments
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/bookings/[bookingId]/vendor-assignments` | Admin, Coordinator | Assign vendor to booking |
| GET | `/api/bookings/[bookingId]/vendor-assignments` | Admin, Coordinator | List all vendor assignments for booking |
| PATCH | `/api/bookings/[bookingId]/vendor-assignments/[assignmentId]` | Vendor | Confirm or decline assignment; submit quotation |

#### Staff Scheduling
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/staff` | Admin, Coordinator | List coordinator roster |
| POST | `/api/bookings/[bookingId]/staff-assignments` | Admin, Coordinator | Assign coordinator to booking |
| GET | `/api/bookings/[bookingId]/staff-assignments` | Admin, Coordinator | List staff assignments for booking |
| PATCH | `/api/bookings/[bookingId]/staff-assignments/[assignmentId]` | Admin | Update assignment or toggle backup |
| DELETE | `/api/bookings/[bookingId]/staff-assignments/[assignmentId]` | Admin | Remove coordinator from booking |

#### Documents
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/bookings/[bookingId]/documents/generate` | Admin, Coordinator | Trigger document generation for booking |
| GET | `/api/bookings/[bookingId]/documents` | Admin, Coordinator, Client (own) | List generated documents for booking |
| GET | `/api/documents/[documentId]/download` | Admin, Coordinator, Client (own) | Stream document file |
| GET | `/api/document-templates` | Admin | List all document templates |
| PATCH | `/api/document-templates/[type]` | Admin | Update template content |

#### Audit Trail
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/audit` | Admin | List audit logs with filters (date, user, module, action) |
| GET | `/api/audit/export` | Admin | Export filtered audit logs as CSV or PDF |

#### Reports
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/reports/bookings` | Admin, Coordinator | Booking and scheduling report |
| GET | `/api/reports/payments` | Admin, Coordinator | Payment and transaction report |
| GET | `/api/reports/vendors` | Admin, Coordinator | Vendor coordination report |
| GET | `/api/reports/staff` | Admin, Coordinator | Staff scheduling report |
| GET | `/api/reports/audit` | Admin | Audit trail monitoring report |
| GET | `/api/reports/[type]/export` | Admin, Coordinator | Export report as CSV or PDF |
| GET | `/api/reports/dashboard` | Admin | Real-time dashboard metrics |

---

## 7. Key Technical Flows

### 7.1 Login with MFA
1. User submits email + password → `POST /api/auth/login`
2. API validates credentials; checks `isLocked`; increments `failedLoginCount` on failure
3. On success: generates 6-digit OTP, hashes it, stores in `OtpToken` with 10-min TTL, sends plaintext OTP via email
4. Client is returned a `pendingMfa: true` flag and `tempToken` (short-lived, OTP-only scope)
5. User submits OTP → `POST /api/auth/verify-otp`
6. API finds valid OTP for user, compares hash, checks `expiresAt`; on success marks OTP as used
7. API issues access token (15-min JWT in httpOnly cookie) + refresh token (7-day JWT in httpOnly cookie)
8. AuditLog entry written: `LOGIN_SUCCESS` or `MFA_FAILED`
9. Client is redirected to `/dashboard`

### 7.2 Client Booking Submission and Confirmation
1. Client fills booking form → `useCreateBooking()` hook → `POST /api/bookings`
2. API validates body against `createBookingSchema` (Zod)
3. API checks `Booking` table for existing CONFIRMED record on requested `eventDate`
4. If date is taken: returns 409 Conflict; if free: creates `Booking` with status `PENDING`
5. AuditLog entry written: `BOOKING_CREATED`
6. Organizer sees new booking notification on dashboard
7. Organizer confirms → `PATCH /api/bookings/[bookingId]` with `{ status: "CONFIRMED" }`
8. API updates booking status; triggers document generation for CONTRACT and WELCOME_LETTER
9. AuditLog entry written: `BOOKING_CONFIRMED`
10. Client receives email with welcome letter; contract available in client portal

### 7.3 Payment Submission and Verification
1. Client navigates to booking → uploads screenshot or enters reference number → `POST /api/payments`
2. API validates body; stores proof file to Supabase Storage (access-controlled bucket); creates `Payment` with status `SUBMITTED`
3. AuditLog entry: `PAYMENT_SUBMITTED`
4. Staff sees payment in verification queue; opens proof → `PATCH /api/payments/[paymentId]/verify`
5. API checks that payment is in `SUBMITTED` status (rejects if already VERIFIED — immutable rule)
6. On verify: sets `status = VERIFIED`, `verifiedAt = now()`, `verifiedById = currentUserId`
7. Within same Prisma transaction: generates INVOICE and RECEIPT documents; writes AuditLog entry `PAYMENT_VERIFIED`
8. Client receives receipt via email; payment status updates in client portal

### 7.4 Audit Trail Write (All Mutating Routes)
```typescript
// Pattern used in every mutating API route
await prisma.$transaction(async (tx) => {
  // 1. Perform the business operation
  const result = await tx.[model].[operation](...)

  // 2. Write audit log in same transaction
  await tx.auditLog.create({
    data: {
      userId: session.userId,
      action: AuditAction.[ACTION],
      module: "[MODULE_NAME]",
      description: "[Human-readable description]",
      status: "SUCCESS",
      metadata: { /* relevant context */ },
    }
  })

  return result
})
```

### 7.5 Document Generation
1. Trigger event fires (booking confirmed, payment verified)
2. API route `POST /api/bookings/[bookingId]/documents/generate` is called internally with `type[]`
3. Service fetches `DocumentTemplate` for each type; merges booking data into template
4. PDF is generated (react-pdf or Puppeteer); stored to Supabase Storage
5. `Document` record created in DB with `filePath`
6. AuditLog entry written: `DOCUMENT_GENERATED`
7. Email notification sent to client with download link

---

## 8. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL connection string (pooled) |
| `DIRECT_URL` | ✅ | Direct connection URL for Prisma migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key (for Storage client) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-side Storage operations) |
| `JWT_SECRET` | ✅ | Secret for signing/verifying access tokens |
| `JWT_REFRESH_SECRET` | ✅ | Separate secret for refresh tokens |
| `OTP_SECRET` | ✅ | Secret used in OTP hash generation |
| `EMAIL_FROM` | ✅ | From address for system emails |
| `RESEND_API_KEY` | ✅ | Resend API key for email delivery |
| `NEXT_PUBLIC_APP_URL` | ✅ | Base URL (e.g. `https://fab-memories.vercel.app`) |
| `SUPABASE_STORAGE_BUCKET_PAYMENTS` | ✅ | Bucket name for payment proof uploads |
| `SUPABASE_STORAGE_BUCKET_DOCUMENTS` | ✅ | Bucket name for generated documents |

---

## 9. Testing Strategy

| Layer | Tool | What Gets Tested |
|---|---|---|
| Unit | Vitest | Zod schemas (valid + invalid inputs), service functions, utility helpers, OTP generation/validation |
| Integration | Vitest + test DB | API route handlers end-to-end — validate input → DB call → correct response shape |
| Component | Testing Library | Key interactive components: booking form, payment upload, OTP input |
| E2E | Playwright | Critical user flows (see below) |

**Coverage priorities (in order):**
1. API route handlers — correct auth enforcement, correct role gating, correct DB outcome, AuditLog written
2. Zod schemas — all valid inputs pass, all invalid inputs fail with correct error messages
3. Business rule enforcement — one-event-per-day, payment immutability, coordinator conflict detection
4. E2E critical flows:
   - Client registration → booking submission → payment upload → status tracking
   - Staff login → payment verification → receipt generation
   - Admin login → audit trail review → report export

---

## 10. Module Breakdown

| Module | Features | Status |
|---|---|---|
| Module 1 — Authentication and Access Control | User auth, MFA, RBAC, session management, account lockout | ⬜ Not Started |
| Module 2 — Event Booking and Scheduling | Booking lifecycle, availability enforcement, event calendar, package management | ⬜ Not Started |
| Module 3 — Payment Processing and Transaction Management | Payment proof submission, staff verification, installment tracking, invoice and receipt generation | ⬜ Not Started |
| Module 4 — Vendor Directory and Coordination | Vendor directory, availability management, assignment workflow, quotation recording | ⬜ Not Started |
| Module 5 — Staff Scheduling | Coordinator roster, guest count-based assignment, conflict detection, backup designation | ⬜ Not Started |
| Module 6 — Document Generation and Management | Template management, automated document generation, file storage and delivery | ⬜ Not Started |
| Module 7 — Secured Event Planning and Audit Trail | Audit trail logging, tamper-evident log storage, log search/filter/export | ⬜ Not Started |
| Module 8 — Real-Time Reporting and Decision Support | Dashboard metrics, five report types, report export | ⬜ Not Started |

> Each module has its own Module Spec document used as the task list during implementation.

---

## 11. Open Technical Questions

| # | Question | Impact | Status |
|---|---|---|---|
| 1 | Puppeteer vs react-pdf for document generation — Puppeteer gives higher fidelity but has cold start latency on Vercel free tier | Affects document generation performance and deployment approach | Open |
| 2 | Should the one-event-per-day constraint use a DB partial unique index or a serializable transaction check? | Affects how race conditions are handled on concurrent booking confirmations | Open |
| 3 | Should audit logs be written to a separate append-only schema/table with revoked UPDATE/DELETE privileges at the DB role level? | Affects tamper-evidence guarantees and DB role setup complexity | Open |
| 4 | What is the maximum payment proof file size to accept? Supabase Storage free tier has limits. | Affects Storage bucket configuration and client-side upload validation | Open |
| 5 | Should report exports be generated synchronously (blocking) or as a background job with a download link? | Affects UX for large date range exports and whether a job queue is needed | Open |
