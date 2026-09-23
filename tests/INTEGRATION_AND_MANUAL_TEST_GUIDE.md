<!-- tests/INTEGRATION_AND_MANUAL_TEST_GUIDE.md -->
# Integration & Manual Test Guide — Fab Memories Events

**Purpose.** A step-by-step direction for testing the whole system by hand, role by role, the way the panel and real users
will use it. The automated suite (`test-harness/`) already proves the logic and the API. This guide covers what only a
person can check: the screens, sign-in, file uploads, e-mail, and how the roles hand work to each other.

**How to use it.**
1. Do **Part A** once (environment).
2. Run the **smoke test** in Part B (5 minutes). If anything fails, stop and fix it first.
3. Work through **Part C** module by module. Each test has an ID, numbered steps, the expected result, and a ✅/❌ box.
4. Do the **end-to-end scenario** in Part D. It crosses every role in one story.
5. Record failures in the **defect log** (Part F) and sign off.

Allow about **3 hours** for Parts B–D with one tester, or about 1½ hours with two testers (one on the client portal, one on
staff screens).

> **Before fixes.** On the code submitted on 2026-09-23, some steps fail because of known defects. They are marked
> **⚠ F#n** and explained in `test-harness/FINDINGS.md`. Apply `fixes/` first if you want a clean run.

---

## Part A — Environment

### A1. Prerequisites

| ✓ | Item | How to check |
|---|---|---|
| ☐ | Node 20+, npm | `node -v` |
| ☐ | PostgreSQL database for testing (dev is fine, **never production**) | `psql "$DATABASE_URL" -c "select 1"` |
| ☐ | `.env` has `DATABASE_URL`, `DIRECT_URL`, Clerk keys, `CLERK_WEBHOOK_SIGNING_SECRET` | open `.env` |
| ☐ | Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, private bucket `payment-proofs` | Supabase dashboard → Storage |
| ☐ | `CRON_SECRET` set (any string) | needed for C10 |
| ☐ | E-mail: `SMTP_HOST` etc., **or** leave unset. E-mails are then printed in the `npm run dev` terminal | — |
| ☐ | Clerk webhook points at your tunnel URL `/api/webhooks/clerk` (only needed for C1.6 sign-up) | Clerk dashboard → Webhooks |

### A2. Prepare the data

```bash
npm install
npx prisma migrate deploy
npx tsx prisma/seed.ts --all          # base users/packages/bookings + reports + integrity scenarios
npm run seed:testing                  # scenarios T1–T6 used by this guide (prints their booking ids)
```

Keep the ids that `seed:testing` prints (and the T5 vendor-brief link). Re-running `npm run seed:testing` resets T1–T6
to their starting state, so you can repeat any test.

### A3. Run the automated tests first

```bash
npm test               # UI + unit, about 1 min, no database needed
npm run test:int       # integration, needs TEST_DATABASE_URL (see test-harness/README.md)
```

If these are red, fix them before testing by hand; the manual tests will fail for the same reasons.

### A4. Start the app

```bash
npm run dev            # http://localhost:3000
```

Use **two browsers** (or one normal and one private window): one signed in as a client, the other as staff.

### A5. Test accounts (from the base seed)

| Role | Sign in at | Username | Password | Name |
|---|---|---|---|---|
| Admin | `/staff-login` | `admin` | `FabMemories123!` (or `SEED_ADMIN_PASSWORD`) | System Administrator |
| Coordinator | `/staff-login` | `coordinator` | `FabMemories123!` | Maria Santos |
| Coordinator | `/staff-login` | `coordinator2` / `3` / `4` | `FabMemories123!` | James Villanueva / Kristine Uy / Paolo Mendoza |
| Vendor | `/staff-login` | `vendor` | `FabMemories123!` | Juan dela Cruz |
| Client | `/sign-in` | `client_anna` | `FabMemories123!` | Anna Reyes |
| Client | `/sign-in` | `client_ben` | `FabMemories123!` | Ben Torres |

### A6. Scenario bookings (from `npm run seed:testing`)

