# Personal data & the audit trail

The audit trail is immutable by design (hash chain + append-only database role). That is the point — and the problem: anything written to it can never be corrected or erased, which sits badly with the Philippines' Data Privacy Act (RA 10173) if it holds personal data. The rule this project follows:

> **Record who (a user id) and what (action, record ids, business values). Never contact details, free text, or names.**

## What is logged

| Kept | Never stored |
|---|---|
| user id (the audit viewer resolves the name from the User table at display time) | names in descriptions (`Client "Anna Reyes" …`) |
| action, module, status, timestamps | phone, e-mail, address, venue text, notes |
| record ids (booking, payment, vendor) | cancellation reasons and other free text (they stay on the booking, where they can be edited or erased) |
| business values: status, amount, dates, guest count, package, role | passwords, tokens, secrets (in any key) |
| *which fields* changed (`changes.fields`) | the values of personal fields |

Example — a client edits phone, notes and guest count:

```
description: "Client updated their booking"
metadata:    { bookingId, changes: { fields: ["clientPhone","guestCount","notes"], values: { guestCount: 55 } } }
```

## How it is enforced (three layers)

1. **By convention** — call sites describe edits with `auditChanges()` and describe actors by role (`lib/audit/redact.ts`).
2. **Safety net** — `writeAuditEntry()` redacts *before hashing*: sensitive keys (email, phone, notes, venue, address, reason, password, token, …) become `[redacted]`, and e-mail addresses and PH mobile numbers inside any string are masked. The stored value is what was hashed, so the chain still verifies.
3. **A test that fails the build** — `prisma/verify-audit-privacy.ts` scans every audit call in `app/`, `features/`, `lib/` and fails if one embeds a name/e-mail, copies a raw payload, or uses a free-text key. (It first proves it can detect a deliberately bad sample.)

## Erasure

Personal data lives in the `User` row (and Clerk), not in the trail. To honour an erasure request: delete the Clerk user, then anonymise the row (e.g. `fullName = 'Deleted user'`, clear `email` and `username`, keep `id`). Audit entries then refer to an anonymous id. *This procedure is guidance; an "anonymise account" admin action has not been built.*

## Limits — state these in the thesis

- **Older entries** written before this change still contain names in their descriptions; the trail cannot be rewritten. On a development database, `npx tsx prisma/seed.ts --fresh` regenerates it. A production system starting from this version has none.
- **A person's name in free text cannot be detected automatically.** The safety net masks e-mails and phone numbers and blanks known personal keys; names are prevented by the convention plus the scanner test, not by pattern matching.
- The `search` filter on report and audit views is never echoed (descriptions say "a search term").
- Role and user id remain, by design: accountability needs *who*. They are pseudonymous once the user row is anonymised.
