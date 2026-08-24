# Module 0 — Authentication & User Management

Handles Clerk-based authentication, role enforcement, staff account provisioning, and the supporting infrastructure shared by every other module.

---

## What's in this module

```
features/auth/
├── components/           ← UI components (empty — consuming pages own their forms)
├── auth.constants.ts     ← TanStack query keys + API route constants
├── auth.schema.ts        ← Zod schemas for create/update staff accounts
├── auth.types.ts         ← TypeScript types: StaffAccount, AuthUser, AppSessionClaims
├── auth.query.ts         ← Prisma queries  [server only — import in /app/api routes]
├── auth.api.ts           ← Axios calls     [client only]
├── auth.hooks.ts         ← TanStack hooks  [client only]
└── index.ts              ← Barrel exports

middleware.ts             ← Clerk middleware (project root)
lib/rbac.ts               ← Role → route access map + helpers
providers/query-provider.tsx  ← TanStack QueryClientProvider (moved from components/)
app/layout.tsx            ← Root layout (updated import path)
prisma/seed.ts            ← Reset-safe seed: all 4 roles, Clerk + Prisma cleanup
```

---

## Architecture

```
Clerk (identity source of truth)
    │
    ├── Webhook → /api/webhooks/clerk  → mirrors user into Prisma
    ├── Backend API → /api/staff-accounts  → admin provisions staff
    │
    └── Session claims (JWT) → middleware.ts reads role → route guard

features/auth/
    auth.query.ts    ←  /app/api/staff-accounts route handlers only
    auth.api.ts      ←  auth.hooks.ts only
    auth.hooks.ts    ←  page components only
    auth.schema.ts   ←  API route handlers (server) + forms (client)
```

**Rule:** components call hooks → hooks call `auth.api.ts` → api calls `/api/*` → routes call `auth.query.ts`. Never skip a layer.

---

## Roles

| Prisma enum   | Login page      | Protected prefix     |
|---------------|-----------------|----------------------|
| `ADMIN`       | `/staff-login`  | `/staff/admin`       |
| `COORDINATOR` | `/staff-login`  | `/staff/coordinator` |
| `VENDOR`      | `/staff-login`  | `/staff/vendor`      |
| `CLIENT`      | `/sign-in`      | `/portal`            |

Role is stored in Clerk `publicMetadata` and surfaced in session claims via a custom token configured in the Clerk dashboard:

```json
{ "metadata": "{{user.public_metadata}}" }
```

Read it server-side with `lib/clerk/auth.ts → getCurrentRole()`.

---

## Middleware

`middleware.ts` (project root) uses `clerkMiddleware` to:

1. Let all public routes through (`/`, `/sign-in`, `/sign-up`, `/staff-login`, `/api/webhooks/*`)
2. Redirect unauthenticated users to the correct login page
3. Redirect authenticated users who land on the wrong section (e.g. CLIENT hitting `/staff` → redirect to `/portal`)

---

## Staff Account Provisioning

Staff accounts (ADMIN, COORDINATOR, VENDOR) are **never self-registered**. An admin creates them via `/staff/admin/users/new`, which calls `POST /api/staff-accounts`.

Flow:
1. Admin submits the create form → `useCreateStaffAccount()` → `POST /api/staff-accounts`
2. Route handler validates body against `createStaffAccountSchema`
3. Creates Clerk user via Backend API with `publicMetadata: { role }`
4. Mirrors into Prisma via `createStaffAccountRecord()`
5. Writes audit log entry (`CREATE` / `USER_MANAGEMENT`)

If Clerk creation succeeds but Prisma fails, the route handler rolls back by deleting the Clerk user.

---

## Hooks Reference

```ts
// Read
useStaffAccounts()           // all non-CLIENT users
useStaffAccount(id)          // single user by Prisma id

// Mutate (all include toast + cache invalidation)
useCreateStaffAccount()      // mutate({ username, password, fullName, role })
useUpdateStaffAccount()      // mutate({ id, input: { fullName?, role?, isActive? } })
useDeactivateStaffAccount()  // mutate(id) — soft delete, locks Clerk account
```

---

## Seed

Runs `npx prisma db seed`. Creates all 4 roles. **Safe to re-run** — finds and deletes existing Clerk users and Prisma rows before recreating.

| Role        | Username    | Password         | Login URL               |
|-------------|-------------|------------------|-------------------------|
| ADMIN       | admin       | FabMemories123!  | `/staff-login`          |
| COORDINATOR | coordinator | FabMemories123!  | `/staff-login`          |
| VENDOR      | vendor      | FabMemories123!  | `/staff-login`          |
| CLIENT      | testclient  | FabMemories123!  | `/sign-in` (by email)   |

Client email: `client@fabmemories.test`

> Change all passwords immediately after first login. Never commit `SEED_ADMIN_PASSWORD` to source control.

---

## Files to Delete

After placing these files, remove the old locations:

```
components/query-provider.tsx    →  replaced by providers/query-provider.tsx
lib/api/staff-accounts.ts        →  replaced by features/auth/auth.api.ts + auth.hooks.ts
lib/api/mutation.ts              →  replaced by standard useMutation in auth.hooks.ts
```

---

## Environment Variables

```env
# Clerk
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/portal
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/portal

# Seed (optional overrides)
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=FabMemories123!
SEED_ADMIN_FULLNAME=System Administrator
SEED_ADMIN_EMAIL=admin@fabmemories.test
```
