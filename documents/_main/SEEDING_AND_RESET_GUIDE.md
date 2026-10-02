<!-- documents/SEEDING_AND_RESET_GUIDE.md -->

# Seeding & resetting the database (and Clerk) — Fab Memories

This guide matches the code as of 2026-09-27, **after the seed fixes**: `prisma/seed.ts`, `prisma/seeds/*` (including `guards.ts` and `clerk-seed-users.ts`).

---

## Quick reference

| I want to… | Command | Touches Clerk? | Safe on production? |
|---|---|---|---|
| See what's registered and whether the DB is empty | `npx tsx prisma/seed.ts --list` | No | Yes (read-only) |
| Seed the demo data into an **empty** DB | `npx tsx prisma/seed.ts` | Creates 8 users | **Refused** (live key / production) |
| Seed base + all test scenarios | `npx tsx prisma/seed.ts --all` | Creates 8 users | **Refused** |
| Add one scenario set on top | `npx tsx prisma/seed.ts --with=testing` (or `reports`, `integrity`) | No | **Refused** |
| Remove one scenario set | `npx tsx prisma/seed.ts --reset=testing` | No | — |
| Remove all scenario sets (keep base) | `npx tsx prisma/seed.ts --reset-all` | No | — |
| **Wipe everything + delete Clerk users + rebuild** | `npx tsx prisma/seed.ts --fresh --all` | **Deletes all** (except keep-list) | **Refused** |
| Wipe the DB, keep Clerk as it is | `npx tsx prisma/seed.ts --fresh --all --keep-clerk` | Replaces only the 8 seed accounts | **Refused** |
| Shortcuts in `package.json` | `npm run seed:testing` / `npm run seed:testing:reset` | No | — |

Add-on seeds:

- `reports`: Module 8 scenarios S1–S11 and history. Add `--bulk=N` for load tests.
- `integrity`: Module 9 scenarios I1–I5.
- `testing`: T1–T6, one booking parked at the start of each manual test.

---

## 0. Fixed issues (2026-09-27)

These used to break resets. They are fixed now, and the regression tests are in `test-harness/unit/seed-guards.unit.test.ts`.

| # | Was | Now |
|---|---|---|
| K1 | `--fresh` failed with `Notification_userId_fkey` / `CoordinatorUnavailability_coordinatorId_fkey` once anyone had a notification or an unavailability day | `--fresh` empties every table in the order set by `WIPE_ORDER` (`prisma/seeds/guards.ts`). A test fails if a model is added to `schema.prisma` without being added to that list. |
| K2 | Emptying the DB without wiping Clerk (`--keep-clerk`, `migrate reset`) made the next seed fail with "username is taken" | The seed finds its own accounts in Clerk by id, username **and** both possible emails, then removes them before re-creating them. |
| K3 | The plain seed would create `admin / FabMemories123!` against a live Clerk key | Every seeding command (base, add-ons, `--fresh`, including `--fresh --keep-clerk`) is refused when `CLERK_SECRET_KEY` is `sk_live_…` or `NODE_ENV=production`. `--list` and `--reset=<addon>` stay allowed. |

---

## 1. Before you run anything

1. **Put seed variables in `.env`, not `.env.local`.** The seed scripts load `dotenv/config`, which reads `.env` only. Next.js reads `.env.local`, but the seeds don't.
2. **`DATABASE_URL` must be the database *owner* connection.** `--fresh` checks that the role can delete audit rows. The restricted `app_runtime` role (`RUNTIME_DATABASE_URL`) is refused on purpose.
3. **`CLERK_SECRET_KEY` must be your *development* instance (`sk_test_…`).** Seeded users are created in whatever instance this key points to.
4. **Stop the dev server, and any webhook forwarding (ngrok / Clerk tunnel), while seeding.**
   - The seed creates Clerk users *and* database rows itself.
   - If your `/api/webhooks/clerk` endpoint receives `user.created` at the same moment, it can create the same row first. The seed then fails on the unique `clerkId`.
   - Deleted users trigger `user.deleted` webhooks too; these are harmless, just noisy.
5. Run migrations first:

   ```bash
   npx prisma migrate deploy      # uses DIRECT_URL (prisma.config.ts)
   npx prisma generate
   ```

Relevant `.env` entries:

```env
DATABASE_URL=postgresql://postgres.<ref>:<owner-pw>@...:6543/postgres   # OWNER role
DIRECT_URL=postgresql://postgres.<ref>:<owner-pw>@...:5432/postgres
CLERK_SECRET_KEY=sk_test_...
SEED_KEEP_CLERK_EMAILS=you@yourmail.com          # optional, see §5
SEED_ADMIN_USERNAME=admin                        # optional
SEED_ADMIN_PASSWORD=FabMemories123!              # optional
SEED_ADMIN_EMAIL=admin.fabmemories@example.com   # optional
```

---

## 2. First-time setup for development / testing

