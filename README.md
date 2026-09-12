# Fab Memories Events — System README

> **Project:** Fab Memories Events — Event Planning & Management System  
> **Stack:** Next.js 16 · React 19 · Prisma 7 · PostgreSQL · Clerk · Supabase Storage · TanStack Query · ShadcnUI · Tailwind CSS v4  
> **Last Updated:** September 12, 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Summary](#2-architecture-summary)
3. [Tech Stack](#3-tech-stack)
4. [Roles & Access Control](#4-roles--access-control)
5. [Module Breakdown](#5-module-breakdown)
6. [Database Schema](#6-database-schema)
7. [Project Structure](#7-project-structure)
8. [Environment Variables](#8-environment-variables)
9. [Getting Started](#9-getting-started)
10. [Seed Data](#10-seed-data)
11. [API Reference](#11-api-reference)
12. [Key Design Decisions](#12-key-design-decisions)

---

## 1. Project Overview

**Fab Memories Events** is a full-stack web application for a professional event planning company based in the Philippines. The system digitizes the entire client-to-event lifecycle — from browsing packages and submitting a booking request, to payment verification, staff scheduling, vendor coordination, and tamper-proof audit logging.

### Business Goals

- Replace manual (WhatsApp/spreadsheet) booking and payment tracking with a structured, role-aware platform.
- Give clients a self-service portal to track their event, submit payments, and view documents.
- Give staff (Admin & Coordinator) a centralized dashboard to manage bookings, verify payments, assign coordinators, and coordinate vendors.
- Produce a tamper-evident audit trail for all critical operations to satisfy compliance and accountability requirements.

---

## 2. Architecture Summary

```
┌─────────────────────────────────────────────┐
│               Client Browser                │
│  Next.js App Router (React 19, RSC + Client)│
└──────────────┬──────────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────────┐
│         Next.js API Routes (/app/api)        │
│  Auth: Clerk JWT middleware (requireRole)    │
│  ORM:  Prisma 7 + pg adapter (PostgreSQL)   │
│  Audit: SHA-256 hash chain (lib/audit)      │
└───────┬─────────────────────────┬───────────┘
        │                         │
┌───────▼────────┐   ┌────────────▼──────────┐
│  PostgreSQL DB  │   │  Supabase Storage     │
│  (Prisma ORM)   │   │  (payment proof imgs) │
└────────────────┘   └───────────────────────┘
        │
┌───────▼────────┐
│  Clerk Auth     │
│  (user mgmt +   │
│   role metadata)│
└────────────────┘
```

**Rendering Strategy:**
- **Public pages** (landing, packages, vendor brief): Server Components with `cache: "no-store"` where data freshness is critical.
- **Protected dashboards**: Client Components using TanStack Query (`useQuery`/`useMutation`) with Axios for data fetching and optimistic updates.
- **API Routes**: All business logic is encapsulated in `features/<module>/<module>.query.ts`; routes are thin orchestration layers.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Component Library | ShadcnUI + Tailwind CSS v4 |
| Animations | Framer Motion 13 |
| State / Data Fetching | TanStack React Query v5 + Axios |
| Forms | React Hook Form + Zod v4 |
| Authentication | Clerk (`@clerk/nextjs` v7) |
| ORM | Prisma 7 (with `@prisma/adapter-pg`) |
| Database | PostgreSQL (via Supabase or direct pg) |
| File Storage | Supabase Storage |
| Audit Trail | Custom SHA-256 hash chain (`lib/audit/`) |
| Email | Nodemailer (configured, not yet wired to triggers) |

---

## 4. Roles & Access Control

The system uses a 4-role RBAC model. Roles are stored in both Clerk's `publicMetadata` and the `User.role` field in PostgreSQL, kept in sync via Clerk webhooks.

| Role | Route Prefix | Description |
|---|---|---|
| `CLIENT` | `/portal/*` | End-user client. Books events, views their booking, submits payments. |
| `COORDINATOR` | `/staff/coordinator/*` | Event coordinator. Views assigned bookings, manages schedule, records manual payments. |
| `ADMIN` | `/staff/admin/*` | Full system access. Confirms bookings, verifies payments, manages staff, vendors, packages, reports, and audit logs. |
| `VENDOR` | `/staff/vendor/*` | External vendor. Views their quotation history and assigned event briefs. |

Route protection is enforced at two layers:
1. **Next.js Middleware** (`lib/rbac.ts`) — redirects unauthorized routes before the page renders.
2. **API routes** (`lib/clerk/auth.ts` → `requireRole([...])`) — returns `403 Forbidden` if the calling user's role is not in the allowed list.

---

## 5. Module Breakdown

The system is organized into **7 feature modules**, each in `features/<module>/`.

---

### Module 1 — Authentication & User Management (`features/auth/`)

**What it does:**
- Clerk-powered sign-in and sign-up for clients (`/sign-in`, `/sign-up`).
- Separate staff login portal at `/staff-login` (username/password, no email sign-up).
- Clerk webhook (`/api/webhooks/clerk`) syncs user creation/updates into the PostgreSQL `User` table.
- Server Action `syncUser` is called on every protected page load to keep the DB user current.
- Role-based redirect after login (`lib/rbac.ts → getDefaultRedirect`).
- Admin can create, deactivate, and manage staff accounts at `/staff/admin/staff` via `/api/staff-accounts`.

**Key files:**
- `lib/clerk/auth.ts` — `requireRole`, `getCurrentDbUser`
- `lib/rbac.ts` — route access map, `canAccess`, `getDefaultRedirect`
- `app/api/webhooks/clerk/route.ts` — Clerk webhook handler
- `lib/sync-user.ts` — DB upsert on auth

---

### Module 2 — Package Management (`features/packages/`)

**What it does:**
- Admin creates and manages event packages (Wedding, Debut, Corporate, Birthday, Other).
- Each package has a base `price` (metro) and optional `priceProvincial`.
- Packages are browsable publicly at `/packages` (unauthenticated).
- Clients select a package when creating a booking; `agreedPrice` is resolved server-side to prevent price manipulation.
- Admin can toggle package `isActive` status.

**Key API routes:**
- `GET /api/public/packages` — Public package listing (no auth).
- `GET /api/packages` — Admin/staff package listing.
- `POST /api/packages` — Create package (ADMIN only).
- `PATCH /api/packages/[packageId]` — Update package (ADMIN only).
- `DELETE /api/packages/[packageId]` — Soft/hard delete (ADMIN only).

---

### Module 3 — Booking Management (`features/bookings/`)

**What it does:**
- Clients submit booking requests specifying event type, date, venue (with Google Maps picker), guest count, package, and desired vendor categories.
- Date availability is enforced: only one `CONFIRMED` booking per calendar day.
- Admin confirms bookings by setting contract terms (payment plan, deposit amount, due dates).
- Full booking lifecycle: `PENDING → CONFIRMED → (CANCELLATION_REQUESTED →) CANCELLED`.
- Clients can request cancellation; admin approves or declines.
- Admin can withdraw (cancel) a pending booking directly.
- Coordinators have a read-only view of their assigned bookings.

**Key API routes:**
- `GET /api/bookings` — All bookings (ADMIN/COORDINATOR) or own bookings (CLIENT).
- `POST /api/bookings` — Create booking (CLIENT only).
- `GET /api/bookings/[bookingId]` — Single booking with relations.
- `PATCH /api/bookings/[bookingId]` — Update booking (ADMIN).
- `POST /api/bookings/[bookingId]/contract-terms` — Set payment plan and due dates (ADMIN).
- `POST /api/bookings/[bookingId]/cancel-request` — Client requests cancellation.
- `GET /api/bookings/availability` — Date availability check.

**Booking statuses:**

```
PENDING ──► CONFIRMED ──► CANCELLATION_REQUESTED ──► CANCELLED
    └─────────────────────────────────────────────► CANCELLED
```

---

### Module 4 — Payment Management (`features/payments/` + `features/installments/`)

**What it does:**
- Clients upload payment proof (image via Supabase Storage) and submit payments.
- Supports DEPOSIT, INSTALLMENT, and FULL_BALANCE payment types.
- Two payment plans: `FULL` (deposit + full balance) and `INSTALLMENT` (deposit + N installment tranches).
- Admin sets an installment schedule (amounts + due dates) per booking.
- Admin/Coordinator verifies or flags submitted payments.
- Manual cash payments can be recorded by staff directly (`POST /api/payments/manual`).
- Payment proof images are served via signed Supabase Storage URLs (time-limited, not public).

**Payment flow:**
```
Client uploads proof → SUBMITTED → Admin verifies → VERIFIED
                                 → Admin flags   → FLAGGED (client can resubmit)
```

**Key API routes:**
- `GET /api/payments` — List payments (filterable by status).
- `POST /api/payments` — Submit payment with proof upload.
- `POST /api/payments/manual` — Record cash/offline payment (ADMIN/COORDINATOR).
- `POST /api/payments/[paymentId]/verify` — Verify or flag a payment (ADMIN/COORDINATOR).
- `GET/POST /api/bookings/[bookingId]/installments` — Installment schedule CRUD.

---

### Module 5 — Staff Assignment & Scheduling (`features/staff-assignments/`)

**What it does:**
- Admin assigns coordinators to bookings with task roles (Lead Coordinator, Guest Registration, Vendor Liaison, Logistics, Program Flow, Other).
- Each assignment can be marked as `isBackup`.
- FR-37 staffing recommendation: guest count determines the recommended coordinator range (e.g., 51–150 guests → 3–5 coordinators).
- FR-40 conflict detection: warns if a coordinator is already assigned to another event on the same date.
- Coordinator dashboard shows their upcoming schedule and assignment list.
- Admin staffing calendar shows all events per month with compliance status.
- Coordinator roster shows each coordinator's upcoming assignment count and next event.

**Staffing recommendations (FR-37):**
| Guests | Min | Max |
|---|---|---|
| 1–50 | 1 | 2 |
| 51–150 | 3 | 5 |
| 151–300 | 5 | 8 |
| 301–500 | 7 | 10 |
| 500+ | 10 | 15 |

**Key API routes:**
- `GET /api/bookings/[bookingId]/staff` — Get assignments for a booking.
- `POST /api/bookings/[bookingId]/staff` — Assign coordinator (ADMIN).
- `DELETE /api/bookings/[bookingId]/staff/[assignmentId]` — Remove assignment (ADMIN).
- `GET /api/staff` — Full coordinator list with upcoming counts.
- `GET /api/staff/calendar` — Month-view calendar entries with compliance.
- `GET /api/staff/my-schedule` — Coordinator's own assignment list.
- `GET /api/staff/my-dashboard` — Coordinator dashboard summary.

---

### Module 6 — Vendor Management (`features/vendors/`)

**What it does:**
- Admin maintains a vendor directory with categories (Catering, Photography, Videography, Florals, Decoration, Sounds & Lighting, Venue, Hair & Makeup, Entertainment, Transportation, Other).
- Vendors are assigned to bookings per category with contact tracking (`contactedAt`, `confirmedAt`).
- When clients create a booking, they select desired vendor categories; admin matches vendors from the directory.
- Vendor coverage gap detection: dashboard highlights bookings where a requested category has no confirmed vendor.
- **Vendor Brief** (`/vendor-brief/[bookingId]?view=[vendorId]`): a public, shareable, read-only event brief page for external vendors. Shows event logistics (date, venue, guest count, package, notes) and the vendor's specific assignment. No client PII or pricing is exposed.
- Admin can copy the vendor brief URL directly from the booking detail page.

**Key API routes:**
- `GET/POST /api/vendors` — Vendor directory CRUD (ADMIN).
- `GET/PATCH/DELETE /api/vendors/[vendorId]` — Single vendor CRUD.
- `GET/POST /api/bookings/[bookingId]/vendors` — Booking vendor assignments.
- `PATCH/DELETE /api/bookings/[bookingId]/vendors/[vendorId]` — Update/remove assignment.
- `GET /api/vendor-brief/[bookingId]` — Public brief data (no auth required).

---

### Module 7 — Audit Trail & Reports (`features/audit/` + `features/reports/`)

**What it does:**

**Audit Trail:**
- Every significant action (login/logout, booking CRUD, payment verify, vendor assign, staff assign, report access) is written to an append-only `AuditLog` table.
- The audit log implements a **SHA-256 hash chain**: each entry's hash is computed from its own fields plus the previous entry's hash, forming a tamper-evident linked chain.
- `AuditChainState` (a singleton row) is locked with `SELECT ... FOR UPDATE` inside every `logAction()` transaction to prevent concurrent writes from forking the chain.
- Admin can run a full **chain integrity verification** from the UI — every entry's stored hash is recomputed and cross-checked with the chain links.
- Audit logs are filterable by date range, user, module, action, and status.
- CSV export of audit logs.

**Admin Dashboard / Reports:**
- Real-time operational dashboard at `/staff/admin` showing: active bookings, pending requests, payments to verify, upcoming events this week.
- Compliance widgets: understaffed events (below FR-37 minimum) and vendor coverage gaps.
- Merged "Needs Attention" action list (unset contract terms, payments awaiting verification, pending cancellation requests).
- "This week's events" timeline.

**Key API routes:**
- `GET /api/audit` — Paginated, filterable audit log (ADMIN).
- `GET /api/audit/stats` — Aggregate audit stats (total entries, failures, most active module).
- `GET /api/audit/verify` — Full chain integrity check (ADMIN).
- `GET /api/reports/dashboard` — Admin dashboard summary (ADMIN).

---

## 6. Database Schema

### Models

| Model | Description |
|---|---|
| `User` | Authenticated users; synced from Clerk. Roles: CLIENT, ADMIN, COORDINATOR, VENDOR. |
| `Package` | Event packages with metro/provincial pricing and inclusions. |
| `Booking` | Core entity. Links client + package + payment plan + contract terms. |
| `Payment` | Individual payment submissions (deposit, installment, full balance). |
| `Installment` | Installment schedule rows linked to a booking. |
| `Vendor` | Vendor directory entries with category and contact info. |
| `BookingVendor` | Join table linking vendors to bookings, with contact/confirmation tracking. |
| `StaffAssignment` | Coordinator assignments per booking with task role. |
| `AuditLog` | Append-only tamper-evident audit entries with hash chain. |
| `AuditChainState` | Singleton row tracking the current hash chain tip (used for serialized writes). |

### Key Enums

- `Role`: CLIENT, ADMIN, COORDINATOR, VENDOR
- `BookingStatus`: PENDING, CONFIRMED, CANCELLED, CANCELLATION_REQUESTED
- `EventType`: WEDDING, DEBUT, CORPORATE, BIRTHDAY, OTHER
- `PaymentType`: DEPOSIT, INSTALLMENT, FULL_BALANCE
- `PaymentStatus`: PENDING, SUBMITTED, VERIFIED, FLAGGED
- `PaymentPlan`: FULL, INSTALLMENT
- `VendorCategory`: CATERING, PHOTOGRAPHY, VIDEOGRAPHY, FLORALS, DECORATION, SOUNDS_LIGHTING, VENUE, HAIR_MAKEUP, ENTERTAINMENT, TRANSPORTATION, OTHER
- `StaffTaskRole`: LEAD_COORDINATOR, GUEST_REGISTRATION, VENDOR_LIAISON, LOGISTICS, PROGRAM_FLOW, OTHER
- `AuditAction`: LOGIN, LOGOUT, CREATE, UPDATE, DELETE, VERIFY, CONFIRM, DECLINE, EXPORT, VIEW
- `AuditModule`: AUTH, USER_MANAGEMENT, BOOKING, PAYMENT, VENDOR, STAFF_SCHEDULE, DOCUMENT, REPORT

### Migration History

| Migration | Date | Description |
|---|---|---|
| `20260802_user_clerk` | Aug 2 | Initial User model + Clerk sync |
| `20260802_user_session_tracking` | Aug 2 | Session tracking fields |
| `20260813_user_audit_schema` | Aug 13 | AuditLog + AuditAction/Module enums |
| `20260824_add_bookings_packages` | Aug 24 | Package + Booking models |
| `20260825_add_payments_installments` | Aug 25 | Payment + Installment models (3 iterations) |
| `20260825_booking_polish` | Aug 25 | Booking status and relation refinements |
| `20260826_add_agreed_price` | Aug 26 | `Booking.agreedPrice` server-resolved field |
| `20260829_add_contract_terms_phone` | Aug 29 | Contract terms + clientPhone on booking |
| `20260829_add_full_balance_payment_due` | Aug 29 | `fullPaymentDueDate` on booking |
| `20260903_add_vendor_module` | Sep 3 | Vendor + BookingVendor models |
| `20260904_staff_coordinator` | Sep 4 | StaffAssignment model + StaffTaskRole enum |
| `20260912_audit_trails` | Sep 12 | Hash chain fields (sequence, hash, previousHash) + AuditChainState |
| `20260912_revert_audit_metadata_to_jsonb` | Sep 12 | Force `AuditLog.metadata` to plain `json` for hash stability |

---

## 7. Project Structure

```
fabmemories/
├── app/
│   ├── (pages)/
│   │   ├── (protected)/
│   │   │   ├── portal/           # Client portal pages
│   │   │   │   ├── page.tsx      # Dashboard
│   │   │   │   ├── bookings/     # Booking list + detail + edit + payment
│   │   │   │   ├── payments/     # Payment history
│   │   │   │   └── documents/    # (placeholder)
│   │   │   └── staff/
│   │   │       ├── admin/        # Admin pages (dashboard, bookings, payments,
│   │   │       │                 #   packages, vendors, staff, reports, audit)
│   │   │       ├── coordinator/  # Coordinator pages (bookings, calendar,
│   │   │       │                 #   payments, staff roster)
│   │   │       └── vendor/       # Vendor pages (quotations, history)
│   │   └── (public)/
│   │       ├── sign-in/          # Client auth (Clerk)
│   │       ├── sign-up/          # Client registration
│   │       ├── staff-login/      # Staff auth (username/password)
│   │       ├── packages/         # Public package browser
│   │       ├── vendor-brief/     # Public vendor event brief
│   │       ├── forgot-password/
│   │       ├── privacy/
│   │       ├── terms/
│   │       └── support/
│   ├── api/
│   │   ├── bookings/             # Booking CRUD + sub-resources
│   │   ├── payments/             # Payment CRUD + verify + manual
│   │   ├── packages/             # Package CRUD
│   │   ├── vendors/              # Vendor directory CRUD
│   │   ├── staff/                # Staff list + calendar + dashboard
│   │   ├── staff-accounts/       # Staff account management
│   │   ├── audit/                # Audit log + stats + verify
│   │   ├── reports/              # Dashboard summary
│   │   ├── vendor-brief/         # Public vendor brief data
│   │   ├── public/               # Unauthenticated endpoints
│   │   └── webhooks/clerk/       # Clerk user sync webhook
│   ├── generated/prisma/         # Prisma-generated client
│   ├── layout.tsx                # Root layout (Clerk + Query providers)
│   └── globals.css
│
├── features/                     # Feature-sliced modules
│   ├── auth/                     # Auth shell + hooks
│   ├── bookings/                 # Booking types, API, hooks, components
│   ├── installments/             # Installment schedule components + hooks
│   ├── packages/                 # Package types, API, hooks, components
│   ├── payments/                 # Payment types, API, hooks, components
│   ├── reports/                  # Admin dashboard hooks + components
│   ├── staff-assignments/        # Staff assignment types, API, hooks, components
│   ├── vendors/                  # Vendor types, API, hooks, components
│   ├── audit/                    # Audit log types, API, hooks, components
│   ├── landing/                  # Landing page components
│   └── layouts/                  # Sidebar shell, nav, mobile tab bar
│
├── lib/
│   ├── audit/
│   │   ├── chain.ts              # SHA-256 hash computation + canonical stringify
│   │   └── log.ts                # logAction() — transactional, serialized writes
│   ├── clerk/
│   │   ├── auth.ts               # requireRole, getCurrentDbUser
│   │   ├── client.ts             # Clerk browser client
│   │   └── types.ts
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   └── server.ts             # Server Supabase client
│   ├── prisma.ts                 # Singleton Prisma client
│   ├── rbac.ts                   # Route access map + canAccess
│   ├── roles.ts                  # Role utilities
│   ├── axios.ts                  # Configured Axios instance
│   ├── query-client.ts           # TanStack Query client config
│   ├── storage.ts                # Supabase storage helpers
│   ├── csv-export.ts             # CSV generation utility
│   └── utils.ts                  # cn() + misc helpers
│
├── components/
│   └── ui/                       # ShadcnUI components + custom atoms
│
├── prisma/
│   ├── schema.prisma             # Full data model
│   ├── seed.ts                   # Seed script (Clerk + DB)
│   └── migrations/               # Prisma migration history
│
├── providers/
│   ├── query-provider.tsx        # TanStack Query provider wrapper
│   └── theme-provider.tsx        # next-themes provider
│
└── types/
    └── globals.d.ts              # Global type augmentations
```

---

## 8. Environment Variables

```env
# PostgreSQL
DATABASE_URL=postgresql://...

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# Clerk redirect paths
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Supabase (file storage)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App URL (used in vendor brief absolute URL generation)
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Seed credentials (optional overrides)
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=FabMemories123!
SEED_ADMIN_EMAIL=admin@example.com
```

---

## 9. Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (copy and fill .env)
cp .env.example .env

# 3. Push schema and generate Prisma client
npx prisma migrate deploy
npx prisma generate

# 4. Run seed (creates Clerk users + DB records)
npx tsx prisma/seed.ts

# 5. Start development server
npm run dev
```

**Available scripts:**
```json
{
  "dev":            "next dev",
  "build":          "prisma generate && next build",
  "start":          "next start",
  "typecheck":      "tsc --noEmit",
  "format":         "prettier --write \"**/*.{ts,tsx}\"",
  "create-feature": "node scripts/create-feature.mjs"
}
```

---

## 10. Seed Data

Running `npx tsx prisma/seed.ts` creates the following test scenario:

### Users

| Username | Password | Role | Notes |
|---|---|---|---|
| `admin` | `FabMemories123!` | ADMIN | Login at `/staff-login` |
| `coordinator` | `FabMemories123!` | COORDINATOR | Maria Santos |
| `coordinator2` | `FabMemories123!` | COORDINATOR | James Villanueva |
| `coordinator3` | `FabMemories123!` | COORDINATOR | Kristine Uy |
| `coordinator4` | `FabMemories123!` | COORDINATOR | Paolo Mendoza |
| `vendor` | `FabMemories123!` | VENDOR | Juan dela Cruz |
| `anna.fabmemories@example.com` | `FabMemories123!` | CLIENT | Login at `/sign-in` |
| `ben.fabmemories@example.com` | `FabMemories123!` | CLIENT | Login at `/sign-in` |

### Seeded Bookings

| # | Client | Event | Status | Plan | Notes |
|---|---|---|---|---|---|
| 1 | Anna | Debut (+45d, Cebu) | CONFIRMED | INSTALLMENT | Deposit verified, inst#1 paid, inst#2 submitted. 3 vendors (2 confirmed). 3 primary + 1 backup coordinator. |
| 2 | Ben | Corporate (+60d, Cebu) | CONFIRMED | FULL | Deposit verified, full balance submitted. 1 vendor confirmed. No staff assigned. |
| 3 | Anna | Wedding (+90d, Negros) | PENDING | (no terms) | Awaiting contract terms. 3 vendor categories requested. No staff. |
| 4 | Ben | Birthday (+45d, Cebu) | PENDING | FULL | Deposit overdue. Same date as Anna's Debut — seeded coordinator conflict (FR-40). |
| 5 | Anna | Wedding (past) | CANCELLED | — | Cancelled booking for testing. |

### Seeded Vendors

Bloom & Petal Florals · Lens & Frame Photography · CineVision Videography · Feria Catering Services · Glow Events Decoration

---

## 11. API Reference

### Bookings
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/bookings` | ADMIN/COORDINATOR/CLIENT | List bookings (role-scoped) |
| POST | `/api/bookings` | CLIENT | Create booking request |
| GET | `/api/bookings/[id]` | ADMIN/COORDINATOR/CLIENT | Get single booking |
| PATCH | `/api/bookings/[id]` | ADMIN | Update booking |
| POST | `/api/bookings/[id]/contract-terms` | ADMIN | Set payment plan + due dates |
| POST | `/api/bookings/[id]/cancel-request` | CLIENT | Request cancellation |
| GET | `/api/bookings/availability` | Any auth | Check date availability |
| GET/POST | `/api/bookings/[id]/installments` | ADMIN | Installment schedule |
| GET/POST | `/api/bookings/[id]/staff` | ADMIN | Staff assignments |
| DELETE | `/api/bookings/[id]/staff/[assignmentId]` | ADMIN | Remove assignment |
| GET/POST | `/api/bookings/[id]/vendors` | ADMIN | Booking vendors |
| PATCH/DELETE | `/api/bookings/[id]/vendors/[vendorId]` | ADMIN | Update/remove vendor |

### Payments
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/payments` | ADMIN/COORDINATOR | List all payments |
| POST | `/api/payments` | CLIENT | Submit payment + proof |
| POST | `/api/payments/manual` | ADMIN/COORDINATOR | Record manual payment |
| POST | `/api/payments/[id]/verify` | ADMIN/COORDINATOR | Verify or flag payment |

### Packages
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/public/packages` | None | Public package listing |
| GET | `/api/packages` | Any auth | Staff package listing |
| POST | `/api/packages` | ADMIN | Create package |
| PATCH/DELETE | `/api/packages/[id]` | ADMIN | Update/delete package |

### Vendors
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET/POST | `/api/vendors` | ADMIN | Vendor directory |
| PATCH/DELETE | `/api/vendors/[id]` | ADMIN | Update/delete vendor |
| GET | `/api/vendor-brief/[bookingId]` | None | Public vendor brief |

### Staff
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/staff` | ADMIN/COORDINATOR | Coordinator roster |
| GET | `/api/staff/calendar` | ADMIN/COORDINATOR | Calendar month view |
| GET | `/api/staff/my-schedule` | COORDINATOR | Own assignments |
| GET | `/api/staff/my-dashboard` | COORDINATOR | Own dashboard stats |
| GET/POST/DELETE | `/api/staff-accounts/[id]` | ADMIN | Staff account management |

### Audit & Reports
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/audit` | ADMIN | Paginated audit log |
| GET | `/api/audit/stats` | ADMIN | Aggregate stats |
| GET | `/api/audit/verify` | ADMIN | Full chain integrity check |
| GET | `/api/reports/dashboard` | ADMIN | Admin dashboard summary |

---

## 12. Key Design Decisions

### Server-Side Price Resolution
When a client submits a booking, `agreedPrice` is resolved server-side by reading the package record from the database. The client cannot pass a manipulated price value — the API ignores any price from the request body.

### Hash-Chained Audit Trail
The audit log uses a SHA-256 hash chain (similar to a blockchain) where each entry's hash incorporates the previous entry's hash. This means that altering any historical audit record — even a single character — will cause every subsequent hash to fail verification. The `AuditChainState` singleton row is locked with `SELECT ... FOR UPDATE` inside every write transaction, ensuring no two concurrent `logAction()` calls can ever produce the same `previousHash` (which would fork the chain).

### Canonical JSON for Audit Hashing
Postgres's `jsonb` type reorders object keys on storage. Since the same logical metadata must hash identically whether computed at write time or at verification time, all metadata is serialized through `canonicalStringify()` (key-sorted, deterministic) before hashing.

### Signed Storage URLs
Payment proof images are stored in Supabase Storage under a private bucket. The API generates short-lived signed URLs on every fetch — the client never gets a permanent public URL to proof images.

### Date Availability Rule
The system enforces a one-CONFIRMED-event-per-date rule. PENDING bookings on the same date are allowed (for quotes/exploratory requests), but a second `CONFIRMED` booking on the same calendar day is rejected at the API level.

### Feature Slice Architecture
All business logic lives in `features/<module>/`:
- `<module>.types.ts` — TypeScript interfaces
- `<module>.schema.ts` — Zod validation schemas
- `<module>.query.ts` — Prisma DB queries (server-only)
- `<module>.api.ts` — Axios API functions (client-side)
- `<module>.hooks.ts` — TanStack Query hooks
- `<module>.constants.ts` — Labels, enums, display config
- `components/` — React UI components for this module

This keeps concerns co-located and makes each module independently understandable.
