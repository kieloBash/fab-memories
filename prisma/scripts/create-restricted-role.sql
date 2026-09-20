-- prisma/scripts/create-restricted-role.sql
--
-- ── Layer 2 of tamper protection: an APPEND-ONLY audit table for the application's own database role ──
--
-- The hash chain (lib/audit/chain.ts) DETECTS tampering. This script PREVENTS the easiest route to it:
-- the role the running application connects as can INSERT audit entries but can never UPDATE, DELETE or
-- TRUNCATE them — so even a fully compromised application (or a stray script using its credentials)
-- cannot rewrite history through that connection.
--
-- Two roles, two connection strings:
--   DIRECT_URL / DATABASE_URL     → the OWNER role. Migrations, seeding, backups. Never used by the running app.
--   RUNTIME_DATABASE_URL          → app_runtime (created below). What lib/prisma.ts uses at run time.
--
-- HOW TO RUN (once, as the database OWNER / an admin — NOT as app_runtime):
--   1. Replace CHANGE_ME_STRONG_PASSWORD below.
--   2. psql "$DIRECT_URL" -f prisma/scripts/create-restricted-role.sql      (or paste into the Supabase SQL editor)
--   3. Set  RUNTIME_DATABASE_URL="postgresql://app_runtime:<password>@<host>:<port>/<db>"
--      (Supabase pooler: the user is  app_runtime.<project-ref>  — check the connection string page.)
--   4. Restart the app, then open /staff/admin/audit/integrity — "Audit table is write-protected" should pass.
--   5. Prove it:  npx tsx prisma/verify-restricted-role.ts
--
-- Safe to re-run. This supersedes revoke-audit-log-privileges.sql (which needed you to guess the role name).
--
-- WHAT THIS DOES NOT PROTECT AGAINST: a superuser / the database owner connecting directly. No application-
-- level control can. That is exactly why the hash chain (and its tip anchor) exists as an independent layer.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime LOGIN PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
  END IF;
END $$;

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO app_runtime', current_database());
END $$;

GRANT USAGE ON SCHEMA public TO app_runtime;

-- Normal read/write access for the application ...
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;

-- ... but nobody, through this role, may empty or restructure a table.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM app_runtime;

-- The audit trail is append-only.
REVOKE UPDATE, DELETE, TRUNCATE ON "AuditLog"          FROM app_runtime;
REVOKE UPDATE, DELETE, TRUNCATE ON "AuditWriteFailure" FROM app_runtime;

-- The chain tip must be ADVANCED (UPDATE) by every audit write, but must never be deleted or reset.
REVOKE DELETE, TRUNCATE ON "AuditChainState" FROM app_runtime;

-- Tables created by FUTURE migrations (run by the current role) get the same baseline automatically.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;
