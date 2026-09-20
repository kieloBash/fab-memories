// features/integrity/index.ts — CLIENT-SAFE barrel (integrity.query.ts is server-only)

export { integrityKeys, integrityRoutes } from "./integrity.constants"
export type { CheckStatus, IntegrityCheck, IntegrityReport } from "./integrity.types"
export { fetchIntegrityReport } from "./integrity.api"
export { useIntegrityReport } from "./integrity.hooks"
