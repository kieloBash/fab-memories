# Payment Flow — End-to-End Test Cases

Use the seeded accounts (all passwords: `FabMemories123!`):
- Admin:       `admin` / `/staff-login`
- Coordinator: `coordinator` / `/staff-login`
- Client Anna: `anna.fabmemories@example.com` / `/sign-in`
- Client Ben:  `ben.fabmemories@example.com` / `/sign-in`

---

## TC-01 — Deposit happy path (client submits, admin verifies, booking confirms) PASSED

**Bug fixed:** — baseline flow

| Step | Actor | Action | Expected result |
|------|-------|--------|-----------------|
| 1 | Anna | Go to a PENDING booking → Payment tab | Sees "Submit reservation deposit" form. Step indicator shows step 1 active |
| 2 | Anna | Enter GCash reference number `GC-TEST-001`, amount ₱9,000, click Submit | Toast "Deposit proof submitted". Status badge changes to **Submitted**. "Under review" amber banner appears. Form disappears |
| 3 | Admin | Go to `/staff/admin/payments` | New payment card appears with status **Submitted** |
| 4 | Admin | Click payment → verify with note "Confirmed" | Toast "Deposit verified — booking is now confirmed" |
| 5 | Anna | Refresh payment page | Status badge → **Verified**. Green "Deposit verified" banner. Step indicator moves to step 2. Installment schedule section appears (empty — "No schedule yet") |
| 6 | Admin | Booking detail → status | Booking status is now **Confirmed** |

**Pass criteria:** Booking flips to CONFIRMED exactly once. No double-confirmation possible.

---

## TC-02 — Deposit flagged → resubmit → re-verify (Bug 1 fix) PASSED

**Bug fixed:** Client UI was stuck showing the resubmit form even after re-verification.

| Step | Actor | Action | Expected result |
|------|-------|--------|-----------------|
| 1 | Anna | Submit deposit (ref `GC-TEST-BAD`) | Status: Submitted |
| 2 | Admin | Flag payment with note "Screenshot blurry" | Status: **Flagged** |
| 3 | Anna | Refresh payment page | Red "Deposit flagged" banner with staff note. Resubmit form is visible. Status badge: **Flagged** |
| 4 | Anna | Submit new deposit (ref `GC-TEST-002`) | Status: **Submitted**. Amber "Under review" banner. **Form disappears** ← Bug 1 fix |
| 5 | Admin | Go to payments list | Two DEPOSIT payments visible for this booking. Latest one is SUBMITTED |
| 6 | Admin | Verify the new (SUBMITTED) payment | Booking → CONFIRMED |
| 7 | Anna | Refresh payment page | Green "Deposit verified" banner. Step 2 active. **No resubmit form visible** ← Bug 1 fix |

**Pass criteria:** After step 4, the resubmit form must NOT be visible. After step 7, the green verified banner is shown, not the flagged or resubmit state.

---

## TC-03 — Installment schedule creation with deposit deduction (Bug 2 fix) PASSED

**Bug fixed:** Deposit amount was not deducted from the installment total — admin was forced to re-enter the full package price.

| Step | Actor | Action | Expected result |
|------|-------|--------|-----------------|
| 1 | Admin | Go to confirmed booking (package: ₱30,000, deposit: ₱9,000) → Installment schedule | Context card shows: Package ₱30,000 · Deposit paid ₱9,000 |
| 2 | Admin | View balance summary in the form | Shows: Package total ₱30,000 · Already paid ₱9,000 · **Left to schedule ₱21,000** |
| 3 | Admin | Default row should show ₱21,000 | First row amount pre-filled to ₱21,000 (not ₱30,000) ← Bug 2 fix |
| 4 | Admin | Click "Equal split", add 2 more rows (3 total) | Each row shows ₱7,000. Balance indicator: "✓ Balanced" |
| 5 | Admin | Save schedule | Toast "Schedule saved — 3 installments added". Table shows 3 rows ordered #1, #2, #3 |
| 6 | Admin | Installment schedule table | TOTAL shows ₱21,000. DEPOSIT column shows ₱9,000. REMAINING = ₱21,000 |
| 7 | Anna | Go to payment page → installment section | Summary: Package ₱30,000 · Deposit ₱9,000 · Installments paid ₱0 · Remaining ₱21,000. Progress bar: deposit segment fills ~30% |

**Pass criteria:** The form's "Left to schedule" equals `packagePrice − depositPaid`. The table's remaining balance equals `packagePrice − depositPaid − installmentsPaid`.

---

## TC-04 — Installment payment submits to correct installment (Bug 4 fix) PASSED

**Bug fixed:** Verify route was guessing the installment via `findFirst(UNPAID)` instead of reading the stored `installmentId`.

| Step | Actor | Action | Expected result |
|------|-------|--------|-----------------|
| 1 | Admin | Create schedule: 3 installments (₱7,000 each) | #1, #2, #3 all UNPAID |
| 2 | Anna | Click "Pay now" on installment **#2** | Dialog opens with amount ₱7,000 pre-filled |
| 3 | Anna | Submit with ref `GC-INST-002` | Toast "Installment payment proof submitted". Installment #2 row shows "Under review" badge |
| 4 | Admin | Go to payments list → find the installment payment | Payment links to installment #2 (verify via DB or payment detail) |
| 5 | Admin | Verify the payment | Toast "Installment payment verified" |
| 6 | Admin | Installment schedule table | Installment **#2** shows "Paid". #1 and #3 remain "Unpaid". ← Bug 4 fix (old code would have marked #1 Paid) |
| 7 | Anna | Payment page → installment schedule | #2 shows Paid. Remaining balance reduced by ₱7,000 |

