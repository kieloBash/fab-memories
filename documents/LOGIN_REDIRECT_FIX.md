# Login redirect fix — `/sign-in` for clients, `/staff-login` for staff

## The bug

Every login behaved like the **staff** login, and users kept ending up on `/sign-in`.

**Root cause:** `app/(pages)/(public)/sign-in/[[...sign-in]]/page.tsx` had been overwritten with an exact copy of the staff login page. It showed "Staff access" and a Username field, and it called `finishSignIn({ portal: "staff" })`. As a result:

| Who | Where | What happened |
|---|---|---|
| CLIENT | `/sign-in` | Clerk accepted the password → portal-check said `WRONG_PORTAL` → session revoked → sent to `/staff-login?error=WRONG_PORTAL` |
| ADMIN / COORDINATOR / VENDOR | `/sign-in` | **Let in**, which broke the portal rule |
| Anyone Clerk redirects by itself | → `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (`/sign-in`) | Landed on a staff form at the client URL |

The test suite caught it: 8 `client sign-in (/sign-in)` tests in `test-harness/ui/login-portal.test.tsx` failed.

**Second problem found (redirect loop):** when the session token had no `metadata.role`, the app looped:

- `staff/layout.tsx` sent the user to `/portal`.
- `portal/layout.tsx` sent them back to `/staff`.
- `staff/page.tsx` also defaulted unknown roles to `/portal`.

The result was `ERR_TOO_MANY_REDIRECTS`.

## What changed

| File | Change |
|---|---|
| `app/(pages)/(public)/sign-in/[[...sign-in]]/page.tsx` | Rebuilt as the **client** page: Email address/username + password, `portal: "client"`, links to `/sign-up`, `/forgot-password` and `/staff-login`. |
| `lib/clerk/page-session.ts` | **New.** `getPageSession()` returns `{ signedIn, role, roleSource, dbUser }`. The role comes from the session token first, then from the database for active accounts. It never guesses. |
| `app/(pages)/(protected)/staff/layout.tsx` | Signed out → `/staff-login`. Unknown role → `/unauthorized`. CLIENT → `/portal`. Passes `signOutRedirectUrl="/staff-login"`. |
| `app/(pages)/(protected)/portal/layout.tsx` | Signed out → `/sign-in`. Unknown role → `/unauthorized`. Staff → their own dashboard. Passes `signOutRedirectUrl="/sign-in"`. |
| `app/(pages)/(protected)/staff/page.tsx` | Server-side `redirect(dashboardFor(role))`. No client-side guessing. |
| `app/(pages)/(protected)/staff/{admin,coordinator,vendor}/layout.tsx` | Use `getPageSession()`, so a missing token claim doesn't wrongly show `/unauthorized`. |
| `app/(pages)/(protected)/unauthorized/page.tsx` | Uses `getPageSession()` for the "back to your dashboard" link. |
| `features/layouts/components/SidebarShell.tsx` | New optional prop `signOutRedirectUrl` (default `/`), passed to `LogoutButton`. |
| `components/logout-button.tsx` | `signOut({ redirectUrl })`, so Clerk navigates after the session is cleared. The old `router.push` raced the sign-out. |
| `test-harness/unit/page-session.unit.test.ts` | **New.** 5 tests for the role resolution. |
| `tests/login-portals.e2e.md` | **New.** Manual end-to-end checklist. |

No API route, schema, migration or seed changed. Use the existing `01-base` seed accounts.

## Redirect rules after the fix

| Visitor | `/staff/**` | `/portal/**` |
|---|---|---|
| Signed out | `/staff-login` (proxy) | `/sign-in` (proxy) |
| CLIENT | `/portal` | allowed |
| ADMIN / COORDINATOR / VENDOR | allowed (sub-sections still role-checked) | own dashboard |
| Signed in, role only in DB | treated as the DB role | treated as the DB role |
| Signed in, no role anywhere / deactivated | `/unauthorized` | `/unauthorized` |
| Sign out from sidebar | → `/staff-login` | → `/sign-in` |

## Verified

- `npx vitest run --project ui --project unit`: **345 / 345 pass**. That is the 340 existing tests (including the 8 that were failing) plus 5 new ones.
- Not verified here: a real Clerk instance. Run `tests/login-portals.e2e.md`.

## Clerk Dashboard check

The role in the token only appears if **Sessions → Customize session token** contains:

```json
{ "metadata": "{{user.public_metadata}}" }
```

The app now survives without it by falling back to the database role. Keep it set anyway, because `proxy.ts` uses the token claim to redirect signed-in users away from the login pages.
