# E2E — Seeding & safe reset (DB + Clerk)

Run against a **development** Supabase project and a **development** Clerk instance only.

**Setup:**

1. `.env` and `.env.local` hold the same Clerk keys. Check with:
   ```bash
   grep -h "CLERK_SECRET_KEY\|CLERK_PUBLISHABLE_KEY" .env .env.local | cut -c1-40
   ```
2. `DATABASE_URL` in `.env` is the owner connection.
3. Stop `npm run dev` and any webhook tunnel.

## A. Full reset with data that used to block it (fix K1)

| # | Steps | Expected | ✔ |
|---|---|---|---|
| A1 | Make sure some notifications and an unavailability day exist. Either sign in as `anna` and submit a payment proof, and as `coordinator` add an unavailable day; or just use a DB that has been clicked through. | Rows exist in `Notification` and `CoordinatorUnavailability` (Supabase table editor) | |
| A2 | `npx tsx prisma/seed.ts --fresh --all` | Preview shows the DB counts, and a **Clerk count that roughly matches the DB user count** (not 0), with sample emails | |
| A3 | Type `yes` | "Database cleared" → "n deleted" for Clerk → base, reports, integrity, testing run → `✅ Done`. **No foreign-key error.** | |
| A4 | Supabase: `Notification`, `CoordinatorUnavailability` | Empty (or only rows the new seeds created) | |
| A5 | Clerk Dashboard → Users | Only the 8 seed accounts, plus anyone on `SEED_KEEP_CLERK_EMAILS` | |
| A6 | Sign in: `admin` at `/staff-login`, `anna.fabmemories@example.com` at `/sign-in` (`FabMemories123!`) | Both land on their dashboards | |

## B. Cancel is safe

| # | Steps | Expected | ✔ |
|---|---|---|---|
| B1 | `npx tsx prisma/seed.ts --fresh --all`, press Enter (don't type `yes`) | "Cancelled. Nothing was deleted." `--list` still says the DB has data. | |

## C. DB-only reset keeps other Clerk users (fix K2)

| # | Steps | Expected | ✔ |
|---|---|---|---|
| C1 | Sign up a new client at `/sign-up` (e.g. `test.keep@yourmail.com`) | Account exists in Clerk | |
| C2 | `npx tsx prisma/seed.ts --fresh --all --keep-clerk`, then `yes` | Preview says Clerk is not touched; seed completes with **no "username is taken"** | |
| C3 | Clerk Dashboard | `test.keep@…` still exists; the 8 seed accounts exist once each, with new ids (no duplicates) | |
| C4 | Sign in as `test.keep@…` at `/sign-in` | Works; lands on `/portal` (row re-created at sign-in) | |

## D. Re-seed after the DB was emptied by something else (fix K2)

| # | Steps | Expected | ✔ |
|---|---|---|---|
| D1 | `npx tsx prisma/seed.ts --fresh --all --keep-clerk --yes` (the DB is emptied while the seed accounts stay in Clerk) | Completes | |
| D2 | Run D1 a second time | Completes again (seed accounts found by username and replaced, never "username is taken") | |

## E. Production refusal (fix K3)

| # | Steps | Expected | ✔ |
|---|---|---|---|
| E1 | `NODE_ENV=production npx tsx prisma/seed.ts` | `❌ Refusing to seed: NODE_ENV is "production"…` Nothing created. | |
| E2 | `NODE_ENV=production npx tsx prisma/seed.ts --fresh --keep-clerk` | Refused, and no preview is shown | |
| E3 | `NODE_ENV=production npx tsx prisma/seed.ts --list` | Still works (read-only) | |
| E4 | `CLERK_SECRET_KEY=sk_live_fake npx tsx prisma/seed.ts --with=testing` | `Refusing to seed: CLERK_SECRET_KEY is a LIVE key…` | |
| E5 | `NODE_ENV=production npx tsx prisma/seed.ts --reset=testing` | Allowed (only removes tagged test bookings) | |

## F. Add-ons

| # | Steps | Expected | ✔ |
|---|---|---|---|
| F1 | `npx tsx prisma/seed.ts --with=testing` twice | Second run removes the first run's T1–T6, then re-creates them (no duplicates) | |
| F2 | `npx tsx prisma/seed.ts --reset-all` | Add-on data gone, base users and bookings still there | |

## Automated

```bash
npx vitest run --project unit test-harness/unit/seed-guards.unit.test.ts   # 15 tests
npm test                                                                  # full UI + unit suite
```
