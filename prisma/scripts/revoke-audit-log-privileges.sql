-- prisma/scripts/revoke-audit-log-privileges.sql
--
-- ── Layer 2: database-level tamper prevention ──────────────────────
--
-- The hash chain (see lib/audit/chain.ts) DETECTS tampering after the
-- fact — if someone alters a row, the next integrity check will catch
-- it. This script adds a second, independent layer that PREVENTS the
-- most common tampering path in the first place: revoking UPDATE and
-- DELETE privileges on the audit tables from the application's own
-- database role.
--
-- After running this, the application can still INSERT new audit
-- entries (required for logAction() to keep working) but can no
-- longer UPDATE or DELETE existing rows through the connection it
-- normally uses — not even if the application code were compromised,
-- and not through a stray migration or admin script that reuses the
-- app's own credentials.
--
-- This does NOT protect against a superuser/database-owner role
-- connecting directly with elevated privileges — no application-level
-- control can prevent that. That's exactly why the hash chain (Layer 1)
-- exists as a second, independent mechanism: even a superuser who
-- rewrites a row through a completely different connection will be
-- caught by the next chain verification, because the tampering shows
-- up as a broken hash regardless of which privilege level made the edit.
--
-- ── How to run this ─────────────────────────────────────────────────
--
-- 1. Identify the role your application connects as. Run this via any
--    connection using your app's DATABASE_URL:
--
--      SELECT current_user;
--
-- 2. Replace `app_user` below with that role name, then run this
--    script once via the Supabase SQL editor (or `psql`) using an
--    ADMIN/OWNER connection — not the app's own connection, since the
--    app's role won't have permission to revoke its own grants.
--
-- 3. Confirm it took effect:
--
--      SELECT grantee, privilege_type
--      FROM information_schema.role_table_grants
--      WHERE table_name IN ('AuditLog', 'AuditChainState');
--
--    You should see INSERT and SELECT for your app role, but no
--    UPDATE or DELETE rows for it.
--
-- 4. Re-run this script after any `prisma migrate` that recreates
--    these tables — a fresh migration re-grants full privileges by
--    default and this revocation does not survive a table drop/recreate.

REVOKE UPDATE, DELETE ON TABLE "AuditLog" FROM app_user;
REVOKE UPDATE, DELETE ON TABLE "AuditChainState" FROM app_user;

-- Optional, stricter: also block TRUNCATE (a single statement that
-- wipes a whole table without touching individual rows, which DELETE
-- privilege alone doesn't cover).
REVOKE TRUNCATE ON TABLE "AuditLog" FROM app_user;
REVOKE TRUNCATE ON TABLE "AuditChainState" FROM app_user;
