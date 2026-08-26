# Agreed Price & Dialog UI — Test Scenarios

Accounts (all passwords: `FabMemories123!`):
- Admin:    `admin` → `/staff-login`
- Client A: `anna.fabmemories@example.com` → `/sign-in`

Prerequisites:
- At least one Package must have `priceProvincial` set (e.g. standard ₱85,000 / provincial ₱95,000)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` set for map-pin detection

Migration required before testing:
```bash
npx prisma migrate dev --name add-agreed-price
npx prisma generate
```

---

## Bug 1 — Agreed Price

### TC-AP-01 — Metro Manila booking stores standard price

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | New booking → type "Makati" in venue | "Metro Manila" badge shows |
| 2 | Anna | Select Wedding package (₱85,000) → submit | Booking created |
| 3 | Anna | Open booking card | Price shows **₱85,000** |
| 4 | Admin | Open booking detail | Agreed price shows **₱85,000**. No "Provincial rate" badge |
| 5 | Admin | Check DB `Booking.agreedPrice` | `85000.00`. `isProvincial = false` |

**Pass:** `agreedPrice` = standard package price

---

### TC-AP-02 — Provincial booking stores provincial price

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | New booking → select Cebu venue via Google Places | "Provincial" badge shows |
| 2 | Anna | Select Wedding package | Card shows **₱95,000** (provincial rate) |
| 3 | Anna | Review step | Price shows ₱95,000 |
| 4 | Anna | Submit | Booking created |
| 5 | Anna | Open booking card | Price shows **₱95,000**. "Provincial" amber tag visible |
| 6 | Admin | Open booking detail | "Agreed price" row shows ₱95,000 with "Provincial rate" badge |
| 7 | Admin | Check DB | `agreedPrice = 95000.00`. `isProvincial = true` |

**Pass:** `agreedPrice` = provincial package price

---

### TC-AP-03 — Provincial price persists after booking is confirmed (the original bug)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Submit provincial booking (₱95,000 agreed price) | Booking PENDING |
| 2 | Anna | Submit deposit | Deposit SUBMITTED |
| 3 | Admin | Verify deposit | Booking → CONFIRMED |
| 4 | Anna | Open booking card | Price still shows **₱95,000** ← was reverting to ₱85,000 before fix |
| 5 | Anna | Open booking detail | "Agreed price" ₱95,000. "Provincial rate" badge still visible |
| 6 | Admin | Open installments page | Context card shows "Agreed price ₱95,000". Form balance targets ₱95,000 minus deposit |

**Pass:** Price never reverts. `booking.agreedPrice` is the single source of truth everywhere.

---

### TC-AP-04 — Installment balance uses agreedPrice, not package.price

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open installments page for a provincial booking (₱95,000 agreed, ₱85,000 standard) | Context card shows Agreed price: **₱95,000** (not ₱85,000) |
| 2 | Admin | Deposit paid was ₱28,500 (30% of 95k) | "Balance to schedule" = ₱95,000 − ₱28,500 = **₱66,500** |
| 3 | Admin | Click "Equal split" with 3 rows | Each row = ~₱22,167 (totalling ₱66,500) |
| 4 | Admin | "✓ Balanced" indicator appears | Only when installments sum to ₱66,500 |

**Pass:** Form and table use `agreedPrice` as the total. Balance never calculated from `package.price`.

---

### TC-AP-05 — Admin updates package price after booking — agreedPrice unchanged

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Books Wedding package at ₱85,000 | `agreedPrice = 85000` stored |
| 2 | Admin | Go to Packages → edit Wedding package → change price to ₱90,000 | Package updated |
| 3 | Anna | Open the old booking | Still shows **₱85,000** (the price at booking time) |
| 4 | Admin | Open installments page for the old booking | Agreed price ₱85,000 (unchanged) |

**Pass:** `agreedPrice` is immutable after booking creation. Package price changes don't affect existing bookings.

---

### TC-AP-06 — Client edits booking: changes package → agreedPrice recalculated

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Books Classic Wedding package at ₱85,000 (metro) | `agreedPrice = 85000` |
| 2 | Anna | Edit booking → switch to Grand Wedding package (₱150,000) | |
| 3 | Anna | Save changes | Booking updated |
| 4 | Anna | Open booking card | Price shows **₱150,000** |
| 5 | DB check | `Booking.agreedPrice` | `150000.00` |

**Pass:** `agreedPrice` recalculated when package changes.

---

### TC-AP-07 — Client edits booking: switches from metro to provincial → agreedPrice recalculated

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Booked with Metro Manila venue (₱85,000) | `agreedPrice = 85000`, `isProvincial = false` |
| 2 | Anna | Edit booking → change venue to Cebu (provincial) | "Provincial" badge appears |
| 3 | Anna | Save | Booking updated |
| 4 | Anna | Open booking card | Price shows **₱95,000**. "Provincial" tag visible |
| 5 | DB check | `isProvincial = true`, `agreedPrice = 95000` | ✓ |

**Pass:** Switching location type recalculates `agreedPrice`.

---

### TC-AP-08 — Client edits booking: keeps same package + location → agreedPrice unchanged

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Booked at ₱85,000 | `agreedPrice = 85000` |
| 2 | Anna | Edit booking → changes only guest count from 100 to 150 | No package/location change |
| 3 | Anna | Save | Booking updated |
| 4 | DB check | `agreedPrice` | Still **85000.00** (unchanged) |

**Pass:** Editing non-price fields doesn't recalculate agreedPrice.

---

### TC-AP-09 — Payment page uses agreedPrice for installment balance display

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Anna | Provincial booking confirmed (₱95,000), deposit ₱28,500 verified | Booking CONFIRMED |
| 2 | Anna | Go to payment page → installment section | TOTAL column = ₱66,500 (not ₱85,000 or ₱95,000) |
| 3 | Anna | Package summary at top | Shows ₱95,000. Deposit: ₱28,500. Remaining: ₱66,500 |

**Pass:** Installment table totals derived from `agreedPrice` minus deposit.

---

## Bug 2 — Dialog UI

### TC-DLG-01 — Confirm booking dialog appearance

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open a PENDING booking | "Confirm booking" button visible |
| 2 | Admin | Click "Confirm booking" | Dialog opens with: green icon (CalendarCheck2), title "Confirm this booking?", description with bold date, Cancel + "Yes, confirm booking" buttons |
| 3 | Admin | Verify no raw/unstyled appearance | Dialog uses the app's rounded-xl, white background, border styling |

**Pass:** Dialog matches design system.

---

### TC-DLG-02 — Confirm booking dialog — loading state

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Click "Yes, confirm booking" | Button text changes to "Confirming…". Button disabled during request |
| 2 | Admin | Wait for success | Dialog closes. Toast: "Booking confirmed successfully". Booking status → Confirmed |

**Pass:** No double-submit possible.

---

### TC-DLG-03 — Cancel booking dialog appearance

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open a PENDING booking → click "Cancel booking" | Dialog opens with: red icon (AlertCircle), title "Cancel this booking?", textarea for reason, "Go back" + "Cancel booking" buttons |
| 2 | Admin | Verify styling | Red icon on blush background, destructive button style, outline "Go back" |

**Pass:** Dialog visually distinct from confirm (red vs green) and matches design system.

---

### TC-DLG-04 — Cancel booking dialog — validation

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open cancel dialog | "Cancel booking" button is **disabled** (no reason entered) |
| 2 | Admin | Type a reason | Button enables |
| 3 | Admin | Clear reason | Button disables again |
| 4 | Admin | Type reason → click "Cancel booking" | Button shows "Cancelling…". On success: dialog closes, booking → Cancelled |

**Pass:** Can't submit without a reason.

---

### TC-DLG-05 — Cancel booking dialog — "Go back" closes without cancelling

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Open cancel dialog, type a reason | |
| 2 | Admin | Click "Go back" | Dialog closes. Booking still PENDING. Reason text cleared |

**Pass:** "Go back" is a safe exit.

---

### TC-DLG-06 — Dialog accessible via keyboard

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Focus "Confirm booking" button → press Enter | Dialog opens |
| 2 | Admin | Tab to "Yes, confirm booking" → press Enter | Booking confirmed |
| 3 | Admin | Open cancel dialog → press Escape | Dialog closes without cancelling |

**Pass:** Both dialogs are keyboard accessible.
