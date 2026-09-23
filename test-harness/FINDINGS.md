<!-- test-harness/FINDINGS.md -->
# Findings from the test harness

Date: 2026-09-23 · Code base: the `Archive.zip` submitted on that date · Database: PostgreSQL 16 with all 19 migrations and the
`base + reports + integrity` seeds.

Seven defects were found while building the happy-path tests. Each one has a test that **fails on the current code** and
**passes once the fix is applied**. The fixes are in `fixes/` (a patch plus full replacement files). They are optional and
kept separate so the harness can be adopted without touching application code.

| # | Severity | Area | One-line summary | Proven by |
|---|---|---|---|---|
| 1 | **Critical** | Bookings | Every `POST /api/bookings` crashes; clients cannot book | `00-golden-path` step 3, `02-bookings` |
| 2 | **High (security)** | All modules | 10 data-access modules are public Server Actions | `unit/server-actions` |
| 3 | **High (security)** | Payments | A client can list another client's payments | `13-ownership` [FINDING #3] |
| 4 | **High (security)** | Payments | A client can record a payment on another client's booking | `13-ownership` [FINDING #4] |
| 5 | Medium | Vendors / Bookings | Vendor-coverage check always returns HTTP 405 | `unit/api-contract`, `ui/booking-actions` |
| 6 | Medium | Staff scheduling | Coordinators cannot open any booking (404) | `unit/page-links` |
| 7 | Low (latent) | Staff accounts | `fetchStaffAccount()` calls a route with no `GET` | `unit/api-contract` |

Test results:

| | Original code | With `fixes/` applied |
|---|---|---|
| Vitest: 42 files, 444 tests (UI + unit + integration) | 410 passed, **9 failed**, 25 skipped | **444 passed** |
| Existing `run-route-tests.sh` (10 scripts, 213 checks) | 213 passed | 213 passed |
| `npm run typecheck` | 0 errors | 0 errors |

