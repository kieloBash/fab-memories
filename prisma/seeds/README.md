# Main seed

One entry point for all seed data: `prisma/seed.ts`. The seeds live in `prisma/seeds/` and are listed in `prisma/seeds/index.ts`.

```bash
npx tsx prisma/seed.ts --help
```

## Everyday commands

| Command | What it does |
|---|---|
| `npx tsx prisma/seed.ts` | Seeds the **base** data (users, packages, sample bookings, vendors, staff) **only if the database is empty**. Never wipes anything. |
| `… --with=reports,integrity` | Base (if empty) + those add-on seeds |
| `… --all` | Base + every add-on |
| `… --only=reports` | Just that add-on (base data must already exist) |
| `… --with=reports --bulk=1000` | Add-on flags pass through (`--bulk=N` = N extra past bookings, for load tests) |
| `… --reset=reports` | Removes **only** what that add-on created |
| `… --reset-all` | Removes every add-on's data (base untouched) |
| `… --list` | Shows the registered seeds and whether the database is empty |
| `… --fresh --all` | **Wipes the database and every Clerk user**, then rebuilds (asks first) |

`npx prisma db seed` runs the plain command (base only, if empty). Use `npx tsx prisma/seed.ts …` when you need options.

Optional `package.json` scripts:

```json
"seed": "tsx prisma/seed.ts",
"seed:all": "tsx prisma/seed.ts --all",
"seed:fresh": "tsx prisma/seed.ts --fresh --all",
"seed:list": "tsx prisma/seed.ts --list"
```

(`npm run seed -- --with=reports` passes extra options.)

## Add-on seeds

| Name | Adds |
|---|---|
| `reports` | Module 8 demo scenarios S1–S11, history, audit entries (fills the dashboard risk panel). `--bulk=N` for load testing |
| `integrity` | Module 9 scenarios I1–I5 (blocked confirms, held dates, a clean verify) for `docs/MODULE_9_E2E_TEST.md` |

The old commands still work: `npx tsx prisma/seed-reports.ts [--bulk=N] [--reset-only]` and `npx tsx prisma/seed-integrity.ts [--reset-only]`.

## `--fresh` — what it deletes

1. **Database:** all users, bookings, payments, installments, vendors, packages, staff assignments and the audit trail (including the failure log).
2. **Clerk:** **every** user in the Clerk instance your `CLERK_SECRET_KEY` points to (except the keep-list). This signs you out everywhere.
3. Then it recreates the base users in Clerk and the database, and runs the seeds you selected.

It prints the database target, the counts, and a sample of the Clerk emails, then requires you to type `yes` (`--yes` skips this for scripts).

**Safety rules (all checked before anything is deleted):**
- A **live** Clerk key (`sk_live_…`) is refused.
- The database role must be able to delete audit rows. The restricted `app_runtime` role is refused — put the **owner** connection in `DATABASE_URL` when seeding.
- Not an interactive terminal and no `--yes` → refused.
- `SEED_KEEP_CLERK_EMAILS=you@example.com,other@example.com` (in `.env`) protects those Clerk accounts, and their database rows.
- `--fresh --keep-clerk` leaves Clerk alone; only the seeded accounts are replaced.

Deleting many Clerk users is paced and retried when Clerk rate-limits (HTTP 429).

## Add a new seed

1. `cp prisma/seeds/_template.ts prisma/seeds/04-my-seed.ts`
2. Change `TAG`, the description, and fill in `run()`. Tag everything you create so `reset()` can remove exactly that.
3. In `prisma/seeds/index.ts` add one `import { seed as mySeed } from "./04-my-seed"` and add `mySeed` to the `SEEDS` list.
4. `npx tsx prisma/seed.ts --with=my-seed` — and `--reset=my-seed` to undo it.

Base users always exist to look up (`client_anna`, `client_ben`, `coordinator`, `admin`, …); don't recreate them.

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Database **owner** connection used by seeding |
| `CLERK_SECRET_KEY` | The Clerk instance to create the accounts in |
| `SEED_KEEP_CLERK_EMAILS` | Clerk accounts `--fresh` must not delete |
| `SEED_ADMIN_USERNAME` | Admin username (default `admin`) |
| `SEED_CLERK_STUB=<file.json>` | Offline test mode: a fake Clerk stored in that file. Users made this way **cannot sign in**. Leave unset normally. |

## Not verified against real Clerk

The Clerk wipe was tested against an offline stand-in that pages results and simulates rate limiting; it has not been run against a live Clerk instance. Try `--fresh` on a **development** instance with a few test users first.