**Pass criteria:** Exactly the installment the client chose is marked PAID, regardless of which installments are unpaid.

---

## TC-05 — Schedule replacement preserves paid installments (Bug 3 fix) PASSED

**Bug fixed:** Replacing the schedule was creating duplicate `order = 1` rows when a PAID installment already existed.

| Step | Actor | Action | Expected result |
|------|-------|--------|-----------------|
| 1 | Admin | Create 3-installment schedule (#1 ₱7k, #2 ₱7k, #3 ₱7k) | All UNPAID |
| 2 | Anna | Submit + Admin verifies payment for installment #1 | #1 → PAID |
| 3 | Admin | Go to installment schedule page | Locked paid section shows installment #1. Form shows "Left to schedule: ₱14,000" |
| 4 | Admin | Replace schedule — save 2 new rows (₱7k each) | Toast success |
| 5 | Admin | View full schedule table | Shows 3 rows total: #1 PAID (locked), #2 UNPAID, #3 UNPAID. No duplicate order numbers ← Bug 3 fix |
| 6 | Admin | Confirm row numbers | #1 = old paid, #2 and #3 = new replacements (offset correctly) |

**Pass criteria:** No duplicate order numbers. PAID installments cannot be deleted or re-ordered.

---

## TC-06 — Deposit screenshot upload (Supabase Storage) PASSED

| Step | Actor | Action | Expected result |
|------|-------|--------|-----------------|
| 1 | Anna | Go to payment page, click "Screenshot Upload" tab | File input visible with note "Accepted: JPEG, PNG, WebP — max 5 MB" |
| 2 | Anna | Try to upload a `.pdf` file | Error message: "Only JPEG, PNG, and WebP images are accepted." Upload button remains disabled |
| 3 | Anna | Try to upload an image >5MB | Error: "File size must not exceed 5 MB." |
| 4 | Anna | Upload a valid JPEG ≤ 5MB | File name shown in UI with file size |
| 5 | Anna | Click "Upload & Submit" | Loading spinner. On success: Toast "Deposit proof submitted". Status → Submitted |
| 6 | Admin | Go to payment detail | "View Screenshot" link is visible and clickable |
| 7 | Admin | Click "View Screenshot" | Opens signed URL in new tab — image is visible |
| 8 | Admin | Wait 1 hour, refresh | Signed URL has expired — image no longer accessible via old link (new fetch generates new signed URL) |

**Pass criteria:** Invalid files are rejected client-side before any upload attempt. Valid files upload to Supabase and produce a working signed URL.

---

## TC-07 — Role access controls

| Step | Actor | Action | Expected result |
|------|-------|--------|-----------------|
| 1 | Anna | `GET /api/payments` without `?bookingId=` | 400 Bad Request |
| 2 | Anna | `GET /api/payments?bookingId=<Ben's bookingId>` | 403 Forbidden |
| 3 | Anna | `PATCH /api/payments/<paymentId>/verify` | 403 Forbidden |
| 4 | Vendor | `POST /api/bookings/<id>/installments` | 403 Forbidden |
| 5 | Coordinator | `POST /api/bookings/<id>/installments` | 403 Forbidden (ADMIN only) |
| 6 | Admin | `POST /api/bookings/<id>/installments` on a PENDING booking | 409 Conflict — "can only be set for CONFIRMED bookings" |
| 7 | Admin | `PATCH /api/payments/<alreadyVerifiedId>/verify` | 409 Conflict — "Cannot verify a payment with status VERIFIED" |
| 8 | Admin | `PATCH /api/payments/<alreadyPaidInstallmentId>/verify` | 409 Conflict — "This installment is already marked as paid" |

---

## TC-08 — Edge cases & regression checks

| # | Scenario | Expected result |
|---|----------|-----------------|
| E1 | Client submits installment payment without `installmentId` in request body | 422 — "installmentId is required for installment payments" |
| E2 | Admin verifies an INSTALLMENT payment whose `installmentId` is null (submitted before fix) | 409 — "This installment payment has no linked installment" with helpful message |
| E3 | Admin replaces schedule when ALL installments are paid | Form shows "All payments accounted for" — no rows to edit, save button hidden |
| E4 | Client with 2 bookings: fetching payments for booking A returns only booking A's payments | Correct — ownership check enforced in GET /api/payments |
| E5 | Admin verifies deposit on a booking that's already CONFIRMED | 409 — "Cannot verify a payment with status VERIFIED" (payment is already VERIFIED) |
| E6 | Client cancels booking with a SUBMITTED deposit | Booking → CANCELLED. The SUBMITTED deposit stays SUBMITTED — admin reviews and refunds manually |
| E7 | Progress bar on installment table: deposit ₱9k on ₱30k package = 30% emerald segment | Correct stacked bar rendering |
| E8 | "Equal split" on 3 rows with ₱21,001 remaining (odd cent) | Row 1 = ₱7,000.33, Row 2 = ₱7,000.33, Row 3 = ₱7,000.34 (last row absorbs remainder) |
| E9 | Client views payment page while deposit is PENDING (never submitted) | No payment info shown. "Submit reservation deposit" form visible |
| E10 | Signed URL for proof image: network request fails silently | `proofImageUrl` returned as `null` — no crash, no broken image link |
