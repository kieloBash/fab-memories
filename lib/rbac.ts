// lib/rbac.ts

import type { Role } from "@/app/generated/prisma/client"

/**
 * Defines which roles can access which route prefixes.
 * Role values match the Prisma enum exactly (uppercase).
 * Routes match the actual app/(pages)/... structure.
 */
export const ROUTE_ACCESS: Record<string, Role[]> = {
  "/staff/admin":       ["ADMIN"],
  "/staff/coordinator": ["COORDINATOR", "ADMIN"],
  "/staff/vendor":      ["VENDOR", "ADMIN"],
  "/staff":             ["ADMIN", "COORDINATOR", "VENDOR"],
  "/portal":            ["CLIENT"],
}

/**
 * Returns true if the given role is permitted to visit the given pathname.
 * Unmatched routes (not gated) are always allowed through.
 */
export function canAccess(pathname: string, role: Role | null): boolean {
  if (!role) return false

  // Match the most-specific prefix first (longest match wins)
  const match = Object.keys(ROUTE_ACCESS)
    .sort((a, b) => b.length - a.length)
    .find((prefix) => pathname.startsWith(prefix))

  if (!match) return true // not a gated route
  return ROUTE_ACCESS[match].includes(role)
}

/**
 * Returns the default redirect path for a given role after sign-in.
 */
export function getDefaultRedirect(role: Role): string {
  switch (role) {
    case "ADMIN":       return "/staff/admin"
    case "COORDINATOR": return "/staff/coordinator"
    case "VENDOR":      return "/staff/vendor"
    case "CLIENT":      return "/portal"
    default:            return "/"
  }
}
