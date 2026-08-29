# Contract Terms, Payment Plan & Client Phone — E2E Test Cases

Accounts (all passwords: `FabMemories123!`):
- Admin: `admin` → `/staff-login`
- Coordinator: `coordinator` → `/staff-login`
- Anna: `anna.fabmemories@example.com` → `/sign-in`
- Ben: `ben.fabmemories@example.com` → `/sign-in`

Migration required:
```bash
npx prisma migrate dev --name add-contract-terms-phone
npx prisma generate
npx prisma db seed
```

---

## TC-CT-01 — Client phone required on new booking

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Go to `/portal/bookings/new` | Step 0 visible |
| 2 | Anna | Fill all fields except phone | "Choose a package" button stays disabled |
| 3 | Anna | Enter invalid phone `12345` | Red error: "Enter a valid PH mobile number" |
| 4 | Anna | Enter `091712345` (9 digits, too short) | Still invalid |
| 5 | Anna | Enter `09171234567` (correct format) | Green "Valid mobile number" message |
| 6 | Anna | Enter `+639171234567` (international format) | Also valid ✓ |
| 7 | Anna | Complete form + submit | Booking created with `clientPhone = "09171234567"` |

**Pass:** Cannot proceed without a valid PH mobile number.

---

## TC-CT-02 — Phone displayed in review step and on booking detail

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Submit booking with phone `09171234567` | Success |
| 2 | Anna | On Review step (step 3) | "Mobile: 09171234567" shown in summary |
| 3 | Anna | Open booking detail after submit | "Your contact" row shows `09171234567` |
| 4 | Admin | Open the same booking | "Client mobile" row shows `09171234567` as a `tel:` link |
| 5 | Admin | Click the phone link (on mobile) | Device initiates a call to the number |

**Pass:** Phone visible to both client and admin. Admin link is tappable.

---

## TC-CT-03 — Client can update phone when editing PENDING booking

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Open a PENDING booking → Edit | Phone field pre-filled |
| 2 | Anna | Change phone to `09281234567` | Valid ✓ |
| 3 | Anna | Save | Booking updated |
| 4 | Admin | Open booking | Phone shows `09281234567` |

**Pass:** Phone updates correctly on edit.

---

## TC-CT-04 — Admin sets contract terms (full flow)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open a PENDING booking with no terms set | Right panel shows "Contract terms" card with "Pending discussion" badge |
| 2 | Admin | Observe "Package standard price" row | Shows e.g. ₱85,000 (with arrow → ₱97,750 if provincial) |
| 3 | Admin | Override agreed price to `90000` | Input updates |
| 4 | Admin | Select "Installment Plan" | Card highlighted in pink |
| 5 | Admin | Enter deposit `27000`, deposit due date (future date) | Remaining balance preview: ₱90,000 − ₱27,000 = **₱63,000** |
| 6 | Admin | Enter staff note "Discussed via call — agreed ₱90k" | |
| 7 | Admin | Click "Save contract terms" | Toast "Contract terms saved". Badge → "Terms set" (green) |
| 8 | Admin | Refresh booking detail | "Contract terms" summary shows agreed price ₱90,000, INSTALLMENT plan, deposit ₱27,000, note |
| 9 | Anna | Refresh client booking detail | Step 1 "Contract terms agreed" → done ✓ with summary |
| 10 | Anna | Journey step 2 sublabel | Shows "Pay ₱27,000 to confirm your booking" |
| 11 | Anna | "Go to payments" button | Enabled (was disabled before terms set) |

**Pass:** Contract terms persist correctly. Client view updates to reflect them.

---

## TC-CT-05 — Agreed price override replaces auto-calculated price

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Books provincial Wedding (auto agreedPrice = ₱97,750) | |
| 2 | Admin | Open booking → set agreed price to `92000` | |
| 3 | Admin | Save | |
| 4 | Anna | Open booking card | Shows **₱92,000** (not ₱97,750) |
| 5 | Admin | Open installments page | Context card shows "Agreed price ₱92,000" |
| 6 | DB check | `Booking.agreedPrice` | `92000.00` |

**Pass:** Admin price override takes precedence and flows through to all displays.

---

## TC-CT-06 — Deposit amount must be less than agreed price

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Set agreed price `50000`, deposit amount `50000` | Error: "Deposit amount must be less than the agreed price" |
| 2 | Admin | Set deposit `55000` (more than agreed) | Same error |
| 3 | Admin | Set deposit `49999` | No error. Remaining: ₱1 |
| 4 | Admin | Try to save | API also validates (409 if deposit ≥ agreedPrice) |

