# Module 9 — Integrity & Audit Hardening

Makes the two promises the thesis rests on **structurally true** instead of merely *monitored*:

1. **A booking rule can never be broken** — no confirmation without a verified deposit, and never two confirmed events on one date, even under concurrent requests.
2. **No state-changing action happens without an audit record**, and the audit trail cannot be quietly shortened or rewritten.

Module 8 *detects* problems. Module 9 makes the worst ones impossible, and adds a live screen (`/staff/admin/audit/integrity`) that proves it.

## What was wrong → what happens now

| # | Before | Now |
|---|---|---|
| 1 | The confirm button (PATCH) confirmed any booking — no deposit check, no date check | One gate, `transitionBooking`, used by **all four** code paths that change status. Confirm requires a **verified** deposit (no override) and a free date |
| 2 | Two confirmed events on one date were possible (race, or a cancellation request that freed the date) | A **partial unique index** in Postgres + an app check. A date stays **held** while a cancellation request is undecided |
| 3 | Deposit verified for a booking whose date was already taken → payment "verified", booking not confirmable | One transaction: the payment is verified **only if** the booking can be confirmed. Otherwise 409 and the payment stays SUBMITTED |
| 4 | Two staff clicking *Verify* together could both succeed | Reviews are **claims** ("SUBMITTED → VERIFIED only if still SUBMITTED") |
| 5 | The audit entry was written *after* the change, in a separate step, and errors were swallowed | State-critical routes write the entry **in the same transaction**. If it can't be written, the action is **rolled back** (503) |
| 6 | Deleting the *last* audit rows was undetectable | Chain verification also compares the **chain tip** (`AuditChainState`) with the last entry |
| 7 | The app's DB role could `UPDATE`/`DELETE` audit rows; the SQL to prevent it was missing | `create-restricted-role.sql` → an `app_runtime` role that can only **append** |
| 8 | Old audit CSV export never worked (asked for 10,000 rows from an endpoint capped at 100), wasn't logged, wasn't injection-safe | Repointed to Module 8's server export (logged, escaped, working) |
| 9 | Account lockouts weren't recorded | Lockouts are logged (de-duplicated) — see *Limitations* |
| 10 | A bug: the client edit route compared two `Date` objects with `!==` (always true) | Compares calendar dates |

## The booking gate

`features/bookings/bookings.transition.ts` is the only place a booking's status may change.

| From → To | Rule |
|---|---|
| PENDING → CONFIRMED | verified DEPOSIT payment **and** date free |
| CANCELLATION_REQUESTED → CONFIRMED (*Decline & keep confirmed*) | same two rules |
| CONFIRMED → CANCELLATION_REQUESTED | allowed (date stays **held**) |
| PENDING / CONFIRMED / CANCELLATION_REQUESTED → CANCELLED | allowed (date released) |
| anything else, incl. anything leaving CANCELLED, CONFIRMED → CONFIRMED | `INVALID_STATE` |

Inside the caller's transaction it locks the booking row, checks the transition, deposit and date, writes, and maps a unique-index violation to the same friendly error. If two requests race, both may pass the app check — only one `UPDATE` can win the index.

| Code | HTTP | Meaning |
|---|---|---|
| `DEPOSIT_NOT_VERIFIED` | 409 | No VERIFIED deposit. Verify the submitted one, or use *Record manual payment* for walk-in/cash |
| `DATE_TAKEN` | 409 | Another booking holds this date (confirmed or awaiting a cancellation decision) |
| `INVALID_STATE` | 409 | Transition not allowed from the current status |
| `PAYMENT_ALREADY_REVIEWED` | 409 | Someone else verified/flagged this payment first |
| `AUDIT_WRITE_FAILED` | 503 | The action was **rolled back** because its audit entry couldn't be written |

All responses are `{ "error": "<readable message>", "code": "<CODE>" }`, so existing toasts show the message unchanged.

## Atomic vs best-effort audit

| | Routes | If the audit write fails |
|---|---|---|
| **Atomic** (`auditedTransaction`) | booking create / edit / confirm / restore / cancel / withdraw / cancel-request / contract terms · installment schedule · payment submit / verify (all types) / flag / manual | whole action **rolled back**, 503, failure recorded |
| **Best-effort** (`logAction`) | vendors, staff assignments, packages, staff-account changes, report/audit views, blocked-attempt records, webhooks | retried once, then stored in `AuditWriteFailure` and shown on the dashboard (`AUDIT_WRITE_FAILED`) — never silently lost |

Staff-account create/deactivate stay best-effort because the real change happens inside **Clerk**, outside our database; no transaction can span both.

The audit entry is written **last** inside the transaction, so the chain lock is held only for the insert and lock-order deadlocks are impossible.

## Files

