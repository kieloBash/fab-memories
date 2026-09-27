# Session lifetime — `SESSION_MAX_AGE` (default 1 day)

## Before

The app never limited how long a sign-in lasted. Sessions lived for whatever the Clerk Dashboard's **Sessions → Maximum lifetime** said (Clerk's default is several days).

## Now

A sign-in is valid for **`SESSION_MAX_AGE`** after the user entered their password. The default is **`1d`**.

```env
SESSION_MAX_AGE=1d     # 90m | 12h | 1d | 7d …  (invalid value → 1d, never "unlimited")
```

The value is read on every request, so changing it only needs a restart or redeploy. No migration is needed.

## How it works

1. Every Clerk session token carries a **factor verification age**: the minutes since the password was entered. `proxy.ts` compares it with `SESSION_MAX_AGE` on every request. This needs no database or network call.
2. When a session is expired:

   | Request | Result |
   |---|---|
   | Page under `/staff/**` or `/portal/**` | Redirect to the login page of the account's **own** portal: `/staff-login?error=SESSION_EXPIRED` or `/sign-in?error=SESSION_EXPIRED` |
   | Any `/api/**` route | `401 { code: "SESSION_EXPIRED" }` |
   | `/api/auth/session-expired` | Allowed (see step 3) |
   | `/sign-in`, `/staff-login` | Allowed. It is **not** bounced to the dashboard, because the page has to load. |

3. The login page shows **"Your session has expired. Please sign in again."** While the browser is still signed in, the page:
   - calls `POST /api/auth/session-expired`, which rechecks the age on the server, **revokes the session at Clerk**, and writes an audit entry: `LOGOUT / AUTH / SUCCESS — <ROLE> session ended — older than the 1d maximum session age`, with metadata `{ event: "SESSION_EXPIRED", maxAgeMinutes, sessionAgeMinutes, sessionRevoked }`;
   - signs the browser out and returns to the same page, which then just shows the message.
4. Screens that are already open: `lib/axios.ts` has a response interceptor. The first `401 SESSION_EXPIRED` sends the browser to `/staff-login` (for `/staff/**` screens) or `/sign-in`, once, instead of showing an error toast for every query.

**Safety checks on `POST /api/auth/session-expired`:**

- A session that is still valid gets `409 NOT_EXPIRED`, so a crafted link cannot log anyone out.
- A session already ended by another tab gets no second audit entry.

## Files

| File | Change |
|---|---|
| `lib/security/session-policy.ts` | **New.** Parses `SESSION_MAX_AGE`, provides `isSessionExpired()` and formatting helpers. |
| `proxy.ts` | Expiry check for pages, API routes and login pages. |
| `app/api/auth/session-expired/route.ts` | **New.** Revokes the session and writes the audit entry. |
| `lib/clerk/portal.ts` | New refusal code `SESSION_EXPIRED` and its message. |
| `features/auth/finish-sign-in.ts` | `useSignInErrorFromUrl` ends an expired session and signs the browser out. |
| `features/auth/portal-check.ts` | `endExpiredSession()` client call. |
| `lib/axios.ts` | `redirectIfSessionExpired()` and the response interceptor. |
| `.env.example` | `SESSION_MAX_AGE=1d`. |
| `test-harness/unit/session-policy.unit.test.ts` | **New.** Parser, expiry and interceptor tests. |
| `test-harness/unit/session-expired-route.unit.test.ts` | **New.** Route tests. |
| `test-harness/ui/proxy.test.tsx` | +10 expiry tests. |
| `test-harness/ui/login-portal.test.tsx` | +3 tests per login page, and a `useAuth` mock. |
| `test-harness/ui/forgot-password.test.tsx` | `useAuth` mock added (the hook now uses it). |
| `tests/session-lifetime.e2e.md` | **New.** Manual checklist. |

Tests: **398 / 398** UI and unit tests pass.

## Clerk Dashboard settings to match

- **Sessions → Maximum lifetime** must be **≥ `SESSION_MAX_AGE`**. The app can only shorten sessions. If Clerk's limit is shorter, Clerk ends the session first with its own plain sign-out.
- **Sessions → Inactivity timeout** is separate from this setting. Leave it off unless you want an idle limit as well.
- **Sessions → Customize session token** should keep `{ "metadata": "{{user.public_metadata}}" }` (see `LOGIN_REDIRECT_FIX.md`).

## Limits (state these in the thesis)

- **It is an absolute limit, counted from the last password entry.** Activity does not extend it. If Clerk asks the user to re-verify (re-enter the password), the clock restarts.
- **Up to about a minute of slack.** Clerk refreshes the session token roughly every minute, so the age is checked at that resolution.
- **Missing claim.** If the session token has no verification age (an older Clerk session-token version), the check is **skipped** and a warning is logged once. Sessions then fall back to Clerk's own lifetime; they are never treated as expired by mistake.
- **The server-side revoke happens on the login page.** If the user closes the browser before reaching it, the Clerk session is not revoked right away. It is still useless, because `proxy.ts` refuses every page and API call for it, and Clerk's own maximum lifetime ends it later.
