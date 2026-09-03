// features/packages/packages.constants.ts

export const packageKeys = {
  all: ["packages"] as const,
  lists: () => [...packageKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...packageKeys.lists(), filters] as const,
  details: () => [...packageKeys.all, "detail"] as const,
  detail: (id: string) => [...packageKeys.details(), id] as const,
  // Separate cache bucket for the unauthenticated public listing
  publicList: () => [...packageKeys.all, "public-list"] as const,
} as const

export const packageRoutes = {
  packages: "/packages",
  package: (id: string) => `/packages/${id}`,
  // Public, unauthenticated endpoint — powers the /packages marketing page
  publicPackages: "/public/packages",
} as const
