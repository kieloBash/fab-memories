// features/auth/index.ts

// ── Constants ─────────────────────────────────────────────────────────────────
export { authKeys, authRoutes } from "./auth.constants"

// ── Schema ────────────────────────────────────────────────────────────────────
export {
  createStaffAccountSchema,
  updateStaffAccountSchema,
} from "./auth.schema"
export type { CreateStaffAccountInput, UpdateStaffAccountInput } from "./auth.schema"

// ── Types ─────────────────────────────────────────────────────────────────────
export type { StaffAccount, AuthUser, PublicMetadata, AppSessionClaims } from "./auth.types"

// ── API (client only) ─────────────────────────────────────────────────────────
export {
  fetchStaffAccounts,
  fetchStaffAccount,
  createStaffAccount,
  updateStaffAccount,
  deactivateStaffAccount,
} from "./auth.api"

// ── Hooks (client only) ───────────────────────────────────────────────────────
export {
  useStaffAccounts,
  useStaffAccount,
  useCreateStaffAccount,
  useUpdateStaffAccount,
  useDeactivateStaffAccount,
} from "./auth.hooks"

// ── Query (server only — import directly in /app/api route handlers) ──────────
// export { ... } from "./auth.query"
