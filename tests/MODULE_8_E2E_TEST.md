# Module 8 — End-to-End Test Script

**Scope of this version (Batch 1):** everything reachable through the API and the database.
Screen-level tests (dashboard panels, filter bar, tables, export button) are listed in §9 and will be filled in with Batch 2.

**How to run GET endpoints as a real user:** sign in through the normal login page, then paste the URL into the same browser tab — the session cookie is sent and the browser shows the JSON. (Firefox/Edge pretty-print JSON; in Chrome tick "Pretty-print".)

---

## 0. Preconditions

```bash
# DEV database only
npx prisma migrate dev
npx tsx prisma/seed.ts
npx tsx prisma/seed-reports.ts
npm run dev
```

| Role | Login page | Username / email | Password |
|---|---|---|---|
| Admin | `/staff-login` | `admin` | `FabMemories123!` |
| Coordinator | `/staff-login` | `coordinator` | `FabMemories123!` |
| Client | `/sign-in` | `anna.fabmemories@example.com` | `FabMemories123!` |

Automated checks that must be green before you start manual testing:

```bash
npx tsx prisma/verify-reports.ts      # expect: 112 passed, 0 failed
bash test-harness/run-route-tests.sh  # expect: 49 passed, 0 failed
```

> **Time-sensitive data.** Seeded proof ages (30 h, 80 h) and the "failed actions in 24 h" alert are relative to when you ran the seed. Re-run `seed-reports.ts` if it was more than a day ago.

Base URL below: `http://localhost:3000`.

---

## 1. Access control (FR-04, FR-50, FR-57, NFR-16)

| ID | Signed in as | Open | Expected |
|---|---|---|---|
| AC-01 | *(signed out)* | `/api/reports/bookings` | redirected to sign-in **or** `401` |
| AC-02 | Client | `/api/reports/bookings` | `403 {"error":"Forbidden"}` |
| AC-03 | Client | `/api/reports/dashboard` | `403` |
| AC-04 | Client | `/api/reports/bookings/export` | `403` |
| AC-05 | Coordinator | `/api/reports/bookings` , `/payments` , `/vendors` , `/staff` | `200` each |
| AC-06 | Coordinator | `/api/reports/audit` | `403` |
| AC-07 | Coordinator | `/api/reports/audit/export` | `403` |
| AC-08 | Coordinator | `/api/reports/dashboard` | `403` |
| AC-09 | Admin | every URL above | `200` |

---

## 2. Validation (NFR-18, NFR-30)

Signed in as **Admin**:

| ID | Open | Expected |
|---|---|---|
| VA-01 | `/api/reports/bookings?from=2026-10-02&to=2026-10-01` | `422`, message mentions the *from* date |
| VA-02 | `/api/reports/bookings?from=yesterday` | `422` |
| VA-03 | `/api/reports/bookings?bookingStatus=DONE` | `422` |
| VA-04 | `/api/reports/bookings?pageSize=999` | `422` |
| VA-05 | `/api/reports/bookings?bookingStatus=&from=` | `200` (empty values ignored) |
| VA-06 | `/api/reports/audit?module=BOOKING';DROP TABLE x;--` | `422` (never reaches the database) |
| VA-07 | `/api/reports/audit?search=%25%5C_'%22` | `200` (LIKE/quote characters are harmless) |
| VA-08 | `/api/reports/bookings/export?format=pdf` | `422` (CSV only) |
| VA-09 | `/api/reports/bookings/export?table=nope` | `404` |
| VA-10 | `/api/reports/secrets/export` | `404` |

---

## 3. Reports return correct numbers

Signed in as **Admin**. "Cross-check" columns give you an independent way to confirm each number in `psql`/Prisma Studio.

### 3.1 Booking report — `/api/reports/bookings`