**Pass:** Both client-side and server-side validation enforced.

---

## TC-CT-07 — Contract terms can only be set while PENDING

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open a CONFIRMED booking | "Contract terms" card NOT shown on right panel |
| 2 | Admin | Try `PATCH /api/bookings/[id]/contract-terms` directly on CONFIRMED booking | 409: "Contract terms can only be set while the booking is pending" |

**Pass:** Terms are immutable after confirmation.

---

## TC-CT-08 — Full Payment plan flow

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Set terms: FULL plan, deposit ₱15,000 on Ben's Corporate booking | Saved |
| 2 | Ben | Booking detail | Step 3 label: "Settle remaining balance" (not "Settle installments") |
| 3 | Ben | Journey step 3 sublabel after deposit verified | "Remaining: ₱35,000" |
| 4 | Admin | Booking detail right panel | Green "Full payment plan" card shown. No installment schedule CTA |
| 5 | Admin | Booking detail right panel — CONFIRMED | Does NOT show "Installment schedule" button |
| 6 | Ben | Payment page after deposit verified | Single "Pay remaining balance" section (not installment schedule) |

**Pass:** FULL plan hides installment schedule everywhere. Shows correct remaining balance.

---

## TC-CT-09 — Installment Plan flow

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Set terms: INSTALLMENT plan, deposit ₱22,425 on a booking | Saved |
| 2 | Admin | After deposit is verified, booking CONFIRMED | "Installment schedule" button visible in right panel |
| 3 | Admin | Click "Installment schedule" | Navigates to installment page. Context card shows agreedPrice (not package.price) |
| 4 | Admin | Create schedule totalling `agreedPrice − deposit` | "✓ Balanced" indicator |
| 5 | Anna | Client payment page | Installment schedule table visible |

**Pass:** INSTALLMENT plan shows installment schedule. Admin creates it after confirmation.

---

## TC-CT-10 — "Awaiting terms" state — client payment page blocked

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Open a PENDING booking with no contract terms | Step 1 "Contract terms agreed" → active (pink), not done |
| 2 | Anna | Journey step 2 sublabel | "Our team will contact you at 09171234567 to discuss…" |
| 3 | Anna | "Go to payments" button | **Disabled** — greyed out |
| 4 | Anna | Booking details "Contract terms" area | Amber "Awaiting contract terms" banner with phone number shown |

**Pass:** Client cannot proceed to payment until admin sets terms.

---

## TC-CT-11 — Staff note is internal (not shown to client)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Set staff note "Client wants discount, agreed ₱90k" | Saved |
| 2 | Admin | View booking detail | Staff note visible in contract terms summary |
| 3 | Anna | View client booking detail | Staff note NOT visible anywhere |

**Pass:** `staffNote` is admin-only.

---

## TC-CT-12 — Deposit due date displayed correctly

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Set deposit due date 7 days from now | Saved |
| 2 | Anna | Client booking detail → contract terms | "Deposit required (by [date])" shown |
| 3 | Admin | Can set any future date | No past date restriction in UI, but logic is flexible |

---

## TC-CT-13 — Coordinator can set contract terms (not just admin)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Coordinator | Open a PENDING booking | "Contract terms" card visible |
| 2 | Coordinator | Save terms | 200 OK. Audit log: COORDINATOR set contract terms |

**Pass:** Both ADMIN and COORDINATOR can set terms.

---

## TC-CT-14 — Edge cases

| # | Scenario | Expected |
|---|----------|----------|
| E1 | Client edits booking — phone field pre-filled | Old phone shown. Can update |
| E2 | Submit booking with `+639171234567` (international) | Valid. Stored as-is |
| E3 | Contract terms saved with only some fields | Partial update — only provided fields change |
| E4 | Admin saves terms with no paymentPlan | `paymentPlan` stays null. Terms badge stays "Pending discussion" |
| E5 | Admin saves terms with agreedPrice but no other fields | Only price updated. Plan + deposit remain null |
| E6 | Booking already has terms — admin updates them | Overwrites with new values. New audit log entry created |
| E7 | Deposit due date set to today | Valid (not restricted to future in current implementation) |
| E8 | Ben submits deposit before admin sets terms | Payment submitted. But client booking detail still shows "Awaiting terms" for plan/schedule |
| E9 | Anna's booking has customizations — shown in admin detail | Customization badges visible below package details |
| E10 | Installments page for FULL plan booking | Installments CTA NOT shown. No schedule needed |
