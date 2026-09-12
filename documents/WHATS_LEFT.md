# Fab Memories Events — What's Left / Missing Features

> **Purpose:** A clear, client-facing summary of features and functionality that are **not yet implemented** in the current build, organized by priority and module.
>
> **Current Build Status:** 7 of the planned modules are fully or partially implemented. The items below represent gaps between what is built and what a production-ready system would require.

---

## Quick Summary

| Category | Status |
|---|---|
| Core Booking Lifecycle | ✅ Complete |
| Payment & Installments | ✅ Complete |
| Staff Assignment & Scheduling | ✅ Complete |
| Vendor Management | ✅ Complete |
| Audit Trail (Hash Chain) | ✅ Complete |
| Admin Dashboard / Reports | ✅ Complete (basic) |
| Document Management | ⚠️ Placeholder only |
| Notifications / Email | ⚠️ Not wired |
| Client-facing Documents | ❌ Not started |
| Advanced Reporting / Analytics | ❌ Not started |
| Vendor Portal (Login & Quotations) | ❌ Scaffolded, not functional |
| Mobile Responsiveness Polish | ⚠️ Partial |
| Production Hardening | ⚠️ Not done |

---

## 1. Document Management Module

**Current state:** A placeholder page exists at both `/portal/documents` and `/staff/admin/documents` and `/staff/coordinator/documents` — all show a "Coming Soon" placeholder component. No document functionality is implemented.

**What's missing:**

### 1.1 — Contract / Agreement Generation
- Generate a PDF event contract from the confirmed booking details (event date, venue, package, agreed price, payment plan, payment schedule, cancellation terms).
- Admin triggers generation; PDF is stored in Supabase Storage.
- Client can view/download the contract from their portal.

### 1.2 — Document Signing
- Digital e-signature flow for the event contract (either DocuSign-style or a simple consent checkbox with audit log).
- Track when the client has signed the contract.
- Prevent booking confirmation without a signed contract (optional business rule).

### 1.3 — Document Storage & Access
- Admin can upload arbitrary documents per booking (e.g., venue permits, vendor contracts, program of events).
- Each document has a type (Contract, Permit, Receipt, Other) and access level (client-visible vs. internal only).
- Client portal shows only client-visible documents.

### 1.4 — Event Rundown / Program Builder
- Coordinator creates a program-of-events rundown for the event.
- Shareable as a PDF or via a link (similar to the vendor brief).

**Impact:** High — clients currently have no formal contract to reference, and coordinators have no shared event rundown tool.

---

## 2. Email & Notification System

**Current state:** Nodemailer is installed in `package.json` and the dependency is present, but **no email sending is wired to any trigger** in the system. Notifications are entirely absent.

**What's missing:**

### 2.1 — Transactional Email Triggers
The following events should send email notifications but currently do not:

| Trigger | Recipient | Email content |
|---|---|---|
| Booking created (PENDING) | Admin | "New booking request from [Client Name]" |
| Contract terms set | Client | "Your booking has been reviewed — deposit details enclosed" |
| Payment submitted | Admin | "New payment submitted for review — [Client Name], [Amount]" |
| Payment verified | Client | "Your payment of ₱[amount] has been verified ✓" |
| Payment flagged | Client | "Your payment was flagged — please resubmit with the correct proof" |
| Booking confirmed | Client | "Your event is CONFIRMED! Here are your booking details." |
| Booking cancelled | Client | "Your booking has been cancelled — contact us for more info" |
| Cancellation request received | Admin | "Client [Name] has requested a cancellation" |
| Coordinator assigned | Coordinator | "You have been assigned to [Event Type] on [Date]" |
| Installment due reminder | Client | "Friendly reminder: your installment of ₱[amount] is due in 7 days" |

### 2.2 — In-App Notification Bell
- The `NotificationBell` component exists in `features/layouts/components/NotificationBell.tsx` but is **not connected to any data source**.
- A `Notification` model and API need to be created.
- Notifications should be read/unread, and dismissible.

### 2.3 — SMS / Viber Notifications
- Many Philippine clients use Viber more than email. A Viber Business API or SMS gateway (e.g., Semaphore, Globe Labs) integration for critical notifications (payment confirmation, event reminders) is not present.

**Impact:** High — the entire payment and booking workflow is currently silent. Clients and staff must manually check the system for updates.

