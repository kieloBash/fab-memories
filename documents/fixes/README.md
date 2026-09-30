<!-- docs/fixes/README.md -->
# Scope-alignment fixes (FR-12, FR-18, FR-31, event types, vendor accounts)

Code changes that make the live system match the revised thesis scope. No database migration is needed.

## What changed

| # | Change | Requirement | Files |
|---|---|---|---|
| 1 | **Client e-mail when a booking is confirmed** — by a verified deposit, a manually recorded deposit, a direct confirmation, or a declined cancellation request ("remains confirmed"). Cancellations already e-mailed the client through `notify()`. | FR-12 | `lib/email/client-emails.ts` (new), `app/api/payments/[paymentId]/verify/route.ts`, `app/api/payments/manual/route.ts`, `app/api/bookings/[bookingId]/route.ts` |
| 2 | **Client e-mail when any payment is verified** (deposit, installment, full balance, or recorded by staff). Survey Form C item 4 rates this. | FR-12 / Form C-4 | same as #1 |
| 3 | **Only Wedding and Debut** can be booked or offered. Corporate, Birthday and Other stay in the database enum so old records still display, but the forms hide them, the public catalog filters them out, and the API refuses them (422). | Scope | `features/bookings/bookings.constants.ts` (`ACTIVE_EVENT_TYPES`), `features/bookings/bookings.schema.ts`, `features/packages/packages.schema.ts`, `app/api/public/packages/route.ts`, public packages page, new/edit booking pages, `package-form.tsx` |
| 4 | **Provincial pricing switched off** behind one flag, `PROVINCIAL_PRICING_ENABLED = false`: public Metro Manila/Provincial switch and booking-form badges hidden, provincial price not sent publicly, and the API ignores `isProvincial` (standard price). Set the flag to `true` to restore everything. | FR-18 (deferred) | `bookings.constants.ts`, `bookings.schema.ts`, public route, public packages page, new/edit booking pages |
| 5 | **FR-31:** vendors can only be assigned to CONFIRMED bookings → `409 BOOKING_NOT_CONFIRMED`. (Your fix, rewritten so the check actually returns.) | FR-31 | `app/api/bookings/[bookingId]/vendors/route.ts` |
| 6 | **404 instead of 500** when updating or removing a vendor that is not assigned to the booking. | Bug fix | `app/api/bookings/[bookingId]/vendors/[vendorId]/route.ts` |
| 7 | **No vendor accounts:** Vendor removed from the New/Edit account role picker and refused by the API (422); `/staff/vendor` pages send everyone to `/unauthorized`; "vendor" removed from the sign-in pages, the staff-login panel, the User accounts subtitle and the landing-page role/feature cards. Existing VENDOR rows still display as "Vendor (not used)". | Delimitation | `staff-accounts.constants.ts`, `staff/vendor/layout.tsx`, `sign-in`, `staff-login`, `auth-shell.tsx`, `staff/admin/users/page.tsx`, `lib/clerk/portal.ts`, `FeaturesSection.tsx`, `RolesSection.tsx` |

Every changed file keeps its location comment at the top.

## Tests updated

- `test-harness/ui/staff-accounts.test.tsx` — role change now uses Admin and checks Vendor is not offered.
- `test-harness/integration/02-bookings.int.test.ts` — `isProvincial` is ignored → standard price.
- `test-harness/integration/07-vendors.int.test.ts` — assigns on a CONFIRMED booking; new case: PENDING → 409.
- `test-harness/integration/11-staff-accounts.int.test.ts` — VENDOR role → 422; role change uses ADMIN.
- `test-harness/integration/10-notifications.int.test.ts` — new: verifying a deposit e-mails "booking confirmed" and "payment verified"; flagging does not.
- `e2e/specs/02-bookings.spec.ts`, `03-packages.spec.ts`, `05-vendors.spec.ts` — event-type refusal, provincial pricing off, FR-31 blocking, 404 check, independent vendor tests.

**Checked here:** no new TypeScript errors across all changed files; Vitest unit + UI tests show the same results as before the changes (the only affected test was updated and passes); the Playwright suite type-checks and lists 94 tests. **Not run here:** the integration tests (they need your test database) — run `npm run test:int`.

## Deploy checklist

1. Copy the files from the zip over your repo (same paths) and run `npm run test`, `npm run test:int`.
2. **Set up Gmail sending** — see `docs/email/README.md` (replaces the earlier SMTP note: `SMTP_*` variables are no longer used).
3. Push → Vercel deploys.
4. In the admin screens: **deactivate** the Vendor-role account ("Juan dela Cruz") and any Corporate / Birthday / Other packages (hidden from clients already, but still in the admin list).
5. Run the checks in `docs/fixes/TEST.md`, then re-run Playwright modules 01, 02, 03 and 05.

## To undo a part later

- Re-offer an event type: add it to `ACTIVE_EVENT_TYPES` in `features/bookings/bookings.constants.ts`.
- Bring back provincial pricing (keeping FR-18 in scope): set `PROVINCIAL_PRICING_ENABLED = true` in the same file.