| Id | Client | State when seeded | Used in |
|---|---|---|---|
| **T1** | Anna | PENDING, no contract terms | C3 |
| **T2** | Anna | PENDING, FULL plan, deposit **submitted** | C4.3 |
| **T3** | Ben | CONFIRMED, INSTALLMENT plan, 2 unpaid installments | C5 |
| **T4** | Ben | CANCELLATION_REQUESTED | C8 |
| **T5** | Anna | CONFIRMED, 60 guests, 1 coordinator, 1 caterer contacted | C6, C7 |
| **T6** | Ben | PENDING, deposit **flagged** | C4.4 |

All T-bookings have "T1 needs terms", "T2 deposit to verify", … in their venue name, so they are easy to find with the
bookings search.

### A7. Conventions

- **Expected** is what must happen. Anything else is a defect, even if it "sort of works".
- For every ❌, take a screenshot and add a row to the defect log (Part F).
- "Audit ✓" means: open `/staff/admin/audit`, and the newest entry describes the action you just did.

---

## Part B — Smoke test (5 min)

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| S1 | Open `/` signed out | Landing page loads; "Packages" and sign-in links work | ☐ |
| S2 | Open `/packages` | Active packages listed with prices and inclusions | ☐ |
| S3 | Sign in as `client_anna` at `/sign-in` | Lands on `/portal`; Anna's bookings are visible | ☐ |
| S4 | Sign in as `admin` at `/staff-login` | Lands on `/staff/admin`; dashboard counters and risk panel load | ☐ |
| S5 | As admin open `/staff/admin/audit/integrity` | Checks render; "Audit trail is untampered" is **pass** | ☐ |

---

## Part C — Module tests

### C1. Authentication & access control (Module 1)

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| C1.1 | Sign in as `admin` at **`/sign-in`** (the client page) | Refused with a message pointing to the staff login; signed out again. Audit ✓ (FAILURE, "attempted the client sign-in") | ☐ |
| C1.2 | Sign in as `client_ben` at **`/staff-login`** | Refused, pointed to the client sign-in | ☐ |
| C1.3 | Signed in as `client_anna`, type `/staff/admin` in the address bar | Redirected to `/portal` | ☐ |
| C1.4 | Signed in as `coordinator`, open `/staff/admin` | Not allowed (redirect / unauthorized); `/staff/coordinator` works | ☐ |
| C1.5 | Signed out, open `/portal/bookings` | Redirected to `/sign-in` | ☐ |
| C1.6 | Create a new client at `/sign-up` (webhook tunnel running) | Account created; lands in `/portal`; a CLIENT row exists (`/staff/admin/audit` shows "User account created (role: CLIENT)") | ☐ |
| C1.7 | `/sign-in` → **Forgot password?** → complete the reset (real mailbox) → sign out → sign in with the **new** password | Lands on `/portal` both times; **never** "Unauthorized" or bounced to `/`. Full test: `tests/LOGIN_AFTER_PASSWORD_RESET_TEST.md` | ☐ |
| C1.7b | `/staff-login` → **Forgot password?** | URL has `?portal=staff`; staff look; after the reset → staff dashboard | ☐ |
| C1.7c | Any refused sign-in (e.g. C1.1) | Stays on that login page with the reason; never lands on `/` | ☐ |
| C1.8 | Sign out from any page | Back to the public site; protected pages redirect again | ☐ |