The 9 failures are exactly the tests listed in the table above. The 25 skipped tests are later steps of the two "story"
suites that stop at their first failure (finding #1) instead of reporting a cascade of misleading failures.

---

## 1 · Booking creation always fails (Critical)

**Where:** `app/api/bookings/route.ts`, the audit entry inside `POST`.

```ts
const r_booking = await attempt(
  auditedTransaction(async (tx, audit) => {
    const result = await createBookingRecord(actor.id, parsed.data, agreedPrice, tx)
    audit({ ..., metadata: { bookingId: booking.id, ... } })   // ← `booking` does not exist yet
    return result
  }), ...)
const booking = r_booking.value                                 // ← it is declared here
```

`audit()` builds its object immediately, so `booking.id` is read before `const booking` is initialised. JavaScript throws
`ReferenceError: Cannot access 'booking' before initialization`, the transaction rolls back and the request fails with a 500.
**No client can submit a booking request.** The older route scripts did not catch it because they create bookings directly
with Prisma instead of through the route.

**Fix (one line):** `bookingId: booking.id` → `bookingId: result.id`.

**Evidence:** `00-golden-path` step 3 fails with that exact `ReferenceError` at `app/api/bookings/route.ts:108`.

## 2 · Data-access modules are exposed as public Server Actions (High, security)

**Where:** the first line of these files is `"use server"`:
`audit.query.ts`, `auth.query.ts`, `availability.query.ts`, `booking-history.query.ts`, `bookings.query.ts`,
`installments.query.ts`, `packages.query.ts`, `payments.query.ts`, `staff-assignments.query.ts`, `vendors.query.ts`.

In Next.js, `"use server"` at the top of a module turns **every exported function** into a Server Action: an HTTP endpoint that
any browser can call with arguments it chooses. These functions take raw ids and write to the database
(`deleteBookingRecord`, `createPaymentRecord`, `verifyDepositPaymentRecord`, …) with **no** `requireRole` or ownership check.
Those checks live in the route handlers, which a Server Action call bypasses. `bookings.transition.ts` already documents this
rule (*"Not a 'use server' module (that would expose these as actions)"*), and `reports.query.ts` notes the directive was
removed there for the same reason.

**Fix:** delete the `"use server"` line from the ten files. No client component imports them (checked), so nothing else
changes. The unit test keeps it from coming back.

## 3 · A client can list another client's payments (High, security)

**Where:** `GET /api/payments` (`app/api/payments/route.ts`), `CLIENT` branch.

The route requires `?bookingId=` for clients but never checks that the booking belongs to them.

**Evidence:** signed in as Ben, `GET /api/payments?bookingId=<Anna's booking>` returned **200 with Anna's payment**
(reference number, amount, and a signed URL to her proof image).

**Fix:** look up the booking and return 403 unless `booking.clientId === actor.id`.

## 4 · A client can record a payment on another client's booking (High, security)

**Where:** `POST /api/payments` (`app/api/payments/route.ts`).

**Evidence:** signed in as Ben, a `FULL_BALANCE` payment posted against Anna's booking returned **201** and the row was
created. Staff then see it in their verification queue, and all staff are notified.

**Fix:** before creating the payment, return 403 unless the booking belongs to the signed-in client (404 if it does not exist).
Any uploaded proof file is removed on refusal.

## 5 · The vendor-coverage check always fails with HTTP 405 (Medium)

**Where:** `features/vendors/vendors.api.ts → fetchVendorCoverage()` calls `GET /bookings/:id/vendors/coverage`.
The server serves coverage at `GET /bookings/:id/vendors?coverage=true`.

The client's path is matched by `app/api/bookings/[bookingId]/vendors/[vendorId]/route.ts` with `vendorId = "coverage"`.
That file has no `GET`, so the response is **405**. As a result, the **Confirm booking** dialog can never show its
"Unconfirmed vendor categories" warning (or the "all covered" note). The existing UI test did not catch this because
it mocked the wrong URL too.

**Fix:** call `GET /bookings/:id/vendors` with `params: { coverage: "true" }`. The fix also updates
`test-harness/ui/vendor-quotation.test.tsx` to route that URL correctly.

## 6 · Coordinators cannot open any booking (Medium)

**Where:** there is no `app/(pages)/(protected)/staff/coordinator/bookings/[bookingId]/page.tsx`, but these link to it:

- the coordinator **Bookings** list (`BookingsListView basePath="/staff/coordinator/bookings"`);
- the coordinator **dashboard** (`staff/coordinator/page.tsx:158`);
- coordinator **payment detail** (`staff/coordinator/payments/[paymentId]/page.tsx:127`);
- **My assignments** (`features/staff-assignments/components/my-assignments-list.tsx:70`).

Every one of them leads to a 404. The existing UI test checks the `router.push` call, but a mocked router cannot know whether
the page exists.

**Fix:** a deliberately basic coordinator booking page built from the existing feature components. It covers details,
contract terms (while pending), confirm/cancel, payments (linking to the coordinator payment page), history, staff and
vendors. Admin-only actions (manual payment, installment schedule) stay on the admin page.

## 7 · `fetchStaffAccount()` calls a route that has no `GET` (Low, latent)

**Where:** `features/auth/auth.api.ts → fetchStaffAccount(id)` → `GET /api/staff-accounts/:id`.
`app/api/staff-accounts/[id]/route.ts` exports only `PATCH` and `DELETE`. The matching hook `useStaffAccount` is not used by
any page yet, so nothing breaks today; it would 405 the moment someone uses it. (`features/auth` also duplicates the
`features/staff-accounts` API; consider removing the older copy.)

**Fix:** add an admin-only `GET` that returns one non-client account.

---

## Minor observations (no test, not fixed)

- **Stale booking status after verifying a deposit.** `useVerifyPayment` invalidates payment queries only. Verifying a deposit
  also confirms the booking, but `bookingKeys` are not invalidated, so an open booking screen shows *Pending* until refetched.
  Add `queryClient.invalidateQueries({ queryKey: bookingKeys.all })` on success.
- **Installment totals are checked only in the browser.** `InstallmentScheduleForm` blocks an unbalanced schedule, but
  `POST /bookings/:id/installments` accepts any amounts. Consider validating the sum against the remaining balance on the server.
- **Placeholders.** `/portal/documents`, `/staff/admin/documents`, `/staff/coordinator/documents`, `/staff/vendor/history` and
  `/staff/vendor/quotations` render "coming soon". They are out of scope for these tests.
