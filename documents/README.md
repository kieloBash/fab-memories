# Fab Memories Events — Real-Time Transaction Monitoring System

A web-based event planning and real-time transaction monitoring system for Fab Memories Events — a wedding and debut coordination business. The system replaces all manual operations with a centralized platform covering event booking, payment verification, vendor coordination, staff scheduling, document generation, and a comprehensive audit trail with real-time decision support reporting.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| Next.js 14+ (App Router) | Framework — routing, server components, API routes |
| TypeScript | Language — strict mode |
| Prisma | ORM — database access and schema management |
| PostgreSQL (Supabase) | Database |
| Supabase Storage | File storage — payment proof uploads and generated documents |
| Clerk | Authentication — email/password + OTP-based MFA; |
| TanStack React Query | Server state management, data fetching, mutations, cache invalidation |
| Axios | HTTP client — configured instance at `lib/axios.ts` |
| Zod | Schema validation — same schema used on client forms and server API routes |
| shadcn/ui | Component library — never edit `components/ui/` manually |
| Tailwind CSS | Styling |
| Resend/Gmail API | Transactional email — OTP delivery, document notifications, receipts |
| react-pdf / Puppeteer | PDF generation — contracts, invoices, receipts, event checklists |
| Vercel | Deployment |

---

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables and fill in your values
cp .env.example .env.local

# Generate the Prisma client
npx prisma generate

# Push the schema to your database (development)
npx prisma db push

# Or run migrations (production)
npx prisma migrate deploy

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```env
# Database
DATABASE_URL=
DIRECT_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET_PAYMENTS=payment-proofs
SUPABASE_STORAGE_BUCKET_DOCUMENTS=event-documents

# JWT
JWT_SECRET=
JWT_REFRESH_SECRET=
OTP_SECRET=

# Email
RESEND_API_KEY=
EMAIL_FROM=no-reply@fabmemories.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Scripts

### `create-feature`

Scaffolds a new feature folder with all standard files pre-wired.

```bash
npm run create-feature -- --name <feature-name>
```

**Example:**
```bash
npm run create-feature -- --name bookings
```

**Output:**
```
features/bookings/
├── components/        ← add UI components here
├── hooks/
│   └── use-bookings.ts
├── services/
│   └── bookings.service.ts
├── schemas/
│   └── bookings.schema.ts
├── types/
│   └── bookings.types.ts
└── index.ts           ← uncomment exports as you build
```

All exports in `index.ts` start commented out. Uncomment them as you implement each piece.

**Setup:** `create-feature.mjs` lives in `scripts/` at the project root. The `package.json` entry:

```json
"scripts": {
  "create-feature": "node scripts/create-feature.mjs",
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest",
  "test:e2e": "playwright test",
  "prisma:generate": "prisma generate",
  "prisma:push": "prisma db push",
  "prisma:studio": "prisma studio"
}
```

---

## Folder Structure

```
fab-memories/
├── app/
│   ├── (public)/
│   │   └── login/
│   ├── (authenticated)/
│   │   ├── dashboard/
│   │   ├── bookings/
│   │   ├── calendar/
│   │   ├── packages/
│   │   ├── payments/
│   │   ├── vendors/
│   │   ├── staff/
│   │   ├── documents/
│   │   ├── audit/
│   │   ├── reports/
│   │   ├── portal/
│   │   ├── vendor-portal/
│   │   └── settings/
│   ├── api/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── bookings/
│   │   ├── packages/
│   │   ├── payments/
│   │   ├── vendors/
│   │   ├── staff/
│   │   ├── documents/
│   │   ├── audit/
│   │   └── reports/
│   └── generated/
│       └── prisma/          ← never edit manually
├── features/
│   ├── auth/
│   ├── bookings/
│   ├── packages/
│   ├── payments/
│   ├── installments/
│   ├── vendors/
│   ├── staff/
│   ├── documents/
│   ├── audit/
│   └── reports/
├── components/
│   ├── ui/                  ← never edit manually (shadcn)
│   ├── shared/
│   └── layout/
├── lib/
│   ├── prisma.ts
│   ├── axios.ts
│   ├── jwt.ts
│   ├── email.ts
│   ├── storage.ts
│   ├── pdf.ts
│   ├── query-client.ts
│   └── utils.ts
├── types/
│   └── index.ts
├── providers/
│   └── query-provider.tsx
├── prisma/
│   └── schema.prisma
├── scripts/
│   └── create-feature.mjs
├── middleware.ts
└── public/
```

---

## Folder Responsibilities

### `app/`
The Next.js App Router lives here. This folder is **routes only** — pages import components and call hooks but contain no business logic, no direct DB calls, and no inline validation.

- `app/(public)/` — publicly accessible pages (no login required). Currently only `/login`.
- `app/(authenticated)/` — all protected pages (JWT required). Middleware enforces this at the route level.
- `app/api/` — API route handlers. Each route receives a request, validates the body against the feature's Zod schema, calls the data layer, writes an audit log entry, and returns a response. No business logic beyond that.
- `app/generated/prisma/` — Prisma client output. **Never edit this folder.** Regenerate with `npx prisma generate`.

---

### `features/`
The core of the application. Each domain concept gets its own feature folder. A developer working on any feature only needs to look inside that one folder.

Every feature follows the same internal structure:

```
features/[feature]/
├── components/   # UI components used only within this feature
├── hooks/        # Data-fetching hooks (useQuery / useMutation wrappers)
├── services/     # Raw HTTP call functions — no React, no hooks
├── schemas/      # Zod validation schemas
├── types/        # TypeScript types specific to this domain
└── index.ts      # Barrel file — re-exports everything public-facing
```

**The rule:** if something is used only within one feature, it stays inside that feature. When a second feature needs it, it moves to the appropriate shared location.

#### `features/[feature]/components/`
React components only ever rendered within this feature. If a component is needed by two features, it moves to `components/shared/`.

#### `features/[feature]/hooks/`
React hooks that wrap service functions with `useQuery` or `useMutation`. The only layer that imports from TanStack React Query. Components call hooks — they never call service functions directly.

```ts
// hooks know about the data-fetching library
export const useBooking = (id: string) =>
  useQuery({ queryKey: ["bookings", id], queryFn: () => getBooking(id) })
