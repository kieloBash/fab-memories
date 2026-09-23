<!-- tests/LOGIN_AFTER_PASSWORD_RESET_TEST.md -->
# Test: signing in after a password reset (client and staff)

**Reported bug:** "Forgot password worked, but signing in with the new password returned *Unauthorized* and redirected
me to `/`."

**Cause:** the Clerk account had no row in our `User` table. That row is normally created by the Clerk webhook, which
often doesn't reach a development machine; it can also be lost when the database is re-seeded while the Clerk user is
kept. The reset page skipped the server check, so it looked fine. The next ordinary sign-in called
`POST /api/auth/portal-check`, got a bare 401, and the page's `signOut()` fell back to Clerk's default destination, `/`.

**Fix (summary):**
- portal-check repairs a missing row (`lib/sync-user.ts`) and returns explicit codes.
- All three pages finish sign-in the same way (`features/auth/finish-sign-in.ts`).
- A refusal returns to the same login page with its reason, never to `/`.
- The reset page runs the same check, and works for staff via `?portal=staff`.

Details: `test-harness/FINDINGS.md` #8.

---

## 1. Automated (run first)

```bash
npx vitest run test-harness/ui/forgot-password.test.tsx test-harness/ui/login-portal.test.tsx test-harness/ui/proxy.test.tsx
npx vitest run --project integration test-harness/integration/15-portal-check-repair.int.test.ts   # needs TEST_DATABASE_URL
```

Expected: `forgot-password` 9 passed · `login-portal` 20 passed · `proxy` 74 passed · `15-portal-check-repair` 11 passed.

| Automated test | Proves |
|---|---|
| forgot-password: "finishes with the SAME server check as /sign-in" | the reset flow can no longer skip the check that exposed the bug |
| forgot-password: "a refused account is explained and signed out back to /sign-in" | no bounce to `/`; the reason is shown |
| forgot-password: staff tests | `/staff-login` → reset → staff dashboard; refusals return to `/staff-login` |
| login-portal: `?error=` tests | after the sign-out redirect, the page explains why; unknown codes can't inject text |
| login-portal: pending `reset-password` task | explained ("set a new password first"), no longer silently stuck |
| 15-portal-check-repair: missing row | the row is created, CLIENT written back to Clerk, audited, → `/portal` |
| 15-portal-check-repair: re-seeded account | the old row is re-linked (same id, role and history) when its old Clerk account is gone |
| 15-portal-check-repair: conflicts | never takes over a record owned by another live Clerk account; unverified e-mail isn't enough |

## 2. Manual tests

**Setup:** `npm run dev`. Use a client account with a **real mailbox** you can read. Seeded clients use `@example.com`,
so sign up a fresh client at `/sign-up`. For staff tests, the admin's e-mail must be real (`SEED_ADMIN_EMAIL`). Other
staff accounts have placeholder e-mails and can't receive codes. Keep `/staff/admin/audit` open in a second browser as
admin.

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| **PR-1** Client happy path | `/sign-in` → **Forgot password?** → e-mail → **Send reset code** → code from the mailbox → **Verify code** → new password (8+ chars) → **Reset password** | Lands on `/portal`, signed in | ☐ |
| **PR-2** Sign in again (the reported bug) | Sign out (you land on `/`, which is normal for sign-out) → `/sign-in` → the **new** password | Lands on `/portal`. **Not** "Unauthorized", **not** bounced to `/` | ☐ |
| **PR-3** Old password | Sign out → sign in with the **old** password | Clerk's "incorrect password" error on `/sign-in` | ☐ |
| **PR-4** Other sessions | Before PR-1, also sign in on a second browser. After PR-1, refresh it | The second browser is signed out (`signOutOfOtherSessions`) | ☐ |
| **PR-5** Staff reset | `/staff-login` → **Forgot password?** | URL is `/forgot-password?portal=staff`; staff look; "Back to sign in" → `/staff-login` | ☐ |
| **PR-6** Staff finishes | Complete the reset as the admin | Lands on `/staff/admin` (not `/portal`) | ☐ |
| **PR-7** Staff signs in again | Sign out → `/staff-login` → new password | `/staff/admin` | ☐ |

### Reproduce the original bug, then watch the repair (dev/test database only)

This simulates "the Clerk account exists but our database row is linked to an old Clerk id", the state the bug came from.

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| **PR-8** Break the link | Pick the client from PR-1. Run:<br>`psql "$DIRECT_URL" -c "UPDATE \"User\" SET \"clerkId\" = 'user_orphan_test' WHERE email = '<their e-mail>'"` | (Old code: the next sign-in shows Unauthorized and bounces to `/`) | ☐ |
| **PR-9** Sign in | `/sign-in` with that client | Lands on `/portal` normally | ☐ |
| **PR-10** Check the repair | Admin → `/staff/admin/audit`, newest entries | "CLIENT account record **re-linked** to its new sign-in identity". The row's `clerkId` is back to the real Clerk id, and its bookings are still there | ☐ |

The e-mail must be **verified** in Clerk; it is for anyone who signed up with an e-mail code. Otherwise PR-9 is refused
with "couldn't find your account details", which is the safe outcome.

### Refusals now stay on the login page, with the reason

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| **PR-11** Wrong portal | Sign in as a **client** at `/staff-login` | Stays on `/staff-login` with "This is the staff sign-in. Client accounts sign in at the regular sign-in (/sign-in)." | ☐ |
| **PR-12** Wrong portal (reverse) | Sign in as **admin** at `/sign-in` | Stays on `/sign-in` with the staff-login hint | ☐ |
| **PR-13** Deactivated | Deactivate the PR-1 client: `psql "$DIRECT_URL" -c "UPDATE \"User\" SET \"isActive\" = false WHERE email = '<their e-mail>'"` (the Users page lists staff only). Then that client uses **Forgot password**. Afterwards set it back to `true` | After the new password: back on `/sign-in` with "This account has been deactivated…". No session | ☐ |
| **PR-14** Link can't inject text | Open `/sign-in?error=Call%200917%20for%20a%20refund` | Generic "We couldn't verify your account…"; the injected text is **not** shown, and `?error` disappears from the address bar | ☐ |
| **PR-15** Audit | Admin → `/staff/admin/audit`, module *Auth*, status *Failure* | PR-11/12/13 each logged ("attempted the … sign-in", "deactivated") | ☐ |

## 3. If PR-2 still fails

Open DevTools → **Network** → the `portal-check` request → **Response**:

| Response | Meaning | Action |
|---|---|---|
| `401 {"code":"NO_SESSION"}` | The server can't see the Clerk session at all | Check `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are from the **same** Clerk instance, the system clock is right, and no browser extension blocks cookies |
| `403 {"code":"ACCOUNT_NOT_FOUND"}` | The row was missing and could not be safely created or linked | Audit log: `ACCOUNT_LINK_CONFLICT` means another live Clerk account owns that e-mail/username in our DB. Fix the data by hand |
| `403 {"code":"WRONG_PORTAL"}` | A staff account on the client page, or vice versa | Use the other login page |
| `200 {"ok":true,…}` but still redirected | Not this bug | Check `/portal` vs `/staff` layout role logic and the session token's `metadata.role` claim (Clerk → Sessions → customize token) |

| Tester | Date | Result |
|---|---|---|
| | | ☐ all passed |