---

## 3. Vendor Portal (Internal Vendor Login)

**Current state:** The vendor role (`VENDOR`) exists in the RBAC system, and vendor login at `/staff-login` works. The vendor portal at `/staff/vendor` exists with two pages:
- `/staff/vendor` — Dashboard (placeholder / very minimal)
- `/staff/vendor/quotations` — Quotation list (placeholder)
- `/staff/vendor/history` — Booking history (placeholder)

The public **Vendor Brief** page (`/vendor-brief/[bookingId]`) works and is complete.

**What's missing:**

### 3.1 — Vendor Dashboard
- Show the vendor's assigned upcoming events.
- Link to each event's vendor brief.
- Show their confirmation status per event.

### 3.2 — Quotation Management
- Vendors can submit pricing quotations for a booking category they are assigned to.
- Admin can accept or reject quotations.
- Accepted quotations auto-populate the vendor notes field.

### 3.3 — Vendor Self-Service Brief Access
- Instead of relying on admin to share the URL, allow a logged-in vendor to see all their briefs from their dashboard.

**Impact:** Medium — the external vendor brief (shareable link) covers the most critical use case. The internal vendor portal is a "nice to have" for vendors who do repeated business.

---

## 4. Advanced Reports & Analytics

**Current state:** The admin dashboard at `/staff/admin/reports` renders a basic operational summary (active bookings, payments to verify, understaffed events, vendor gaps). There is no historical analytics, revenue reporting, or data export beyond the audit log CSV.

**What's missing:**

### 4.1 — Revenue Reports
- Monthly/quarterly revenue totals from verified payments.
- Revenue breakdown by event type (Wedding vs. Debut vs. Corporate).
- Outstanding balance tracking (total booked vs. total collected).
- Chart: revenue trend over time.

### 4.2 — Booking Volume Reports
- Number of bookings per month / per event type.
- Conversion rate: PENDING → CONFIRMED.
- Cancellation rate.
- Peak season identification.

### 4.3 — Exportable Reports
- Export booking list to CSV/Excel.
- Export payment records to CSV/Excel (for accounting/BIR compliance).
- *(Audit log CSV export is already implemented.)*

### 4.4 — Coordinator Performance Report
- Number of events handled per coordinator.
- On-time payment verification rates.

**Impact:** Medium — critical for business decision-making and financial compliance. The current dashboard is operational (day-to-day) but not analytical (month/quarter level).

---

## 5. Client Cancellation & Refund Workflow

**Current state:** Clients can request a cancellation (`CANCELLATION_REQUESTED`), and admin can cancel a booking. However, the **refund process is entirely manual and untracked** in the system.

**What's missing:**

### 5.1 — Cancellation Policy Configuration
- Admin configures cancellation policy rules (e.g., "100% refund if cancelled 60+ days before event; 50% refund if 30–59 days; 0% if < 30 days").
- Policy is shown to clients before they submit a cancellation request.

### 5.2 — Refund Tracking
- After admin approves a cancellation, record the refund amount and method.
- Track refund status (Pending, Processed).
- Show refund status on the client portal.

### 5.3 — Cancellation Audit
- Currently, the `cancellationReason` field exists but the admin's approval/decline of a `CANCELLATION_REQUESTED` booking is not distinctly audited with metadata (refund amount, reason for decline, etc.).

**Impact:** Medium — the basic flow (request, approve, cancel) works. Refund tracking and policy enforcement are missing.

---

## 6. Booking Edit / Amendment

**Current state:** A booking edit page exists at `/portal/bookings/[bookingId]/edit`, but it is minimal. Clients have no structured way to request changes to a confirmed booking.

**What's missing:**

### 6.1 — Client Amendment Request
- Client submits a formal amendment request (change guest count, venue, date, package add-ons).
- Admin reviews and approves/declines.
- If pricing changes, admin revises the agreed price and re-issues contract terms.

### 6.2 — Admin Booking Edit
- Admin can update booking details (venue, guest count, notes, customizations) directly.
- All edits are logged in the audit trail with a diff (before/after values).

**Impact:** Low-medium — currently the only way to change a confirmed booking is for admin to manually update the database.

---

## 7. Multi-Event / Recurring Client Support

**Current state:** The client portal now shows "other bookings" for multi-booking clients (recently added). However, the system has no structured support for:

### 7.1 — Client Loyalty / Repeat Client Tracking
- Flag returning clients.
- Show client booking history to admin when creating a new booking.
- Offer loyalty pricing adjustments.

### 7.2 — Event Series
- Corporate clients may book recurring monthly events. No series/recurrence concept exists.

**Impact:** Low — not a current business pain point for this company size.

---

## 8. Mobile Responsiveness & PWA

**Current state:** The layout uses Tailwind responsive classes and a `MobileTabBar` component for mobile navigation. Basic responsiveness is present, but several admin pages (tables, calendars, multi-column layouts) are **not fully optimized for small screens**.

**What's missing:**

### 8.1 — Mobile-Optimized Admin Tables
- The bookings table, payments table, and staff roster table are desktop-first and require horizontal scrolling on mobile.
- Consider card-based mobile layouts or collapsible row detail views.

### 8.2 — PWA / Installable App
- A `manifest.json` and service worker for PWA install on iOS/Android.
- Push notification support for mobile devices.
- Offline viewing of cached booking details.

### 8.3 — Camera-Integrated Payment Proof Upload
- On mobile, the payment proof upload should trigger the camera directly (capture payment receipt in real time).

**Impact:** Medium — many clients access the portal on mobile. Admin staff are likely on desktop, so lower urgency there.

---

## 9. Production Hardening (Non-Feature)

These are not features but are required before going live:

### 9.1 — Rate Limiting
- No rate limiting exists on any API route.
- The payment submission endpoint and auth endpoints are particularly vulnerable to abuse.
- Recommended: Upstash Redis + `@upstash/ratelimit`.

### 9.2 — Input Sanitization
- Zod validation is in place, but long text fields (notes, staff notes) are not sanitized against XSS.

### 9.3 — Error Monitoring
- No error tracking (e.g., Sentry) is configured.
- Unhandled exceptions will be silent in production.

### 9.4 — Environment Separation
- No staging/preview environment configuration.
- Seed data deletion command is not separated from production migration scripts.

### 9.5 — Database Backup
- No automated backup strategy is configured.
- Supabase managed backups should be enabled.

### 9.6 — Audit Log Immutability at DB Level
- The audit log is tamper-evident (hash chain) but not technically immutable at the database level.
- A dedicated Postgres role with INSERT-only on `AuditLog` (no UPDATE/DELETE) + a SQL script `prisma/scripts/revoke-audit-log-privileges.sql` exists but needs to be applied to production.

### 9.7 — Secrets Management
- Environment variables are currently in `.env`. For production, migrate to a secrets manager (Vercel Environment Variables, AWS Secrets Manager, or Doppler).

**Impact:** Critical before production launch.

---

## 10. Missing UI States & Edge Cases

Several screens have known gaps in their loading/empty/error states:

| Page | Missing State |
|---|---|
| `/portal/documents` | Entire feature is a placeholder |
| `/staff/vendor/quotations` | No quotation data model or API |
| `/staff/vendor/history` | No data connected |
| Coordinator booking detail | Manual payment button UI not wired in all paths |
| Client payment page | No loading state on image upload progress |
| Admin vendor form | No duplicate vendor detection (same name + category) |
| Booking list (admin) | No search/full-text filter (only status + event type + date range) |
| Staff calendar | Month navigation is present but no year navigation |

---

## Priority Ranking for Next Development Sprint

| Priority | Feature | Effort | Impact |
|---|---|---|---|
| 🔴 Critical | Email notifications (booking confirmed, payment verified) | Medium | Very High |
| 🔴 Critical | Document generation (PDF contract) | High | Very High |
| 🔴 Critical | Production hardening (rate limiting, Sentry, DB role) | Low-Medium | Very High |
| 🟠 High | Refund tracking on cancellations | Low | High |
| 🟠 High | Revenue / financial reports + CSV export | Medium | High |
| 🟠 High | In-app notification bell (real data) | Medium | High |
| 🟡 Medium | Mobile table responsiveness | Medium | Medium |
| 🟡 Medium | Vendor portal (login-based brief access) | Medium | Medium |
| 🟡 Medium | Client booking amendment request | Medium | Medium |
| 🟢 Low | PWA + push notifications | High | Medium |
| 🟢 Low | Quotation management (vendor portal) | High | Low |
| 🟢 Low | Recurring event series | High | Low |