```

#### `features/[feature]/services/`
Plain async functions that make HTTP requests via `lib/axios.ts`. **No React, no hooks** — just functions that take inputs and return data.

```ts
// services only know about the HTTP client
export const getBooking = async (id: string) => {
  const { data } = await api.get(`/bookings/${id}`)
  return data
}
```

#### `features/[feature]/schemas/`
Zod schemas that define the shape of data for this feature. These are the **single source of truth** for validation — the same schema is used by the form on the client and the API route handler on the server. Never define validation in two places.

#### `features/[feature]/types/`
TypeScript types specific to this domain. These extend or compose Prisma-generated types — they never redefine them. Prisma types are imported from `@/types`.

#### `features/[feature]/index.ts`
The barrel file. Re-exports everything that other features or `app/` pages need.

```ts
// ✅ Clean — import from the barrel
import { useBooking, BookingWithPayments } from "@/features/bookings"

// ❌ Avoid — deep import paths
import { useBooking } from "@/features/bookings/hooks/use-booking"
```

---

### `components/`
Shared UI components — used across two or more features.

- `components/ui/` — auto-generated by shadcn/ui CLI. **Never edit this folder.**
- `components/shared/` — cross-feature reusable components: `confirm-dialog.tsx`, `empty-state.tsx`, `loading-spinner.tsx`, `data-table.tsx`, `status-badge.tsx`, etc.
- `components/layout/` — app shell: `sidebar.tsx`, `topbar.tsx`, `role-guard.tsx`.

---

### `lib/`
Framework-level setup and utilities. Nothing here is domain-specific.

- `lib/prisma.ts` — Prisma client singleton. Import `prisma` from here in all API routes.
- `lib/axios.ts` — Configured Axios instance with base URL and error interceptors. Import `api` from here in all service files.
- `lib/jwt.ts` — `signAccessToken()`, `signRefreshToken()`, `verifyToken()` helpers.
- `lib/email.ts` — `sendOtpEmail()`, `sendDocumentNotification()`, `sendReceiptEmail()` wrappers around Resend.
- `lib/storage.ts` — Supabase Storage helpers: `uploadPaymentProof()`, `getDocumentUrl()`, `deleteFile()`.
- `lib/pdf.ts` — Document generation helpers: `generatePdf(template, data)` → Buffer.
- `lib/query-client.ts` — TanStack QueryClient factory used by QueryProvider.
- `lib/utils.ts` — General helpers: `cn()` for class merging, formatters, date utilities.

---

### `types/`
Global TypeScript types available everywhere in the app.

```ts
// types/index.ts
// Re-export Prisma types so features don't import from the generated path directly
export type {
  User, Booking, Package, Payment, Installment,
  Vendor, VendorAssignment, Coordinator, StaffAssignment,
  Document, AuditLog, DocumentTemplate
} from "@/app/generated/prisma"

