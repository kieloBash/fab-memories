# Module 9 — End-to-End Test Script

Manual click-through for **Integrity & Audit Hardening**. Tick each box; every step lists the expected result.
Use a **dev** database. Sign-ins are the seed users (admin, coordinator, client_anna, client_ben).

## 0. Setup

```bash
npx prisma migrate dev            # applies the two Module 9 migrations
npx tsx prisma/seed-integrity.ts  # scenarios I1–I5
npm run dev
```

If the migration aborts listing dates, see the README ("Install → step 2").

| Seed | State | Used for |
|---|---|---|
| I1 | CONFIRMED (deposit verified), day +130 | holds a date |
| I2 | PENDING + SUBMITTED deposit, **same date as I1** | verify must be blocked |
| I3 | PENDING, **no deposit** (+135) | confirm must be blocked |
| I4 | CANCELLATION_REQUESTED (+140) | date stays held |
| I4b | PENDING + SUBMITTED deposit, **same date as I4** | verify must be blocked |
| I5 | PENDING + SUBMITTED deposit, free date (+145) | verify succeeds |

## A. No confirmation without a verified deposit

Sign in as **admin**.

- [ ] Open booking **I3** → *Confirm booking*. **Expected:** error toast "A verified deposit is required before a booking can be confirmed…"; status stays *Pending*.
- [ ] Audit trail → filter Status = *Failure*. **Expected:** a "Blocked: could not confirm the booking — …" entry by you.
- [ ] Open booking **I5** → Payments → open its SUBMITTED deposit → **Verify**. **Expected:** success; booking becomes *Confirmed*.
- [ ] Audit trail. **Expected:** exactly **one** "verified deposit — booking … CONFIRMED" entry for it.

## B. One booking per date

- [ ] Open the SUBMITTED deposit of **I2** → **Verify**. **Expected:** error "Another booking already holds this date…". The payment is **still SUBMITTED**, booking still *Pending*, no new VERIFY entry.
- [ ] Open the SUBMITTED deposit of **I4b** → **Verify**. **Expected:** same error — a pending cancellation request still holds the date.
- [ ] Open **I4** → **Decline & keep confirmed**. **Expected:** back to *Confirmed*. Audit trail records action **Decline** (not a second Confirm).
- [ ] Open **I1** → *Cancel booking* (enter a reason). Then verify **I2**'s deposit again. **Expected:** now it succeeds — cancelling released the date.
- [ ] Client view (client_anna) — try to book a date held by a confirmed booking. **Expected:** "This date is already booked."

## C. Walk-in / cash deposit

- [ ] Admin → a PENDING booking on a free date → *Record manual payment* → type **Deposit**. **Expected:** payment recorded and booking Confirmed.
- [ ] Repeat for a date that is already held. **Expected:** blocked with the date message and **no** payment row left behind.

## D. Two people clicking at once

- [ ] Open the same SUBMITTED payment in two browser windows. Click **Verify** in both as quickly as you can. **Expected:** one succeeds; the other shows "already been reviewed". One audit entry.

## E. System integrity screen

Audit trail → **System integrity** (admin only).

- [ ] Five cards appear. **Audit trail is untampered** = Pass. **One booking per date is enforced by the database** = Pass.
- [ ] **Audit table is write-protected** = *Warning* on the owner role (names `create-restricted-role.sql`); *Pass* once `RUNTIME_DATABASE_URL` points at `app_runtime`.
- [ ] **No booking breaks a business rule** = Fail while Module 8's demo scenario S11 exists (lists the booking). Cancel it or verify its deposit → *Run checks again* → Pass.
- [ ] Sign in as coordinator and open `/staff/admin/audit/integrity`. **Expected:** access refused (admin only).

## F. Tampering is detected (dev DB only)

```sql
CREATE TABLE audit_backup_demo AS
  SELECT * FROM "AuditLog" WHERE sequence > (SELECT max(sequence) - 3 FROM "AuditLog");
DELETE FROM "AuditLog" WHERE sequence > (SELECT max(sequence) - 3 FROM "AuditLog");
```

- [ ] *Run checks again*. **Expected:** **Audit trail is untampered → Fail**, "3 entries were deleted"; dashboard risk panel shows a HIGH audit-integrity alert.

Restore:

```sql
INSERT INTO "AuditLog" SELECT * FROM audit_backup_demo;
DROP TABLE audit_backup_demo;
```

- [ ] *Run checks again*. **Expected:** Pass. (Entries written while the rows were missing link to the restored ones, so the chain closes again.)

## G. Database lock-down (needs the restricted role)

```bash
psql "$DIRECT_URL" -f prisma/scripts/create-restricted-role.sql     # after setting the password inside
RUNTIME_DATABASE_URL="postgresql://app_runtime:<pw>@host/db" npx tsx prisma/verify-restricted-role.ts
```

- [ ] **Expected:** 15 passed. Restart the app with `RUNTIME_DATABASE_URL` set → **Audit table is write-protected → Pass**, and the whole app still works.

## H. Fail-closed audit

- [ ] In `psql` as the owner: `REVOKE INSERT ON "AuditLog" FROM app_runtime;` then try **Verify** on a payment. **Expected:** error "…could not be recorded in the audit trail. Nothing was changed"; the payment is still SUBMITTED. (Dashboard risk panel shows *Audit entries could not be written*; integrity screen → Fail.)
- [ ] Restore: `GRANT INSERT ON "AuditLog" TO app_runtime;` → Verify works again.

## I. Export & lockout

- [ ] Audit trail → **Export CSV**. **Expected:** a CSV downloads; the audit trail gains an *Export* entry (the old button never worked and never logged).
- [ ] `npx tsx prisma/simulate-lockout.ts coordinator` → Audit trail, Module = Authentication, Status = Failure. **Expected:** one "account locked after repeated failed sign-in attempts" entry. Run it again: nothing new (de-duplicated within 30 min).

## Automated equivalents

```bash
npx tsx prisma/verify-integrity.ts && bash test-harness/run-route-tests.sh && npx vitest run
```
