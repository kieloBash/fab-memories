# Fab Memories Events — End-to-End Happy Path Testing

> **Purpose:** Demonstrates the complete inner workings of the Fab Memories Events system by walking through the full lifecycle of a single wedding booking — from client sign-up to a confirmed, fully-paid event with staff and vendors assigned — in the exact order that each actor would experience it in real use.
>
> **Prerequisite:** Run `npx tsx prisma/seed.ts` before testing, or start fresh. All steps below use the seeded test accounts.

---

## Actors & Login Credentials

| Actor | Role | Login URL | Credentials |
|---|---|---|---|
| **Anna Reyes** | Client | `/sign-in` | `anna.fabmemories@example.com` / `FabMemories123!` |
| **System Admin** | Admin | `/staff-login` | `admin` / `FabMemories123!` |
| **Maria Santos** | Coordinator | `/staff-login` | `coordinator` / `FabMemories123!` |
| **Bloom & Petal** (external) | Vendor | No login — via shareable URL | N/A |

---

## Overview: The Happy Path in 8 Stages

```
Stage 1: Client browses packages (public, no login)
Stage 2: Client registers and creates a booking
Stage 3: Admin reviews and confirms the booking (sets contract terms)
Stage 4: Client submits deposit payment
Stage 5: Admin verifies the deposit → booking goes CONFIRMED
Stage 6: Admin assigns staff coordinator
Stage 7: Admin assigns vendors + shares vendor brief
Stage 8: Admin sets installment schedule → client pays installments
```

---

## Stage 1 — Client Browses Packages (Public)

**Actor:** Anonymous visitor (no login required)

### Step 1.1 — Visit the landing page

1. Navigate to `http://localhost:3000`.
2. The landing page loads with Hero, Features, Roles, Stats, and CTA sections.
3. The "Browse Packages" button or navbar link navigates to `/packages`.

### Step 1.2 — Browse available packages

1. Navigate to `/packages`.
2. The public package listing loads (calls `GET /api/public/packages` — no authentication required).
3. You should see packages including:
   - **Classic Wedding Package** — ₱85,000 (metro) / ₱97,750 (provincial)
   - **Elegant Debut Package** — ₱65,000 (metro) / ₱74,750 (provincial)
   - **Corporate Events Package** — ₱50,000 (metro)
   - **Birthday Celebration Package** — ₱30,000 (metro)
4. Clicking a package shows inclusions (e.g., "8-hour coverage", "Bridal car", "Floral centerpieces").

**✅ Expected:** All active packages render without authentication. No price manipulation is possible at this stage.

---

## Stage 2 — Client Registers and Creates a Booking

**Actor:** Anna Reyes (Client)

### Step 2.1 — Sign up

1. Navigate to `/sign-up`.
2. Clerk renders the sign-up form.
3. Register with email `anna.fabmemories@example.com` and password `FabMemories123!`.
4. *(If using seed data, Anna already exists — skip to Step 2.2 and just sign in at `/sign-in`.)*
5. After registration, Clerk fires a webhook to `/api/webhooks/clerk`, which creates the `User` record in the database with `role: CLIENT`.
6. Anna is redirected to `/portal` (the client dashboard).

**✅ Expected:** After login, Anna lands at `/portal`. The "No bookings yet" empty state is shown.

### Step 2.2 — Create a new booking

1. From the client portal dashboard, click **"Request a booking"** (or **"New booking"** in the header).
2. Navigate to `/portal/bookings/new`.
3. Fill in the booking form:
   - **Event type:** Wedding
   - **Package:** Classic Wedding Package
   - **Event date:** Pick a future date that is currently available (not already confirmed by another booking).
   - **Event time:** (optional) e.g., 4:00 PM
   - **Venue:** Type "The Ruins" — the venue picker (Google Maps integration) should offer a formatted address and pin coordinates.
   - **Guest count:** 120
   - **Is provincial:** Yes (The Ruins is in Negros Occidental)
   - **Contact phone:** 09171234567
   - **Desired vendor categories:** Photography, Catering, Florals
   - **Notes:** "String quartet during the reception."