```
features/bookings/bookings.transition.ts      THE gate (server-only)
features/bookings/bookings.query.ts           all status changes now call the gate; isDateAvailable counts held statuses
features/payments/payments.query.ts           claim-based reviews; deposit paths use the gate
features/installments/installments.query.ts   joins a transaction
features/audit/audit.query.ts / audit.types   + chain-tip check
features/audit/components/export-audit-button.tsx   → server export
features/integrity/                           integrity.query.ts (server) · api · hooks · components · types · index
features/reports/reports.{risk,types,constants}.ts  + AUDIT_WRITE_FAILED risk rule
lib/audit/log.ts                              writeAuditEntry · auditedTransaction · logAction (retry + failure record)
lib/db.ts · lib/domain-errors.ts · lib/route-errors.ts
lib/clerk/webhook-handler.ts                  webhook logic, testable; + lockout logging
app/api/integrity/route.ts                    GET (ADMIN only)
app/(pages)/(protected)/staff/admin/audit/integrity/page.tsx   the System integrity screen
app/api/{bookings,payments,…}/**/route.ts     atomic + typed errors
prisma/migrations/20260920100000_one_held_booking_per_date/    partial unique index (aborts with a list if data conflicts)
prisma/migrations/20260920100100_audit_write_failure/          AuditWriteFailure table
prisma/scripts/find-date-conflicts.sql · create-restricted-role.sql
prisma/seed-integrity.ts · verify-integrity.ts · verify-restricted-role.ts · simulate-lockout.ts
test-harness/verify-integrity-routes.ts · ui/integrity.test.tsx · ui/fixtures/integrity.json
docs/MODULE_9_E2E_TEST.md                     manual end-to-end script
```

## Install

Use the installer — **never drag folders onto your project in Finder** ("Replace" deletes files that aren't in the zip):

```bash
unzip module-9-safe-install.zip -d ~/module-9-install
bash ~/module-9-install/install-module-9.sh /path/to/project
bash ~/module-9-install/restore-missing.sh  /path/to/project      # should say "Nothing is missing"
```

Then:

1. **Add the model** to `prisma/schema.prisma` (the installer does not touch your schema):

   ```prisma
   model AuditWriteFailure {
     id          String      @id @default(cuid())
     createdAt   DateTime    @default(now())
     userId      String?
     action      AuditAction
     module      AuditModule
     description String
     error       String
     attempts    Int         @default(1)

     @@index([createdAt])
   }
   ```
2. `npx prisma migrate dev` — applies both migrations.
   **If it aborts** ("Cannot add the one-booking-per-date rule…") your data already has a date held twice. Run `psql "$DATABASE_URL" -f prisma/scripts/find-date-conflicts.sql`, cancel or decline all but one booking per listed date, and re-run. (Module 8's demo seed created such a pair on purpose — `npx tsx prisma/seed-reports.ts --reset-only` removes it.)
   Prisma cannot express the partial index, so it lives only in SQL and is not in `schema.prisma` — expected. Run `migrate dev` once and confirm it does **not** offer to drop the index.
3. `npx prisma generate`
4. *(Recommended)* lock the audit table: edit the password in `prisma/scripts/create-restricted-role.sql`, run it as the database **owner**, set `RUNTIME_DATABASE_URL` to the new `app_runtime` connection, keep `DIRECT_URL`/`DATABASE_URL` on the owner for migrations and seeding. Supabase pooler: the user is `app_runtime.<project-ref>`.
5. *(Optional demo data)* `npx tsx prisma/seed-integrity.ts`

## Verify

```bash
npx tsx prisma/verify-integrity.ts                       # 83 checks: matrix, races, atomicity, tip anchor, report, lockout
bash test-harness/run-route-tests.sh                     # 56 (Module 8) + 47 (Module 9) real route-handler checks
npx vitest run                                           # 48 UI tests
RUNTIME_DATABASE_URL=… npx tsx prisma/verify-restricted-role.ts   # 15 checks, once the role exists
```

Each guarantee was **mutation-tested**: deliberately breaking it (dropping the deposit check, the date check, the index, the claim, the tip check, the atomic rollback, de-duplication…) makes the suite fail. Running the suites *as* `app_runtime` also passes, so nothing depends on being able to rewrite audit rows.

## Limitations (state these in the thesis)

- **Failed passwords are not captured.** Sign-in uses Clerk's hosted components, so an incorrect password never reaches this server. Clerk reports the *lockout* that follows repeated failures (`user.updated` with `locked: true`); that is what is logged. Capturing every attempt would need a custom sign-in flow. The webhook payload shape was tested with synthetic events — confirm once against a real Clerk lockout.
- **A database superuser/owner can still rewrite anything.** The restricted role protects against the application; the hash chain and tip anchor are the independent layer that detect an owner-level rewrite. Someone who edits rows *and* `AuditChainState` in a way that recomputes every hash would defeat detection without an external anchor (e.g. periodic export of the tip hash to another system).
- **Fail-closed audit trades availability for accountability.** If the audit write is broken, atomic actions return 503 until it is fixed.
- **Existing bad data is not auto-fixed.** Records that already violate a rule (e.g. Module 8's demo scenario S11, a confirmed booking with no deposit) appear as a FAIL on the integrity screen until someone resolves them.
- Not covered by a transaction: Clerk account operations (see above) and file uploads to storage (a rejected payment submission deletes its orphaned upload).
