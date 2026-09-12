# Module 7 — Secured Event Planning and Audit Trail
## End-to-End Test Cases

Accounts (all passwords: `FabMemories123!`):
- Admin: `admin` → `/staff-login`
- Any Coordinator/Vendor/Client account, for RBAC negative tests

Migration required:
```bash
npx prisma migrate dev --name add-audit-hash-chain
npx prisma generate
```

**Clerk Dashboard configuration required** for TC-AT-15: under your
Clerk instance's Webhooks settings, ensure the endpoint subscription
includes `session.created`, `session.ended`, and `session.removed` in
addition to whatever `user.*` events are already subscribed — these
are not enabled by default alongside user events.

**DB lockdown (TC-AT-14)** requires running
`prisma/scripts/revoke-audit-log-privileges.sql` once against your
database as an owner/superuser role (see comments in that file for
exact steps).

---

## Basic viewing and filtering

## TC-AT-01 — Admin views the audit trail

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Go to `/staff/admin/audit` | Page loads: 4 stat cards, chain integrity card, filters bar, paginated table |
| 2 | Admin | Check stat cards | Total logged actions, Actions today, Failed actions, Most active module all show real numbers, not placeholders |
| 3 | DB check | New `AuditLog` row created for this page load | `action: VIEW`, `module: REPORT`, description mentions the admin's name |

## TC-AT-02 — Filter by date range

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Set "From" date to yesterday, "To" date to today | Table refreshes, shows only entries in that range |
| 2 | Admin | Clear both dates | Table reverts to unfiltered (still respecting other active filters) |

## TC-AT-03 — Filter by user, module, action, status

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Select a specific coordinator in the user filter | Only that user's entries shown |
| 2 | Admin | Select module "Payment" | Only PAYMENT-module entries shown |
| 3 | Admin | Select action "Verify" | Only VERIFY actions shown |
| 4 | Admin | Select status "Failure" | Only FAILURE-status entries shown (if none exist, empty state shown, not an error) |
| 5 | Admin | Combine 2+ filters at once | All are applied together (AND, not OR) |
| 6 | Admin | Click "Clear filters" | All filters reset, page returns to 1 |

## TC-AT-04 — Search by description text

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Type a client's name into the search box | Table filters to entries whose description contains that text (case-insensitive) |

## TC-AT-05 — Pagination

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | With more than 25 entries total, view page 1 | Shows entries 1–25, "Page 1 of N" |
| 2 | Admin | Click next page | Shows next 25, filters remain applied |
| 3 | Admin | Click previous page while on page 1 | Button disabled, no-op |