// Enums
export {
  Role, BookingStatus, PaymentStatus, PaymentMethod,
  ProofType, EventType, PackageTier, LocationType,
  VendorServiceType, AssignmentStatus, DocumentType, AuditAction
} from "@/app/generated/prisma"

// Shared API response wrappers
export type ApiResponse<T> = { data: T; message?: string }
export type PaginatedResponse<T> = { data: T[]; total: number; page: number; pageSize: number }
export type ApiError = { error: string }
```

---

### `providers/`
React context providers wrapping the app.

- `providers/query-provider.tsx` — Mounts `QueryClientProvider` and React Query devtools. Imported in the root layout.

---

### `prisma/`
Prisma schema and migration files.

- `prisma/schema.prisma` — the full database schema. All model and enum definitions live here.

> **Note:** The Prisma client is generated to a custom path: `app/generated/prisma/`. Always import from `@/app/generated/prisma` — or better, from `@/types` which re-exports everything. Never import from `@prisma/client`.

---

### `middleware.ts`
Next.js middleware that runs on every request. Responsibilities:
1. Reads the JWT access token from the `httpOnly` cookie.
2. Verifies the token with `lib/jwt.ts`.
3. Redirects unauthenticated requests on `/(authenticated)/*` to `/login`.
4. Attaches the decoded payload (userId, role) to the request headers for downstream API routes.

---

### `scripts/`
Node utility scripts for development workflow automation. Not bundled, not imported — run via `npm run <script>`.

- `scripts/create-feature.mjs` — scaffolds a new feature folder. Zero external dependencies; uses only Node built-ins.

---

## Key Conventions

**1. Feature-local first, promote when shared.**
Start inside the feature. Move to `components/shared/`, `lib/`, or `types/` only when a second feature needs it.

**2. Barrel files keep imports clean.**
Every feature has an `index.ts`. Always import from `@/features/[feature]`, never from deep internal paths.

**3. Services → Hooks → Components. Never skip a layer.**
Components call hooks. Hooks call services. Services call `lib/axios.ts`. Each layer has one job.

**4. One schema, two uses.**
The same Zod schema validates the form on the client and the request body in the API route.

**5. `app/` stays thin.**
If a page file is growing with logic, it belongs in a hook or service.

**6. Never manually edit auto-generated folders.**
`app/generated/prisma/` and `components/ui/` are owned by their respective CLI tools.

**7. ORM types flow through `types/index.ts`.**
Feature files import from `@/types`, not directly from the generated Prisma path.

**8. Every mutating API route writes to AuditLog.**
All POST, PATCH, and DELETE routes write an `AuditLog` entry within the same Prisma transaction as the business operation. This is non-negotiable — the audit trail is the core accountability mechanism of the system.

**9. Payment records are immutable after verification.**
No PATCH route will accept changes to a `Payment` record once its status is `VERIFIED`. This is enforced at the API level and tested.

**10. Role checks happen at the route level, not the component level.**
`middleware.ts` enforces authentication. API routes enforce role. UI components use role information for display only — never for access control.
