// features/packages/index.ts

export { packageKeys, packageRoutes } from "./packages.constants"

export { createPackageSchema, updatePackageSchema } from "./packages.schema"
export type { CreatePackageInput, UpdatePackageInput } from "./packages.schema"

export type { Package, PackageWithBookingCount, PublicPackage } from "./packages.types"

export {
  fetchPackages, fetchPackage, createPackage, updatePackage, fetchPublicPackages,
} from "./packages.api"

export {
  usePackages, usePackage, useCreatePackage, useUpdatePackage, usePublicPackages,
} from "./packages.hooks"

// Server-only — import directly in route handlers
// export { ... } from "./packages.query"