4. Click **Submit Booking Request**.

**What happens behind the scenes:**
- `POST /api/bookings` is called.
- The API validates the request with Zod (`createBookingSchema`).
- It checks date availability: `isDateAvailable(eventDate)` — queries for existing `CONFIRMED` bookings on that date.
- It resolves `agreedPrice` **server-side** from the package: since `isProvincial = true`, it uses `priceProvincial = 97750` — the client cannot override this.
- A new `Booking` record is created with `status: PENDING`.
- An audit log entry is written: `CREATE / BOOKING / "Client 'Anna Reyes' submitted a booking request for [date]"`.

**✅ Expected:**
- Anna is redirected to the booking detail page at `/portal/bookings/[bookingId]`.
- Status shows **PENDING**.
- `agreedPrice` shows **₱97,750.00** (server-resolved provincial price).
- A "Awaiting confirmation" message is visible.
- No payment options are shown yet (no contract terms set).

---

## Stage 3 — Admin Reviews and Confirms the Booking

**Actor:** System Admin

### Step 3.1 — Log in as Admin

1. Navigate to `/staff-login`.
2. Log in with `admin` / `FabMemories123!`.
3. Redirected to `/staff/admin` (Admin Dashboard).

**✅ Expected:** The Admin dashboard loads showing:
- **Pending requests:** at least 1 (Anna's new booking).
- **Needs Attention** list shows Anna's booking under "Contract terms not yet set."

### Step 3.2 — Review the pending booking

1. Click **"Bookings"** in the admin sidebar or navigate to `/staff/admin/bookings`.
2. Filter by status **"Pending"**.
3. Find Anna Reyes' Wedding booking and click to open it.
4. Review the booking details: event date, venue, guest count, agreed price ₱97,750, vendor categories requested.

### Step 3.3 — Set contract terms (confirm booking)

1. On the booking detail page, find the **"Contract Terms"** section.
2. Click **"Set Contract Terms"**.
3. Fill in:
   - **Payment plan:** Installment
   - **Deposit amount:** ₱29,325 (30% of ₱97,750)
   - **Deposit due date:** 7 days from today
   - **Staff note:** "Provincial wedding — 3-month installment plan agreed with client."
4. Click **Save Terms**.

**What happens behind the scenes:**
- `POST /api/bookings/[bookingId]/contract-terms` is called.
- The booking record is updated with `paymentPlan: INSTALLMENT`, `depositAmount`, `depositDueDate`.
- The booking status changes to... *(still PENDING — it becomes CONFIRMED only after the deposit is verified).*
- Audit log: `CONFIRM / BOOKING / "Admin set contract terms for booking [id]"`.

**✅ Expected:**
- The booking now shows the payment plan, deposit amount, and due date.
- The "Needs Attention" item for this booking changes from "Contract terms not set" to "Deposit awaiting payment."

---

## Stage 4 — Client Submits Deposit Payment

**Actor:** Anna Reyes (Client)

### Step 4.1 — Log back in as Anna

1. Log out of the admin account.
2. Navigate to `/sign-in` and log in as `anna.fabmemories@example.com`.
3. Navigate to `/portal` — Anna can now see contract terms have been set.

### Step 4.2 — Submit deposit payment

1. Open the booking detail at `/portal/bookings/[bookingId]`.
2. The **"Payment Summary"** section now shows:
   - Total: ₱97,750.00
   - Deposit due: ₱29,325.00
   - Due date: [the date Admin set]
3. Click **"Pay Deposit"** or navigate to `/portal/bookings/[bookingId]/payment`.
4. Fill in the payment form:
   - **Payment method:** GCash
   - **Reference number:** GC-TEST-001
   - **Upload proof:** attach any image file (simulating a GCash screenshot)
5. Click **Submit Payment**.

**What happens behind the scenes:**
- The proof image is uploaded to Supabase Storage (private bucket). A `proofStoragePath` is stored.
- `POST /api/payments` creates a `Payment` record with `status: SUBMITTED`, `paymentType: DEPOSIT`.
- An audit log entry is written: `CREATE / PAYMENT / "Client submitted deposit payment for booking [id]"`.

**✅ Expected:**
- Payment shows as **"Submitted — Under Review"**.
- A confirmation message appears: "Your payment has been submitted and is pending verification."
- Anna cannot make further payments until the deposit is verified.

---

## Stage 5 — Admin Verifies the Deposit → Booking Confirmed

**Actor:** System Admin

### Step 5.1 — Log in as Admin

1. Log in at `/staff-login` as `admin`.
2. The Admin Dashboard now shows:
   - **Payments to verify:** 1 (highlighted in amber if > 0).
   - **Needs Attention** list shows Anna's deposit as "Payment awaiting verification."

### Step 5.2 — Verify the payment

1. Navigate to `/staff/admin/payments`.
2. Filter by status **"Submitted"**.
3. Click on Anna's deposit payment.
4. The payment detail shows: amount ₱29,325, method GCash, reference GC-TEST-001, and the uploaded proof image (served via a signed Supabase URL).
5. Review the image, then click **"Verify Payment"**.
6. Add a verification note: "GCash screenshot confirmed. Ref GC-TEST-001."
7. Click **Confirm Verification**.

**What happens behind the scenes:**
- `POST /api/payments/[paymentId]/verify` is called with `{ action: "verify", note: "..." }`.
- Payment status → `VERIFIED`.
- `Booking.depositVerifiedAt` and `depositVerifiedById` are set.
- **Booking status changes to `CONFIRMED`** (because the deposit has now been verified).
- Audit log: `VERIFY / PAYMENT / "Admin verified deposit payment [id] for booking [id]"`.

**✅ Expected:**
- Payment status shows **"Verified ✓"**.
- Booking status changes to **"Confirmed"** (visible in both admin and client views).
- The Admin Dashboard "Active bookings" counter increments.
- The "Payments to verify" counter decrements.

---

## Stage 6 — Admin Assigns a Staff Coordinator

**Actor:** System Admin

### Step 6.1 — Open the confirmed booking

1. Navigate to `/staff/admin/bookings/[bookingId]`.
2. Find the **"Staff Assignments"** panel.
3. The staffing recommendation banner shows: **"120 guests → 3–5 coordinators recommended"** (FR-37).

### Step 6.2 — Assign Maria Santos as lead coordinator

1. Click **"Assign Coordinator"**.
2. The assign dialog opens showing all active coordinators with their upcoming event counts.
3. Select **"Maria Santos"** (coordinator).
4. Set:
   - **Task role:** Lead Coordinator
   - **Notes:** "Main point of contact on-site for the client."
   - **Is backup:** No
5. Click **Assign**.

**What happens behind the scenes:**
- `POST /api/bookings/[bookingId]/staff` is called.
- A `StaffAssignment` record is created linking Maria Santos to Anna's booking.
- FR-40 conflict check runs: if Maria is already assigned to another event on the same date, a **warning** is shown (non-blocking — admin can still assign, but is informed).
- Audit log: `CREATE / STAFF_SCHEDULE / "Admin assigned coordinator Maria Santos to booking [id]"`.

**✅ Expected:**
- Maria Santos appears in the Staff Assignments panel with role "Lead Coordinator."
- The staffing compliance indicator updates (still below recommended count of 3–5 → amber warning).

### Step 6.3 — Assign additional coordinators

1. Repeat the assign process for **Kristine Uy** (Guest Registration) and **Paolo Mendoza** (Vendor Liaison).
2. After 3 primary coordinators, the compliance banner should turn **green** ("Meets recommended staffing").

**✅ Expected:**
- Admin Dashboard "understaffed events" count decreases.
- The booking detail shows 3 assigned coordinators.

### Step 6.4 — Coordinator views their schedule

1. Log out of admin.
2. Log in as `coordinator` (Maria Santos) at `/staff-login`.
3. Navigate to `/staff/coordinator`.
4. **Coordinator Dashboard** shows:
   - Upcoming assignments count: at least 1.
   - Anna's Wedding appears in the "This week / upcoming" list.
5. Navigate to `/staff/coordinator/calendar`.
6. The **Staffing Calendar** shows the event date marked, with a compliance dot.

**✅ Expected:** Maria Santos can see her assignment, the event details, and the staffing calendar — but cannot modify bookings, payments, or staff assignments.

---

## Stage 7 — Admin Assigns Vendors and Shares the Vendor Brief

**Actor:** System Admin

### Step 7.1 — Open the booking's vendor panel

1. Log back in as admin. Navigate to the booking detail.
2. Find the **"Vendor Assignments"** panel.
3. Anna requested: Photography, Catering, Florals — these are shown as requested categories.

### Step 7.2 — Assign a photographer

1. Click **"Assign Vendor"** for the Photography category.
2. The vendor picker filters the directory to Photography vendors.
3. Select **"Lens & Frame Photography"**.
4. Add notes: "Full-day package. ₱25,000 agreed."
5. Mark as **Contacted** (today's date).
6. Click **Assign**.

**What happens behind the scenes:**
- `POST /api/bookings/[bookingId]/vendors` creates a `BookingVendor` record.
- Audit log: `CREATE / VENDOR / "Admin assigned vendor Lens & Frame Photography (Photography) to booking [id]"`.

### Step 7.3 — Mark vendor as confirmed

1. After receiving confirmation from the vendor, click **"Mark as Confirmed"** on the Lens & Frame Photography assignment.
2. `confirmedAt` is set to today.

### Step 7.4 — Assign catering and florals vendors

1. Repeat for **Feria Catering Services** (Catering) and **Bloom & Petal Florals** (Florals).
2. Mark all as contacted and confirmed.

**✅ Expected:**
- All 3 requested vendor categories now show a confirmed vendor.
- Admin Dashboard "vendor gap" count for this booking clears → green.

### Step 7.5 — Share the vendor brief

1. On the booking detail page, find the **"Vendor Brief"** section next to Bloom & Petal's assignment.
2. Click **"Copy Brief Link"** (or the share icon).
3. The URL is copied: `https://[domain]/vendor-brief/[bookingId]?view=[bookingVendorId]`.

### Step 7.6 — View the vendor brief (as an external vendor)

1. Open the copied URL in a browser (no login required).
2. The **Vendor Event Brief** page loads showing:
   - Event type: Wedding
   - Event date and formatted venue address.
   - Guest count: 120
   - Package name: Classic Wedding Package
   - Package customizations (String quartet, Garden setup).
   - Notes: "String quartet during the reception."
   - Assignment section: "Your assignment — Florals 🌸 — Confirmed ✓"
   - Contacted and confirmed dates.
   - A Google Maps link to the venue pin.
3. **No client PII (phone, email) is shown. No pricing is shown. No other vendor data is shown.**

**✅ Expected:** External vendor sees only event logistics and their own assignment — nothing sensitive is exposed. The page is fully server-rendered with `cache: "no-store"`.

---

## Stage 8 — Installment Schedule Set and Client Pays

**Actor:** System Admin, then Anna Reyes (Client)

### Step 8.1 — Admin sets installment schedule

1. Log in as admin. Navigate to `/staff/admin/bookings/[bookingId]/installments`.
2. Create the installment schedule:
   - Total remaining after deposit: ₱97,750 − ₱29,325 = ₱68,425
   - **Installment 1:** ₱22,808 — due in 30 days
   - **Installment 2:** ₱22,808 — due in 60 days
   - **Installment 3:** ₱22,809 — due in 90 days (event − 1 week)
3. Click **Save Schedule**.

**✅ Expected:** 3 installment rows are created with status `UNPAID`.

### Step 8.2 — Client views and pays first installment

1. Log in as Anna at `/sign-in`.
2. Navigate to `/portal/bookings/[bookingId]`.
3. The Payment Summary now shows:
   - Deposit: ₱29,325 ✓ Verified
   - Installment 1: ₱22,808 — due [date] — **UNPAID**
   - Installment 2: ₱22,808 — due [date] — UNPAID
   - Installment 3: ₱22,809 — due [date] — UNPAID
4. Click **"Pay Installment 1"**.
5. Fill in: method Bank Transfer, reference BT-TEST-001, upload proof.
6. Submit.

**What happens:** Payment is created with `paymentType: INSTALLMENT`, linked to `installmentId` of Installment 1, status `SUBMITTED`.

### Step 8.3 — Admin verifies the installment payment

1. Log in as admin.
2. Navigate to `/staff/admin/payments`.
3. Find the submitted installment payment.
4. Verify it.

**What happens:**
- Payment → `VERIFIED`.
- The linked `Installment` record → `status: PAID`, `paidAt: now`.
- Audit log: `VERIFY / PAYMENT / "..."`.

**✅ Expected:** Installment 1 now shows "Paid ✓" with the verified date. The payment timeline is clearly visible to both admin and client.

---

## Bonus: Audit Trail Demonstration

**Actor:** System Admin

### View the audit log

1. Navigate to `/staff/admin/audit`.
2. The audit log table shows every action taken throughout this test run, including:
   - `LOGIN / AUTH` — Anna's sign-in
   - `CREATE / BOOKING` — Anna's booking submission
   - `CONFIRM / BOOKING` — Admin set contract terms
   - `VERIFY / PAYMENT` — Deposit verification
   - `CREATE / STAFF_SCHEDULE` — Each coordinator assignment
   - `CREATE / VENDOR` — Each vendor assignment
   - `VIEW / REPORT` — Dashboard accesses

3. Filter by **Module: BOOKING** to see only booking-related entries.
4. Filter by **Action: VERIFY** to see all payment verifications.

### Run the chain integrity check

1. At the top of the audit page, find the **"Chain Integrity"** widget.
2. Click **"Verify Chain Integrity"**.
3. The system walks every audit entry, recomputes each SHA-256 hash from the stored fields, and checks that each entry correctly chains from the previous one.

**✅ Expected:** 
- Result: **"Chain Valid — [N] entries verified ✓"** in green.
- The verification itself is recorded as a new audit entry (`VIEW / REPORT / "Admin ran a full audit chain integrity check — result: VALID"`).
- This means there is always a permanent record of *who* verified the chain and *when*.

---

## Summary of System Coverage Demonstrated

| Feature | Stage | Status |
|---|---|---|
| Public package browsing (no auth) | 1 | ✅ |
| Client registration + Clerk webhook sync | 2 | ✅ |
| Booking creation with server-side price resolution | 2 | ✅ |
| Date availability enforcement | 2 | ✅ |
| Admin contract terms (payment plan + due dates) | 3 | ✅ |
| Client payment submission + Supabase Storage upload | 4 | ✅ |
| Admin payment verification → booking confirmation | 5 | ✅ |
| Staff coordinator assignment + FR-37 compliance check | 6 | ✅ |
| FR-40 coordinator conflict detection | 6 | ✅ |
| Coordinator dashboard + calendar view | 6 | ✅ |
| Vendor assignment per category | 7 | ✅ |
| Vendor coverage gap detection | 7 | ✅ |
| Public vendor brief (no auth, scoped data) | 7 | ✅ |
| Installment schedule creation | 8 | ✅ |
| Client installment payment submission | 8 | ✅ |
| Admin installment verification | 8 | ✅ |
| Tamper-evident audit log with SHA-256 hash chain | Bonus | ✅ |
| Chain integrity verification (user-initiated) | Bonus | ✅ |
| Role-based access control (4 roles) | All | ✅ |
| RBAC enforced at middleware + API route layers | All | ✅ |
