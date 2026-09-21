# Module 10 — Security hardening (batch 1)

Security headers + Content-Security-Policy, a deny-by-default `/api` gate, and personal-data protection in the audit trail.
Read `docs/SECURITY_HEADERS.md` and `docs/AUDIT_PRIVACY.md`.

## Where the files go (paths are relative to your project root)

**New**
| File | Purpose |
|---|---|
| `lib/security/headers.ts` | Every security header and the CSP settings |
| `lib/audit/redact.ts` | Redaction + `auditChanges()` |
| `prisma/verify-audit-privacy.ts` | 29 privacy checks incl. the source scanner |
| `test-harness/ui/proxy.test.tsx` | 40 tests: `/api` gate, page redirects, CSP, static headers |
| `docs/SECURITY_HEADERS.md`, `docs/AUDIT_PRIVACY.md` | Documentation and the click-through checklist |

**Replaced** (compare first if you edited them)
| File | Change |
|---|---|
| `next.config.ts` | static security headers, `poweredByHeader: false` (your file was empty) |
| `proxy.ts` | your file + the `/api` deny-by-default gate + `contentSecurityPolicy` |
| `lib/audit/log.ts` | redaction before hashing |
| `lib/clerk/webhook-handler.ts` | no names in login/logout/lockout descriptions |
| `features/reports/reports.shared.ts`, `reports.handler.ts` | never echo search terms; no names |
| `test-harness/verify-integrity-routes.ts` | +9 route-level privacy checks |
| 22 files under `app/api/**/route.ts` | no names in descriptions; `auditChanges()` instead of raw payloads; free-text reasons not copied (list in the zip) |

**Edit by hand — `patches/app-layout.patch`** (your real `app/layout.tsx` isn't in my copy). Apply with `git apply patches/app-layout.patch`, or make the four small edits shown in `docs/SECURITY_HEADERS.md`. **Required**: without it, enforcing the CSP would break sign-in and the theme.

## Then

1. `npx tsx prisma/verify-audit-privacy.ts` → 29 passed. `npx vitest run` → 88 passed. `bash test-harness/run-route-tests.sh` → 56 + 56.
2. Deploy; do the click-through in `docs/SECURITY_HEADERS.md` (the CSP is **report-only** — nothing can break).
3. When the console is clean: set `CSP_ENFORCE=true` in Vercel and redeploy.

## Dependency fixes (NOT in the zip — run these yourself, then re-test sign-in, the map and uploads)

```bash
npm install next@16.3.5 --legacy-peer-deps      # patches the critical proxy-bypass advisory (16.2.6 → 16.3.5, same major)
npm uninstall nodemailer                          # installed but unused; has a high advisory
npm audit fix --omit=dev                          # transitive fixes (sharp, postcss, fast-uri, js-yaml, nanoid, hono, qs)
```
I could not test the `next` upgrade against your real Clerk/Supabase/Maps, so upgrade on a branch first.

## Known / not done
- Existing audit entries keep the names they were written with (see AUDIT_PRIVACY.md).
- `/vendor-brief/<unknown id>` renders a 500 instead of a 404 (pre-existing; unrelated).
- Not in this batch: rate limiting, upload magic-byte checks, vendor-role scoping on `/api/bookings/[id]/vendors`, `server-only` on query files, seed refusing live Clerk keys, expiring vendor-brief links, external anchoring of the audit tip.
