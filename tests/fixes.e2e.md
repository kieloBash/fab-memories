# Payment Fixes — End-to-End Test Cases

Accounts (all passwords: `FabMemories123!`):
- Admin: `admin` → `/staff-login`
- Coordinator: `coordinator` → `/staff-login`  
- Anna: `anna.fabmemories@example.com` → `/sign-in`
- Ben: `ben.fabmemories@example.com` → `/sign-in`

Migration required:
```bash
npx prisma migrate dev --name add-full-balance-payment-type
npx prisma generate
npx prisma db seed
```

---

## Issue 1 — Edit booking: phone field missing

### TC-01-A — Edit page pre-fills phone correctly

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Open a PENDING booking → click "Edit" | Navigates to `/portal/bookings/[id]/edit` |
| 2 | Anna | Check "Mobile contact number" field | Pre-filled with existing `clientPhone` value (e.g. `09171234567`) |
| 3 | Anna | Clear the phone field | "Submit" button disables |
| 4 | Anna | Enter invalid phone `abc123` | Red error: "Enter a valid PH mobile number" |
| 5 | Anna | Enter valid phone `09281234567` | Green "Valid mobile number" |
| 6 | Anna | Save changes | Booking updated. Admin sees new phone number |

**Pass:** Phone field present, pre-filled, validated, saved correctly.

---

### TC-01-B — Edit page blocked for non-PENDING bookings

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Navigate directly to `/portal/bookings/[confirmedId]/edit` | Amber warning: "Only pending bookings can be edited. Status: CONFIRMED" |
| 2 | Anna | No form shown | Correct — edit blocked |

---

## Issue 2 — Deposit paid ≥ deposit required

### TC-02-A — Deposit paid exactly equals required → correct display

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Set `depositAmount = ₱15,000` on Ben's Corporate booking | Terms saved |
| 2 | Ben | Submit deposit proof for exactly ₱15,000 | Submitted |
| 3 | Admin | Verify deposit | Payment verified |
| 4 | Ben | Payment page → deposit section | Shows "Amount paid: ₱15,000". No overpaid notice |
| 5 | Ben | Full balance section | Shows "Agreed price ₱50,000 − Deposit ₱15,000 = Balance due ₱35,000" |

**Pass:** Balance correctly calculates as `agreedPrice − actualDepositPaid`.

---

### TC-02-B — Deposit paid more than required → overpaid notice + adjusted balance

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Set `depositAmount = ₱15,000` | |
| 2 | Ben | Submit deposit for ₱20,000 (₱5k over) | |
| 3 | Admin | Verify ₱20,000 deposit | |
| 4 | Ben | Payment page → deposit section | Blue "Overpaid" notice: "You paid ₱20,000 — ₱5,000 more than required. This will be applied toward your remaining balance." |
| 5 | Ben | Full balance section | Balance due = ₱50,000 − ₱20,000 = **₱30,000** (not ₱35,000) ← Key fix |
| 6 | Admin | Installments page (if INSTALLMENT plan) | Balance to schedule = ₱50,000 − ₱20,000 = ₱30,000 |

**Pass:** Overpaid deposit correctly reduces the remaining balance everywhere.

---

### TC-02-C — Deposit exactly covers full price → balance is zero

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Set agreedPrice = ₱30,000, deposit = ₱30,000 | API rejects: "Deposit must be less than agreed price" |
| 2 | Admin | Set deposit = ₱29,999 | Saves |
| 3 | Client | Pays ₱29,999 deposit, admin verifies | |
| 4 | Client | Payment page | Remaining balance = ₱1 |

**Pass:** Validation prevents deposit ≥ agreedPrice.

---

## Issue 3 — Full plan: client has no way to pay remaining balance

### TC-03-A — Full plan remaining balance section appears after deposit verified

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Ben | Open `/portal/bookings/[corpId]/payment` after deposit verified | "Remaining balance" section visible below deposit section |
| 2 | Ben | Section shows | Agreed price ₱50,000 · Deposit paid ₱15,000 · Balance due ₱35,000 |
| 3 | Ben | Due date shown | "Balance due by [fullPaymentDueDate]" |
| 4 | Ben | Click "Pay remaining balance (₱35,000)" | `PaymentProofUpload` form appears with `paymentType=FULL_BALANCE`, amount pre-filled ₱35,000 |
| 5 | Ben | Submit with reference number | Toast "Full balance payment submitted". "Under review" notice appears |
| 6 | Admin | Payments list | New payment with type "Full Balance Payment" + status "Submitted" |
| 7 | Admin | Verify the payment | Payment verified |
| 8 | Ben | Payment page | "Fully paid — no outstanding balance" |

**Pass:** Full plan clients can pay their remaining balance through the UI.

---

### TC-03-B — Full plan: installment schedule NOT shown

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Ben | Payment page (FULL plan, deposit verified) | "Installment schedule" section does NOT appear |
| 2 | Admin | Booking detail | "Installment schedule" button does NOT appear in the right panel |

**Pass:** FULL plan never shows installment UI.

---

### TC-03-C — Full balance already submitted → "Pay" button replaced by "Under review"

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Ben | Submit full balance proof | Submitted |
| 2 | Ben | Refresh payment page | "Payment under review" amber notice. "Pay remaining balance" button gone |
| 3 | Ben | Cannot submit again | Correct — prevents double submission |

---

## Issue 4 — Deposit due date overdue

### TC-04-A — Deposit overdue: client payment page shows warning

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Ben | Open Birthday booking payment page (deposit overdue by 3 days per seed) | Red "Deposit overdue" banner: "Your deposit was due on [date]. Please submit your payment as soon as possible or contact us." |
| 2 | Ben | Deposit form still visible | Yes — client can still submit even after due date |
| 3 | Ben | Submit deposit | Form works normally |