## TC-AT-06 — Expand a row for metadata and chain details

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Click any row | Expands to show: chain position (#sequence), full entry hash, previous hash (if not genesis), and formatted JSON metadata |
| 2 | Admin | Click the same row again | Collapses |
| 3 | Admin | Check the very first entry ever logged (lowest sequence number) | Its "Previous hash" section does not render (genesis entry, `previousHash: null`) |

## TC-AT-07 — Export CSV

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Apply some filters, click "Export CSV" | Browser downloads `audit-trail-YYYY-MM-DD.csv` |
| 2 | Admin | Open the CSV | Contains all matching entries (not just the current page), with columns: Sequence #, Timestamp, User, Action, Module, Description, Status, Entry Hash, Previous Hash |
| 3 | Admin | Confirm exported hash values | Match what's shown when expanding the same row in the UI |

---

## Tamper-evidence — the core feature

## TC-AT-08 — Integrity check on a clean chain (happy path)

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | On the audit trail page, click "Run integrity check" | Button shows "Verifying…", spinner icon |
| 2 | Admin | Wait for result | Green shield icon, "Verified — all N entries intact, chain unbroken", timestamp of check |
| 3 | DB check | New `AuditLog` entry for the check itself | `action: VIEW`, `module: REPORT`, `status: SUCCESS`, description mentions "result: VALID" |

## TC-AT-09 — Detect a tampered entry (content altered, hash left alone)

This simulates the most naive tampering attempt: someone with direct
database access edits a row's content but doesn't know to recompute
anything.

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Tester | Note any existing `AuditLog` row's `sequence` value, e.g. `42` | |
| 2 | Tester | Via direct SQL (e.g. Supabase SQL editor, **before** running the lockdown script from TC-AT-11), run:<br>`UPDATE "AuditLog" SET description = 'Tampered text' WHERE sequence = 42;` | Row updated (this should still succeed at this point — lockdown not yet applied) |
| 3 | Admin | Return to `/staff/admin/audit`, click "Run integrity check" | Red shield icon: **"Integrity check failed at entry #42 of N"**, reason: "This entry's stored content does not match its recorded hash — one or more fields were altered after the entry was written." |
| 4 | DB check | The verification's own log entry | `status: FAILURE`, metadata includes `brokenAtSequence: 42` |

**Pass:** the exact tampered entry is identified by sequence number — not just "something, somewhere is wrong."

## TC-AT-10 — Detect a tampered entry where the attacker tries to recompute the hash

A more sophisticated tamper attempt: after editing the content, the
attacker also updates the `hash` column to whatever they think it
should be, hoping to hide the edit.

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Tester | On a fresh/reset chain, pick entry `sequence = 10` | |
| 2 | Tester | Via SQL, update both `description` AND `hash` on that row to some arbitrary values (i.e. an attacker who doesn't know the exact hashing algorithm/canonicalization rules, which is the realistic case — they don't have this codebase) | Row updated |
| 3 | Admin | Run integrity check | Fails at entry #10 — either "stored content does not match its recorded hash" (if their guessed hash doesn't recompute correctly, which it won't without knowing the canonicalization scheme) |
| 4 | Tester | *(Optional, to demonstrate the chain-link property specifically)* Even if the attacker somehow produced a hash that satisfies entry #10 in isolation, entry #11's `previousHash` still references the **original** hash of entry #10 — so the very next entry now fails the "previousHash mismatch" check instead | Fails at entry #11 with "recorded previous-hash does not match the actual preceding entry's hash" if #10's self-check is somehow bypassed |

**Pass:** demonstrates the chain-link check is a second, independent line of defense beyond the single-entry hash check — an attacker has to correctly re-derive and re-link *every subsequent entry*, not just the one they altered.

## TC-AT-11 — Database-level lockdown prevents the tamper path entirely

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin/DBA | Run `prisma/scripts/revoke-audit-log-privileges.sql` against the database, with the correct role name substituted in | Script completes |
| 2 | Tester | Using the **application's own** database connection/role, attempt:<br>`UPDATE "AuditLog" SET description = 'x' WHERE sequence = 1;` | **Rejected** — `ERROR: permission denied for table AuditLog` |
| 3 | Tester | Attempt `DELETE FROM "AuditLog" WHERE sequence = 1;` | Also rejected |
| 4 | Tester | Attempt a normal `INSERT` (i.e. what `logAction()` actually does) | Still succeeds — the app can keep writing new entries, just never modify existing ones |

**Pass:** confirms Layer 2 (DB privilege revocation) actually prevents the tamper path used in TC-AT-09/10 from being reachable through the app's own credentials, not just detectable after the fact.

---

## Coverage gap closures

## TC-AT-12 — Login/logout logging

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Any user | Sign in via `/sign-in` or `/staff-login` | New `AuditLog` entry: `action: LOGIN`, `module: AUTH`, description includes the user's name and role |
| 2 | Same user | Sign out | New entry: `action: LOGOUT`, `module: AUTH` |
| 3 | Admin | Filter the audit trail by module "Authentication" | Both entries appear |

## TC-AT-13 — Report access logging

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Admin | Visit `/staff/admin` (the operational dashboard) | New entry: `action: VIEW`, `module: REPORT`, "viewed the operational dashboard" |
| 2 | Admin | Visit `/staff/admin/audit` | New entry: `action: VIEW`, `module: REPORT`, "viewed the audit trail" — the system logs access to the audit trail itself |

---

## Role access control

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| E1 | Client | `GET /api/audit` | 403 Forbidden |
| E2 | Vendor | `GET /api/audit` | 403 Forbidden |
| E3 | Coordinator | `GET /api/audit` | 403 Forbidden — audit trail is Admin-only, unlike Module 8's operational reports which extend to Coordinator |
| E4 | Client | `GET /api/audit/stats` | 403 Forbidden |
| E5 | Coordinator | `GET /api/audit/verify` | 403 Forbidden |
| E6 | Admin | All three routes | 200 OK |

---

## Edge cases

| # | Scenario | Expected |
|---|----------|----------|
| EC1 | Fresh database, zero audit entries | Integrity check returns `isValid: true, totalEntries: 0` — no crash on an empty chain |
| EC2 | Concurrent writes — trigger 10+ simultaneous actions that each call `logAction()` (e.g. bulk-assign several coordinators in quick succession via script/multiple tabs) | No two entries share the same `sequence` or the same `previousHash` — the `AuditChainState` row lock serializes them correctly; a subsequent integrity check still passes |
| EC3 | Export when filtered results exceed 10,000 rows | CSV contains the first 10,000; toast explicitly warns the export was truncated and suggests narrowing filters |
| EC4 | Filter by a user whose account was later deactivated (`isActive: false`) | Their historical entries still display correctly with their name — deactivation doesn't hide or break past audit history |
| EC5 | An audit log entry with no associated user (`userId: null`, e.g. a system-level action) | Displays as "System" in the table and export, not a blank or crashed row |
