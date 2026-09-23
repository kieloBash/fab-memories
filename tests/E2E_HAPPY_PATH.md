<!-- tests/E2E_HAPPY_PATH.md -->
# End-to-end happy path (automated + by hand)

One booking's complete life, every role, **through the real route handlers**. It is automated as
`test-harness/integration/00-golden-path.int.test.ts`, and the same story is Part D of
`tests/INTEGRATION_AND_MANUAL_TEST_GUIDE.md` for doing it in the browser.

## Run it

```bash
# once: TEST_DATABASE_URL in .env, base seed applied to that database (see test-harness/README.md)
npx vitest run --project integration test-harness/integration/00-golden-path.int.test.ts
```

Expected output (with `fixes/` applied):

```
✓ |integration| test-harness/integration/00-golden-path.int.test.ts (24 tests)
  Tests  24 passed (24)
```

On the original code, step 3 fails with `ReferenceError: Cannot access 'booking' before initialization`
(FINDINGS.md #1). Steps 4–24 are then **skipped** with the reason, because every later step needs that booking.

## What each step proves

| # | Actor | Route(s) | Asserted |
|---|---|---|---|
| 1 | signed out | `GET /api/public/packages` | the test package is listed with price and inclusions |
| 2 | client | `GET /api/bookings/availability` | the chosen date is available |
| 3 | client | `POST /api/bookings` | 201, PENDING, owned by the client, **price set by the server** from the package |
| 4 | client, admin | `GET /api/bookings` | client sees it in their list; admin finds it by venue search |
| 5 | admin | `PATCH …/contract-terms` | INSTALLMENT plan, ₱30,000 deposit |
| 6 | client | `POST /api/payments` | deposit SUBMITTED; every active admin gets a PAYMENT_SUBMITTED notification |
| 7 | admin | `GET /api/payments/:id` | payment details |
| 8 | admin | `PATCH /api/payments/:id/verify` | VERIFIED **and** booking CONFIRMED (same transaction); date no longer available |
| 9 | admin | `POST …/installments` | 2 installments created |
| 10 | client | `GET …/installments` | both UNPAID, in order |
| 11 | client → coordinator | `POST /api/payments`, `PATCH …/verify` | installment #1 PAID |
| 12 | admin | `POST /api/payments/manual` | #2 recorded as VERIFIED at once, PAID |
| 13 | admin | `GET /api/staff`, `POST …/staff` ×2, `GET …/staff?compliance` | lead + backup assigned; backup not counted (FR-39) |
| 14 | coordinator | `GET /api/staff/my-schedule`, `GET /api/staff/calendar` | event on their schedule and the month calendar |
| 15 | admin | `POST /api/vendors`, `POST …/vendors`, `PATCH …/vendors/:id`, `GET …/vendors?coverage` | quotation ₱65,000.50 kept; CATERING covered, PHOTOGRAPHY missing |
| 16 | signed out | `GET /api/vendor-brief/:id?view=` | brief + assignment; **no** client phone, name or quotation |
| 17 | client | `POST …/cancel-request` | CANCELLATION_REQUESTED |
| 18 | admin | `PATCH /api/bookings/:id` | declined → CONFIRMED |
| 19 | client | `GET …/history` | requested → terms → deposit submitted → verified → cancellation requested → declined |
| 20 | admin | `GET /api/notifications`, `PATCH /api/notifications/:id` | notification listed and marked read |
| 21 | admin | `GET /api/audit`, `GET /api/audit/verify` | actions recorded; hash chain valid |
| 22 | admin | `GET /api/reports/bookings`, `/payments`, `/reports/bookings/export` | booking row, 3 VERIFIED payments, CSV contains the booking |
| 23 | admin | `GET /api/integrity` | audit chain pass; no rule violation for this booking |
| 24 | admin | `PATCH /api/bookings/:id` | CANCELLED; client notified; date available again |

All data is created with an `ITEST-` venue and a unique far-future date, and is removed when the file finishes
(audit entries are kept; see test-harness/README.md §4).