**Pass:** Overdue warning shown but doesn't block submission.

---

### TC-04-B — Deposit overdue: no warning if submitted/verified

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Ben | Submit deposit after due date | Status: Submitted |
| 2 | Ben | Refresh payment page | Overdue warning disappears (replaced by "Under review" amber notice) |
| 3 | Admin | Verify deposit | Booking confirmed |
| 4 | Ben | Payment page | No overdue warning. Deposit section shows "Verified" |

**Pass:** Overdue banner only shows when deposit is missing AND due date is past.

---

### TC-04-C — Full balance overdue: warning on client payment page

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Set `fullPaymentDueDate` to yesterday | |
| 2 | Client | Open payment page after deposit verified (FULL plan) | Red "Balance overdue" banner: "was due [date]. Please pay immediately." |
| 3 | Client | "Pay remaining balance" button still present | Yes — still actionable |

**Pass:** Full balance overdue shown as red; deposit overdue also shown as red.

---

### TC-04-D — No due date set → no overdue warning

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Set contract terms without `depositDueDate` or `fullPaymentDueDate` | |
| 2 | Client | Payment page | No overdue warning shown at all |

**Pass:** Overdue logic is gated on due date being set.

---

## Issue 5 — Admin manual payment recording

### TC-05-A — Admin records cash deposit (confirms booking)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open a PENDING booking with terms set | |
| 2 | Admin | Click "Record manual payment" | Navigates to `/staff/admin/bookings/[id]/manual-payment` |
| 3 | Admin | Info banner shown | "Payment will be marked as verified immediately — no proof required" |
| 4 | Admin | Select "Reservation Deposit", method CASH, amount ₱15,000 | |
| 5 | Admin | Add note "Cash received during site visit Aug 29" | |
| 6 | Admin | Click "Record payment as verified" | Toast "Deposit recorded — booking confirmed" |
| 7 | Admin | Return to booking | Status now CONFIRMED. Deposit section shows VERIFIED, method CASH |
| 8 | Client | Payment page | Deposit verified. Remaining balance / installment section visible |

**Pass:** Manual deposit records as VERIFIED and confirms booking in one step.

---

### TC-05-B — Admin records cash full balance payment

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open CONFIRMED booking with FULL plan (deposit already verified) | |
| 2 | Admin | Click "Record manual payment" | |
| 3 | Admin | "Full Balance Payment" option shown with hint "Remaining: ₱35,000" | |
| 4 | Admin | Select FULL_BALANCE, CASH, amount ₱35,000 | |
| 5 | Admin | Submit | Toast "Full balance payment recorded" |
| 6 | Client | Payment page | "Fully paid — no outstanding balance". ₱0 remaining |

**Pass:** Manual full balance payment recorded and balance recalculates correctly.

---

### TC-05-C — Admin records installment payment manually

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open CONFIRMED booking with INSTALLMENT plan | |
| 2 | Admin | Click "Record manual payment" | |
| 3 | Admin | Select "Installment Payment" | Installment selector dropdown appears |
| 4 | Admin | Select "Installment #2 — ₱17,442 (due Aug 29)" | |
| 5 | Admin | Method CASH, amount ₱17,442 | |
| 6 | Admin | Submit | Toast "Installment payment recorded" |
| 7 | Admin | Installments page | Installment #2 → PAID |
| 8 | Client | Payment page | Installment #2 shows "Paid". Running balance updated |

**Pass:** Manual installment payment correctly links to the right installment and marks it PAID.

---

### TC-05-D — Admin manual payment: fullPaymentDueDate visible in contract terms form

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open PENDING booking → contract terms form | |
| 2 | Admin | Select "Full Payment" plan | "Full balance due by" date field appears |
| 3 | Admin | Select "Installment Plan" | Full balance due date field disappears |
| 4 | Admin | Select "Full Payment" again, set date | Saved |
| 5 | Client | Payment page | Due date shown in balance section |

**Pass:** `fullPaymentDueDate` only shown/saved for FULL plan.

---

### TC-05-E — Manual payment page shows "No outstanding payments" when fully paid

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Record manual full balance payment (booking now fully paid) | |
| 2 | Admin | Navigate to `/staff/admin/bookings/[id]/manual-payment` again | "No outstanding payments for this booking" message shown |

**Pass:** Form correctly detects no remaining payment types available.

---

## Edge Cases

| # | Scenario | Expected |
|---|----------|----------|
| E1 | Admin tries manual INSTALLMENT without selecting installment | "Record payment" button disabled |
| E2 | Admin tries manual FULL_BALANCE on PENDING (unconfirmed) booking | API 409: "Booking must be confirmed before recording non-deposit payments" |
| E3 | Client submits FULL_BALANCE payment via API (bypassing INSTALLMENT plan UI) | Payment saved as SUBMITTED — admin verifies or flags as usual |
| E4 | Deposit verified, full balance verified = agreedPrice → "Fully paid" | "Fully paid" banner. No more payment actions |
| E5 | Admin records ₱0 amount manually | "Record payment" button disabled (amount must be > 0) |
| E6 | Deposit overdue, admin records manual deposit | Booking confirmed. Overdue warning disappears from client view |
| E7 | Full balance payment FLAGGED → client can resubmit | Re-submit form appears (same as deposit flagged flow) |
| E8 | Multiple FULL_BALANCE payments (partial payments) | Each adds to `fullBalancePaid` total. Balance reduces accordingly |
