<!-- documents/SESSION_LIFETIME.md -->
# Session lifetime — managed by Clerk

The app does **not** measure or limit how long a sign-in lasts. Clerk does. This replaces the earlier custom
`SESSION_MAX_AGE` setting (default 1 day), which was removed.

## Where it is configured

Clerk Dashboard → **Sessions** (do it on the instance the site uses — development now, production later):

| Setting | What it does |
|---|---|
| Maximum lifetime | A session ends this long after sign-in, whatever the user is doing |
| Inactivity timeout | A session ends after this long without activity (if your Clerk plan offers it) |

Revoking a session by hand (Dashboard → Users → user → Sessions → Revoke) ends it immediately.

## What the app does when Clerk ends a session

Nothing is checked by the app itself — an ended session simply arrives as **signed out**:

| Where the user is | What happens |
|---|---|
| Opens or reloads a page under `/staff/**` or `/portal/**` | `proxy.ts` redirects to the login page (`/staff-login` or `/sign-in`) |
| A screen that is already open makes an API call | `proxy.ts` answers `401 { code: "NO_SESSION" }`; `lib/axios.ts` (`redirectIfSignedOut`) sends the browser to its login page **once** with `?error=SESSION_ENDED` |
| On the login page | Shows "You've been signed out. Please sign in again." and removes the code from the address bar. No server call, no second sign-out |

## What was removed

| Removed | Why |
|---|---|
| `lib/security/session-policy.ts` (`SESSION_MAX_AGE` parsing, age check) | The app no longer decides when a session is too old |
| `POST /api/auth/session-expired` | It revoked "too old" sessions; Clerk does that now |
| `?error=SESSION_EXPIRED` and `401 SESSION_EXPIRED` | Replaced by Clerk's normal signed-out path (`NO_SESSION` → `SESSION_ENDED`) |
| `SESSION_MAX_AGE` environment variable | Unused — delete it from Vercel and `.env` files if it is still set |
| `session-policy.unit.test.ts`, `session-expired-route.unit.test.ts` | Tested the removed code |

`/api/auth/portal-check` stays. It is an **access** check (is this account allowed on this login page, is it
deactivated), not a session-age check; it only ends a session to refuse a sign-in.

## Tests

| File | Covers |
|---|---|
| `test-harness/unit/signed-out-redirect.unit.test.ts` | `redirectIfSignedOut`: right login page, `SESSION_ENDED`, once only, ignores other errors and login pages |
| `test-harness/ui/proxy.test.tsx` → "session lifetime is left to Clerk" | An old sign-in that Clerk still accepts is never cut off; an ended session redirects (pages) or gets `401 NO_SESSION` (API) |
| `test-harness/ui/login-portal.test.tsx` | `?error=SESSION_ENDED` is explained only; the old `SESSION_EXPIRED` code is treated as unknown |
| `tests/session-lifetime.e2e.md` | Manual check against the running site |

## Thesis wording

Session lifetime (maximum lifetime and inactivity timeout) is enforced by the authentication provider, Clerk, and
configured in its dashboard. When a session ends, the system returns the user to the correct login page with an
explanation.