| ID | Steps | Expected | Cross-check |
|---|---|---|---|
| BK-01 | open with no filters | `summary.total` = number of rows in `Booking` | `SELECT count(*) FROM "Booking"` |
| BK-02 | add `?bookingStatus=CONFIRMED` | all `rows[].status` = CONFIRMED; `summary.total` matches | `… WHERE status='CONFIRMED'` |
| BK-03 | `summary.byStatus`, `byEventType`, `byMonth` | each sums to `summary.total` | — |
| BK-04 | `?pageSize=5&page=2` | 5 rows; `meta.totalRows` unchanged | — |
| BK-05 | `?page=9999` | `rows: []`, `summary` unchanged | — |
| BK-06 | `?from=<30 days ago>&to=<today>` | only bookings whose **event date** is in range | — |

### 3.2 Payment report — `/api/reports/payments`

| ID | Steps | Expected |
|---|---|---|
| PY-01 | no filters | `summary.transactions` = `count(Payment)`; `verifiedAmount` = sum of VERIFIED |
| PY-02 | `summary.byMethod` amounts | sum equals `verifiedAmount` (also `byType`) |
| PY-03 | `?paymentStatus=FLAGGED` | only flagged rows; each has `reviewedByName` (the person who flagged it) |
| PY-04 | `outstanding[]` | the **S4** booking shows outstanding **₱105,000**, overdue **6 days**; the **S5** booking shows **₱35,000**, overdue **2 days**. Overdue rows come first |
| PY-05 | scan all `rows` | every `CHEQUE` row has `paymentType: "DEPOSIT"` (cheque = deposits only) |
| PY-06 | search the JSON text for `proofImageUrl` / `proofStoragePath` | **not present** (NFR-20) |
| PY-07 | `snapshot.installments` | `overdue ≥ 1` (S4 #1); `awaitingVerification ≥ 1` (main-seed installment with a submitted proof is *not* counted overdue) |
| PY-08 | `?from=<today>&to=<today>` | every `submittedAt` falls inside today **in Manila time** (00:00–23:59 +08:00) |

### 3.3 Vendor report — `/api/reports/vendors`

| ID | Steps | Expected |
|---|---|---|
| VD-01 | `summary` | `confirmed + contacted + notContacted` = `totalAssignments` |
| VD-02 | `summary.quotationTotal` | ≥ **₱62,500** (S6 photographer 25,000 + S7 florist 15,000 + S7 photographer 22,500) |
| VD-03 | `gaps[]` | contains the **S6** event with `missing: ["CATERING"]`; does **not** contain S7 |
| VD-04 | `?vendorCategory=FLORALS` | only FLORALS rows |
| VD-05 | default | no rows whose `bookingStatus` is CANCELLED |

### 3.4 Staff report — `/api/reports/staff`

| ID | Steps | Expected |
|---|---|---|
| ST-01 | S6 row (160 guests) | recommended **8–12**, `primaryCount` 3, `compliance: "UNDERSTAFFED"` |
| ST-02 | S7 row (40 guests) | recommended **4–5**, `primaryCount` 4, `COMPLIANT`, `hasBackup: false` |
| ST-03 | S8a / S8b rows | both `hasConflict: true` |
| ST-04 | `coordinators[]` | lists **all 4** coordinators; *Paolo Mendoza* has `conflictDates ≥ 1` |
| ST-05 | `?compliance=UNDERSTAFFED` | only understaffed rows; `summary.events` equals the row count |

### 3.5 Audit report — `/api/reports/audit`

| ID | Steps | Expected |
|---|---|---|
| AU-01 | no filters | `summary.totalEntries` = `count(AuditLog)`; `byModule`, `byAction`, `byDay` each sum to it |
| AU-02 | `chain` | `isValid: true` |
| AU-03 | `?status=FAILURE` | only FAILURE rows; `failureCount` = `totalEntries` |
| AU-04 | `?module=PAYMENT` , `?action=VERIFY` , `?search=flagged` | filtered rows; `byDay` totals agree |
| AU-05 | `rows` | newest first (`sequence` descending); each row has `hash` and `previousHash` |

---

## 4. Risk engine (thesis objective 3 — proactive risk mitigation)

Admin → `/api/reports/dashboard` → inspect `risks` and `riskSummary`
(`risks` is capped at the top 8; for the full list run `verify-reports.ts`, or see Batch 2's risk panel).

| ID | Scenario | Expected risk |
|---|---|---|
| RK-01 | **S1** proof waiting 30 h | `PROOF_UNVERIFIED`, **MEDIUM** |
| RK-02 | **S1b** proof waiting 80 h | `PROOF_UNVERIFIED`, **HIGH** |
| RK-03 | **S2** flagged 9 days, no resubmission | `PAYMENT_FLAGGED`, HIGH |
| RK-04 | **S2b** flagged, corrected, verified | **nothing** raised |
| RK-05 | **S3** deposit due 4 days ago | `DEPOSIT_OVERDUE`, HIGH |
| RK-06 | **S4** installment #1 due 6 days ago | `INSTALLMENT_OVERDUE`, HIGH |
| RK-07 | main-seed installment past due **with proof submitted** | **not** `INSTALLMENT_OVERDUE` |
| RK-08 | **S5** balance due 2 days ago | `FULL_BALANCE_OVERDUE`, HIGH |
| RK-09 | **S6** event in 5 days, 3 of 8 coordinators, caterer unconfirmed | `UNDERSTAFFED_IMMINENT` **and** `VENDOR_GAP_IMMINENT`, HIGH |
| RK-10 | **S7** event in 20 days, fully staffed & covered | **nothing** raised |
| RK-11 | **S8** Paolo on two pending events, one date | `COORDINATOR_CONFLICT` HIGH + `DATE_CONTENTION` LOW |
| RK-12 | main seed: Anna's Debut (confirmed) & Ben's Birthday (pending) share a date | `DATE_CONTENTION` MEDIUM |
| RK-13 | **S9** cancellation requested 100 h ago | `CANCELLATION_PENDING`, HIGH |
| RK-14 | **S10** two CONFIRMED events on one date | `DOUBLE_CONFIRMED`, HIGH |
| RK-15 | **S11** CONFIRMED with no verified deposit | `CONFIRMED_WITHOUT_DEPOSIT`, HIGH |
| RK-16 | 4+ FAILURE audit entries in the last 24 h | `AUDIT_FAILURES`, MEDIUM (HIGH at ≥ 10) |
| RK-17 | ordering | all HIGH before MEDIUM before LOW |

**Resolution test (risks clear when the cause is fixed):**

1. Note the `PROOF_UNVERIFIED` item for S1 (Anna's wedding, ₱20,000).
2. As Admin or Coordinator, open its payment (`/staff/admin/payments/<paymentId>`) and **verify** it.
3. Reload `/api/reports/dashboard`. **Expected:** that item is gone and `riskSummary.medium` dropped by 1.

---

## 5. Audit logging of report access (FR-48) and de-duplication

| ID | Steps | Expected |
|---|---|---|
| LG-01 | As Admin open `/api/reports/payments?paymentStatus=FLAGGED`, then open `/staff/admin/audit` | one new entry: `VIEW` · `REPORT` · *"ADMIN … viewed the Payments & transactions report (paymentStatus FLAGGED)"* |
| LG-02 | Reload the same URL 3 more times | **no** additional entries (same user, report, filters within 10 min) |
| LG-03 | Change the filter (`paymentStatus=VERIFIED`) | **one** new entry |
| LG-04 | Same URL with `&page=2&pageSize=5` | no new entry (paging is not a new access) |
| LG-05 | Open `/api/reports/dashboard` five times over a minute | at most **one** *"viewed the operational dashboard"* entry |
| LG-06 | Open the export URL twice | **two** `EXPORT` · `REPORT` entries (exports are never de-duplicated); metadata shows `rowCount`, `filters`, `table` |

---

## 6. CSV export (FR-57)

| ID | Steps | Expected |
|---|---|---|
| EX-01 | Admin: `/api/reports/bookings/export?bookingStatus=CONFIRMED` | file downloads as `bookings-report-<today>.csv` |
| EX-02 | open in Excel / Sheets | header row present; `₱` and accents render correctly (UTF-8 BOM) |
| EX-03 | count data rows | equals the number of CONFIRMED bookings (paging is ignored on export) |
| EX-04 | `/api/reports/payments/export?table=outstanding` | outstanding-balance CSV with an *Overdue* column |
| EX-05 | `/api/reports/vendors/export?table=gaps` , `/api/reports/staff/export?table=coordinators` | `200`, correct headers |
| EX-06 | Admin: `/api/reports/audit/export` | columns *Sequence #*, *Entry hash (SHA-256)*, *Previous hash*; first entry shows `GENESIS` |
| EX-07 | Coordinator: `/api/reports/bookings/export` | `200`; `/api/reports/audit/export` → `403` |
| EX-08 | **Formula injection.** In Prisma Studio set any booking's `venue` to `=HYPERLINK("http://example.com","click")`, export bookings, open in Excel | the cell shows the literal text, prefixed with `'` — **no clickable formula**. Restore the venue afterwards |

---

## 7. Tamper evidence (NFR-19) — **dev database only**

The core promise of the thesis: *if anyone edits the audit trail, the system notices.*

```sql
-- 1. pick an early entry and remember its text
SELECT sequence, description FROM "AuditLog" WHERE sequence = 5;

-- 2. simulate someone editing history directly in the database
UPDATE "AuditLog" SET description = 'TAMPERED' WHERE sequence = 5;
```

| ID | Steps | Expected |
|---|---|---|
| TP-01 | Admin: `/api/reports/audit` | `chain.isValid: false`, `chain.brokenAtSequence: 5`, reason explains the mismatch |
| TP-02 | Admin: `/api/reports/dashboard` (allow up to 5 min for the cached check, or restart the dev server) | a **HIGH** `AUDIT_INTEGRITY` risk pointing at entry #5 |
| TP-03 | restore: `UPDATE "AuditLog" SET description = '<original text>' WHERE sequence = 5;` | both return to normal |

If you have run `prisma/scripts/revoke-audit-log-privileges.sql` and connect as the restricted role, step 2 is **refused by the database** (defence layer 1); the hash chain (layer 2) is what catches it when it is done by a superuser.

---

## 8. Performance (NFR-05: reports ≤ 10 s)

```bash
npx tsx prisma/seed-reports.ts --bulk=3000     # adds ~3,000 bookings, ~4,500 payments
npx tsx prisma/verify-reports.ts
```

| ID | Expected |
|---|---|
| PF-01 | every timing line in *"Timings"* shows ✅ (reference machine: all ≤ 0.6 s) |
| PF-02 | in the browser, each report JSON's `meta.durationMs` is < 10000 |
| PF-03 | `verify-reports.ts` still passes every assertion with the large dataset (proves correctness doesn't degrade under load) |

Clean up afterwards: `npx tsx prisma/seed-reports.ts --reset-only`.

---

## 9. Batch 2 — screen-level tests *(to be completed)*

| Area | Tests to add |
|---|---|
| Dashboard | risk panel (severity colours, deep links), recent-activity feed, auto-refresh (30 s) with "last updated" stamp |
| Reports landing | one card per report; coordinators don't see *Audit* |
| Each report page | filter bar validates `from ≤ to`; summary cards; charts; table paging; empty state; export button downloads the CSV |
| Coordinator area | *Reports* nav item; audit report absent |
| Vendor panel | enter / clear a quotation on an assignment; it appears in the vendor report |
| Responsive | tables scroll on a phone-width viewport (NFR-11 / NFR-22) |

---

## 10. Test evidence to keep for the thesis

1. Terminal output of `verify-reports.ts` (112 passed) and `run-route-tests.sh` (49 passed).
2. Screenshot of a report JSON showing `meta.durationMs`.
3. The Audit trail page showing the `VIEW`/`EXPORT` entries produced in §5–§6.
4. The tamper test (§7): before, after (`isValid: false`, entry #5), and restored.
5. The dashboard risk panel with the seeded scenarios (Batch 2).