```bash
npx tsx prisma/seed.ts --list       # should say "database is empty"
npx tsx prisma/seed.ts --all        # base + reports + integrity + testing
```

If the base seed says **"Skipping base: the database already has data"**, nothing was changed. To start over, use §5.

**Accounts created** (password `FabMemories123!` for all):

| Login page | Sign in with | Role |
|---|---|---|
| `/staff-login` | `admin` | ADMIN |
| `/staff-login` | `coordinator`, `coordinator2`, `coordinator3`, `coordinator4` | COORDINATOR |
| `/staff-login` | `vendor` | VENDOR |
| `/sign-in` | `anna.fabmemories@example.com` (or `client_anna`) | CLIENT |
| `/sign-in` | `ben.fabmemories@example.com` (or `client_ben`) | CLIENT |

In Clerk, the staff accounts appear with emails `seed.<username>@example.com`. In the database their email is empty.

---

## 3. Everyday testing — add and remove scenario sets

Add-ons are tagged and re-runnable. Running one again first removes what its previous run created.

```bash
npx tsx prisma/seed.ts --with=testing        # (re)create T1–T6
npx tsx prisma/seed.ts --reset=testing       # remove T1–T6 only
npx tsx prisma/seed.ts --with=reports --bulk=1000   # load-test data
npx tsx prisma/seed.ts --reset-all           # remove every add-on, keep base users/bookings
```

None of these touch Clerk or the base users.

To get the demo bookings back into their starting state after clicking around, you need a full reset (§5). The base data cannot be reset on its own.

---

## 4. Checking the result

```bash
npx tsx prisma/seed.ts --list
npx tsx prisma/verify-integrity.ts           # audit hash chain intact after a seed
```

Then sign in with one account per role (table in §2). Or run `tests/login-portals.e2e.md`.

---

## 5. Full reset — wipe the DB **and** delete the Clerk users (development only)

### Step 0 — check which Clerk instance the seed will use

The seed reads `.env`; the app reads `.env.local`. Both must hold the **same** Clerk keys, or the seed creates accounts in an instance the app does not use. This prints only the start of each key:

```bash
grep -h "CLERK_SECRET_KEY\|CLERK_PUBLISHABLE_KEY" .env .env.local | cut -c1-40
```

In the `--fresh` preview (step 2), the Clerk user count should roughly match the database user count. **0 Clerk users next to a non-empty database means the keys differ** — cancel and fix `.env`.

### Step 1 — protect your own Clerk login (optional)

`--fresh` deletes **every user in the Clerk instance** — not just seeded ones — except the emails in the keep-list:

```env
SEED_KEEP_CLERK_EMAILS=you@yourmail.com,teammate@yourmail.com
```

For a kept account:

- the Clerk account survives;
- a CLIENT's database row survives, but its bookings are wiped;
- a staff row has no email in the DB, so it is deleted anyway. It is re-linked the next time that person signs in (portal-check repairs missing rows).

### Step 2 — preview, then confirm

```bash
npx tsx prisma/seed.ts --fresh --all
```

Before deleting anything, the script prints:

- the database host and name, with user / booking / audit counts;
- how many Clerk users will be deleted, with sample emails, and how many are kept.

Type `yes` to continue. **Anything else cancels, with nothing deleted.** That makes this command a safe dry run: read the summary, then press Enter.

### What happens after `yes`, in order

1. **Guard rails, checked before any deletion:**
   - a live Clerk key (`sk_live_…`) or `NODE_ENV=production` is refused, with or without `--keep-clerk`;
   - a missing `CLERK_SECRET_KEY` is refused;
   - a DB role that cannot delete audit rows is refused;
   - a non-interactive terminal without `--yes` is refused.
2. **Database wipe in one transaction.** Every table in `WIPE_ORDER` (`prisma/seeds/guards.ts`): the audit tables, notifications, coordinator unavailability, staff assignments, booking-vendors, vendors, installments, payments, bookings and packages, then the users (except kept clients). If anything fails, nothing is deleted.
3. **Clerk deletion.** Users are deleted one by one, paced, with retries on 429 rate limits. Progress shows as `n/total`.
   - If any deletion fails, the script stops and lists them. The DB is already empty at that point, so fix the cause and run `--fresh` again.
4. **Rebuild:** base, then the add-ons you selected. `--fresh` alone means base only; `--fresh --all` means everything.

You are signed out everywhere afterwards, because your session's user was deleted.

### Scripted / CI use

```bash
npx tsx prisma/seed.ts --fresh --all --yes
```

Only use this in CI against a disposable DB and a dev Clerk instance.

### DB-only reset (keep Clerk)

```bash
npx tsx prisma/seed.ts --fresh --all --keep-clerk
```

This wipes the database and rebuilds it. In Clerk, only the 8 seed accounts are removed and re-created (fix K2). Every other Clerk user stays, but loses their database row and bookings; their row is re-created as CLIENT, or with the role in their Clerk metadata, the next time they sign in.

### Avoid

