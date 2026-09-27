<!-- documents/SEEDING_AND_RESET_GUIDE.md -->

# Seeding & resetting the database (and Clerk) — Fab Memories

This guide matches the code as of 2026-09-27: `prisma/seed.ts`, `prisma/seeds/*`, `prisma/seeds/clerk-wipe.ts`.
Read **§0 Known issues** first. Two of them affect resets today.

---

## Quick reference

| I want to… | Command | Touches Clerk? | Safe on production? |
|---|---|---|---|
| See what's registered and whether the DB is empty | `npx tsx prisma/seed.ts --list` | No | Yes (read-only) |
| Seed the demo data into an **empty** DB | `npx tsx prisma/seed.ts` | Creates 8 users | **No** (demo passwords) |
| Seed base + all test scenarios | `npx tsx prisma/seed.ts --all` | Creates 8 users | **No** |
| Add one scenario set on top | `npx tsx prisma/seed.ts --with=testing` (or `reports`, `integrity`) | No | No |
| Remove one scenario set | `npx tsx prisma/seed.ts --reset=testing` | No | — |
| Remove all scenario sets (keep base) | `npx tsx prisma/seed.ts --reset-all` | No | — |
| **Wipe everything + delete Clerk users + rebuild** | `npx tsx prisma/seed.ts --fresh --all` | **Deletes all** (except keep-list) | **Refused** (live key) |
| Shortcuts in `package.json` | `npm run seed:testing` / `npm run seed:testing:reset` | No | — |

Add-on seeds:

- `reports`: Module 8 scenarios S1–S11 and history. Add `--bulk=N` for load tests.
- `integrity`: Module 9 scenarios I1–I5.
- `testing`: T1–T6, one booking parked at the start of each manual test.

---

## 0. Known issues (as of this guide)

| # | Problem | Effect | Workaround until fixed |
|---|---|---|---|
| K1 | `--fresh` does not delete `Notification` or `CoordinatorUnavailability` rows. Both reference `User` with `ON DELETE RESTRICT`. | Once anyone has received a notification or entered unavailability, `--fresh` fails with a foreign-key error. The wipe runs in one transaction, so **nothing is deleted** — neither the DB nor Clerk. It is safe, but the reset is blocked. | Run §5 step 0 (two `DELETE`s) first. |
| K2 | The base seed looks up staff in Clerk by `admin.fabmemories@example.com`, but it created them as `seed.admin@example.com`. | Emptying the DB **without** also deleting Clerk users breaks the next seed for staff: Clerk says "username is taken". This happens with `--fresh --keep-clerk`, `npx prisma migrate reset`, or a manual `TRUNCATE`. | Don't use those. If it already happened, delete the `seed.*@example.com` users in Clerk Dashboard → Users, then seed again. |
| K3 | The base seed has no production guard. With a live Clerk key and an empty DB, it creates `admin / FabMemories123!`. | Public demo accounts in production. | Never run `npx tsx prisma/seed.ts` against production (see §7). |

Fixes for K1–K3 are proposed at the end (§9). They are not applied yet.

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

### Step 0 — work around K1 (until the fix in §9 is applied)

Run this in the Supabase SQL editor, or with `psql "$DIRECT_URL"`, as the owner:

```sql
DELETE FROM "Notification";
DELETE FROM "CoordinatorUnavailability";
```

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
   - a live Clerk key (`sk_live_…`) is refused;
   - a missing `CLERK_SECRET_KEY` is refused;
   - a DB role that cannot delete audit rows is refused;
   - a non-interactive terminal without `--yes` is refused.
2. **Database wipe in one transaction.** Deletes the audit failures, audit log, audit chain state, staff assignments, booking-vendors, vendors, installments, payments, bookings and packages, then the users (except kept clients).
3. **Clerk deletion.** Users are deleted one by one, paced, with retries on 429 rate limits. Progress shows as `n/total`.
   - If any deletion fails, the script stops and lists them. The DB is already empty at that point, so fix the cause and run `--fresh` again.
4. **Rebuild:** base, then the add-ons you selected. `--fresh` alone means base only; `--fresh --all` means everything.

You are signed out everywhere afterwards, because your session's user was deleted.

### Scripted / CI use

```bash
npx tsx prisma/seed.ts --fresh --all --yes
```

Only use this in CI against a disposable DB and a dev Clerk instance.

### Do **not** use for a full reset

- **`npx prisma migrate reset`.** It drops the DB and runs the base seed, but never deletes Clerk users. The result is orphaned Clerk users and K2 failures.
- **`--fresh --keep-clerk`.** Also hits K2 for staff accounts.
- **Deleting users in the Clerk Dashboard without wiping the DB.** The `user.deleted` webhook only marks rows inactive, so logins break while the rows remain.

---

## 6. Deleting only the test users from Clerk

There is no command for "Clerk only". Choose one:

- **Full reset:** `--fresh` (§5). The keep-list keeps real people.
- **Manual:** Clerk Dashboard → Users → search `@example.com` → delete. Then `--fresh` to rebuild the DB consistently.

---

## 7. Production

**Never run the seed against production.** The base seed creates accounts with a published password and fake bookings. `--fresh` refuses live keys; the plain seed does not (K3).

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
   - Sessions → Maximum lifetime ≥ `SESSION_MAX_AGE`;
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
| `Refusing to wipe Clerk users: … LIVE key` | `CLERK_SECRET_KEY` is `sk_live_` | Use the dev key. Production is never wiped. |
| `The database role "app_runtime" cannot delete audit rows` | Runtime connection used | Put the owner connection in `DATABASE_URL` |
| `Not an interactive terminal — pass --yes` | Piped / CI | Add `--yes` (only against disposable targets) |
| Foreign key error on `Notification_userId_fkey` or `CoordinatorUnavailability_coordinatorId_fkey` | K1 | §5 step 0, then run again. Nothing was deleted. |
| Clerk: `That username is taken` / `form_identifier_exists` | K2 (DB emptied, Clerk not) | Delete the `seed.*@example.com` users in Clerk, then seed |
| Unique constraint on `clerkId` during seed | A webhook created the row first | Stop the dev server / tunnel while seeding (§1.4), then `--fresh` |
| `n FAILED` during Clerk deletion | Network or a Clerk error | The DB is already wiped. Run `--fresh` again (already-deleted users count as done). |
| Seeded users can't sign in | `SEED_CLERK_STUB` is set | Unset it. The stub is an offline fake. |

---

## 9. Proposed fixes (not applied — need your go-ahead)

1. **K1:** add `notification` and `coordinatorUnavailability` to the `--fresh` wipe (`prisma/seeds/cli.ts`), plus a test that fails if a new table referencing `User` is ever left out of the wipe.
2. **K2:** in the base seed's Clerk cleanup, look staff up by username and by `seed.<username>@example.com`. This makes `--keep-clerk` and `migrate reset` work.
3. **K3:** the base seed refuses a live Clerk key, and refuses `NODE_ENV=production`.
4. **Optional:** add `seed`, `seed:all`, `seed:fresh`, `seed:list` scripts to `package.json`.
5. **Optional:** add a `prisma/seeds/bootstrap-admin.ts` command for production. It would create one admin from env variables, with no demo data and a required strong password, replacing the manual steps in §7.4.