### C2. Booking request — client (Module 2)

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| C2.1 | As Anna: `/portal/bookings/new` → **Choose a package** → pick a Wedding package | Package selected; price shown | ☐ |
| C2.2 | **Event details**: a date at least 3 months ahead, event type, venue, guest count 150, mobile `09171234567`, notes, a customization, vendor services *Catering* + *Photography* | Date shows as available; invalid mobile (e.g. `12345`) shows an error | ☐ |
| C2.3 | Review → **Submit booking request** | Success toast; booking appears in `/portal/bookings` as **Pending** / "Waiting for contract terms". Audit ✓ **⚠ F#1: fails with an error on the original code** | ☐ |
| C2.4 | Open it → **Edit**, change guests to 180 and save | Saved; detail shows 180 | ☐ |
| C2.5 | Try a date that is already **confirmed** for another booking (e.g. T3's date) | Refused: "This date is already booked" | ☐ |
| C2.6 | Create a second request, then **Withdraw request** → **Yes, withdraw** | Removed from the list | ☐ |

### C3. Contract terms — staff (scenario **T1**)

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| C3.1 | As admin: `/staff/admin/bookings`, search "T1", open it | Badge **Pending discussion**; package price shown | ☐ |
| C3.2 | Choose **Installment** plan, deposit `25000`, deposit due date next week, a staff note | "Remaining after deposit" preview shows price − 25,000 | ☐ |
| C3.3 | Enter a deposit **≥** the agreed price | Red "Deposit must be less than the agreed price"; save disabled | ☐ |
| C3.4 | Fix it → **Save contract terms** | Toast "Contract terms saved"; badge **Terms set**; Audit ✓ | ☐ |
| C3.5 | As Anna open T1 in the portal | Shows the plan and the deposit to pay; **Submit reservation deposit** available; staff note **not** visible | ☐ |

### C4. Payments (Module 3)

**C4.1 Client submits a deposit by screenshot** (use the booking from C2 or T1 after C3)

| Steps | Expected | ✓ |
|---|---|---|
| As Anna open the booking → deposit → **Screenshot** tab → upload a JPG/PNG under 5 MB → **Upload & submit** | Toast "Deposit proof submitted successfully"; payment shows **Submitted** | ☐ |
| Try a PDF or a file over 5 MB | Rejected before upload with a clear message | ☐ |
| As admin, check the bell 🔔 | "New payment submitted" notification; clicking it opens the payment | ☐ |

**C4.2 Client submits by reference number:** same, using the **Reference number** tab and a reference such as `GC-123456`.
Expected: submitted without an image. The admin payment page says "Reference number submitted (no image)". ☐

**C4.3 Staff verify a deposit (scenario T2)**

| Steps | Expected | ✓ |
|---|---|---|
| As coordinator `/staff/coordinator/payments` → open T2's deposit | Proof details and **Staff verification** panel | ☐ |
| Add a note → **Verify** | Toast "Deposit verified — booking is now confirmed"; payment **Verified** | ☐ |
| Open the booking | Status **Confirmed** (refresh if it still says Pending; see FINDINGS minor note). Its date is now unavailable to others | ☐ |
| Audit ✓ | "…verified deposit — booking … CONFIRMED" | ☐ |

**C4.4 Flag and resubmit (scenario T6)**

| Steps | Expected | ✓ |
|---|---|---|
| As Ben open T6 | "Deposit flagged — please resubmit" with the staff note | ☐ |
| Resubmit with a new reference | New payment **Submitted**; the old one stays **Flagged** | ☐ |
| As admin, open a *new* submission → type a note → **Flag for resubmission** | Toast "Payment flagged for resubmission"; Ben gets a 🔔 notification (and an e-mail, or a console print) | ☐ |

**C4.5 Manual (face-to-face) payment**

| Steps | Expected | ✓ |
|---|---|---|
| As admin open a **pending** booking that has terms → **Record manual payment** → type *Deposit*, method *Cash*, amount, note → **Record payment as verified** | Payment **Verified** at once and the booking becomes **Confirmed** | ☐ |
| Same page on a confirmed booking with type *Full balance*, method *Cheque* | Recorded as verified | ☐ |

**C4.6 Security spot-check.** Signed in as Ben, open the browser console on any `/portal` page and run
`fetch('/api/payments?bookingId=<T5 id>').then(r => r.status)`. T5 belongs to Anna.
Expected **403**. **⚠ F#3: returns 200 with Anna's payments on the original code.** ☐

### C5. Installments (scenario **T3**)

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| C5.1 | As Ben open T3 | Two installments **Unpaid**, each with **Pay now** | ☐ |
| C5.2 | **Pay now** on #1 → reference → submit | #1 shows the pending payment; its **Pay now** disappears | ☐ |
| C5.3 | As admin verify it | #1 **Paid**; progress bar moves | ☐ |
| C5.4 | Admin: booking → **Installments** → re-plan the rest into 3 rows with **Add installment** + **Equal split**, set dates → **Save installment schedule** | #1 stays **Paid (locked)**; new rows are numbered 2, 3, 4; "✓ Balanced" before saving | ☐ |
| C5.5 | Change one amount so it doesn't add up | Shows "unallocated" / "over-allocated"; save disabled | ☐ |
| C5.6 | Record #2 as a manual payment (*Which installment?* → #2) | #2 **Paid** | ☐ |

### C6. Staff scheduling (Module 5, scenario **T5**)

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| C6.1 | Admin opens T5 → **Staff scheduling** panel | "Below recommended staffing": 60 guests → recommended 7–8, assigned 1 | ☐ |
| C6.2 | **Assign coordinator** → pick Kristine Uy | "No scheduling conflicts on this date" appears before saving | ☐ |
| C6.3 | Task role *Guest Registration*, toggle **Backup coordinator** → **Assign coordinator** | Listed with a **Backup** tag; the assigned count does **not** go up (backups don't count) | ☐ |
| C6.4 | Pick a coordinator already on another event that day | Amber "Already committed on this date" warning; still allowed | ☐ |
| C6.5 | Remove Kristine (trash icon) | Removed; toast | ☐ |
| C6.6 | As `coordinator4`: `/staff/coordinator/availability` → add T5's date, reason "Personal leave" | Listed | ☐ |
| C6.7 | Admin tries to assign `coordinator4` to T5 | Refused: "marked themselves unavailable on this date" | ☐ |
| C6.8 | As `coordinator` (Maria): dashboard and `/staff/coordinator/staff` | T5 appears under upcoming / my assignments | ☐ |
| C6.9 | Click the event in **My assignments** / the bookings list | Coordinator booking page opens **⚠ F#6: 404 on the original code** | ☐ |
| C6.10 | `/staff/coordinator/calendar` → T5's month | T5 on its day with the staffing count | ☐ |

### C7. Vendors (Module 4, scenario **T5**)

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| C7.1 | Admin `/staff/admin/vendors/new`: name, category *Photography*, contact, channel, coverage areas (a preset + a custom one), notes → save | Vendor in the directory | ☐ |
| C7.2 | Edit it, clear the contact person → save | Saved; field empty | ☐ |
| C7.3 | Open T5 → **Vendors** panel | Caterer listed as *Contacted*; Photography shown as not yet covered | ☐ |
| C7.4 | Assign the new photographer; **Record** quotation `25000`, note "Full day" → **Save quotation** | ₱25,000 shown with the note | ☐ |
| C7.5 | **Mark confirmed** on the caterer | Confirmed; contacted date and note **kept** | ☐ |
| C7.6 | Open **Confirm booking** on a *pending* booking that requested vendors | Warning lists unconfirmed categories **⚠ F#5: never shows on the original code** | ☐ |
| C7.7 | Copy the **event brief link** for the caterer; open it in a signed-out window | Event date, venue, guests, motif, the caterer's scope note. **No** client name, phone or quotation | ☐ |
| C7.8 | As Anna, open T5 | Sees which vendors are on the event | ☐ |

### C8. Cancellation (scenario **T4**)

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| C8.1 | As Ben: a **confirmed** booking → **Request cancellation** → reason under 10 characters | Submit disabled; counter shows the length | ☐ |
| C8.2 | Full reason → **Submit request** | Status **Cancellation requested**; the date stays held | ☐ |
| C8.3 | Admin opens T4 → decline (keep confirmed) | Back to **Confirmed**; history shows "Cancellation request declined" | ☐ |
| C8.4 | Request again, then admin **Cancel booking** with a reason | **Cancelled**; Ben gets "Your booking was cancelled" 🔔; the date becomes available again | ☐ |

### C9. Service packages (Module 2)

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| C9.1 | `/staff/admin/packages/new`: name, type *Debut*, price `75000.50`, description, 2 inclusions (plus an empty one) → create | Created; the empty inclusion is dropped | ☐ |
| C9.2 | Price `10.123` | Rejected (max 2 decimals) | ☐ |
| C9.3 | Edit the price → save | New price shown on `/packages` | ☐ |
| C9.4 | Deactivate it | Gone from `/packages` and from the client's package picker; still visible to admin | ☐ |

### C10. Notifications & reminders

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| C10.1 | Give a pending booking a deposit due date **tomorrow** (contract terms), then run:<br>`curl -X POST http://localhost:3000/api/cron/due-date-reminders -H "Authorization: Bearer $CRON_SECRET"` | `200`; the client gets "Deposit due soon" 🔔 + e-mail | ☐ |
| C10.2 | Run the same command again | No second reminder (de-duplicated for 20 h) | ☐ |
| C10.3 | Same command **without** the header | `401` | ☐ |
| C10.4 | Client bell: open one notification, then **mark all read** | Badge count drops, then clears | ☐ |

### C11. Reports & monitoring (Module 8)

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| C11.1 | `/staff/admin` dashboard | Counters, "Needs attention", upcoming events, recent activity, risk panel; refreshes by itself (30 s) | ☐ |
| C11.2 | `/staff/admin/reports` → each of Bookings, Payments, Vendors, Staff, Audit | Each loads in under ~10 s with summary + table | ☐ |
| C11.3 | Bookings report: status *Confirmed* + a date range | Only matching rows; changing a filter goes back to page 1 | ☐ |
| C11.4 | Set *from* after *to* | Error "The 'from' date must not be after the 'to' date" | ☐ |
| C11.5 | **Export CSV** on each report (and "Export outstanding" / "gaps" / "coordinators") | File downloads; opens in Excel with ₱ shown correctly; Audit ✓ (EXPORT) | ☐ |
| C11.6 | As coordinator: reports | Bookings, Payments, Vendors, Staff available; **Audit** is not | ☐ |

### C12. Audit trail & integrity (Modules 7 and 9)

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| C12.1 | `/staff/admin/audit`: filter by module *Payment*, then search "verified" | Only matching entries; newest first | ☐ |
| C12.2 | Click an entry | Chain position, entry hash, previous hash, metadata. **No** e-mails, phone numbers or venues (redacted) | ☐ |
| C12.3 | **Run integrity check** | "Verified — all N entries intact, chain unbroken" | ☐ |
| C12.4 | *Tamper demo* (test database only, owner role):<br>`psql "$DIRECT_URL" -c "UPDATE \"AuditLog\" SET description = description || ' (edited)' WHERE sequence = 10"` → re-run the check | "Integrity check **failed** at entry #10" with the reason | ☐ |
| C12.5 | Undo it: `… SET description = replace(description, ' (edited)', '') WHERE sequence = 10` → re-run | Verified again | ☐ |
| C12.6 | `/staff/admin/audit/integrity` | All checks pass (or warn only about the restricted DB role if it isn't configured) | ☐ |

### C13. User accounts (admin)

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| C13.1 | `/staff/admin/users` → create a Coordinator (username, password ≥ 8, name) | Listed as Active; can sign in at `/staff-login` | ☐ |
| C13.2 | Edit → change role to Vendor | Saved; after re-login lands on `/staff/vendor` | ☐ |
| C13.3 | **Deactivate** → confirm | Shows Deactivated; that user can no longer sign in | ☐ |
| C13.4 | **Reactivate** | Can sign in again | ☐ |
| C13.5 | Try to deactivate or change the role of **your own** account | Not allowed | ☐ |

### C14. Security & quality spot-checks

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| C14.1 | As Ben, open `/portal/bookings/<T5 id>` (Anna's) | Not shown (forbidden / not found) | ☐ |
| C14.2 | `curl -I http://localhost:3000/` | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`, a CSP header; **no** `X-Powered-By` | ☐ |
| C14.3 | Signed out: `curl -i http://localhost:3000/api/bookings` | `401 {"error":"Unauthorized"}` | ☐ |
| C14.4 | Phone-width window (DevTools, 375 px) on `/portal` and `/staff/admin` | Mobile tab bar; no sideways scrolling; dialogs fit | ☐ |
| C14.5 | Portal payment page for someone else's booking via Ben's console:<br>`fetch('/api/payments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({bookingId:'<T5 id>',paymentType:'FULL_BALANCE',method:'GCASH',amount:1,referenceNumber:'x'})}).then(r=>r.status)` | **403** **⚠ F#4: 201 on the original code** | ☐ |

---

## Part D — End-to-end scenario (all roles, one story)

This mirrors the automated `00-golden-path` test. Use a **fresh** date about 6 months ahead. Write the booking id here: `____________`.

| # | Who | Do | Check | ✓ |
|---|---|---|---|---|
| 1 | Visitor | `/packages`, pick a package | Price and inclusions visible | ☐ |
| 2 | Anna | Book it (C2.1–C2.3) with *Catering* + *Photography* | Pending, "Waiting for contract terms" **⚠ F#1** | ☐ |
| 3 | Admin | Contract terms: Installment, deposit, due date | Terms set | ☐ |
| 4 | Anna | Pay the deposit by reference | Submitted; admin 🔔 | ☐ |
| 5 | Admin | Verify it | **Confirmed**; date no longer offered to Ben | ☐ |
| 6 | Admin | Two installments for the rest | Anna sees 2 unpaid | ☐ |
| 7 | Anna | Pay #1 | Submitted | ☐ |
| 8 | Maria (coordinator) | Verify #1 | #1 paid | ☐ |
| 9 | Admin | Record #2 manually (cash) | #2 paid; balance ₱0 | ☐ |
| 10 | Admin | Assign Maria (lead) and James (backup) | Banner counts 1 primary | ☐ |
| 11 | Maria | Dashboard / calendar | Event listed **⚠ F#6** when opening it | ☐ |
| 12 | Admin | Add a caterer, assign, quote, confirm | Catering covered, Photography missing | ☐ |
| 13 | Vendor (signed out) | Open the brief link | Event details, no client personal data | ☐ |
| 14 | Anna | Request cancellation | Cancellation requested | ☐ |
| 15 | Admin | Decline → stays confirmed | History shows the decline | ☐ |
| 16 | Anna | Booking history timeline | Requested → terms → deposit → verified → … → declined, in order | ☐ |
| 17 | Admin | Audit trail filtered by this booking's actions; **Run integrity check** | All steps logged; chain verified | ☐ |
| 18 | Admin | Bookings + Payments reports for that date; **Export CSV** | Booking and 3 verified payments present | ☐ |
| 19 | Admin | Cancel the booking with a reason | Cancelled; Anna 🔔; date free again | ☐ |

---

## Part E — Reading the automated results

| You see | Meaning |
|---|---|
| `Tests 444 passed` | Everything, including the defects' regression tests, is fine |
| `9 failed` (original code) | Exactly the 7 defects in `FINDINGS.md`. The failing test names contain the evidence |
| `… skipped` in `00-golden-path` / `02-bookings` | A story suite stopped at its first failed step; read that step |
| `Unmocked GET …` in a UI test | The component called a URL the test didn't expect; compare with the API contract test |

---

## Part F — Defect log and sign-off

### Defect log

| # | Test ID | Role | Steps to reproduce | Expected | Actual | Severity (C/H/M/L) | Screenshot | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | |
| 2 | | | | | | | | |
| 3 | | | | | | | | |

### Summary

| Part | Tests | Passed | Failed | Not run |
|---|---|---|---|---|
| B Smoke | 5 | | | |
| C1 Auth | 10 | | | |
| C2 Booking | 6 | | | |
| C3 Terms | 5 | | | |
| C4 Payments | 11 | | | |
| C5 Installments | 6 | | | |
| C6 Staff | 10 | | | |
| C7 Vendors | 8 | | | |
| C8 Cancellation | 4 | | | |
| C9 Packages | 4 | | | |
| C10 Notifications | 4 | | | |
| C11 Reports | 6 | | | |
| C12 Audit | 6 | | | |
| C13 Users | 5 | | | |
| C14 Security | 5 | | | |
| D End-to-end | 19 | | | |

### Sign-off

| | Name | Date | Signature |
|---|---|---|---|
| Tester | | | |
| Reviewer / adviser | | | |

Build / commit tested: `__________` · Fixes applied: ☐ yes ☐ no · Automated result: `____ passed / ____ failed`