- **`npx prisma migrate reset`.** It works for the seed accounts now, but other Clerk users are left without database rows, and there is no preview or confirmation. Prefer `--fresh`.
- **Deleting users in the Clerk Dashboard without wiping the DB.** The `user.deleted` webhook only marks rows inactive, so logins break while the rows remain.

---

## 6. Deleting only the test users from Clerk

There is no command for "Clerk only". Choose one:

- **Full reset:** `--fresh` (§5). The keep-list keeps real people.
- **Manual:** Clerk Dashboard → Users → search `@example.com` → delete. Then `--fresh` to rebuild the DB consistently.

---

## 7. Production

**Never run the seed against production.** The base seed creates accounts with a published password and fake bookings. Since fix K3, every seeding command refuses a live Clerk key (`sk_live_…`) and `NODE_ENV=production`. Treat that as a safety net, not permission: a production database with a *test* Clerk key would not be detected.

### First deployment

1. **Migrations:**

   ```bash
   npx prisma migrate deploy
   ```

   Run with the production `DIRECT_URL`.
2. **Restricted runtime role:** run `prisma/scripts/create-restricted-role.sql` once, then set `RUNTIME_DATABASE_URL` in Vercel.
3. **Clerk production instance:**
   - username + password sign-in enabled;
   - session token customized to `{ "metadata": "{{user.public_metadata}}" }`;
   - Sessions → Maximum lifetime (and inactivity timeout) set as you want them — Clerk enforces session lifetime, the app does not (see `documents/SESSION_LIFETIME.md`);
   - webhook endpoint `https://<your-domain>/api/webhooks/clerk` with `user.*` and `session.*` events, its secret stored in `CLERK_WEBHOOK_SIGNING_SECRET`.
4. **First admin, created by hand (no seed):**
   1. Clerk Dashboard (production) → Users → **Create user**, with a username, the owner's real email, and a strong password.
   2. Wait for the `user.created` webhook. The user appears in the `User` table as CLIENT.
   3. On that user, go to **Metadata → Public** and set `{ "role": "ADMIN" }`. The `user.updated` webhook changes the DB role to ADMIN.
   4. Sign in at `/staff-login`.
5. **Everything else goes through the app.** The admin creates packages (Admin → Packages), coordinators and vendors (Admin → User accounts). Clients sign up at `/sign-up`.

### "Resetting" production

Don't wipe. The audit trail is tamper-evident on purpose, and `--fresh` refuses live keys. To undo bad data:

- **Take a backup first:**

  ```bash
  pg_dump "$DIRECT_URL" -Fc -f fabmemories-$(date +%F).dump
  ```

  Or use Supabase → Database → Backups.
- **Restore from backup:** use Supabase point-in-time restore or `pg_restore`.
- **Remove individual accounts:** deactivate them in Admin → User accounts. Don't delete them, because deletion breaks audit history.

---

## 8. Troubleshooting

| Message | Cause | Fix |
|---|---|---|
| `DATABASE_URL is required` | The variable is only in `.env.local` | Put it in `.env` |
| `Skipping "base": the database already has data` | The DB is not empty | Use `--with=<addon>`, or `--fresh` for a full rebuild |
| `"<addon>" needs the "base" data first` | Add-on run on an empty DB | `npx tsx prisma/seed.ts --with=<addon>` (base runs first) |
| `The database role "app_runtime" cannot delete audit rows` | Runtime connection used | Put the owner connection in `DATABASE_URL` |
| `Not an interactive terminal — pass --yes` | Piped / CI | Add `--yes` (only against disposable targets) |
| `Refusing to seed: CLERK_SECRET_KEY is a LIVE key` / `NODE_ENV is "production"` | Fix K3 | Use the dev instance's `sk_test_` key and unset `NODE_ENV` |
| `--fresh` preview shows **0 Clerk users** but the DB has users | `.env` and `.env.local` hold different Clerk keys | Cancel, then copy the keys from `.env.local` into `.env` (§5 step 0) |
| Foreign key error during `--fresh` | A new table is not in `WIPE_ORDER` | Add it to `prisma/seeds/guards.ts` (the unit test names it). Nothing was deleted. |
| Clerk: `That username is taken` / `form_identifier_exists` | A seed username belongs to a Clerk user with a different id and email | Delete that user in Clerk Dashboard → Users, then run the seed again |
| Unique constraint on `clerkId` during seed | A webhook created the row first | Stop the dev server / tunnel while seeding (§1.4), then `--fresh` |
| `n FAILED` during Clerk deletion | Network or a Clerk error | The DB is already wiped. Run `--fresh` again (already-deleted users count as done). |
| Seeded users can't sign in | `SEED_CLERK_STUB` is set | Unset it. The stub is an offline fake. |

---

## 9. Still optional (not built)

1. `seed`, `seed:all`, `seed:fresh`, `seed:list` scripts in `package.json`.
2. A `bootstrap-admin` command for production: one admin created from environment variables, with no demo data, replacing the manual steps in §7.
